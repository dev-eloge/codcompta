<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Push\WebPush;
use Illuminate\Console\Command;

/**
 * Checks Sika's notifications from the server: keys, devices of a user, and what each push service answers.
 */
class TestPushNotifications extends Command
{
    /**
     * @var string
     */
    protected $signature = 'codcompta:notifications-essai {email : Adresse email du compte à tester}';

    /**
     * @var string
     */
    protected $description = 'Envoie une notification de test à tous les appareils d\'un compte et affiche la réponse de chaque service';

    public function handle(WebPush $webPush): int
    {
        if (! $webPush->isConfigured()) {
            $this->error('Les clés VAPID ne sont pas dans le fichier .env. Lancez php artisan codcompta:vapid, copiez les deux lignes, puis redémarrez l\'application.');

            return self::FAILURE;
        }

        $this->line('Clés VAPID : présentes. Contact : '.$webPush->subject());

        if (! str_starts_with($webPush->subject(), 'mailto:') && ! str_starts_with($webPush->subject(), 'https://')) {
            $this->warn('VAPID_SUBJECT doit commencer par mailto: ou https:// (Apple refuse sinon).');
        }

        $user = User::where('email', $this->argument('email'))->first();

        if ($user === null) {
            $this->error('Aucun compte avec cette adresse email.');

            return self::FAILURE;
        }

        $subscriptions = $user->pushSubscriptions()->get();

        if ($subscriptions->isEmpty()) {
            $this->warn('Ce compte n\'a activé les notifications sur aucun appareil. Ouvrez « Mes objectifs » sur le téléphone et touchez « Activer les notifications ».');

            return self::FAILURE;
        }

        $delivered = 0;

        foreach ($subscriptions as $subscription) {
            $result = $webPush->deliver($subscription, [
                'title' => 'Essai de Sika',
                'body' => 'Si vous lisez ceci, les notifications marchent sur cet appareil.',
                'url' => route('goals.index', absolute: false),
                'tag' => 'sika-test',
            ]);

            $device = ($subscription->device ?: 'Appareil').' ('.parse_url($subscription->endpoint, PHP_URL_HOST).')';

            if ($result['ok']) {
                $delivered++;
                $this->info("Envoyé : {$device}, réponse {$result['status']}");

                continue;
            }

            $this->error("Refusé : {$device}, réponse ".($result['status'] ?? 'aucune').($result['reason'] ? " : {$result['reason']}" : ''));

            if (in_array($result['status'], [401, 403], true)) {
                $this->line('  Les clés ont changé depuis l\'activation : sur cet appareil, désactivez puis réactivez les notifications.');
            }
        }

        $this->newLine();
        $this->line("{$delivered} appareil(s) sur {$subscriptions->count()} ont accepté la notification.");

        return $delivered > 0 ? self::SUCCESS : self::FAILURE;
    }
}
