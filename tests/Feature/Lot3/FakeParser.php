<?php

namespace Tests\Feature\Lot3;

use App\Models\Agency;
use App\Services\Parsing\MessageParser;
use App\Services\Parsing\MessageParsingException;

/**
 * Stands in for the Claude API in tests: returns a prepared answer.
 */
class FakeParser implements MessageParser
{
    public int $calls = 0;

    /**
     * @param  array{reports: list<array<string, mixed>>, warnings: list<string>}|string  $answer  a string makes the reading fail with that reason
     */
    public function __construct(public array|string $answer) {}

    public function parse(Agency $agency, string $body, string $receivedOn): array
    {
        $this->calls++;

        if (is_string($this->answer)) {
            throw new MessageParsingException($this->answer);
        }

        return $this->answer;
    }
}
