<?php

namespace App\Services\Google;

use RuntimeException;

/**
 * Raised when Google refuses a sign-in. The message is shown to the person, in French.
 */
class GoogleException extends RuntimeException {}
