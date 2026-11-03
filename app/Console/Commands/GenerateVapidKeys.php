<?php

namespace App\Console\Commands;

use App\Services\Push\WebPush;
use Illuminate\Console\Command;

/**
 * Prints a new pair of keys for Sika's notifications, to paste into the .env file once.
 */
class GenerateVapidKeys extends Command
{
    /**
     * @var string
     */
    protected $signature = 'codcompta:vapid';

    /**
     * @var string
     */
    protected $description = 'Crée les clés des notifications Sika (à copier dans le fichier .env)';

    public function handle(): int
    {
        $keys = WebPush::generateKeys();

        $this->line('Copiez ces deux lignes dans votre fichier .env (une seule fois, puis gardez-les) :');
        $this->newLine();
        $this->line('VAPID_PUBLIC_KEY='.$keys['public']);
        $this->line('VAPID_PRIVATE_KEY='.$keys['private']);
        $this->newLine();
        $this->warn('Si vous changez ces clés plus tard, chaque utilisateur devra réactiver les notifications.');

        return self::SUCCESS;
    }
}
