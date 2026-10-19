<?php

namespace App\Http\Controllers;

use App\Jobs\ReadSheet;
use App\Models\Agency;
use App\Models\Country;
use App\Models\Merchant;
use App\Models\Report;
use App\Models\SheetImport;
use App\Models\SheetSource;
use App\Services\Sheets\ColumnGuesser;
use App\Services\Sheets\GoogleClient;
use App\Services\Sheets\GoogleSheetsException;
use App\Services\Sheets\SheetImporter;
use App\Services\Sheets\SheetRowReader;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Google Sheets as a source of reports: link a tab, map its columns, read it, check and import (BF-11).
 */
class SheetController extends Controller
{
    public function index(Request $request, GoogleClient $google): Response
    {
        $merchant = $this->merchantOf($request);
        $connection = $merchant->googleConnection()->first();

        return Inertia::render('sheets/index', [
            'googleConfigured' => $google->isConfigured(),
            'connection' => $connection ? ['email' => $connection->google_email] : null,
            'sources' => $merchant->sheetSources()
                ->with(['country:id,name', 'defaultAgency:id,name', 'imports' => fn ($query) => $query->latest('id')->limit(1)])
                ->withCount('reports')
                ->orderBy('spreadsheet_title')
                ->get()
                ->map(fn (SheetSource $source) => [
                    'id' => $source->id,
                    'spreadsheet_title' => $source->spreadsheet_title,
                    'sheet_title' => $source->sheet_title,
                    'url' => $source->url(),
                    'country' => $source->country->name,
                    'default_agency' => $source->defaultAgency?->name,
                    'auto_sync' => $source->auto_sync,
                    'last_synced_at' => $source->last_synced_at?->toIso8601String(),
                    'reports_count' => $source->reports_count,
                    'latest_import' => ($import = $source->imports->first()) ? [
                        'id' => $import->id,
                        'status' => $import->status,
                        'proposals' => count($import->proposals ?? []),
                    ] : null,
                ]),
            'hasCountries' => $merchant->countries()->exists(),
        ]);
    }

    /**
     * Step 1 and 2: paste the link, pick the tab, check the columns.
     */
    public function create(Request $request, GoogleClient $google): Response|RedirectResponse
    {
        return $this->form($request, $google, null);
    }

    public function edit(Request $request, GoogleClient $google, SheetSource $source): Response|RedirectResponse
    {
        $this->ensureOwned($request, $source->merchant_id);

        return $this->form($request, $google, $source);
    }

    public function store(Request $request): RedirectResponse
    {
        $merchant = $this->merchantOf($request);
        $data = $this->validated($request, $merchant);

        if ($merchant->sheetSources()->where('spreadsheet_id', $data['spreadsheet_id'])->where('sheet_title', $data['sheet_title'])->exists()) {
            throw ValidationException::withMessages(['sheet_title' => 'Cet onglet est déjà relié. Modifiez-le depuis la liste des Sheets.']);
        }

        $source = $merchant->sheetSources()->create($data);

        return $this->startReading($request, $source);
    }

    public function update(Request $request, SheetSource $source): RedirectResponse
    {
        $merchant = $this->merchantOf($request);
        $this->ensureOwned($request, $source->merchant_id);

        $source->update($this->validated($request, $merchant));

        return $this->startReading($request, $source);
    }

    public function destroy(Request $request, SheetSource $source): RedirectResponse
    {
        $this->ensureOwned($request, $source->merchant_id);

        $source->delete();

        return to_route('sheets.index')->with('success', "Onglet « {$source->sheet_title} » délié. Les rapports déjà importés sont gardés.");
    }

    public function sync(Request $request, SheetSource $source): RedirectResponse
    {
        $this->ensureOwned($request, $source->merchant_id);

        return $this->startReading($request, $source);
    }

    public function showImport(Request $request, SheetImport $import): Response
    {
        $import->load('source.country.agencies');
        $this->ensureOwned($request, $import->source->merchant_id);
        $source = $import->source;

        return Inertia::render('sheets/import', [
            'import' => [
                'id' => $import->id,
                'status' => $import->status,
                'error' => $import->error,
                'warnings' => $import->warnings ?? [],
                'rows_read' => $import->rows_read,
                'proposals' => $import->proposals ?? [],
            ],
            'source' => [
                'id' => $source->id,
                'spreadsheet_title' => $source->spreadsheet_title,
                'sheet_title' => $source->sheet_title,
                'url' => $source->url(),
                'country' => $source->country->name,
            ],
            'agencies' => $source->country->agencies->map(fn (Agency $agency) => ['id' => $agency->id, 'name' => $agency->name])->values(),
        ]);
    }

    /**
     * Step 3: save the ticked rows. Figures always come from the sheet; only dates, agency and status can be corrected.
     */
    public function confirmImport(Request $request, SheetImport $import, SheetImporter $importer): RedirectResponse
    {
        $import->load('source');
        $this->ensureOwned($request, $import->source->merchant_id);

        abort_unless($import->status === SheetImport::STATUS_READY, 409, 'Cette lecture a déjà été importée.');

        $data = $request->validate([
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.row' => ['required', 'integer'],
            'rows.*.period_start' => ['required', 'date'],
            'rows.*.period_end' => ['required', 'date', 'after_or_equal:rows.*.period_start'],
            'rows.*.agency_id' => ['nullable', 'integer', Rule::exists('agencies', 'id')->where('country_id', $import->source->country_id)],
            'rows.*.status' => ['required', Rule::in([Report::STATUS_COUNTED, Report::STATUS_DETAIL])],
        ], [
            'rows.required' => 'Cochez au moins une ligne à importer.',
            'rows.*.period_start.required' => 'Indiquez la date de début de cette ligne.',
            'rows.*.period_end.required' => 'Indiquez la date de fin de cette ligne.',
            'rows.*.period_end.after_or_equal' => 'La date de fin doit être après la date de début.',
            'rows.*.agency_id.required' => 'Choisissez l\'agence de cette ligne.',
            'rows.*.agency_id.exists' => 'Cette agence n\'est pas dans ce pays.',
        ]);

        $proposals = collect($import->proposals ?? [])->keyBy('row');
        $rows = [];

        foreach ($data['rows'] as $position => $choice) {
            $proposal = $proposals->get($choice['row']);
            abort_if($proposal === null, 422, 'Ligne inconnue.');

            if (($proposal['kind'] ?? 'report') === 'report' && empty($choice['agency_id'])) {
                throw ValidationException::withMessages(["rows.$position.agency_id" => 'Choisissez l\'agence de cette ligne.']);
            }

            $rows[] = [...$proposal, ...$choice, 'agency_id' => $choice['agency_id'] ?? null];
        }

        $keys = collect($rows)->map(fn (array $row) => SheetRowReader::key($import->source, $row));

        if ($keys->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages(['rows' => 'Deux lignes cochées ont la même agence et les mêmes dates : décochez-en une.']);
        }

        $saved = $importer->import($import, $rows, $request->user());

        return to_route('sheets.index')->with('success', "{$saved} ligne".($saved > 1 ? 's importées' : ' importée')." depuis « {$import->source->sheet_title} ».");
    }

    private function startReading(Request $request, SheetSource $source): RedirectResponse
    {
        $import = $source->imports()->create([
            'user_id' => $request->user()->id,
            'status' => SheetImport::STATUS_PENDING,
        ]);

        ReadSheet::dispatch($import);

        return to_route('sheets.imports.show', $import);
    }

    private function form(Request $request, GoogleClient $google, ?SheetSource $source): Response|RedirectResponse
    {
        $merchant = $this->merchantOf($request);
        $connection = $merchant->googleConnection()->first();

        if ($connection === null) {
            return to_route('sheets.index')->with('warning', 'Connectez d\'abord votre compte Google.');
        }

        $link = (string) $request->query('lien', $source?->url() ?? '');
        $spreadsheetId = $link !== '' ? GoogleClient::spreadsheetIdFrom($link) : null;
        $tab = (string) $request->query('onglet', $source?->sheet_title ?? '');
        $spreadsheet = null;
        $preview = null;
        $error = null;

        if ($link !== '' && $spreadsheetId === null) {
            $error = 'Ce lien ne ressemble pas à un lien Google Sheets. Copiez l\'adresse affichée quand le Sheet est ouvert.';
        }

        try {
            if ($spreadsheetId !== null) {
                $spreadsheet = ['id' => $spreadsheetId, ...$google->spreadsheet($connection, $spreadsheetId)];
            }

            if ($spreadsheet !== null && $tab !== '' && collect($spreadsheet['sheets'])->contains('title', $tab)) {
                $rows = array_slice($google->values($connection, $spreadsheetId, $tab, 40), 0, 40);
                $guesser = new ColumnGuesser;
                $headerRow = $source?->header_row ?? $guesser->headerRow($rows);

                $preview = [
                    'rows' => array_map(fn (array $row) => array_map(fn ($cell) => is_scalar($cell) ? (string) $cell : '', array_slice($row, 0, 16)), $rows),
                    'header_row' => $headerRow,
                    'columns' => $source?->columns ?? $guesser->guess($rows[$headerRow - 1] ?? []),
                ];
            }
        } catch (GoogleSheetsException $exception) {
            $error = $exception->getMessage();
        }

        return Inertia::render('sheets/create', [
            'link' => $link,
            'tab' => $tab,
            'spreadsheet' => $spreadsheet,
            'preview' => $preview,
            'error' => $error,
            'fields' => SheetSource::FIELDS,
            'requiredFields' => SheetSource::REQUIRED_FIELDS,
            'countries' => $merchant->countries()->with('agencies:id,country_id,name')->orderBy('name')->get()->map(fn (Country $country) => [
                'id' => $country->id,
                'name' => $country->name,
                'agencies' => $country->agencies->map(fn (Agency $agency) => ['id' => $agency->id, 'name' => $agency->name])->values(),
            ]),
            'source' => $source ? [
                'id' => $source->id,
                'country_id' => $source->country_id,
                'default_agency_id' => $source->default_agency_id,
                'auto_sync' => $source->auto_sync,
            ] : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, Merchant $merchant): array
    {
        $fieldRules = collect(SheetSource::FIELDS)->keys()->mapWithKeys(fn (string $field) => [
            "columns.$field" => [in_array($field, SheetSource::REQUIRED_FIELDS, true) ? 'required' : 'nullable', 'integer', 'min:0', 'max:25'],
        ])->all();

        $data = $request->validate([
            'spreadsheet_id' => ['required', 'string', 'max:120'],
            'spreadsheet_title' => ['required', 'string', 'max:255'],
            'sheet_title' => ['required', 'string', 'max:255'],
            'country_id' => ['required', 'integer', Rule::exists('countries', 'id')->where('merchant_id', $merchant->id)],
            'default_agency_id' => ['nullable', 'integer', Rule::exists('agencies', 'id')->where('country_id', $request->integer('country_id'))],
            'header_row' => ['required', 'integer', 'min:1', 'max:40'],
            'auto_sync' => ['boolean'],
            ...$fieldRules,
        ], [
            'country_id.required' => 'Choisissez le pays de cet onglet.',
            'default_agency_id.exists' => 'Cette agence n\'est pas dans ce pays.',
            'columns.label.required' => 'Choisissez la colonne des dates.',
            'columns.revenue.required' => 'Choisissez la colonne du chiffre d\'affaires.',
        ]);

        $columns = collect(SheetSource::FIELDS)->keys()->mapWithKeys(fn (string $field) => [
            $field => isset($data['columns'][$field]) ? (int) $data['columns'][$field] : null,
        ]);

        $used = $columns->filter(fn ($column) => $column !== null);

        if ($used->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages(['columns' => 'Une même colonne est choisie pour deux informations différentes.']);
        }

        return [...collect($data)->except('columns')->all(), 'columns' => $columns->all(), 'auto_sync' => $request->boolean('auto_sync', true)];
    }
}
