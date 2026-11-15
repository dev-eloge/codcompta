import FlashMessage from '@/components/flash-message';
import InputError from '@/components/input-error';
import { ChoiceCard } from '@/components/report-form/fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa } from '@/lib/format';
import { formatRate, formatRateDate, type DisplayCurrency } from '@/lib/money';
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
    dollar: DisplayCurrency | null;
    euroRate: number;
}

type PartRow = { name: string; percent: string };

type ProfitForm = {
    parts: PartRow[];
    display_currency: CurrencyCode | null;
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

export default function ProfitSettings({ parts, preset, presets, displayCurrency, dollar, euroRate }: Props) {
    const { data, setData, put, processing, errors, transform } = useForm<ProfitForm>({
        parts: toRows(parts),
        display_currency: displayCurrency,
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

        // A total that is not 100 % is explained right under the list: take the merchant there.
        if (total !== 100) {
            totalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            totalRef.current?.focus();

            return;
        }

        transform((form) => ({ ...form, parts: form.parts.map((row) => ({ name: row.name.trim(), percent: percentOf(row) })) }));
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

                <section aria-labelledby="currency-title" className="glass flex flex-col gap-4 rounded-2xl p-5 md:p-7">
                    <div className="space-y-1">
                        <h2 id="currency-title" className="text-xl font-bold">
                            Devise d'affichage
                        </h2>
                        <p className="text-muted-foreground text-[15px]">
                            Vos rapports restent en francs CFA. Vous pouvez aussi les lire en euros ou en dollars.
                        </p>
                    </div>
                    <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 text-sm font-bold">Deuxième devise</legend>
                        <div className="grid gap-3 md:grid-cols-3">
                            <ChoiceCard
                                name="display_currency"
                                checked={data.display_currency === null}
                                onSelect={() => setData('display_currency', null)}
                                title="Aucune"
                                help="Francs CFA seulement."
                            />
                            <ChoiceCard
                                name="display_currency"
                                checked={data.display_currency === 'EUR'}
                                onSelect={() => setData('display_currency', 'EUR')}
                                title="Euro (€)"
                                help={`Taux fixe : ${formatRate({ code: 'EUR', rate: euroRate, rate_date: null, stale: false })}.`}
                            />
                            <ChoiceCard
                                name="display_currency"
                                checked={data.display_currency === 'USD'}
                                onSelect={() => setData('display_currency', 'USD')}
                                title="Dollar US ($)"
                                help="Taux du jour, mis à jour chaque matin."
                            />
                        </div>
                        <InputError message={errors.display_currency} />
                    </fieldset>
                    {data.display_currency !== null && (
                        <p className="badge-info flex items-start gap-2 rounded-xl px-4 py-3 text-sm">
                            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <span>
                                {data.display_currency === 'USD' && dollar === null
                                    ? "Le taux du dollar n'est pas encore arrivé : le bouton « F CFA / $ » apparaîtra sur Mes rapports dès demain matin."
                                    : `Un bouton « F CFA / ${data.display_currency === 'EUR' ? '€' : '$'} » apparaît sur Mes rapports. Le taux utilisé est rappelé sous les chiffres.`}
                                {data.display_currency === 'USD' && dollar?.rate_date && (
                                    <>
                                        {' '}
                                        Dernier taux connu, celui du {formatRateDate(dollar.rate_date)} : {formatRate(dollar)}.
                                    </>
                                )}
                            </span>
                        </p>
                    )}
                </section>

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
