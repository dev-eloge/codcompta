<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * Grants or removes the super admin role (platform owner) for an existing account.
 */
class SuperAdmin extends Command
{
    /**
     * @var string
     */
    protected $signature = 'codcompta:super-admin {email : Email du compte} {--retirer : Retire le rôle au lieu de le donner}';

    /**
     * @var string
     */
    protected $description = 'Donne (ou retire) le rôle de super admin à un compte existant';

    public function handle(): int
    {
        $user = User::where('email', mb_strtolower((string) $this->argument('email')))->first();

        if ($user === null) {
            $this->error('Aucun compte avec cet email. Inscrivez-vous d\'abord sur la plateforme.');

            return self::FAILURE;
        }

        $user->forceFill(['is_super_admin' => ! $this->option('retirer')])->save();

        $this->info($user->is_super_admin
            ? "{$user->email} est maintenant super admin. Le menu « Administration » apparaît dans la barre latérale."
            : "{$user->email} n'est plus super admin.");

        return self::SUCCESS;
    }
}
