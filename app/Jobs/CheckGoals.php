<?php

namespace App\Jobs;

use App\Models\Merchant;
use App\Services\Push\SikaNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Looks again at the merchant's goals after new figures, so Sika can announce a goal just reached.
 */
class CheckGoals implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $merchantId) {}

    public function handle(SikaNotifier $notifier): void
    {
        $merchant = Merchant::find($this->merchantId);

        if ($merchant !== null) {
            $notifier->checkGoals($merchant);
        }
    }
}
