<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateTeamRequest;
use App\Models\Closer;
use App\Models\Country;
use App\Models\Courier;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    /**
     * Who delivers the orders of a country, and the merchant's own couriers, closers and monthly costs.
     */
    public function edit(Request $request, Country $country): Response
    {
        $this->ensureOwned($request, $country->merchant_id);

        $member = fn (Courier|Closer $person) => [
            'id' => $person->id,
            'name' => $person->name,
            'pay_mode' => $person->pay_mode,
            'pay_amount' => $person->pay_amount,
        ];

        return Inertia::render('reference/team', [
            'country' => [
                'id' => $country->id,
                'name' => $country->name,
                'delivery_mode' => $country->delivery_mode,
                'bike_rent' => $country->bike_rent,
                'phone_credit' => $country->phone_credit,
                'storage_rent' => $country->storage_rent,
            ],
            'couriers' => $country->couriers()->orderBy('id')->get()->map($member)->values(),
            'closers' => $country->closers()->orderBy('id')->get()->map($member)->values(),
        ]);
    }

    public function update(UpdateTeamRequest $request, Country $country): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($country, $data) {
            $country->update([
                'delivery_mode' => $data['delivery_mode'],
                'bike_rent' => (int) ($data['bike_rent'] ?? 0),
                'phone_credit' => (int) ($data['phone_credit'] ?? 0),
                'storage_rent' => (int) ($data['storage_rent'] ?? 0),
            ]);

            $this->sync($country->couriers(), $data['couriers'] ?? []);
            $this->sync($country->closers(), $data['closers'] ?? []);

            // The team reports like an agency: it needs its own line in the country.
            if ($country->hasOwnTeam() && ! $country->ownTeam()->exists()) {
                $country->agencies()->create(['name' => 'Mon équipe', 'is_own_team' => true]);
            }
        });

        return to_route('reference.team.edit', $country)->with('success', "Équipe de livraison de {$country->name} enregistrée.");
    }

    /**
     * Updates the members kept, adds the new ones and removes those taken off the list.
     * Their past reports keep their name and amounts.
     *
     * @param  HasMany<Courier, Country>|HasMany<Closer, Country>  $members
     * @param  list<array{id?: int|null, name: string, pay_mode: string, pay_amount: int}>  $rows
     */
    private function sync(HasMany $members, array $rows): void
    {
        $kept = [];

        foreach ($rows as $row) {
            $fields = ['name' => $row['name'], 'pay_mode' => $row['pay_mode'], 'pay_amount' => $row['pay_amount']];
            $existing = isset($row['id']) ? (clone $members)->find($row['id']) : null;

            if ($existing) {
                $existing->update($fields);
                $kept[] = $existing->id;

                continue;
            }

            $kept[] = $members->create($fields)->id;
        }

        (clone $members)->whereNotIn('id', $kept)->delete();
    }

    /**
     * Closes, for good, the Mes rapports card that says a merchant can declare their own delivery team.
     */
    public function dismissTip(Request $request): RedirectResponse
    {
        $this->merchantOf($request)->update(['delivery_tip_dismissed_at' => now()]);

        return back();
    }
}
