<?php

use App\Models\Agency;
use App\Models\Merchant;
use App\Models\ProductAlias;
use App\Models\RawMessage;
use App\Models\Report;
use App\Models\User;
use App\Services\Parsing\MessageParser;
use Database\Seeders\DemoWeekSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Lot3\FakeParser;

/**
 * The demo week of Agence 1 (12–18/10) as the reader should return it, product names as the agency writes them.
 */
function agency1WeekAnswer(): array
{
    $days = [
        ['2026-10-12', 15000, 80000, [['PRODUIT 3', 3, 30000], ['PRODUIT 2', 4, 50000]]],
        ['2026-10-13', 25000, 120000, [['PRODUIT 3', 5, 50000], ['PRODUIT 1', 1, 12000], ['PRODUIT 2', 4, 58000]]],
        ['2026-10-14', 30000, 150000, [['PRODUIT 1', 4, 48000], ['PRODUIT 3', 7, 72000], ['PRODUIT 2', 2, 30000]]],
        ['2026-10-15', 16000, 85000, [['PRODUIT 3', 1, 10000], ['PRODUIT 1', 6, 75000]]],
        ['2026-10-16', 10000, 50000, [['PRODUIT 1', 4, 50000]]],
        ['2026-10-17', 12000, 60000, [['PRODUIT 1', 3, 38000], ['PRODUIT 4', 2, 22000]]],
        ['2026-10-18', 6000, 25000, [['PRODUIT 1', 2, 25000]]],
    ];

    return [
        'reports' => array_map(fn (array $day) => [
            'period_start' => $day[0],
            'period_end' => $day[0],
            'kind' => 'day',
            'delivery_fees' => $day[1],
            'announced_total' => $day[2],
            'lines' => array_map(fn (array $line) => ['label' => $line[0], 'product_id' => null, 'quantity' => $line[1], 'amount' => $line[2]], $day[3]),
            'note' => 'Reversement de 50 000 F non compté',
        ], $days),
        'warnings' => [],
    ];
}

function useFakeParser(array|string $answer): FakeParser
{
    $fake = new FakeParser($answer);
    app()->instance(MessageParser::class, $fake);

    return $fake;
}

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->merchant = Merchant::where('name', 'Boutique Démo')->firstOrFail();
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
    $this->agency1 = Agency::where('name', 'Agence 1')->firstOrFail();

    // Agence 1's week has not been entered yet: it will come from the pasted messages.
    Report::where('agency_id', $this->agency1->id)->each(fn (Report $report) => $report->delete());
});

it('affiche la page pour coller un message', function () {
    $this->actingAs($this->user)
        ->get('/messages/coller')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('messages/create')
            ->has('agencies', 2)
            ->has('recent', 0)
        );
});

it('lit le message collé et propose les rapports avec les bons produits', function () {
    useFakeParser(agency1WeekAnswer());

    $response = $this->actingAs($this->user)->post('/messages', [
        'agency_id' => $this->agency1->id,
        'body' => 'RAPPORT DU 12/10/2026 ... (7 rapports collés)',
    ]);

    $message = RawMessage::sole();
    $response->assertRedirect("/messages/{$message->id}");

    expect($message->status)->toBe(RawMessage::STATUS_PARSED)
        ->and($message->proposals())->toHaveCount(7);

    $this->actingAs($this->user)
        ->get("/messages/{$message->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('messages/show')
            ->where('message.status', 'parsed')
            ->has('proposals', 7)
            ->where('proposals.0.period_start', '2026-10-12')
            ->where('proposals.0.suggested_status', 'counted')
            ->where('proposals.0.lines.0.label', 'PRODUIT 3')
            ->where('proposals.0.lines.0.product_id', $this->merchant->products()->where('name', 'Produit 3')->value('id'))
            ->where('proposals.0.recorded', null)
        );
});

it('valide les 7 rapports proposés et retrouve 328 000 F de bénéfice sur la semaine', function () {
    useFakeParser(agency1WeekAnswer());

    $this->actingAs($this->user)->post('/messages', ['agency_id' => $this->agency1->id, 'body' => 'Les 7 rapports de l\'agence du 12 au 18 octobre']);
    $message = RawMessage::sole();

    foreach ($message->proposals() as $proposal) {
        $this->actingAs($this->user)
            ->post('/rapports', [
                'agency_id' => $this->agency1->id,
                'raw_message_id' => $message->id,
                'period_start' => $proposal['period_start'],
                'period_end' => $proposal['period_end'],
                'status' => $proposal['suggested_status'],
                'delivery_fees' => $proposal['delivery_fees'],
                'closing_fees' => $proposal['closing_fees'],
                'other_fees' => $proposal['other_fees'],
                'announced_total' => $proposal['announced_total'],
                'note' => $proposal['note'],
                'lines' => $proposal['lines'],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect("/messages/{$message->id}");
    }

    expect($message->fresh()->status)->toBe(RawMessage::STATUS_VALIDATED)
        ->and(Report::where('raw_message_id', $message->id)->where('source', Report::SOURCE_MESSAGE)->count())->toBe(7)
        ->and((int) Report::where('raw_message_id', $message->id)->get()->sum(fn (Report $report) => $report->revenue()))->toBe(570000);

    $this->actingAs($this->user)
        ->get('/rapports?period=week&date=2026-10-14')
        ->assertInertia(fn (Assert $page) => $page->where('report.total.profit', 328000));
});

it('retient le nom utilisé par l\'agence pour le prochain message', function () {
    useFakeParser(agency1WeekAnswer());
    $this->actingAs($this->user)->post('/messages', ['agency_id' => $this->agency1->id, 'body' => 'Rapport du 12/10 avec le produit 3']);
    $message = RawMessage::sole();
    $product3 = $this->merchant->products()->where('name', 'Produit 3')->value('id');

    $this->actingAs($this->user)->post('/rapports', [
        'agency_id' => $this->agency1->id,
        'raw_message_id' => $message->id,
        'period_start' => '2026-10-12',
        'period_end' => '2026-10-12',
        'status' => 'counted',
        'lines' => [['label' => 'Article bleu', 'product_id' => $product3, 'quantity' => 3, 'amount' => 32500]],
    ])->assertSessionHasNoErrors();

    expect(ProductAlias::where('agency_id', $this->agency1->id)->where('label', 'article bleu')->value('product_id'))->toBe($product3);
});

it('ne relit pas un message déjà collé', function () {
    $fake = useFakeParser(agency1WeekAnswer());
    $body = "RAPPORT DU 14/10/2026\nPRODUIT 1 x4 = 48 000";

    $this->actingAs($this->user)->post('/messages', ['agency_id' => $this->agency1->id, 'body' => $body]);
    $first = RawMessage::sole();

    $this->actingAs($this->user)
        ->post('/messages', ['agency_id' => $this->agency1->id, 'body' => "  rapport du 14/10/2026 \n produit 1 x4 = 48 000 "])
        ->assertRedirect("/messages/{$first->id}")
        ->assertSessionHas('warning');

    expect(RawMessage::count())->toBe(1)->and($fake->calls)->toBe(1);
});

it('propose en « Détail » un rapport sur des jours déjà comptés', function () {
    useFakeParser(agency1WeekAnswer());
    $agency2 = Agency::where('name', 'Agence 2')->firstOrFail();

    $this->actingAs($this->user)->post('/messages', ['agency_id' => $agency2->id, 'body' => 'Récap de la semaine du 12 au 18']);

    $this->actingAs($this->user)
        ->get('/messages/'.RawMessage::sole()->id)
        ->assertInertia(fn (Assert $page) => $page->where('proposals.0.suggested_status', 'detail'));
});

it('affiche la raison quand la lecture échoue et permet de relire', function () {
    useFakeParser('La lecture automatique n\'est pas encore activée : ajoutez ANTHROPIC_API_KEY dans le fichier .env.');

    $this->actingAs($this->user)->post('/messages', ['agency_id' => $this->agency1->id, 'body' => 'RAPPORT DU 18/10/2026 PRODUIT 1 x2']);
    $message = RawMessage::sole();

    expect($message->status)->toBe(RawMessage::STATUS_FAILED)
        ->and($message->error)->toContain('ANTHROPIC_API_KEY');

    useFakeParser(agency1WeekAnswer());

    $this->actingAs($this->user)->post("/messages/{$message->id}/relire")->assertRedirect("/messages/{$message->id}");

    expect($message->fresh()->status)->toBe(RawMessage::STATUS_PARSED);
});

it('refuse de montrer le message d\'un autre commerçant', function () {
    useFakeParser(agency1WeekAnswer());
    $this->actingAs($this->user)->post('/messages', ['agency_id' => $this->agency1->id, 'body' => 'RAPPORT DU 18/10/2026 PRODUIT 1 x2']);

    $stranger = User::factory()->create(['merchant_id' => Merchant::create(['name' => 'Autre boutique'])->id]);

    $this->actingAs($stranger)->get('/messages/'.RawMessage::sole()->id)->assertNotFound();
    $this->actingAs($stranger)
        ->post('/messages', ['agency_id' => $this->agency1->id, 'body' => 'RAPPORT DU 18/10/2026 PRODUIT 1 x2'])
        ->assertSessionHasErrors('agency_id');
});
