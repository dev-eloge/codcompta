<?php

use App\Models\User;

it('dit clairement qu\'aucun compte n\'existe avec cet email', function () {
    $this->post('/login', ['email' => 'inconnu@exemple.com', 'password' => 'password'])
        ->assertSessionHasErrors(['email' => 'Aucun compte n\'existe avec cet email. Vérifiez l\'adresse ou créez un compte.'])
        ->assertSessionDoesntHaveErrors('password');

    $this->assertGuest();
});

it('signale un mot de passe incorrect sur le bon champ', function () {
    $user = User::factory()->create();

    $this->post('/login', ['email' => $user->email, 'password' => 'mauvais'])
        ->assertSessionHasErrors(['password' => 'Le mot de passe est incorrect.'])
        ->assertSessionDoesntHaveErrors('email');

    $this->assertGuest();
});
