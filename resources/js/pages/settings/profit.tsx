import FlashMessage from '@/components/flash-message';
import InputError from '@/components/input-error';
import { ChoiceCard } from '@/components/report-form/fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa } from '@/lib/format';
import { formatRate, type DisplayCurrency } from '@/lib/money';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, CircleAlert, Info, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';

interface Part {
    name: string;
    percent: number;
}

type CurrencyCode = 'EUR' | 'USD';

interface Props {
    parts: Part[];
    preset: string | null;
    presets: Record<string, Part[]>;
    displayCurrency: CurrencyCode | null;
    /** The automatic rates: the fixed euro peg, and the dollar rate of the day (null if never fetched). */
    automatic: Record<CurrencyCode, DisplayCurrency | null>;
    /** The merchant's own rates, when set. */
    ownRates: Record<CurrencyCode, number | null>;
}

type PartRow = { name: string; percent: string };

type RateMode = 'auto' | 'own';

type ProfitForm = {
    parts: PartRow[];
    display_currency: CurrencyCode | null;
    rate_mode: Record<CurrencyCode, RateMode>;
    own_rates: Record<CurrencyCode, string>;
};

const MIN_PARTS = 2;
const MAX_PARTS = 5;
/** The example used for the preview, the demo week of the project file. */
const EXAMPLE_PROFIT = 328000;

const OWN_RULE = 'own';
const presetHelp: Record<string, string> = {
    '40-20-40': 'Épargne, votre poche, réinvestir. La règle de base.',
    '50-30-20': "Plus d'épargne, moins de réinvestissement.",
};

/** One colour per part, the same in the list and in the preview bar; the name is always written next to it. */
const partColors = ['bg-gold-brand', 'bg-mint-brand', 'bg-chart-1', 'bg-ink-brand dark:bg-hero-foreground', 'bg-chart-3'];

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Partage et devise', href: '/partage-et-devise' }];

const toRows = (parts: Part[]): PartRow[] => parts.map((part) => ({ name: part.name, percent: String(part.percent) }));
const percentOf = (row: PartRow) => (row.percent === '' ? 0 : Number(row.percent) || 0);

const rateText = (rate: number | null) => (rate === null ? '' : String(rate).replace('.', ','));

export default function ProfitSettings({ parts, preset, presets, displayCurrency, automatic, ownRates }: Props) {
    const { data, setData, put, processing, errors, transform, setError, clearErrors } = useForm<ProfitForm>({
        parts: toRows(parts),
        display_currency: displayCurrency,
        rate_mode: { EUR: ownRates.EUR === null ? 'auto' : 'own', USD: ownRates.USD === null ? 'auto' : 'own' },
        own_rates: { EUR: rateText(ownRates.EUR), USD: rateText(ownRates.USD) },
    });
    const fieldError = (key: string) => (errors as Record<string, string | undefined>)[key];
    const totalRef = useRef<HTMLParagraphElement>(null);
    // A missing name is pointed out when the merchant leaves the field, not at every letter.
    const [left, setLeft] = useState<number[]>([]);
    const nameError = (index: number) =>
        fieldError(`parts.${index}.name`) ??
        (left.includes(index) && data.parts[index]?.name.trim() === '' ? 'Donnez un nom à cette part, par exemple « Stock ».' : undefined);

    const chosenPreset = Object.entries(presets).find(
        ([, presetParts]) =>
            presetParts.length === data.parts.length &&
            presetParts.every((part, index) => part.name === data.parts[index].name.trim() && String(part.percent) === data.parts[index].percent),
    )?.[0];
    // "Ma propre règle" stays chosen once picked, even while the figures still match a ready-made rule.
    const [ownRule, setOwnRule] = useState(preset === null);
    const rule = ownRule ? OWN_RULE : (chosenPreset ?? OWN_RULE);

    const total = data.parts.reduce((sum, row) => sum + percentOf(row), 0);
    const gap = 100 - total;

    const update = (index: number, changes: Partial<PartRow>) =>
        setData(
            'parts',
            data.parts.map((row, i) => (i === index ? { ...row, ...changes } : row)),
        );

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const unnamed = data.parts.findIndex((row) => row.name.trim() === '');

        if (unnamed !== -1) {
            setLeft(data.parts.map((_, index) => index));
            document.getElementById(`part-name-${unnamed}`)?.focus();

            return;
        }

        const shownCode = data.display_currency;

        if (shownCode && data.rate_mode[shownCode] === 'own' && !(Number(data.own_rates[shownCode].replace(/\s/g, '').replace(',', '.')) > 0)) {
            setError(`own_rates.${shownCode}` as keyof ProfitForm, 'Entrez votre taux, par exemple 600.');
            document.getElementById(`own-rate-${shownCode}`)?.focus();

            return;
        }

        clearErrors();

        // A total that is not 100 % is explained right under the list: take the merchant there.
        if (total !== 100) {
            totalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            totalRef.current?.focus();

            return;
        }

        transform((form) => ({
            parts: form.parts.map((row) => ({ name: row.name.trim(), percent: percentOf(row) })),
            display_currency: form.display_currency,
            // An automatic rate clears the merchant's own one.
            own_rates: {
                EUR: form.rate_mode.EUR === 'own' ? form.own_rates.EUR : null,
                USD: form.rate_mode.USD === 'own' ? form.own_rates.USD : null,
            },
        }));
        put(route('profit-settings.update'), { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Partage et devise" />

            <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
                <FlashMessage />
                <h1 className="text-[28px] font-bold md:text-[32px]">Partage et devise</h1>

                <section aria-labelledby="split-title" className="glass flex flex-col gap-5 rounded-2xl p-5 md:p-7">
                    <div className="space-y-1">
                        <h2 id="split-title" className="text-xl font-bold">
                            Partage du bénéfice
                        </h2>
                        <p className="text-muted-foreground text-[15px]">Comment CODCompta découpe votre bénéfice net sur la page Mes rapports.</p>
                    </div>

                    <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 text-sm font-bold">Point de départ</legend>
                        <div className="grid gap-3 md:grid-cols-3">
                            {Object.entries(presets).map(([key, presetParts]) => (
                                <ChoiceCard
                                    key={key}
                                    name="rule"
                                    checked={rule === key}
                                    onSelect={() => {
                                        setOwnRule(false);
                                        setData('parts', toRows(presetParts));
                                    }}
                                    title={presetParts.map((part) => part.percent).join(' / ')}
                                    help={presetHelp[key] ?? presetParts.map((part) => part.name).join(', ')}
                                />
                            ))}
                            <ChoiceCard
                                name="rule"
                                checked={rule === OWN_RULE}
                                onSelect={() => {
                                    setOwnRule(true);
                                    document.getElementById('part-name-0')?.focus();
                                }}
                                title="Ma propre règle"
                                help="Vos parts, vos noms, vos pourcentages."
                            />
                        </div>
                        <p className="text-muted-foreground text-sm">Changez un nom ou un pourcentage ci-dessous : la règle devient la vôtre.</p>
                    </fieldset>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                        <div className="flex flex-col gap-3">
                            <div className="text-muted-foreground hidden grid-cols-[16px_minmax(0,1fr)_120px_48px] gap-3 text-[13px] font-bold sm:grid">
                                <span />
                                <span>Nom de la part</span>
                                <span>Pourcentage</span>
                                <span />
                            </div>
                            <ul className="flex flex-col gap-3">
                                {data.parts.map((row, index) => (
                                    <li
                                        key={index}
                                        className="grid grid-cols-[16px_minmax(0,1fr)_88px_48px] items-start gap-2.5 sm:grid-cols-[16px_minmax(0,1fr)_120px_48px] sm:gap-3"
                                    >
                                        <span aria-hidden="true" className={cn('mt-[18px] size-3 rounded-[3px]', partColors[index])} />
                                        <div>
                                            <label htmlFor={`part-name-${index}`} className="sr-only">
                                                Nom de la part {index + 1}
                                            </label>
                                            <Input
                                                id={`part-name-${index}`}
                                                value={row.name}
                                                maxLength={30}
                                                autoComplete="off"
                                                placeholder="Par exemple « Stock »"
                                                aria-invalid={Boolean(nameError(index))}
                                                aria-describedby={nameError(index) ? `part-name-${index}-error` : undefined}
                                                onChange={(e) => update(index, { name: e.target.value })}
                                                onBlur={() => setLeft((indexes) => (indexes.includes(index) ? indexes : [...indexes, index]))}
                                                className="h-12 text-base"
                                            />
                                            <InputError id={`part-name-${index}-error`} message={nameError(index)} className="mt-1.5" />
                                        </div>
                                        <div>
                                            <label htmlFor={`part-percent-${index}`} className="sr-only">
                                                Pourcentage de la part {index + 1}
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    id={`part-percent-${index}`}
                                                    value={row.percent}
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    aria-invalid={Boolean(fieldError(`parts.${index}.percent`))}
                                                    onChange={(e) => update(index, { percent: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                                    className="h-12 pr-9 text-right text-base tabular-nums"
                                                />
                                                <span
                                                    aria-hidden="true"
                                                    className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-semibold"
                                                >
                                                    %
                                                </span>
                                            </div>
                                            <InputError message={fieldError(`parts.${index}.percent`)} className="mt-1.5" />
                                        </div>
                                        {data.parts.length > MIN_PARTS ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="size-12"
                                                aria-label={`Retirer la part ${row.name.trim() || index + 1}`}
                                                onClick={() => {
                                                    setLeft([]);
                                                    setData(
                                                        'parts',
                                                        data.parts.filter((_, i) => i !== index),
                                                    );
                                                }}
                                            >
                                                <Trash2 aria-hidden="true" />
                                            </Button>
                                        ) : (
                                            <span />
                                        )}
                                    </li>
                                ))}
                            </ul>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    disabled={data.parts.length >= MAX_PARTS}
                                    onClick={() => setData('parts', [...data.parts, { name: '', percent: gap > 0 ? String(gap) : '' }])}
                                >
                                    <Plus aria-hidden="true" />
                                    Ajouter une part
                                </Button>
                                <p
                                    ref={totalRef}
                                    tabIndex={-1}
                                    aria-live="polite"
                                    className={cn(
                                        'flex items-center gap-1.5 font-bold tabular-nums outline-none',
                                        total === 100 ? 'text-primary' : 'text-danger-fg',
                                    )}
                                >
                                    {total === 100 ? (
                                        <Check className="size-4" aria-hidden="true" />
                                    ) : (
                                        <CircleAlert className="size-4" aria-hidden="true" />
                                    )}
                                    Total : {total} %
                                </p>
                            </div>
                            {total !== 100 && (
                                <p className="text-danger-fg text-sm font-semibold">
                                    {gap > 0
                                        ? `Total : ${total} %. Ajoutez ${gap} % à une part pour arriver à 100 %.`
                                        : `Total : ${total} %. Retirez ${-gap} % à une part pour revenir à 100 %.`}
                                </p>
                            )}
                            <InputError message={fieldError('parts')} />
                            <p className="text-muted-foreground text-sm">
                                {data.parts.length >= MAX_PARTS
                                    ? 'Vous avez déjà 5 parts, le maximum.'
                                    : data.parts.length === MIN_PARTS
                                      ? 'Il faut au moins 2 parts. Le total doit faire 100 %.'
                                      : 'De 2 à 5 parts. Le total doit faire 100 %.'}
                            </p>
                        </div>

                        <SplitPreview parts={data.parts} />
                    </div>
                </section>

                <CurrencySection
                    data={data}
                    setRate={(code, changes) => setData((form) => ({ ...form, ...changes(form, code) }))}
                    onCurrency={(code) => setData('display_currency', code)}
                    automatic={automatic}
                    errors={errors as Record<string, string | undefined>}
                />

                <div className="flex flex-wrap justify-end gap-3">
                    <Button asChild variant="outline" size="lg">
                        <Link href={route('reports.index')}>Annuler</Link>
                    </Button>
                    <Button type="submit" size="lg" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                        {processing ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}

/** What the rule gives on an example profit, so the merchant sees the parts before saving. */
function SplitPreview({ parts }: { parts: PartRow[] }) {
    const total = parts.reduce((sum, row) => sum + percentOf(row), 0);

    return (
        <aside aria-labelledby="preview-title" className="bg-muted/60 flex flex-col gap-4 self-start rounded-2xl p-5">
            <h3 id="preview-title" className="font-[family-name:var(--font-sans)] text-base font-bold">
                Aperçu sur {formatFcfa(EXAMPLE_PROFIT)} de bénéfice
            </h3>
            <div aria-hidden="true" className="bg-background flex h-3 gap-0.5 overflow-hidden rounded-full">
                {parts.map((row, index) => (
                    <span key={index} className={cn('h-full', partColors[index])} style={{ width: `${Math.max(0, percentOf(row))}%` }} />
                ))}
            </div>
            <ul className="flex flex-col gap-2.5 text-[15px]">
                {parts.map((row, index) => (
                    <li key={index} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                            <span aria-hidden="true" className={cn('size-3 shrink-0 rounded-[3px]', partColors[index])} />
                            <span className="truncate">
                                {row.name.trim() || `Part ${index + 1}`}, {percentOf(row)} %
                            </span>
                        </span>
                        <span className="font-bold whitespace-nowrap tabular-nums">
                            {formatFcfa(Math.round((EXAMPLE_PROFIT * percentOf(row)) / 100))}
                        </span>
                    </li>
                ))}
            </ul>
            <p className="text-muted-foreground border-t pt-3 text-sm">
                {total === 100
                    ? 'Vos chiffres ne changent pas : seul le découpage affiché change, sur toutes les périodes.'
                    : "L'aperçu sera juste quand le total fera 100 %."}
            </p>
        </aside>
    );
}

const currencyNames: Record<CurrencyCode, { title: string; symbol: string }> = {
    EUR: { title: 'Euro (€)', symbol: '€' },
    USD: { title: 'Dollar US ($)', symbol: '$' },
};

const checkedAt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });

/** Which currency the dashboard shows, and which rate converts it: automatic, or the merchant's own. */
function CurrencySection({
    data,
    setRate,
    onCurrency,
    automatic,
    errors,
}: {
    data: ProfitForm;
    setRate: (code: CurrencyCode, changes: (form: ProfitForm, code: CurrencyCode) => Partial<ProfitForm>) => void;
    onCurrency: (code: CurrencyCode | null) => void;
    automatic: Record<CurrencyCode, DisplayCurrency | null>;
    errors: Record<string, string | undefined>;
}) {
    const code = data.display_currency;
    const auto = code ? automatic[code] : null;
    const mode = code ? data.rate_mode[code] : 'auto';
    const own = code ? Number(data.own_rates[code].replace(/\s/g, '').replace(',', '.')) : NaN;
    const rate = code && mode === 'own' ? (own > 0 ? own : null) : (auto?.rate ?? null);
    const example = 100000;

    const autoHelp = (): string => {
        if (code === 'EUR') {
            return `Taux fixe officiel : 1 € = 655,957 F CFA. Il ne change jamais.`;
        }

        if (!auto) {
            return "Le taux du dollar n'a pas encore pu être récupéré. Fixez votre propre taux en attendant.";
        }

        const when = auto.updated_at ? `, vérifié le ${checkedAt.format(new Date(auto.updated_at))}` : '';

        return `Taux du jour : ${formatRate(auto)}${when}. Mis à jour toutes les 3 heures.`;
    };

    return (
        <section aria-labelledby="currency-title" className="glass flex flex-col gap-5 rounded-2xl p-5 md:p-7">
            <div className="space-y-1">
                <h2 id="currency-title" className="text-xl font-bold">
                    Devise du tableau de bord
                </h2>
                <p className="text-muted-foreground text-[15px]">
                    Vos chiffres restent enregistrés en francs CFA. Choisissez la devise dans laquelle Mes rapports les affiche.
                </p>
            </div>

            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold">Devise affichée</legend>
                <div className="grid gap-3 md:grid-cols-3">
                    <ChoiceCard
                        name="display_currency"
                        checked={code === null}
                        onSelect={() => onCurrency(null)}
                        title="Franc CFA (F)"
                        help="Vos chiffres tels quels."
                    />
                    {(['EUR', 'USD'] as const).map((option) => (
                        <ChoiceCard
                            key={option}
                            name="display_currency"
                            checked={code === option}
                            onSelect={() => onCurrency(option)}
                            title={currencyNames[option].title}
                            help={option === 'EUR' ? 'Taux officiel ou le vôtre.' : 'Taux du jour ou le vôtre.'}
                        />
                    ))}
                </div>
                <InputError message={errors.display_currency} />
            </fieldset>

            {code && (
                <fieldset className="flex flex-col gap-3">
                    <legend className="mb-2 text-sm font-bold">Taux utilisé pour le {code === 'EUR' ? 'euro' : 'dollar'}</legend>
                    <div className="grid gap-3 md:grid-cols-2">
                        <ChoiceCard
                            name={`rate_mode_${code}`}
                            checked={mode === 'auto'}
                            onSelect={() => setRate(code, (form) => ({ rate_mode: { ...form.rate_mode, [code]: 'auto' } }))}
                            title={code === 'EUR' ? 'Taux officiel' : 'Taux du jour, automatique'}
                            help={autoHelp()}
                        />
                        <ChoiceCard
                            name={`rate_mode_${code}`}
                            checked={mode === 'own'}
                            onSelect={() => {
                                setRate(code, (form) => ({ rate_mode: { ...form.rate_mode, [code]: 'own' } }));
                                window.setTimeout(() => document.getElementById(`own-rate-${code}`)?.focus(), 0);
                            }}
                            title="Mon propre taux"
                            help="Par exemple le taux de votre bureau de change."
                        />
                    </div>

                    {mode === 'own' && (
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor={`own-rate-${code}`} className="text-sm font-bold">
                                Votre taux
                            </label>
                            <div className="flex items-center gap-3 text-base font-semibold">
                                <span className="whitespace-nowrap">1 {currencyNames[code].symbol} =</span>
                                <Input
                                    id={`own-rate-${code}`}
                                    value={data.own_rates[code]}
                                    inputMode="decimal"
                                    autoComplete="off"
                                    placeholder={code === 'EUR' ? '655,957' : '600'}
                                    aria-invalid={Boolean(errors[`own_rates.${code}`])}
                                    aria-describedby={errors[`own_rates.${code}`] ? `own-rate-${code}-error` : undefined}
                                    onChange={(e) =>
                                        setRate(code, (form) => ({
                                            own_rates: { ...form.own_rates, [code]: e.target.value.replace(/[^\d,.\s]/g, '') },
                                        }))
                                    }
                                    className="h-12 w-36 text-right text-base tabular-nums"
                                />
                                <span>F CFA</span>
                            </div>
                            <InputError id={`own-rate-${code}-error`} message={errors[`own_rates.${code}`]} />
                        </div>
                    )}

                    <p className="badge-info flex items-start gap-2 rounded-xl px-4 py-3 text-sm">
                        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>
                            {rate
                                ? `Exemple : 100 000 F CFA = ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).format(example / rate)}. `
                                : ''}
                            Mes rapports s'affiche dans cette devise dès l'enregistrement. Le bouton « F CFA | € | $ » de Mes rapports permet aussi de
                            changer à tout moment.
                        </span>
                    </p>
                </fieldset>
            )}
        </section>
    );
}
