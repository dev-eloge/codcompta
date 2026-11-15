<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * How a merchant cuts the net profit into named parts (RG-03), and the amount of each part.
 *
 * A split has 2 to 5 parts, each with a name and a whole percentage; the percentages make 100.
 */
final class ProfitSplit
{
    public const MIN_PARTS = 2;

    public const MAX_PARTS = 5;

    public const NAME_MAX = 30;

    /**
     * The ready-made rules offered as a starting point.
     *
     * @var array<string, list<array{name: string, percent: int}>>
     */
    public const PRESETS = [
        '40-20-40' => [
            ['name' => 'Épargne', 'percent' => 40],
            ['name' => 'Votre poche', 'percent' => 20],
            ['name' => 'À réinvestir', 'percent' => 40],
        ],
        '50-30-20' => [
            ['name' => 'Épargne', 'percent' => 50],
            ['name' => 'Votre poche', 'percent' => 30],
            ['name' => 'À réinvestir', 'percent' => 20],
        ],
    ];

    /**
     * @param  list<array{name: string, percent: int}>  $parts
     */
    public function __construct(public readonly array $parts)
    {
        $count = count($parts);

        if ($count < self::MIN_PARTS || $count > self::MAX_PARTS) {
            throw new InvalidArgumentException('Le partage doit avoir de 2 à 5 parts.');
        }

        if (array_sum(array_column($parts, 'percent')) !== 100) {
            throw new InvalidArgumentException('Les parts de répartition doivent faire 100 %.');
        }
    }

    public static function default(): self
    {
        return new self(self::PRESETS['40-20-40']);
    }

    /**
     * The preset this split matches, or null for the merchant's own rule.
     */
    public function preset(): ?string
    {
        foreach (self::PRESETS as $key => $parts) {
            if ($parts === $this->parts) {
                return $key;
            }
        }

        return null;
    }

    /**
     * Each part with its amount. Rounding is settled on the biggest part, so the parts always add up to the profit.
     *
     * @return list<array{name: string, percent: int, amount: int}>
     */
    public function of(int $profit): array
    {
        $rows = array_map(fn (array $part) => [
            'name' => $part['name'],
            'percent' => $part['percent'],
            'amount' => (int) round($profit * $part['percent'] / 100),
        ], $this->parts);

        $gap = $profit - array_sum(array_column($rows, 'amount'));

        if ($gap !== 0) {
            $biggest = array_keys(array_column($rows, 'percent'), max(array_column($rows, 'percent')))[0];
            $rows[$biggest]['amount'] += $gap;
        }

        return $rows;
    }
}
