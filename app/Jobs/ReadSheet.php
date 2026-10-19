<?php

namespace App\Jobs;

use App\Models\SheetImport;
use App\Services\Sheets\GoogleClient;
use App\Services\Sheets\GoogleSheetsException;
use App\Services\Sheets\SheetRowReader;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Reads a sheet tab in the background and stores the rows to check (BF-11).
 */
class ReadSheet implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 180;

    public function __construct(public SheetImport $import) {}

    public function handle(GoogleClient $google, SheetRowReader $reader): void
    {
        $import = $this->import->loadMissing('source.merchant.googleConnection');
        $source = $import->source;
        $connection = $source->merchant->googleConnection;

        if ($connection === null) {
            $this->fail($import, 'Aucun compte Google n\'est connecté. Connectez-le puis relancez la synchronisation.');

            return;
        }

        try {
            $rows = $google->values($connection, $source->spreadsheet_id, $source->sheet_title);
            $result = $reader->read($source, $rows);
        } catch (GoogleSheetsException $exception) {
            $this->fail($import, $exception->getMessage());

            return;
        } catch (Throwable $exception) {
            Log::error('Sheet reading crashed', ['sheet_import_id' => $import->id, 'exception' => $exception]);
            $this->fail($import, 'Une erreur inattendue a empêché la lecture du Sheet. Réessayez.');

            return;
        }

        $import->update([
            'status' => SheetImport::STATUS_READY,
            'proposals' => $result['proposals'],
            'warnings' => [
                ...$result['warnings'],
                ...($result['unchanged'] > 0 ? ["{$result['unchanged']} ligne(s) déjà importée(s) et inchangée(s) ont été laissées de côté."] : []),
            ],
            'rows_read' => $result['rows_read'],
            'error' => null,
        ]);

        if ($result['proposals'] === []) {
            $import->update(['status' => SheetImport::STATUS_DONE]);
            $source->update(['last_synced_at' => now()]);
        }
    }

    private function fail(SheetImport $import, string $reason): void
    {
        $import->update(['status' => SheetImport::STATUS_FAILED, 'error' => $reason]);
    }
}
