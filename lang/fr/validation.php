<?php

/*
 * French validation messages for the rules used by CODCompta (login, sign-up, settings, forms).
 * Forms that need a more precise wording define their own messages.
 */
return [
    'accepted' => 'Ce champ doit être accepté.',
    'after_or_equal' => 'La date doit être le même jour ou après :date.',
    'array' => 'Ce champ est invalide.',
    'boolean' => 'Ce champ doit être vrai ou faux.',
    'confirmed' => 'La confirmation ne correspond pas.',
    'current_password' => 'Le mot de passe actuel est incorrect.',
    'date' => 'Entrez une date valide.',
    'distinct' => 'Cette valeur apparaît deux fois.',
    'email' => 'Entrez une adresse email valide.',
    'exists' => 'Cette valeur n\'existe pas.',
    'in' => 'Cette valeur n\'est pas acceptée.',
    'integer' => 'Entrez un nombre entier.',
    'lowercase' => 'Écrivez l\'adresse en minuscules.',
    'max' => [
        'numeric' => 'La valeur ne doit pas dépasser :max.',
        'string' => 'Pas plus de :max caractères.',
        'array' => 'Pas plus de :max éléments.',
    ],
    'min' => [
        'numeric' => 'La valeur doit être d\'au moins :min.',
        'string' => 'Au moins :min caractères.',
        'array' => 'Au moins :min élément(s).',
    ],
    'numeric' => 'Entrez un nombre.',
    'password' => [
        'letters' => 'Le mot de passe doit contenir au moins une lettre.',
        'mixed' => 'Le mot de passe doit contenir une majuscule et une minuscule.',
        'numbers' => 'Le mot de passe doit contenir au moins un chiffre.',
        'symbols' => 'Le mot de passe doit contenir au moins un symbole.',
        'uncompromised' => 'Ce mot de passe est apparu dans une fuite de données : choisissez-en un autre.',
    ],
    'required' => 'Ce champ est obligatoire.',
    'size' => [
        'string' => 'Ce champ doit faire :size caractères.',
    ],
    'string' => 'Ce champ doit être du texte.',
    'unique' => 'Cette valeur est déjà utilisée.',
    'url' => 'Entrez une adresse web valide.',

    'custom' => [
        'email' => [
            'unique' => 'Un compte existe déjà avec cet email. Connectez-vous ou utilisez « Mot de passe oublié ».',
        ],
        'password' => [
            'min' => 'Le mot de passe doit faire au moins :min caractères.',
        ],
    ],

    'attributes' => [
        'name' => 'nom',
        'email' => 'email',
        'password' => 'mot de passe',
    ],
];
