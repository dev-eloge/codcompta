<?php

namespace Tests\Feature\Lot5;

/**
 * A tab laid out like a real merchant accounting sheet (fictional figures):
 * month title rows, daily and weekly rows, agency in the label, total rows, an unknown agency.
 */
class SheetFixture
{
    public const HEADERS = [
        'DATE', 'NBRE DE PRODUITS LIVRES', "COUT D'ACHAT DU PRODUIT", 'PRIX DU PRODUIT', "CHIFFRES D'AFFAIRES",
        'FRAIS DE PUBLICITE', 'FRAIS DE CLOSING& CREDIT', 'FRAIS DE LIVRAISON', 'BENEFICE NET',
        'NET A VERSER SUR LE COMPTE EPARGNE', 'NET A VERSER SUR LE COMPTE DE POCHE', 'REINVESTISSEMENT', 'MARGE', 'AUTRES FRAIS',
    ];

    /**
     * @return list<list<mixed>>
     */
    public static function rows(int $agency1Revenue = 60000): array
    {
        return [
            self::HEADERS,
            ['MOIS DE JUILLET'],
            ['03/07/26', 4, 2000, 12000, 48000, 10000, '', 12000, 24000, 9600, 4800, 9600, 0.5],
            ['24/07/26', '', '', '', '', 6500, '', '', -6500, -2600, -1300, -2600],
            ['Mois D\'OCTOBRE'],
            ['Du 28 au 04- Agence 2', 10, 15000, '', 100000, 30000, '', 20000, 35000, 14000, 7000, 14000, 0.35],
            ['Du 28 au 04- Total', 10, 15000, '', 100000, 30000, '', 20000, 35000, 14000, 7000, 14000, 0.35],
            [],
            ['Du 05 au 11- Agence 1', 5, 2500, '', $agency1Revenue, 10000, 1000, 10000, $agency1Revenue - 23500, 0, 0, 0, 0.6],
            ['Du 05 au 11- Agence 9', 1, 500, '', 9000, '', '', 2000, 6500],
            ['Du 12 au 18- Agence 1', 2, 1000, '', 25000, 5000, '', 6000, 13000],
            ['BILAN TOTAL MOIS D\'OCTOBRE', 18, 21000, '', 242000, 51000, 1000, 50000, 119000],
        ];
    }

    /**
     * The Sheets API answer for those rows.
     *
     * @return array<string, mixed>
     */
    public static function valuesResponse(int $agency1Revenue = 60000): array
    {
        return ['range' => "'COMPTA'!A1:Z5000", 'majorDimension' => 'ROWS', 'values' => self::rows($agency1Revenue)];
    }
}
