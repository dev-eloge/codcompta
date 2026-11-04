<?php

use Inertia\Testing\AssertableInertia as Assert;

it('affiche les pages légales sans connexion, avec les informations de l\'éditeur', function (string $url, string $component) {
    config(['codcompta.legal.publisher' => 'Ma Société', 'codcompta.legal.email' => 'contact@exemple.com', 'codcompta.legal.phone' => '']);

    $this->get($url)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component($component)
            ->where('legal.publisher', 'Ma Société')
            ->where('legal.email', 'contact@exemple.com')
            ->where('legal.phone', null)
        );
})->with([
    ['/mentions-legales', 'legal/notice'],
    ['/confidentialite', 'legal/privacy'],
    ['/conditions', 'legal/terms'],
]);
