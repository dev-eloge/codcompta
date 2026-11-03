<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

it('envoie un email de réinitialisation en français au nom de l\'utilisateur', function () {
    Notification::fake();
    $user = User::factory()->create(['name' => 'Awa Mensah', 'email' => 'awa@exemple.com']);

    $this->post('/forgot-password', ['email' => 'awa@exemple.com'])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('status', 'Lien envoyé ! Ouvrez votre boîte mail (pensez aux spams) : le lien est valable 60 minutes.');

    Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
        $mail = $notification->toMail($user);

        expect($mail->subject)->toBe('Réinitialisation de votre mot de passe CODCompta')
            ->and($mail->greeting)->toBe('Bonjour Awa Mensah,')
            ->and($mail->actionText)->toBe('Choisir un nouveau mot de passe')
            ->and($mail->actionUrl)->toContain('/reset-password/'.$notification->token)
            ->and($mail->actionUrl)->toContain('email=awa%40exemple.com')
            ->and(implode(' ', array_merge($mail->introLines, $mail->outroLines)))->toContain('60 minutes');

        $html = (string) $mail->render();
        expect($html)->toContain('Compta')->toContain('#0f8a6c')->not->toContain('Laravel');

        return true;
    });
});

it('dit clairement qu\'aucun compte n\'existe avec cet email', function () {
    Notification::fake();

    $this->post('/forgot-password', ['email' => 'inconnu@exemple.com'])
        ->assertSessionHasErrors(['email' => 'Aucun compte n\'existe avec cet email. Vérifiez l\'adresse ou créez un compte.']);

    Notification::assertNothingSent();
});

it('n\'envoie pas deux liens d\'affilée', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email])->assertSessionHasNoErrors();
    $this->post('/forgot-password', ['email' => $user->email])->assertSessionHasErrors('email');

    Notification::assertSentToTimes($user, ResetPassword::class, 1);
});

it('change le mot de passe avec le lien puis renvoie vers la connexion', function () {
    Notification::fake();
    $user = User::factory()->create();
    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
        $this->post('/reset-password', [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'NouveauMotDePasse2026',
            'password_confirmation' => 'NouveauMotDePasse2026',
        ])->assertRedirect('/login')->assertSessionHas('status', 'Mot de passe changé. Connectez-vous avec le nouveau.');

        return true;
    });

    $this->post('/login', ['email' => $user->email, 'password' => 'NouveauMotDePasse2026'])->assertRedirect();
    $this->assertAuthenticated();
});

it('refuse un lien périmé avec un message clair', function () {
    $user = User::factory()->create();

    $this->post('/reset-password', [
        'token' => 'faux-jeton',
        'email' => $user->email,
        'password' => 'NouveauMotDePasse2026',
        'password_confirmation' => 'NouveauMotDePasse2026',
    ])->assertSessionHasErrors(['email' => 'Ce lien n\'est plus valable (il a expiré ou a déjà servi). Demandez-en un nouveau.']);
});

it('affiche les erreurs de formulaire en français', function () {
    User::factory()->create(['email' => 'pris@exemple.com']);

    $this->post('/register', ['name' => '', 'email' => 'pris@exemple.com', 'password' => 'court', 'password_confirmation' => 'autre'])
        ->assertSessionHasErrors([
            'name' => 'Ce champ est obligatoire.',
            'email' => 'Un compte existe déjà avec cet email. Connectez-vous ou utilisez « Mot de passe oublié ».',
            'password' => 'La confirmation ne correspond pas.',
        ]);
});
