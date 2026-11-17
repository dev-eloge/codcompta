<?php

namespace App\Services\Push;

use App\Models\Merchant;
use App\Models\Report;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

/**
 * Sika's reminders when the merchant has typed no report today: at noon, 5 pm and 8:30 pm, merchant's local time.
 *
 * Each reminder goes once per day, and stops as soon as a report is saved. After several days without
 * any report, the reminder says how long it has been.
 */
class ReportReminders
{
    /**
     * Local time of each reminder, with its words and the page a tap opens.
     *
     * @var array<string, array{at: string, title: string, body: string, url: string}>
     */
    public const SLOTS = [
        'midi' => [
            'at' => '12:00',
            'title' => 'Pas encore de rapport aujourd\'hui',
            'body' => 'Saisissez les livraisons du jour en une minute pour suivre votre bénéfice.',
            'url' => '/rapports/saisie',
        ],
        'soir' => [
            'at' => '17:00',
            'title' => 'Rappel : le rapport du jour',
            'body' => 'Vos agences ont livré aujourd\'hui ? Collez leur message WhatsApp ou saisissez les chiffres.',
            'url' => '/messages/coller',
        ],
        'dernier' => [
            'at' => '20:30',
            'title' => 'Dernier rappel de la journée',
            'body' => 'Sans rapport aujourd\'hui, votre bénéfice du jour reste vide. Il est encore temps.',
            'url' => '/rapports/saisie',
        ],
    ];

    /** A reminder still goes this long after its time, if the scheduler ran late. */
    private const GRACE_MINUTES = 59;

    /** From this many days without a report, the reminder says how long it has been. */
    public const LONG_GAP_DAYS = 2;

    public function __construct(private readonly SikaNotifier $notifier) {}

    /**
     * Sends the reminders that are due now. Returns how many were sent.
     */
    public function sendDue(?CarbonImmutable $now = null): int
    {
        $sent = 0;

        Merchant::query()
            ->where('report_reminders', true)
            ->whereNull('suspended_at')
            ->whereHas('users.pushSubscriptions')
            ->whereHas('countries.agencies')
            ->each(function (Merchant $merchant) use ($now, &$sent) {
                $sent += (int) $this->remind($merchant, $now ?? CarbonImmutable::now());
            });

        return $sent;
    }

    /**
     * Sends this merchant's reminder if one is due and no report was typed today.
     */
    public function remind(Merchant $merchant, CarbonImmutable $now): bool
    {
        $local = $now->setTimezone($merchant->timezone ?: 'Africa/Lome');
        $slot = $this->dueSlot($local);

        if ($slot === null || $this->typedToday($merchant, $local)) {
            return false;
        }

        // Once per slot and per day, even if the scheduler runs every few minutes.
        if (! Cache::add("rappel-rapport:{$merchant->id}:{$local->toDateString()}:{$slot}", true, now()->addDay())) {
            return false;
        }

        $this->notifier->send($merchant, $this->message($merchant, $slot, $local));

        return true;
    }

    public function dueSlot(CarbonImmutable $local): ?string
    {
        foreach (self::SLOTS as $key => $slot) {
            $start = $local->setTimeFromTimeString($slot['at']);

            if ($local->gte($start) && $local->lt($start->addMinutes(self::GRACE_MINUTES + 1))) {
                return $key;
            }
        }

        return null;
    }

    /**
     * A report saved today, or covering today, counts: the merchant has done the day's work.
     */
    private function typedToday(Merchant $merchant, CarbonImmutable $local): bool
    {
        $startOfDay = $local->startOfDay()->utc();

        return Report::query()
            ->whereHas('agency.country', fn ($query) => $query->where('merchant_id', $merchant->id))
            ->where(fn ($query) => $query
                ->where('created_at', '>=', $startOfDay)
                ->orWhereDate('period_end', '>=', $local->toDateString()))
            ->exists();
    }

    /**
     * @return array{title: string, body: string, url: string, tag: string}
     */
    private function message(Merchant $merchant, string $slot, CarbonImmutable $local): array
    {
        $last = Report::query()
            ->whereHas('agency.country', fn ($query) => $query->where('merchant_id', $merchant->id))
            ->max('period_end');

        $message = self::SLOTS[$slot];
        $days = $last ? (int) CarbonImmutable::parse($last, $local->timezone)->startOfDay()->diffInDays($local->startOfDay()) : null;

        if ($days !== null && $days >= self::LONG_GAP_DAYS) {
            $message['title'] = "Ça fait {$days} jours sans rapport";
            $message['body'] = 'Votre dernier rapport date du '.CarbonImmutable::parse($last)->locale('fr')->isoFormat('D MMMM')
                .'. Rattrapez les jours manquants pour garder des chiffres justes.';
        }

        return [
            'title' => $message['title'],
            'body' => $message['body'],
            'url' => $message['url'],
            // One reminder replaces the previous one on the phone, instead of piling up.
            'tag' => 'rappel-rapport',
        ];
    }
}
