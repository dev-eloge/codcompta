<?php

namespace App\Console\Commands;

use App\Services\DisplayCurrency;
use Illuminate\Console\Command;

class RefreshDollarRate extends Command
{
    /**
     * @var string
     */
    protected $signature = 'codcompta:taux-dollar';

    /**
     * @var string
     */
    protected $description = 'Récupère le taux du dollar du jour, en francs CFA';

    public function handle(DisplayCurrency $currency): int
    {
        $rate = $currency->refreshDollar();

        if ($rate === null) {
            $this->warn('Taux du dollar indisponible : le dernier taux connu reste utilisé.');

            return self::FAILURE;
        }

        $this->info('1 $ = '.number_format($rate->rate, 2, ',', ' ').' F CFA ('.$rate->source.').');

        return self::SUCCESS;
    }
}
