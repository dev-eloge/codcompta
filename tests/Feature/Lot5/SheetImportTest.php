<?php

use App\Jobs\ReadSheet;
use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Country;
use App\Models\GoogleConnection;
use App\Models\Merchant;
use App\Models\Report;
use App\Models\SheetImport;
use App\Models\SheetSource;
use App\Models\User;
use App\Services\PeriodReport;
use App\Services\Sheets\ColumnGuesser;
use App\Services\Sheets\SheetRowReader;
use Carbon\CarbonImmutable;
use Database\Seeders\DemoWeekSeeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\Feature\Lot5\SheetFixture;

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->merchant = Merchant::where('name', 'Boutique Démo')->firstOrFail();
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
    $this->country = Country::where('code', 'PD')->firstOrFail();
    $this->agency1 = Agency::where('name', 'Agence 1')->firstOrFail();
    $this->agency2 = Agency::where('name', 'Agence 2')->firstOrFail();

    GoogleConnection::create([
        'merchant_id' => $this->merchant->id,
        'google_email' => 'compta@exemple.com',
        'access_token' => 'jeton-acces',
        'refresh_token' => 'jeton-renouvellement',
        'expires_at' => now()->addHour(),
    ]);

    $this->source = SheetSource::create([
        'merchant_id' => $this->merchant->id,
        'country_id' => $this->country->id,
        'default_agency_id' => $this->agency1->id,
        'spreadsheet_id' => '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
        'spreadsheet_title' => 'Comptabilité',
        'sheet_title' => 'COMPTA',
        'header_row' => 1,
        'columns' => (new ColumnGuesser)->guess(SheetFixture::HEADERS),
    ]);
});

function readFixture(SheetSource $source, int $agency1Revenue = 60000): array
{
    return (new SheetRowReader)->read($source, SheetFixture::rows($agency1Revenue), CarbonImmutable::parse('2026-10-19'));
}

it('devine les colonnes d\'un Sheet de comptabilité', function () {
    expect((new ColumnGuesser)->guess(SheetFixture::HEADERS))->toBe([
        'label' => 0,
        'delivery_fees' => 7,
        'closing_fees' => 6,
        'ad_spend' => 5,
        'purchase_cost' => 2,
        'revenue' => 4,
        'delivered' => 1,
        'other_fees' => 13,
        'profit' => 8,
    ]);

    expect((new ColumnGuesser)->headerRow([['Comptabilité 2026'], [], SheetFixture::HEADERS]))->toBe(3);
});

it('lit les lignes datées, saute les titres et les totaux', function () {
    $result = readFixture($this->source);
    $byRow = collect($result['proposals'])->keyBy('row');

    expect($byRow->keys()->all())->toBe([3, 4, 6, 9, 10, 11]);

    expect($byRow[3])
        ->period_start->toBe('2026-07-03')
        ->agency_id->toBe($this->agency1->id)
        ->revenue->toBe(48000)
        ->profit->toBe(24000)
        ->warnings->toBe([])
        ->selected->toBeTrue();

    expect($byRow[4])->kind->toBe('ad_spend')->shared->toBeTrue()->agency_id->toBeNull()->selected->toBeTrue()->ad_spend->toBe(6500);

    expect($byRow[6])
        ->period_start->toBe('2026-09-28')
        ->period_end->toBe('2026-10-04')
        ->agency_id->toBe($this->agency2->id);

    expect($byRow[10])->agency_id->toBeNull()->selected->toBeFalse()
        ->and($byRow[10]['warnings'][0])->toContain('inconnue');

    expect($byRow[11])->status->toBe(Report::STATUS_DETAIL);
});

it('signale un bénéfice du Sheet qui ne correspond pas au calcul', function () {
    $rows = SheetFixture::rows();
    $rows[2][8] = 30000;

    $result = (new SheetRowReader)->read($this->source, $rows, CarbonImmutable::parse('2026-10-19'));

    expect($result['proposals'][0]['warnings'][0])->toContain('diffère du calcul');
});

it('importe les lignes cochées avec leur coût d\'achat et leur pub', function () {
    $import = $this->source->imports()->create(['status' => SheetImport::STATUS_READY, 'proposals' => readFixture($this->source)['proposals']]);

    $this->actingAs($this->user)->post("/sheets/lectures/{$import->id}", ['rows' => [
        ['row' => 6, 'period_start' => '2026-09-28', 'period_end' => '2026-10-04', 'agency_id' => $this->agency2->id, 'status' => 'counted'],
        ['row' => 9, 'period_start' => '2026-10-05', 'period_end' => '2026-10-11', 'agency_id' => $this->agency1->id, 'status' => 'counted'],
    ]])->assertRedirect('/sheets')->assertSessionHas('success', '2 lignes importées depuis « COMPTA ».');

    $report = Report::where('sheet_source_id', $this->source->id)->whereDate('period_end', '2026-10-11')->with('lines')->sole();

    expect($report)
        ->source->toBe(Report::SOURCE_SHEET)
        ->closing_fees->toBe(1000)
        ->delivery_fees->toBe(10000)
        ->and($report->revenue())->toBe(60000)
        ->and($report->purchaseCost())->toBe(2500)
        ->and($report->deliveredQuantity())->toBe(5)
        ->and(AdSpend::where('report_id', $report->id)->value('amount'))->toBe(10000)
        ->and($import->fresh()->status)->toBe(SheetImport::STATUS_DONE);

    $week = (new PeriodReport)->forCountry($this->country, '2026-10-05', '2026-10-11');

    expect($week['total']['profit'])->toBe(36500);
});

it('ne repropose pas une ligne déjà importée et remplace une ligne modifiée', function () {
    $import = $this->source->imports()->create(['status' => SheetImport::STATUS_READY, 'proposals' => readFixture($this->source)['proposals']]);
    $this->actingAs($this->user)->post("/sheets/lectures/{$import->id}", ['rows' => [
        ['row' => 9, 'period_start' => '2026-10-05', 'period_end' => '2026-10-11', 'agency_id' => $this->agency1->id, 'status' => 'counted'],
    ]]);

    $again = readFixture($this->source->fresh());
    expect(collect($again['proposals'])->pluck('row')->all())->not->toContain(9)
        ->and($again['unchanged'])->toBe(1);

    $changed = readFixture($this->source->fresh(), agency1Revenue: 70000);
    $row = collect($changed['proposals'])->firstWhere('row', 9);
    expect($row['changed'])->toBeTrue();

    $second = $this->source->imports()->create(['status' => SheetImport::STATUS_READY, 'proposals' => $changed['proposals']]);
    $this->actingAs($this->user)->post("/sheets/lectures/{$second->id}", ['rows' => [
        ['row' => 9, 'period_start' => '2026-10-05', 'period_end' => '2026-10-11', 'agency_id' => $this->agency1->id, 'status' => 'counted'],
    ]])->assertSessionHasNoErrors();

    $reports = Report::where('sheet_source_id', $this->source->id)->get();
    expect($reports)->toHaveCount(1)
        ->and($reports->first()->load('lines')->revenue())->toBe(70000)
        ->and(AdSpend::whereNotNull('report_id')->count())->toBe(1);
});

it('lit le Sheet en arrière-plan avec le compte Google du commerçant', function () {
    Http::fake(['sheets.googleapis.com/*' => Http::response(SheetFixture::valuesResponse())]);

    $this->actingAs($this->user)->post("/sheets/{$this->source->id}/synchroniser")->assertRedirect();

    $import = SheetImport::latest('id')->first();

    expect($import->status)->toBe(SheetImport::STATUS_READY)
        ->and($import->proposals)->toHaveCount(6)
        ->and($import->rows_read)->toBe(10);

    Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer jeton-acces')
        && str_contains($request->url(), 'valueRenderOption=UNFORMATTED_VALUE')
        && str_contains(urldecode($request->url()), "'COMPTA'!A1:Z5000"));
});

it('renouvelle le jeton Google expiré avant de lire', function () {
    $this->merchant->googleConnection->update(['expires_at' => now()->subMinute()]);

    Http::fake([
        'oauth2.googleapis.com/token' => Http::response(['access_token' => 'nouveau-jeton', 'expires_in' => 3599]),
        'sheets.googleapis.com/*' => Http::response(SheetFixture::valuesResponse()),
    ]);

    ReadSheet::dispatchSync($this->source->imports()->create(['status' => 'pending']));

    expect($this->merchant->googleConnection->fresh()->access_token)->toBe('nouveau-jeton');
    Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer nouveau-jeton'));
});

it('explique un Sheet inaccessible', function () {
    Http::fake(['sheets.googleapis.com/*' => Http::response(['error' => ['code' => 403, 'status' => 'PERMISSION_DENIED']], 403)]);

    ReadSheet::dispatchSync($import = $this->source->imports()->create(['status' => 'pending']));

    expect($import->fresh())->status->toBe(SheetImport::STATUS_FAILED)
        ->error->toContain('n\'a pas accès');
});

it('relie un onglet avec ses colonnes puis lance sa lecture', function () {
    Queue::fake();
    $this->source->delete();

    $this->actingAs($this->user)->post('/sheets', [
        'spreadsheet_id' => '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
        'spreadsheet_title' => 'Comptabilité',
        'sheet_title' => 'COMPTA',
        'country_id' => $this->country->id,
        'default_agency_id' => $this->agency1->id,
        'header_row' => 1,
        'columns' => ['label' => 0, 'revenue' => 4, 'delivered' => 1, 'ad_spend' => 5],
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect(SheetSource::sole()->columns)->toMatchArray(['label' => 0, 'revenue' => 4, 'purchase_cost' => null]);
    Queue::assertPushed(ReadSheet::class);

    $this->actingAs($this->user)->post('/sheets', [
        'spreadsheet_id' => 'x2AbCdEfGhIjKlMnOpQrStUvWxYz012345678',
        'spreadsheet_title' => 'Comptabilité',
        'sheet_title' => 'AUTRE',
        'country_id' => $this->country->id,
        'header_row' => 1,
        'columns' => ['label' => 0, 'revenue' => 0],
    ])->assertSessionHasErrors('columns');
});

it('garde les Sheets de chaque commerçant pour lui', function () {
    $stranger = User::factory()->create(['merchant_id' => Merchant::create(['name' => 'Autre boutique'])->id]);
    $import = $this->source->imports()->create(['status' => SheetImport::STATUS_READY, 'proposals' => []]);

    $this->actingAs($stranger)->post("/sheets/{$this->source->id}/synchroniser")->assertNotFound();
    $this->actingAs($stranger)->delete("/sheets/{$this->source->id}")->assertNotFound();
    $this->actingAs($stranger)->post("/sheets/lectures/{$import->id}", ['rows' => []])->assertNotFound();
});

it('connecte et déconnecte un compte Google', function () {
    config(['services.google.client_id' => 'id-client', 'services.google.client_secret' => 'secret-client']);
    $this->merchant->googleConnection->delete();

    $redirect = $this->actingAs($this->user)->get('/google/connecter');
    $redirect->assertRedirectContains('accounts.google.com');
    parse_str(parse_url($redirect->headers->get('Location'), PHP_URL_QUERY), $query);

    expect($query['scope'])->toContain('spreadsheets.readonly')->and($query['access_type'])->toBe('offline');

    Http::fake([
        'oauth2.googleapis.com/token' => Http::response(['access_token' => 'a1', 'refresh_token' => 'r1', 'expires_in' => 3599, 'scope' => 'openid email https://www.googleapis.com/auth/spreadsheets.readonly']),
        'openidconnect.googleapis.com/*' => Http::response(['email' => 'compta@exemple.com']),
        'oauth2.googleapis.com/revoke' => Http::response([]),
    ]);

    $this->actingAs($this->user)->get('/google/callback?code=abc&state=mauvais')->assertSessionHas('warning');
    expect(GoogleConnection::count())->toBe(0);

    $this->actingAs($this->user)
        ->withSession(['google_oauth_state' => $query['state']])
        ->get('/google/callback?code=abc&state='.$query['state'])
        ->assertRedirect('/sheets')
        ->assertSessionHas('success');

    $connection = GoogleConnection::sole();
    expect($connection->google_email)->toBe('compta@exemple.com')
        ->and($connection->refresh_token)->toBe('r1')
        ->and($connection->getRawOriginal('access_token'))->not->toBe('a1');

    $this->actingAs($this->user)->delete('/google')->assertRedirect('/sheets');
    expect(GoogleConnection::count())->toBe(0);
});

it('relit chaque matin les onglets en synchronisation automatique', function () {
    Http::fake(['sheets.googleapis.com/*' => Http::response(SheetFixture::valuesResponse())]);
    $this->source->imports()->create(['status' => SheetImport::STATUS_READY, 'proposals' => []]);

    $this->artisan('sheets:sync')->assertSuccessful();

    expect($this->source->imports()->count())->toBe(1)
        ->and($this->source->imports()->first()->status)->toBe(SheetImport::STATUS_READY)
        ->and($this->source->imports()->first()->proposals)->toHaveCount(6);
});

it('affiche les pages Google Sheets', function () {
    Http::fake([
        'sheets.googleapis.com/v4/spreadsheets/*/values/*' => Http::response(SheetFixture::valuesResponse()),
        'sheets.googleapis.com/v4/spreadsheets/*' => Http::response([
            'properties' => ['title' => 'Comptabilité'],
            'sheets' => [['properties' => ['title' => 'COMPTA', 'gridProperties' => ['rowCount' => 1000, 'columnCount' => 26]]]],
        ]),
    ]);

    $this->actingAs($this->user)->get('/sheets')->assertInertia(fn ($page) => $page
        ->component('sheets/index')
        ->where('connection.email', 'compta@exemple.com')
        ->has('sources', 1));

    $this->actingAs($this->user)
        ->get('/sheets/relier?lien='.urlencode('https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0').'&onglet=COMPTA')
        ->assertInertia(fn ($page) => $page
            ->component('sheets/create')
            ->where('spreadsheet.title', 'Comptabilité')
            ->where('preview.header_row', 1)
            ->where('preview.columns.revenue', 4)
            ->where('error', null));

    $import = $this->source->imports()->create(['status' => SheetImport::STATUS_READY, 'proposals' => readFixture($this->source)['proposals']]);

    $this->actingAs($this->user)->get("/sheets/lectures/{$import->id}")->assertInertia(fn ($page) => $page
        ->component('sheets/import')
        ->has('import.proposals', 6)
        ->has('agencies', 2));

    $this->actingAs($this->user)->get('/rapports')->assertInertia(fn ($page) => $page->where('sheetImportsToCheck.0.rows', 6));
});

it('renvoie vers le Sheet pour corriger un rapport importé', function () {
    $import = $this->source->imports()->create(['status' => SheetImport::STATUS_READY, 'proposals' => readFixture($this->source)['proposals']]);
    $this->actingAs($this->user)->post("/sheets/lectures/{$import->id}", ['rows' => [
        ['row' => 9, 'period_start' => '2026-10-05', 'period_end' => '2026-10-11', 'agency_id' => $this->agency1->id, 'status' => 'counted'],
    ]]);

    $report = Report::where('source', Report::SOURCE_SHEET)->sole();

    $this->actingAs($this->user)->from('/rapports')->get("/rapports/{$report->id}/modifier")
        ->assertRedirect('/rapports')
        ->assertSessionHas('warning');
});

it('importe une ligne de pub seule comme pub partagée du pays, une seule fois', function () {
    $import = $this->source->imports()->create(['status' => SheetImport::STATUS_READY, 'proposals' => readFixture($this->source)['proposals']]);

    $this->actingAs($this->user)->post("/sheets/lectures/{$import->id}", ['rows' => [
        ['row' => 4, 'period_start' => '2026-07-24', 'period_end' => '2026-07-24', 'agency_id' => null, 'status' => 'counted'],
    ]])->assertSessionHasNoErrors();

    $adSpend = AdSpend::where('sheet_source_id', $this->source->id)->sole();
    expect($adSpend)->agency_id->toBeNull()->amount->toBe(6500)->report_id->toBeNull()
        ->and(Report::where('sheet_source_id', $this->source->id)->count())->toBe(0);

    $again = readFixture($this->source->fresh());
    expect(collect($again['proposals'])->pluck('row')->all())->not->toContain(4);
});

it('corrige une année tapée par erreur et le signale', function () {
    $rows = SheetFixture::rows();
    $rows[2][0] = '03/07/29';

    $proposal = (new SheetRowReader)->read($this->source, $rows, CarbonImmutable::parse('2026-10-19'))['proposals'][0];

    expect($proposal['period_start'])->toBe('2026-07-03')
        ->and($proposal['warnings'])->toContain('Année 2029 lue comme 2026 : vérifiez la date.');
});
