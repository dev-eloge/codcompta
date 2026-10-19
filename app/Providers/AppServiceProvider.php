<?php

namespace App\Providers;

use App\Services\Parsing\ClaudeMessageParser;
use App\Services\Parsing\MessageParser;
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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
