<?php

namespace App\Services\Parsing;

use RuntimeException;

/**
 * Raised when a message cannot be read. The message is shown to the merchant, in French.
 */
class MessageParsingException extends RuntimeException {}
