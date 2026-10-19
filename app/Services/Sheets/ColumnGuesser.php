<?php

namespace App\Services\Sheets;

use Illuminate\Support\Str;

/**
 * Finds the header row of a tab and guesses what each column holds, from its title.
 */
class ColumnGuesser
{
    /**
     * Checked in this order: "frais de livraison" must be read as a fee before "livrés" is tried.
     *
     * @var array<string, string>
     */
    private const PATTERNS = [
        'label' => '/\b(date|dates|periode|jour|semaine)\b/',
        'delivery_fees' => '/(frais|cout).*(livraison|exped)|^livraison$/',
        'closing_fees' => '/closing|credit|appel/',
        'ad_spend' => '/\bpub|publicit|\bads\b|facebook|meta|tiktok/',
        'purchase_cost' => '/achat/',
        'revenue' => '/chiffre|\bca\b|\bventes?\b|recette|encaiss/',
        'delivered' => '/livr|quantit|\bqte\b|\bnbre?\b/',
        'other_fees' => '/autres?\s+frais|divers/',
        'profit' => '/benefice|resultat/',
    ];

    public static function normalize(mixed $text): string
    {
        return trim((string) preg_replace('/\s+/', ' ', Str::lower(Str::ascii((string) $text))));
    }

    /**
     * The first row (among the first 15) that looks like column titles. Returns a 1-based row number.
     *
     * @param  list<list<mixed>>  $rows
     */
    public function headerRow(array $rows): int
    {
        foreach (array_slice($rows, 0, 15) as $index => $row) {
            $matches = count(array_filter($this->guess($row)));

            if ($matches >= 3) {
                return $index + 1;
            }
        }

        return 1;
    }

    /**
     * @param  list<mixed>  $headers
     * @return array<string, int|null> field => zero-based column index
     */
    public function guess(array $headers): array
    {
        $columns = array_fill_keys(array_keys(self::PATTERNS), null);
        $taken = [];

        foreach (self::PATTERNS as $field => $pattern) {
            foreach ($headers as $index => $header) {
                $text = self::normalize($header);

                if ($text === '' || isset($taken[$index]) || preg_match('/prix|epargne|poche|reinvest|marge/', $text)) {
                    continue;
                }

                if (preg_match($pattern, $text)) {
                    $columns[$field] = $index;
                    $taken[$index] = true;

                    break;
                }
            }
        }

        // The first column usually holds the dates when no title says so.
        if ($columns['label'] === null && ! isset($taken[0]) && $headers !== []) {
            $columns['label'] = 0;
        }

        return $columns;
    }
}
