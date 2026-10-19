<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users are sent from the dashboard to the reports', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/dashboard')->assertRedirect('/rapports');
});
