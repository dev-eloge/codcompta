<?php

namespace App\Services\Parsing;

use App\Models\Agency;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Reads agency messages with the Claude API and returns the reports it finds (BF-08).
 *
 * The model is forced to answer through a tool, so the answer is always structured JSON.
 */
class ClaudeMessageParser implements MessageParser
{
    private const ENDPOINT = 'https://api.anthropic.com/v1/messages';

    private const TOOL = 'enregistrer_rapports';

    public function __construct(
        private readonly ?string $apiKey,
        private readonly string $model,
        private readonly int $timeout = 90,
    ) {}

    public function parse(Agency $agency, string $body, string $receivedOn): array
    {
        if (blank($this->apiKey)) {
            throw new MessageParsingException('La lecture automatique n\'est pas encore activée : ajoutez ANTHROPIC_API_KEY dans le fichier .env.');
        }

        try {
            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
                'anthropic-version' => '2023-06-01',
            ])
                ->timeout($this->timeout)
                ->retry(2, 2000, throw: false)
                ->post(self::ENDPOINT, [
                    'model' => $this->model,
                    'max_tokens' => 8000,
                    'system' => $this->systemPrompt(),
                    'tools' => [$this->tool()],
                    'tool_choice' => ['type' => 'tool', 'name' => self::TOOL],
                    'messages' => [
                        ['role' => 'user', 'content' => $this->userPrompt($agency, $body, $receivedOn)],
                    ],
                ]);
        } catch (ConnectionException) {
            throw new MessageParsingException('Le service de lecture ne répond pas. Réessayez dans quelques minutes.');
        }

        if ($response->failed()) {
            Log::warning('Claude message parsing failed', ['status' => $response->status(), 'body' => $response->json('error')]);

            throw new MessageParsingException(match ($response->status()) {
                401, 403 => 'La clé ANTHROPIC_API_KEY est refusée. Vérifiez-la dans le fichier .env.',
                429, 529 => 'Le service de lecture est saturé. Réessayez dans quelques minutes.',
                default => 'Le message n\'a pas pu être lu (erreur '.$response->status().'). Réessayez.',
            });
        }

        $input = collect($response->json('content', []))
            ->firstWhere('type', 'tool_use')['input'] ?? null;

        if (! is_array($input)) {
            throw new MessageParsingException('La lecture n\'a rien donné d\'exploitable. Vérifiez le message ou saisissez le rapport à la main.');
        }

        return [
            'reports' => is_array($input['reports'] ?? null) ? array_values($input['reports']) : [],
            'warnings' => is_array($input['warnings'] ?? null) ? array_values($input['warnings']) : [],
        ];
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
        Tu es l'assistant comptable d'un e-commerçant africain qui vend en paiement à la livraison.
        Ses agences de livraison lui envoient des rapports sur WhatsApp, chacune dans son propre style.
        Ta seule tâche : extraire fidèlement les rapports contenus dans le message collé, sans rien inventer.

        Règles :
        - Un rapport = une période. Un rapport quotidien a la même date de début et de fin.
          Un récapitulatif de semaine couvre toute la période qu'il annonce.
        - Les dates sont au format AAAA-MM-JJ. Si l'année manque, prends celle de la date de réception,
          sauf si la date tomberait alors après la date de réception : prends l'année précédente.
        - Une ligne = un produit livré : le nom tel que l'agence l'écrit (label), la quantité livrée
          et le montant encaissé auprès des clients pour ce produit (prix de vente total, pas le prix unitaire).
          Si l'agence donne « 4 × 12 500 », la quantité est 4 et le montant 50 000.
          Si un même produit est vendu à deux prix, fais deux lignes.
        - product_id : l'identifiant du catalogue seulement si tu es sûr du produit, sinon null.
        - delivery_fees : frais de livraison de l'agence, y compris les frais d'expédition vers une autre ville.
        - closing_fees : frais de closing, de confirmation d'appels ou de crédit téléphonique.
        - other_fees : tout autre frais déduit par l'agence (emballage, retour…). En cas de doute, mets-le ici et explique-le dans note.
        - announced_total : le total des ventes que l'agence annonce elle-même, sinon null. Ne le calcule pas.
        - Les reversements, versements, dépôts ou montants « restants » envoyés au commerçant ne sont PAS des ventes :
          ne les mets dans aucune ligne ; tu peux les citer dans note.
        - Les commandes annulées, reportées ou refusées ne sont pas des ventes. Le stock restant n'est pas une vente.
        - kind : "day" pour un rapport d'un jour, "recap" pour un récapitulatif qui reprend plusieurs jours.
        - Tous les montants sont des nombres entiers en francs CFA, sans espace ni symbole.
        - Si une information est illisible ou ambiguë, ajoute une phrase courte en français dans warnings.
        - Si le message ne contient aucun rapport, renvoie une liste reports vide et explique pourquoi dans warnings.
        PROMPT;
    }

    private function userPrompt(Agency $agency, string $body, string $receivedOn): string
    {
        $matcher = new ProductMatcher($agency);
        $aliases = collect($matcher->aliases())->groupBy(fn (int $productId) => $productId, preserveKeys: true);

        $catalogue = $matcher->products()
            ->map(function ($product) use ($aliases) {
                $names = collect($aliases->get($product->id, []))->keys()->implode(', ');

                return "- [{$product->id}] {$product->name}".($names !== '' ? " (l'agence écrit aussi : {$names})" : '');
            })
            ->implode("\n");

        return <<<TEXT
        Agence : {$agency->name} ({$agency->country->name})
        Date de réception du message : {$receivedOn}

        Catalogue des produits :
        {$catalogue}

        Message de l'agence :
        <message>
        {$body}
        </message>
        TEXT;
    }

    /**
     * @return array<string, mixed>
     */
    private function tool(): array
    {
        $money = ['type' => ['integer', 'null']];

        return [
            'name' => self::TOOL,
            'description' => 'Enregistre les rapports d\'agence trouvés dans le message.',
            'input_schema' => [
                'type' => 'object',
                'required' => ['reports', 'warnings'],
                'properties' => [
                    'reports' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'required' => ['period_start', 'period_end', 'kind', 'lines'],
                            'properties' => [
                                'period_start' => ['type' => 'string', 'description' => 'AAAA-MM-JJ'],
                                'period_end' => ['type' => 'string', 'description' => 'AAAA-MM-JJ'],
                                'kind' => ['type' => 'string', 'enum' => ['day', 'recap']],
                                'lines' => [
                                    'type' => 'array',
                                    'items' => [
                                        'type' => 'object',
                                        'required' => ['label', 'quantity', 'amount'],
                                        'properties' => [
                                            'label' => ['type' => 'string'],
                                            'product_id' => ['type' => ['integer', 'null']],
                                            'quantity' => ['type' => 'integer'],
                                            'amount' => ['type' => 'integer'],
                                        ],
                                    ],
                                ],
                                'delivery_fees' => $money,
                                'closing_fees' => $money,
                                'other_fees' => $money,
                                'announced_total' => $money,
                                'note' => ['type' => ['string', 'null']],
                                'warnings' => ['type' => 'array', 'items' => ['type' => 'string']],
                            ],
                        ],
                    ],
                    'warnings' => ['type' => 'array', 'items' => ['type' => 'string']],
                ],
            ],
        ];
    }
}
