<?php

use App\Services\AdSpendAllocator;

it('partage la pub au prorata du chiffre d\'affaires (RG-05)', function () {
    $shares = (new AdSpendAllocator)->allocate(150000, [570000, 80000]);

    expect($shares)->toBe([131538, 18462]);
});

it('donne le reste du partage à la dernière agence pour garder le total exact', function () {
    $shares = (new AdSpendAllocator)->allocate(100, [1, 1, 1]);

    expect($shares)->toBe([33, 33, 34])
        ->and(array_sum($shares))->toBe(100);
});

it('partage à parts égales quand aucune agence n\'a de chiffre d\'affaires', function () {
    expect((new AdSpendAllocator)->allocate(10000, [0, 0]))->toBe([5000, 5000]);
});

it('ne renvoie rien quand il n\'y a aucune agence', function () {
    expect((new AdSpendAllocator)->allocate(10000, []))->toBe([]);
});
