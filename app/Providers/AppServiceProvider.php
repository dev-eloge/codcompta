<?php

namespace App\Providers;

use App\Models\User;
use App\Services\Google\GoogleClient;
use App\Services\Parsing\ClaudeMessageParser;
use App\Services\Parsing\MessageParser;
use App\Services\Push\WebPush;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(WebPush::class, fn () => new WebPush(
            publicKey: config('services.webpush.public_key'),
            privateKey: config('services.webpush.private_key'),
            subject: (string) config('services.webpush.subject'),
        ));

        $this->app->bind(MessageParser::class, fn () => new ClaudeMessageParser(
            apiKey: config('services.anthropic.key'),
            model: config('services.anthropic.model'),
            timeout: config('services.anthropic.timeout'),
        ));

        $this->app->bind(GoogleClient::class, fn () => new GoogleClient(
            clientId: config('services.google.client_id'),
            clientSecret: config('services.google.client_secret'),
            redirectUri: config('services.google.redirect') ?: url('/google/callback'),
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The platform owner's area. A super admin consulting a merchant's account is that merchant meanwhile.
        Gate::define('access-admin', fn (User $user): bool => (bool) $user->is_super_admin);

        // Behind the HTTPS proxy, every generated link (assets, Google callback) must use https.
        if (str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }

        // The "forgot password" email, in French and with the user's name.
        ResetPassword::toMailUsing(function (object $notifiable, string $token) {
            $url = url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], false));

            $minutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

            return (new MailMessage)
                ->subject('Réinitialisation de votre mot de passe CODCompta')
                ->greeting('Bonjour '.$notifiable->name.',')
                ->line('Vous avez demandé à changer le mot de passe de votre compte CODCompta.')
                ->action('Choisir un nouveau mot de passe', $url)
                ->line("Ce lien est valable {$minutes} minutes et ne sert qu'une fois.")
                ->line("Si vous n'avez rien demandé, ignorez cet email : votre mot de passe reste inchangé.")
                ->salutation("À bientôt,\nL'équipe CODCompta");
        });
    }
}
