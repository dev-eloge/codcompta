<?php

namespace App\Services;

use App\Models\ExchangeRate;
use App\Models\Merchant;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * The second currency a merchant can read the reports in, and its rate in francs CFA.
 *
 * The franc CFA is pegged to the euro: 1 € = 655,957 F CFA, for the West and Central African francs alike.
 * The US dollar moves every day: its rate is fetched each morning and kept with its date.
 */
class DisplayCurrency
{
    public const EUR = 'EUR';

    public const USD = 'USD';

    public const CURRENCIES = [self::EUR, self::USD];

    public const EUR_RATE = 655.957;

    /**
     * What the reports page needs to convert, or null when the merchant reads francs CFA only.
     *
     * @return array{code: string, rate: float, rate_date: string|null, stale: bool}|null
     */
    public function forMerchant(Merchant $merchant): ?array
    {
        return match ($merchant->display_currency) {
            self::EUR => ['code' => self::EUR, 'rate' => self::EUR_RATE, 'rate_date' => null, 'stale' => false],
            self::USD => $this->dollar($merchant->timezone),
            default => null,
        };
    }

    /**
     * The latest known dollar rate; "stale" when it is not today's.
     *
     * @return array{code: string, rate: float, rate_date: string, stale: bool}|null
     */
    public function dollar(string $timezone = 'UTC'): ?array
    {
        $latest = ExchangeRate::query()->where('currency', self::USD)->latest('rate_date')->first();

        if ($latest === null) {
            return null;
        }

        return [
            'code' => self::USD,
            'rate' => $latest->rate,
            'rate_date' => $latest->rate_date->toDateString(),
            'stale' => $latest->rate_date->toDateString() < now($timezone)->toDateString(),
        ];
    }

    /**
     * Fetches today's euro to dollar rate (European Central Bank, through Frankfurter) and stores
     * the dollar in francs CFA through the fixed euro peg. Returns the stored rate, or null on failure.
     */
    public function refreshDollar(): ?ExchangeRate
    {
        try {
            $response = Http::timeout(15)->retry(2, 1000)->get('https://api.frankfurter.app/latest', ['from' => 'EUR', 'to' => 'USD']);
        } catch (Throwable) {
            return null;
        }

        $usdPerEur = (float) $response->json('rates.USD');

        if (! $response->successful() || $usdPerEur <= 0) {
            return null;
        }

        return ExchangeRate::updateOrCreate(
            ['currency' => self::USD, 'rate_date' => now()->toDateString()],
            ['rate' => round(self::EUR_RATE / $usdPerEur, 4), 'source' => 'BCE ('.$response->json('date').')'],
        );
    }
}
