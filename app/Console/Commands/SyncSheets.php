<?php

namespace App\Console\Commands;

use App\Jobs\ReadSheet;
use App\Models\SheetImport;
use App\Models\SheetSource;
use Illuminate\Console\Command;

/**
 * Reads every linked tab set to sync on its own, so new rows wait for the merchant's check each morning.
 */
class SyncSheets extends Command
{
    /**
     * @var string
     */
    protected $signature = 'sheets:sync';

    /**
     * @var string
     */
    protected $description = 'Relit les onglets Google Sheets reliés et prépare les nouvelles lignes à vérifier';

    public function handle(): int
    {
        $sources = SheetSource::query()
            ->where('auto_sync', true)
            ->whereHas('merchant.googleConnection')
            ->get();

        foreach ($sources as $source) {
            // A reading still waiting for a check is replaced by a fresher one.
            $source->imports()->whereIn('status', [SheetImport::STATUS_READY, SheetImport::STATUS_PENDING, SheetImport::STATUS_FAILED])->delete();

            ReadSheet::dispatch($source->imports()->create(['status' => SheetImport::STATUS_PENDING]));
        }

        $this->info("{$sources->count()} onglet(s) en cours de lecture.");

        return self::SUCCESS;
    }
}
