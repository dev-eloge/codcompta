<?php

use App\Jobs\SendPushNotification;
use App\Models\Merchant;
use App\Models\PushSubscription;
use App\Models\Report;
use App\Models\User;
use App\Services\Push\WebPush;
use Database\Seeders\DemoWeekSeeder;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->merchant = Merchant::where('name', 'Boutique Démo')->firstOrFail();
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
    // The demo week ends on Sunday 18 October; the reports were typed that evening.
    Report::query()->update(['created_at' => '2026-10-18 19:00:00']);

    $keys = WebPush::generateKeys();
    config(['services.webpush.public_key' => $keys['public'], 'services.webpush.private_key' => $keys['private']]);

    PushSubscription::create([
        'user_id' => $this->user->id,
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/rappel',
        'endpoint_hash' => PushSubscription::hashOf('https://fcm.googleapis.com/fcm/send/rappel'),
        'public_key' => WebPush::generateKeys()['public'],
        'auth_token' => WebPush::encode(random_bytes(16)),
    ]);

    Queue::fake();
});

/** Runs the reminders as the scheduler does, at this Lomé time. */
function remindAt(string $time): void
{
    test()->travelTo($time);
    test()->artisan('codcompta:rappels-rapport')->assertSuccessful();
}

it('rappelle 3 fois dans la journée quand aucun rapport n\'est saisi, une seule fois par heure prévue', function () {
    remindAt('2026-10-19 08:00:00');
    remindAt('2026-10-19 12:05:00');
    remindAt('2026-10-19 12:20:00');
    remindAt('2026-10-19 15:00:00');
    remindAt('2026-10-19 17:00:00');
    remindAt('2026-10-19 20:45:00');
    remindAt('2026-10-19 23:00:00');

    Queue::assertPushed(SendPushNotification::class, 3);
    Queue::assertPushedOn('notifications', SendPushNotification::class);
    Queue::assertPushed(SendPushNotification::class, fn ($job) => $job->message['url'] === '/rapports/saisie' && $job->message['tag'] === 'rappel-rapport');
});

it('ne rappelle plus rien dès qu\'un rapport est saisi dans la journée', function () {
    remindAt('2026-10-19 12:00:00');

    Report::query()->latest('id')->first()->replicate()->fill(['period_start' => '2026-10-19', 'period_end' => '2026-10-19'])->save();

    remindAt('2026-10-19 17:00:00');
    remindAt('2026-10-19 20:30:00');

    Queue::assertPushed(SendPushNotification::class, 1);
});

it('dit depuis combien de jours aucun rapport n\'a été saisi', function () {
    remindAt('2026-10-22 12:00:00');

    Queue::assertPushed(SendPushNotification::class, fn ($job) => $job->message['title'] === 'Ça fait 4 jours sans rapport'
        && str_contains($job->message['body'], '18 octobre'));
});

it('suit l\'heure du pays du commerçant', function () {
    $this->merchant->update(['timezone' => 'Africa/Porto-Novo']);

    // 11:30 in Lomé is 12:30 in Porto-Novo.
    remindAt('2026-10-19 11:30:00');

    Queue::assertPushed(SendPushNotification::class, 1);
});

it('se tait quand le commerçant a coupé les rappels', function () {
    $this->actingAs($this->user)->put('/notifications/rappels', ['report_reminders' => false])->assertRedirect();

    remindAt('2026-10-19 12:00:00');

    Queue::assertNothingPushed();
    expect($this->merchant->fresh()->report_reminders)->toBeFalse();
});

it('ne rappelle personne qui n\'a pas activé les notifications', function () {
    PushSubscription::query()->delete();

    remindAt('2026-10-19 12:00:00');

    Queue::assertNothingPushed();
});
