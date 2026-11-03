<?php

namespace App\Services\Push;

use App\Jobs\SendPushNotification;
use App\Models\FinancialGoal;
use App\Models\Merchant;
use App\Services\GoalTracker;

/**
 * What Sika says on the phone: a new goal, a goal reached, a goal that ended short.
 */
class SikaNotifier
{
    public function __construct(private readonly GoalTracker $tracker) {}

    public function goalCreated(FinancialGoal $goal): void
    {
        $progress = collect($this->tracker->all($goal->merchant))->firstWhere('id', $goal->id);

        if ($progress === null) {
            return;
        }

        $this->send($goal->merchant, [
            'title' => 'Sika : nouvel objectif noté 🎯',
            'body' => sprintf(
                '« %s » : %s F %s, %s. Je vous préviens dès qu\'il est atteint.',
                $progress['title'],
                self::money($progress['target']),
                self::metricText($progress['metric']),
                $progress['label'],
            ),
            'tag' => 'goal-'.$goal->id,
        ]);
    }

    /**
     * Announces, once each, the goals that were just reached or that ended short.
     */
    public function checkGoals(Merchant $merchant): void
    {
        $goals = $merchant->financialGoals()->get()->keyBy('id');

        foreach ($this->tracker->current($merchant) as $progress) {
            $goal = $goals->get($progress['id']);

            if ($goal === null) {
                continue;
            }

            if ($progress['status'] === 'reached' && $goal->reached_notified_at === null) {
                $goal->forceFill(['reached_notified_at' => now(), 'missed_notified_at' => now()])->save();
                $this->send($merchant, [
                    'title' => 'Objectif atteint ! 🎉',
                    'body' => sprintf(
                        'Bravo ! « %s » : %s F %s sur %s F visés. Sika danse pour vous.',
                        $progress['title'],
                        self::money($progress['achieved']),
                        self::metricText($progress['metric']),
                        self::money($progress['target']),
                    ),
                    'tag' => 'goal-'.$goal->id,
                ]);
            }

            if ($progress['status'] === 'missed' && $goal->missed_notified_at === null) {
                $goal->forceFill(['missed_notified_at' => now()])->save();
                $this->send($merchant, [
                    'title' => 'Objectif non atteint',
                    'body' => sprintf(
                        '« %s » est terminé : %s F sur %s F, il a manqué %s F. On se fixe le prochain ?',
                        $progress['title'],
                        self::money(max(0, $progress['achieved'])),
                        self::money($progress['target']),
                        self::money($progress['remaining']),
                    ),
                    'tag' => 'goal-'.$goal->id,
                ]);
            }
        }
    }

    /**
     * @param  array{title: string, body: string, tag?: string, url?: string}  $message
     */
    public function send(Merchant $merchant, array $message): void
    {
        $hasDevices = $merchant->users()->whereHas('pushSubscriptions')->exists();

        if ($hasDevices) {
            SendPushNotification::dispatch($merchant->id, $message + ['url' => route('goals.index', absolute: false)]);
        }
    }

    public static function money(int $amount): string
    {
        return number_format($amount, 0, ',', ' ');
    }

    private static function metricText(string $metric): string
    {
        return $metric === 'revenue' ? 'de chiffre d\'affaires' : 'de bénéfice net';
    }
}
