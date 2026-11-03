<?php

namespace App\Jobs;

use App\Models\PushSubscription;
use App\Services\Push\WebPush;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Delivers one Sika message to every phone or computer of the merchant's team.
 */
class SendPushNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    /**
     * @param  array{title: string, body: string, url: string, tag?: string}  $message
     */
    public function __construct(public int $merchantId, public array $message) {}

    public function handle(WebPush $webPush): void
    {
        PushSubscription::query()
            ->whereHas('user', fn ($query) => $query->where('merchant_id', $this->merchantId))
            ->each(fn (PushSubscription $subscription) => $webPush->send($subscription, $this->message));
    }
}
