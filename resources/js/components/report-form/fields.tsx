import InputError from '@/components/input-error';
import { type AdEntry, type Line, toNumber } from '@/components/report-form/use-report-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type AdPlatform, adPlatformLabels } from '@/lib/ad-platforms';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Check, Minus, Plus } from 'lucide-react';
import { ReactNode } from 'react';

export function StepTitle({ id, step, className, children }: { id: string; step: number; className?: string; children: ReactNode }) {
    return (
        <h2 id={id} className={cn('flex items-center gap-2.5 text-lg font-semibold', className)}>
            <span
                aria-hidden="true"
                className="bg-foreground text-background grid size-7 shrink-0 place-items-center rounded-full text-sm tabular-nums"
            >
                {step}
            </span>
            {children}
        </h2>
    );
}

/**
 * A radio choice shown as a card, with a title and one line of help.
 */
export function ChoiceCard({
    name,
    checked,
    onSelect,
    title,
    help,
}: {
    name: string;
    checked: boolean;
    onSelect: () => void;
    title: string;
    help: string;
}) {
    return (
        <label
            className={cn(
                'bg-card has-[:focus-visible]:ring-ring/50 flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-[15px] has-[:focus-visible]:ring-[3px]',
                checked ? 'border-primary border-2' : 'border-input',
            )}
        >
            <input type="radio" name={name} checked={checked} onChange={onSelect} className="accent-primary mt-0.5 size-5 shrink-0" />
            <span>
                <span className="block font-bold">{title}</span>
                <span className="text-muted-foreground block text-xs">{help}</span>
            </span>
        </label>
    );
}

/** Clears the ad of a product: no platform, no amount. */
const noAd: Partial<AdEntry> = { platform: '', amount: '', facebook_amount: '', tiktok_amount: '', orders_received: '' };

/** Shorter names for the phone buttons, two per row. */
const phonePlatformLabels: Record<AdPlatform, string> = { ...adPlatformLabels, facebook_tiktok: 'Les deux' };

/**
 * Where the ad of one product runs, and only the amounts that this choice needs.
 */
export function AdFields({
    productId,
    entry,
    cost,
    error,
    onChange,
    variant = 'desktop',
    noAdChosen = false,
}: {
    productId: string;
    entry: AdEntry;
    cost: number;
    error: (field: string) => string | undefined;
    onChange: (changes: Partial<AdEntry>) => void;
    /** On phones: two buttons per row, fields one under the other, and a "Pas de pub" button. */
    variant?: 'desktop' | 'phone';
    /** On phones: the merchant said this product had no ad. */
    noAdChosen?: boolean;
}) {
    const both = entry.platform === 'facebook_tiktok';
    const phone = variant === 'phone';
    const field = (name: string) => `ad-${productId}-${name}`;
    const labels = phone ? phonePlatformLabels : adPlatformLabels;
    const options: { value: AdPlatform | 'none'; label: string; checked: boolean }[] = [
        ...(Object.keys(adPlatformLabels) as AdPlatform[]).map((platform) => ({
            value: platform,
            label: labels[platform],
            checked: entry.platform === platform,
        })),
        ...(phone ? [{ value: 'none' as const, label: 'Pas de pub', checked: noAdChosen && entry.platform === '' }] : []),
    ];

    return (
        <>
            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold">Où tourne la pub ?</legend>
                <div className={phone ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}>
                    {options.map(({ value, label, checked }) => (
                        <label
                            key={value}
                            className={cn(
                                'has-[:focus-visible]:ring-ring/50 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors duration-150 has-[:focus-visible]:ring-[3px]',
                                phone && 'min-h-12 justify-center',
                                phone && value === 'none' && options.length % 2 === 1 && 'col-span-2',
                                checked
                                    ? 'border-primary bg-success-bg text-success-fg border-2 font-bold'
                                    : 'border-input bg-card hover:bg-accent border',
                            )}
                        >
                            <input
                                type="radio"
                                name={field('platform')}
                                value={value}
                                checked={checked}
                                onChange={() => onChange(value === 'none' ? noAd : { platform: value })}
                                className="sr-only"
                            />
                            {checked && <Check className="size-4 stroke-[2.8]" aria-hidden="true" />}
                            {label}
                        </label>
                    ))}
                </div>
                <InputError message={error('platform')} />
            </fieldset>

            {entry.platform !== '' && (
                <>
                    <div className={cn('grid items-start gap-3', !phone && 'sm:grid-cols-3')}>
                        {both ? (
                            <>
                                <AdNumberField
                                    id={field('facebook')}
                                    label="Dépensé sur Facebook (F)"
                                    value={entry.facebook_amount}
                                    error={error('facebook_amount')}
                                    onChange={(value) => onChange({ facebook_amount: value })}
                                />
                                <AdNumberField
                                    id={field('tiktok')}
                                    label="Dépensé sur TikTok (F)"
                                    value={entry.tiktok_amount}
                                    error={error('tiktok_amount')}
                                    onChange={(value) => onChange({ tiktok_amount: value })}
                                />
                            </>
                        ) : (
                            <AdNumberField
                                id={field('amount')}
                                label={`Dépensé sur ${entry.platform === 'autre' ? 'la pub' : adPlatformLabels[entry.platform]} (F)`}
                                value={entry.amount}
                                error={error('amount')}
                                onChange={(value) => onChange({ amount: value })}
                            />
                        )}
                        <AdNumberField
                            id={field('orders')}
                            label={both && !phone ? 'Commandes reçues (les deux)' : 'Commandes reçues'}
                            hint={phone ? ' (facultatif)' : undefined}
                            placeholder={phone ? '' : 'Facultatif'}
                            value={entry.orders_received}
                            error={error('orders_received')}
                            onChange={(value) => onChange({ orders_received: value })}
                        />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                        {both && (
                            <p className="text-muted-foreground max-w-xl text-xs">
                                Avec les deux en même temps, on ne sépare pas les commandes : ce produit est suivi comme « Facebook et TikTok » pour
                                ces jours-là.
                            </p>
                        )}
                        {!both && !phone && (
                            <button
                                type="button"
                                onClick={() => onChange(noAd)}
                                className="text-muted-foreground hover:text-foreground min-h-11 cursor-pointer text-sm font-semibold underline underline-offset-4"
                            >
                                Pas de pub pour ce produit
                            </button>
                        )}
                        <p className="text-sm font-bold tabular-nums">Pub du produit : {formatFcfa(cost)}</p>
                    </div>
                </>
            )}
        </>
    );
}

export function AdNumberField({
    id,
    label,
    hint,
    value,
    error,
    placeholder = '0',
    onChange,
}: {
    id: string;
    label: string;
    /** Shown after the label, in a lighter weight. */
    hint?: string;
    value: string;
    error?: string;
    placeholder?: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>
                {label}
                {hint && <span className="text-muted-foreground font-normal">{hint}</span>}
            </Label>
            <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                value={value}
                placeholder={placeholder}
                aria-invalid={error ? true : undefined}
                className="tabular-nums"
                onChange={(e) => onChange(e.target.value)}
            />
            <InputError message={error} />
        </div>
    );
}

export function MoneyField({
    id,
    label,
    value,
    error,
    help,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    error?: string;
    help?: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid content-start gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                value={value}
                aria-describedby={help ? `${id}-help` : undefined}
                aria-invalid={error ? true : undefined}
                onChange={(e) => onChange(e.target.value)}
                placeholder="0"
            />
            {help && (
                <p id={`${id}-help`} className="text-muted-foreground text-xs">
                    {help}
                </p>
            )}
            <InputError message={error} />
        </div>
    );
}

/**
 * Under the amount: how it was calculated, the discount given, or why it could not be calculated.
 */
export function AmountHint({
    id,
    line,
    price,
    expected,
    onRecalculate,
}: {
    id: string;
    line: Line;
    price: number | null;
    expected: number | null;
    onRecalculate: () => void;
}) {
    if (line.product_id === '') {
        return null;
    }

    if (price === null || expected === null) {
        return (
            <p id={id} className="text-muted-foreground text-xs">
                Pas de prix de vente pour ce produit : tapez le montant. Ajoutez son prix dans « Pays, livraison et produits » pour ne plus avoir à le
                faire.
            </p>
        );
    }

    const typed = toNumber(line.amount);
    const discount = expected - typed;

    return (
        <p id={id} className="text-muted-foreground text-xs" aria-live="polite">
            <span className="tabular-nums">
                {line.quantity || 0} × {formatFcfa(price)} = {formatFcfa(expected)}
            </span>
            {line.auto ? '. Modifiable en cas de réduction.' : null}
            {!line.auto && discount > 0 && (
                <span className="text-foreground font-medium">
                    . Réduction de <span className="tabular-nums">{formatFcfa(discount)}</span>
                </span>
            )}
            {!line.auto && discount < 0 && (
                <span className="text-foreground font-medium">
                    . <span className="tabular-nums">{formatFcfa(-discount)}</span> de plus que le prix normal
                </span>
            )}
            {!line.auto && (
                <>
                    {' '}
                    <button type="button" onClick={onRecalculate} className="text-primary font-semibold underline underline-offset-4">
                        Remettre {formatFcfa(expected)}
                    </button>
                </>
            )}
        </p>
    );
}

export function SummaryLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-hero-muted">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
        </div>
    );
}

/**
 * A whole number with − and + buttons around it, for thumbs.
 */
export function QuantityStepper({
    id,
    label,
    value,
    min = 1,
    error,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    min?: number;
    error?: string;
    onChange: (value: string) => void;
}) {
    const current = toNumber(value);
    const step = (delta: number) => onChange(String(Math.max(min, current + delta)));

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="border-input bg-card has-[input:focus-visible]:ring-ring/50 flex h-12 items-center rounded-xl border has-[input:focus-visible]:ring-[3px]">
                <button
                    type="button"
                    onClick={() => step(-1)}
                    disabled={current <= min}
                    aria-label={`${label} : un de moins`}
                    className="hover:bg-accent grid h-full w-12 shrink-0 cursor-pointer place-items-center rounded-l-xl disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Minus className="size-5" aria-hidden="true" />
                </button>
                <input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    value={value}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-full w-0 min-w-0 flex-1 [appearance:textfield] bg-transparent text-center text-lg font-semibold tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label={`${label} : un de plus`}
                    className="hover:bg-accent grid h-full w-12 shrink-0 cursor-pointer place-items-center rounded-r-xl"
                >
                    <Plus className="size-5" aria-hidden="true" />
                </button>
            </div>
            <InputError message={error} />
        </div>
    );
}
