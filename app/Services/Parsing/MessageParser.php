<?php

namespace App\Services\Parsing;

use App\Models\Agency;

interface MessageParser
{
    /**
     * Read an agency message and propose the reports it contains.
     *
     * The returned array has the shape
     * ['reports' => list<array<string, mixed>>, 'warnings' => list<string>]
     * where each report holds period_start, period_end, lines (label, product_id,
     * quantity, amount), delivery_fees, closing_fees, other_fees, announced_total,
     * note and warnings. Values are raw: ProposalNormalizer cleans them.
     *
     * @return array{reports: list<array<string, mixed>>, warnings: list<string>}
     *
     * @throws MessageParsingException
     */
    public function parse(Agency $agency, string $body, string $receivedOn): array;
}
