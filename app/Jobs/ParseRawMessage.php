<?php

namespace App\Jobs;

use App\Models\RawMessage;
use App\Services\Parsing\MessageParser;
use App\Services\Parsing\MessageParsingException;
use App\Services\Parsing\ProposalNormalizer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Reads a pasted agency message in the background and stores the proposed reports (BF-08).
 */
class ParseRawMessage implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 180;

    public function __construct(public RawMessage $message) {}

    public function handle(MessageParser $parser, ProposalNormalizer $normalizer): void
    {
        $message = $this->message->loadMissing('agency.country.merchant');
        $agency = $message->agency;
        $receivedOn = ($message->received_at ?? $message->created_at)
            ->timezone($agency->country->merchant->timezone)
            ->toDateString();

        try {
            $proposals = $normalizer->normalize($agency, $parser->parse($agency, $message->body, $receivedOn));
        } catch (MessageParsingException $exception) {
            $this->fail($message, $exception->getMessage());

            return;
        } catch (Throwable $exception) {
            Log::error('Agency message parsing crashed', ['raw_message_id' => $message->id, 'exception' => $exception]);
            $this->fail($message, 'Une erreur inattendue a empêché la lecture. Réessayez ou saisissez le rapport à la main.');

            return;
        }

        $message->update([
            'status' => RawMessage::STATUS_PARSED,
            'parsed' => $proposals,
            'parsed_at' => now(),
            'error' => null,
        ]);
    }

    private function fail(RawMessage $message, string $reason): void
    {
        $message->update([
            'status' => RawMessage::STATUS_FAILED,
            'error' => $reason,
        ]);
    }
}
