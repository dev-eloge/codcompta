<?php

namespace App\Providers;

use App\Services\Parsing\ClaudeMessageParser;
use App\Services\Parsing\MessageParser;
use App\Services\Sheets\GoogleClient;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
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
        // Behind the HTTPS proxy, every generated link (assets, Google callback) must use https.
        if (str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
