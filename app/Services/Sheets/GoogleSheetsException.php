<?php

namespace App\Services\Sheets;

use RuntimeException;

/**
 * Raised when Google refuses a request. The message is shown to the merchant, in French.
 */
class GoogleSheetsException extends RuntimeException
{
    public function __construct(string $message, public readonly bool $needsReconnect = false)
    {
        parent::__construct($message);
    }
}
