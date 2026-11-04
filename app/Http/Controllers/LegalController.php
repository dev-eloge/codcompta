<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Public legal pages: who publishes CODCompta, how personal data is handled, and the terms of use.
 */
class LegalController extends Controller
{
    public function notice(): Response
    {
        return $this->page('legal/notice');
    }

    public function privacy(): Response
    {
        return $this->page('legal/privacy');
    }

    public function terms(): Response
    {
        return $this->page('legal/terms');
    }

    private function page(string $component): Response
    {
        return Inertia::render($component, [
            'legal' => array_map(fn ($value) => filled($value) ? $value : null, config('codcompta.legal')),
            'appUrl' => config('app.url'),
        ]);
    }
}
