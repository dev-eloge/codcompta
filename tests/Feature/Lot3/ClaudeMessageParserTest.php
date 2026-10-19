<?php

use App\Models\Agency;
use App\Services\Parsing\ClaudeMessageParser;
use App\Services\Parsing\MessageParsingException;
use Database\Seeders\DemoWeekSeeder;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->agency = Agency::where('name', 'Agence 1')->firstOrFail();
});

it('envoie le message et le catalogue à Claude et lit la réponse structurée', function () {
    Http::fake(['api.anthropic.com/*' => Http::response([
        'content' => [[
            'type' => 'tool_use',
            'name' => 'enregistrer_rapports',
            'input' => ['reports' => [['period_start' => '2026-10-18', 'period_end' => '2026-10-18', 'kind' => 'day', 'lines' => [['label' => 'PRODUIT 1', 'quantity' => 2, 'amount' => 25000]]]], 'warnings' => []],
        ]],
    ])]);

    $result = (new ClaudeMessageParser('test-key', 'claude-sonnet-5-5'))
        ->parse($this->agency, "RAPPORT DU 18/10\nPRODUIT 1 x2 = 25 000", '2026-10-19');

    expect($result['reports'][0]['lines'][0]['amount'])->toBe(25000);

    Http::assertSent(fn (Request $request) => $request->hasHeader('x-api-key', 'test-key')
        && $request['tool_choice'] === ['type' => 'tool', 'name' => 'enregistrer_rapports']
        && str_contains($request['messages'][0]['content'], 'Produit 1')
        && str_contains($request['messages'][0]['content'], 'PRODUIT 1 x2 = 25 000')
        && str_contains($request['system'], 'reversements'));
});

it('explique en français une clé manquante ou refusée', function () {
    expect(fn () => (new ClaudeMessageParser(null, 'claude-sonnet-5-5'))->parse($this->agency, 'Rapport', '2026-10-19'))
        ->toThrow(MessageParsingException::class, 'ANTHROPIC_API_KEY');

    Http::fake(['api.anthropic.com/*' => Http::response(['error' => ['type' => 'authentication_error']], 401)]);

    expect(fn () => (new ClaudeMessageParser('bad', 'claude-sonnet-5-5'))->parse($this->agency, 'Rapport', '2026-10-19'))
        ->toThrow(MessageParsingException::class, 'refusée');
});

it('explique en français un compte sans crédit', function () {
    Http::fake(['api.anthropic.com/*' => Http::response(['type' => 'error', 'error' => ['type' => 'invalid_request_error', 'message' => 'Your credit balance is too low to access the Anthropic API.']], 400)]);

    expect(fn () => (new ClaudeMessageParser('cle', 'claude-sonnet-5-5'))->parse($this->agency, 'Rapport', '2026-10-19'))
        ->toThrow(MessageParsingException::class, "n'a plus de crédit");
});
