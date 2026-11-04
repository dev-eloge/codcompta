<?php

return [

    /*
    | Link of the explainer video shown on the welcome page (YouTube, Vimeo or a .mp4 file).
    | Leave empty to hide the demo section.
    */
    'demo_video_url' => env('DEMO_VIDEO_URL'),

    /*
    | Who publishes CODCompta, shown on the legal pages (mentions légales, confidentialité, conditions).
    | Empty values are simply not shown.
    */
    'legal' => [
        'publisher' => env('LEGAL_PUBLISHER', 'CODCompta'),
        'responsible' => env('LEGAL_RESPONSIBLE'),
        'registration' => env('LEGAL_REGISTRATION'),
        'address' => env('LEGAL_ADDRESS'),
        'email' => env('LEGAL_EMAIL', env('MAIL_FROM_ADDRESS')),
        'phone' => env('LEGAL_PHONE'),
        'host' => env('LEGAL_HOST'),
        'host_address' => env('LEGAL_HOST_ADDRESS'),
        'jurisdiction' => env('LEGAL_JURISDICTION', 'Lomé (Togo)'),
        'updated_on' => '2026-11-04',
    ],

];
