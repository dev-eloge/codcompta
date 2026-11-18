import { AdFields, ChoiceCard } from '@/components/report-form/fields';
import { type AdEntry, emptyAd, type SentAd, type SharedAd, sharedAdText, toNumber } from '@/components/report-form/use-report-form';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

/** What this report pays for the ad of a product: nothing when it shares an ad noted by another agency. */
export function adCostOf(entry: AdEntry, shared: SharedAd | undefined, noAds: boolean): number {
    if (noAds || (shared && entry.choice === 'same')) {
        return 0;
    }

    return entry.platform === 'facebook_tiktok' ? toNumber(entry.facebook_amount) + toNumber(entry.tiktok_amount) : toNumber(entry.amount);
}

/** The ads as the server receives them, in the order of the products (an error "ads.2.amount" finds its field). */
export function buildAds(
    productIds: string[],
    ads: Record<string, AdEntry>,
    noAds: boolean,
    sharedAdOf: (productId: string) => SharedAd | undefined,
): SentAd[] {
    if (noAds) {
        return [];
    }

    return productIds.flatMap((productId): SentAd[] => {
        const entry = ads[productId] ?? emptyAd;
        const shared = sharedAdOf(productId) !== undefined;

        if (shared && entry.choice === 'same') {
            return [{ product_id: productId, choice: 'same' }];
        }

        if (entry.platform === '') {
            return shared ? [{ product_id: productId, choice: 'separate', platform: '' }] : [];
        }

        const both = entry.platform === 'facebook_tiktok';

        return [
            {
                product_id: productId,
                choice: shared ? 'separate' : null,
                platform: entry.platform,
                amount: both ? null : entry.amount,
                facebook_amount: both ? entry.facebook_amount : null,
                tiktok_amount: both ? entry.tiktok_amount : null,
                orders_received: entry.orders_received,
            },
        ];
    });
}

/**
 * The ad of each product of a report: where it ran and what it cost. Used where a report is checked
 * before saving, for example after reading an agency's WhatsApp message.
 */
export function ProductAds({
    idPrefix,
    productIds,
    productName,
    ads,
    onChange,
    noAds,
    onNoAds,
    sharedAdOf,
    errorFor,
}: {
    /** Keeps field ids unique when several reports are on the same page. */
    idPrefix: string;
    productIds: string[];
    productName: (productId: string) => string;
    ads: Record<string, AdEntry>;
    onChange: (productId: string, changes: Partial<AdEntry>) => void;
    noAds: boolean;
    onNoAds: (value: boolean) => void;
    sharedAdOf: (productId: string) => SharedAd | undefined;
    errorFor: (productId: string, field: string) => string | undefined;
}) {
    return (
        <fieldset className="space-y-3">
            <legend className="mb-1 text-[15px] font-bold">Publicité de ces jours</legend>

            {productIds.length === 0 ? (
                <p className="text-muted-foreground text-sm">Choisissez d'abord les produits des lignes.</p>
            ) : (
                !noAds &&
                productIds.map((productId) => {
                    const entry = ads[productId] ?? emptyAd;
                    const shared = sharedAdOf(productId);
                    const showFields = !shared || entry.choice === 'separate';

                    return (
                        <div key={productId} className={cn('flex flex-col gap-3 rounded-2xl border p-4', shared && 'bg-muted/60')}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-[15px] font-bold">{productName(productId)}</h4>
                                {shared && (
                                    <span className="badge-info inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold">
                                        <Info className="size-3.5" aria-hidden="true" />
                                        Pub déjà notée
                                    </span>
                                )}
                            </div>

                            {shared && (
                                <fieldset className="flex flex-col gap-2">
                                    <legend className="mb-2 text-sm">
                                        <span className="font-semibold tabular-nums">{sharedAdText(shared)}</span>
                                        {shared.noted_by ? `, dans le rapport d'${shared.noted_by}.` : '.'}
                                    </legend>
                                    <ChoiceCard
                                        name={`${idPrefix}-ad-choice-${productId}`}
                                        checked={entry.choice === 'same'}
                                        onSelect={() => onChange(productId, { choice: 'same' })}
                                        title="Même pub pour les deux agences"
                                        help={`${formatFcfa(shared.amount)} partagés selon les livraisons.`}
                                    />
                                    <ChoiceCard
                                        name={`${idPrefix}-ad-choice-${productId}`}
                                        checked={entry.choice === 'separate'}
                                        onSelect={() => onChange(productId, { choice: 'separate' })}
                                        title="Une pub à part pour cette agence"
                                        help="Notez son montant ici."
                                    />
                                </fieldset>
                            )}

                            {showFields && (
                                <AdFields
                                    productId={`${idPrefix}-${productId}`}
                                    entry={entry}
                                    cost={adCostOf(entry, shared, false)}
                                    error={(field) => errorFor(productId, field)}
                                    onChange={(changes) => onChange(productId, changes)}
                                />
                            )}
                        </div>
                    );
                })
            )}

            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-[15px] font-semibold">
                <input type="checkbox" className="accent-primary size-5" checked={noAds} onChange={(e) => onNoAds(e.target.checked)} />
                Pas de publicité pour ces produits
            </label>
        </fieldset>
    );
}
