<?php

namespace App\Services;

use App\Models\ExchangeRate;
use App\Models\Merchant;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * The currency a merchant reads the reports in, and its rate in francs CFA.
 *
 * Reports are stored in francs CFA; only the display is converted.
 * The franc CFA is pegged to the euro: 1 € = 655,957 F CFA, for the West and Central African francs alike.
 * The US dollar moves: its rate is fetched several times a day and kept with its date.
 * A merchant can replace either rate with their own, for example the rate of their money changer.
 */
class DisplayCurrency
{
    public const EUR = 'EUR';

    public const USD = 'USD';

    public const CURRENCIES = [self::EUR, self::USD];

    public const EUR_RATE = 655.957;

    /** Where a rate comes from. */
    public const SOURCE_OFFICIAL = 'official';

    public const SOURCE_AUTO = 'auto';

    public const SOURCE_OWN = 'own';

    /**
     * What the reports page needs to convert, or null when the merchant reads francs CFA.
     *
     * @return array{code: string, rate: float, source: string, rate_date: string|null, updated_at: string|null, stale: bool}|null
     */
    public function forMerchant(Merchant $merchant): ?array
    {
        $code = $merchant->display_currency;

        if (! in_array($code, self::CURRENCIES, true)) {
            return null;
        }

        return $this->rateFor($merchant, $code);
    }

    /**
     * The rate the merchant uses for this currency: their own, or else the automatic one.
     *
     * @return array{code: string, rate: float, source: string, rate_date: string|null, updated_at: string|null, stale: bool}|null
     */
    public function rateFor(Merchant $merchant, string $code): ?array
    {
        $own = $this->ownRate($merchant, $code);

        if ($own !== null) {
            return ['code' => $code, 'rate' => $own, 'source' => self::SOURCE_OWN, 'rate_date' => null, 'updated_at' => null, 'stale' => false];
        }

        return $this->automatic($code, $merchant->timezone ?? 'UTC');
    }

    /**
     * The automatic rate: the fixed euro peg, or the latest dollar rate fetched ("stale" when not today's).
     *
     * @return array{code: string, rate: float, source: string, rate_date: string|null, updated_at: string|null, stale: bool}|null
     */
    public function automatic(string $code, string $timezone = 'UTC'): ?array
    {
        if ($code === self::EUR) {
            return ['code' => self::EUR, 'rate' => self::EUR_RATE, 'source' => self::SOURCE_OFFICIAL, 'rate_date' => null, 'updated_at' => null, 'stale' => false];
        }

        $latest = ExchangeRate::query()->where('currency', self::USD)->latest('rate_date')->first();

        if ($latest === null) {
            return null;
        }

        return [
            'code' => self::USD,
            'rate' => $latest->rate,
            'source' => self::SOURCE_AUTO,
            'rate_date' => $latest->rate_date->toDateString(),
            'updated_at' => $latest->updated_at?->toIso8601String(),
            'stale' => $latest->rate_date->toDateString() < now($timezone)->toDateString(),
        ];
    }

    public function ownRate(Merchant $merchant, string $code): ?float
    {
        $rate = $merchant->custom_rates[$code] ?? null;

        return is_numeric($rate) && $rate > 0 ? (float) $rate : null;
    }

    /**
     * Makes sure a dollar rate exists before the dollar is shown: fetches one when none was ever stored.
     */
    public function ensureDollar(): void
    {
        if (! ExchangeRate::query()->where('currency', self::USD)->exists()) {
            $this->refreshDollar();
        }
    }

    /**
     * Fetches the current euro to dollar rate (European Central Bank, through Frankfurter) and stores
     * the dollar in francs CFA through the fixed euro peg. Returns the stored rate, or null on failure.
     */
    public function refreshDollar(): ?ExchangeRate
    {
        try {
            $response = Http::timeout(8)->retry(2, 500, throw: false)->get('https://api.frankfurter.app/latest', ['from' => 'EUR', 'to' => 'USD']);
        } catch (Throwable) {
            return null;
        }

        $usdPerEur = (float) $response->json('rates.USD');

        if (! $response->successful() || $usdPerEur <= 0) {
            return null;
        }

        $rate = ExchangeRate::updateOrCreate(
            ['currency' => self::USD, 'rate_date' => now()->toDateString()],
            ['rate' => round(self::EUR_RATE / $usdPerEur, 4), 'source' => 'BCE ('.$response->json('date').')'],
        );
        // A refresh with the same figure still says when the rate was last checked.
        $rate->touch();

        return $rate;
    }
}
