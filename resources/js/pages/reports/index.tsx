import FlashMessage from '@/components/flash-message';
import { GoalCard, isActive } from '@/components/goals/goal-progress';
import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { ReportTabs } from '@/components/reports/report-tabs';
import { type Trend, TrendCharts } from '@/components/reports/trend-charts';
import { DeleteButton } from '@/components/row-actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa, formatNumber, formatPercent, formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type GoalProgress, type SharedData } from '@/types';
import { Deferred, Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarRange, ChevronLeft, ChevronRight, CircleAlert, ClipboardPlus, FileSpreadsheet, Pencil, Target, Trophy } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

type PeriodType = 'day' | 'week' | 'month' | 'custom';

interface Country {
    id: number;
    name: string;
    code: string;
}

interface Period {
    type: PeriodType;
    from: string;
    to: string;
    days: number;
    label: string;
    previous: string;
    previous_to: string;
    next: string;
    next_to: string;
    is_current: boolean;
}

interface Row {
    name: string;
    delivered: number;
    revenue: number;
    purchase_cost: number;
    ad_spend: number;
    closing_fees: number;
    delivery_fees: number;
    other_fees: number;
    profit: number;
    margin: number;
    ad_spend_per_delivered: number;
    savings: number;
    pocket: number;
    reinvestment: number;
}

interface Entry {
    id: number;
    agency: string;
    period_start: string;
    period_end: string;
    delivered: number;
    revenue: number;
    delivery_fees: number;
    announced_total: number | null;
    status: 'counted' | 'detail' | 'to_verify';
    source: 'manual' | 'message' | 'sheet';
}

const sourceLabels: Record<Entry['source'], string> = { manual: 'Saisi à la main', message: 'Message WhatsApp', sheet: 'Google Sheet' };

interface Props {
    countries: Country[];
    countryId: number | null;
    period: Period;
    report: { agencies: Row[]; total: Row } | null;
    entries: Entry[];
    trend?: Trend | null;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Mes rapports', href: '/rapports' }];

/**
 * "Résultats de novembre 2026", "Résultats d'octobre 2026", "Résultats du 12 au 18 octobre 2026".
 */
function periodTitle(period: Period): string {
    if (period.type === 'week' || period.type === 'custom') {
        return `Résultats ${period.label}`;
    }

    if (period.type === 'day') {
        return `Résultats du ${period.label}`;
    }

    return /^[aeiouyàâéèêh]/i.test(period.label) ? `Résultats d'${period.label}` : `Résultats de ${period.label}`;
}

const periodChoices: { value: PeriodType; label: string }[] = [
    { value: 'day', label: 'Jour' },
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
    { value: 'custom', label: 'Dates au choix' },
];

/** Local calendar date as Y-m-d (the merchant's day, not UTC). */
function isoDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return isoDate(date);
}

/** Monday of the week before this one. */
function lastWeekMonday(): string {
    const date = new Date();
    const sinceMonday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - sinceMonday - 7);

    return isoDate(date);
}

function firstOfMonth(): string {
    const date = new Date();

    return isoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

const presets: { label: string; range: () => [string, string] }[] = [
    { label: 'Semaine passée + cette semaine', range: () => [lastWeekMonday(), isoDate(new Date())] },
    { label: '7 derniers jours', range: () => [daysAgo(6), isoDate(new Date())] },
    { label: '30 derniers jours', range: () => [daysAgo(29), isoDate(new Date())] },
    { label: 'Depuis le début du mois', range: () => [firstOfMonth(), isoDate(new Date())] },
];

const statusLabels: Record<Entry['status'], string> = {
    counted: 'Compté',
    detail: 'Détail, non compté',
    to_verify: 'À vérifier',
};

const statusHelp: Record<Entry['status'], string> = {
    counted: 'Ce rapport entre dans le calcul du bénéfice.',
    detail: "Détail d'un rapport déjà compté : il n'entre pas dans le calcul, pour ne pas compter deux fois les mêmes ventes.",
    to_verify: "Ce rapport n'entre pas encore dans le calcul : ouvrez-le pour le vérifier.",
};

const columns: { key: keyof Row; label: string; help: string; format?: (row: Row) => string }[] = [
    { key: 'delivered', label: 'Produits livrés', help: 'Nombre de produits remis aux clients', format: (row) => formatNumber(row.delivered) },
    { key: 'revenue', label: "Chiffre d'affaires", help: 'Argent encaissé à la livraison' },
    { key: 'purchase_cost', label: "Coût d'achat", help: 'Prix payé au fournisseur pour les produits livrés' },
    { key: 'ad_spend', label: 'Publicité', help: 'Dépenses Facebook, TikTok, etc. sur la période' },
    { key: 'closing_fees', label: 'Closing', help: 'Commissions des personnes qui confirment les commandes par téléphone' },
    { key: 'delivery_fees', label: 'Livraison', help: 'Frais payés aux livreurs' },
    { key: 'other_fees', label: 'Autres frais', help: 'Toutes les autres dépenses déclarées dans les rapports' },
    { key: 'profit', label: 'Bénéfice net', help: 'Ce qui reste après toutes les dépenses' },
    { key: 'savings', label: 'Épargne', help: 'Part du bénéfice à mettre de côté' },
    { key: 'pocket', label: 'Votre poche', help: 'Part du bénéfice pour vous' },
    { key: 'reinvestment', label: 'Réinvestissement', help: 'Part du bénéfice à remettre dans le stock et la pub' },
    { key: 'margin', label: 'Marge', help: "Bénéfice net divisé par le chiffre d'affaires", format: (row) => formatPercent(row.margin) },
];

export default function ReportsIndex({ countries, countryId, period, report, entries, trend }: Props) {
    const { goals = [] } = usePage<SharedData>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rapports" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <ReportTabs />

                <FlashMessage />

                {countries.length === 0 ? (
                    <EmptyAccount />
                ) : (
                    <>
                        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-semibold tracking-tight first-letter:uppercase">{periodTitle(period)}</h1>
                                <p className="text-muted-foreground max-w-2xl text-sm">
                                    Votre bénéfice après le coût d'achat, la publicité, le closing et la livraison. Seuls les rapports « Compté »
                                    entrent dans le calcul, à la date de fin de chaque rapport.
                                </p>
                            </div>

                            <PeriodPicker countries={countries} countryId={countryId} period={period} />
                        </header>

                        {goals.length > 0 && <GoalsOverview goals={goals} />}

                        {report && <Summary total={report.total} days={period.days} />}

                        {report && <AgencyTable rows={report.agencies} total={report.total} />}

                        <EntryList entries={entries} />

                        <Deferred data="trend" fallback={<TrendSkeleton />}>
                            {trend ? <TrendCharts trend={trend} /> : <></>}
                        </Deferred>
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function Summary({ total, days }: { total: Row; days: number }) {
    const figures = [
        { label: "Chiffre d'affaires", value: formatFcfa(total.revenue) },
        { label: 'Publicité', value: formatFcfa(total.ad_spend) },
        { label: 'Produits livrés', value: formatNumber(total.delivered) },
        { label: 'Marge', value: formatPercent(total.margin) },
        { label: 'Publicité par produit livré', value: formatFcfa(total.ad_spend_per_delivered) },
    ];

    return (
        <section aria-label="Résumé" className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
            <div className="glass-hero rounded-2xl p-6">
                <p className="text-sm font-medium text-white/85">Bénéfice net{days > 1 ? ` sur ${days} jours` : ''}</p>
                <p className="sr-only">{total.profit < 0 ? 'Perte sur la période' : 'Gain sur la période'}</p>
                <p
                    className={cn(
                        'mt-1 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums md:text-5xl',
                        total.profit < 0 && 'text-on-hero-loss',
                    )}
                >
                    {formatFcfa(total.profit)}
                </p>
                {total.profit < 0 && <p className="text-on-hero-loss mt-1 text-sm font-semibold">Perte : les dépenses dépassent les ventes.</p>}
                <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-white/20 pt-4 text-sm sm:grid-cols-3 sm:gap-2">
                    <div>
                        <dt className="text-white/80">Épargne</dt>
                        <dd className="text-on-hero-gold font-bold tabular-nums">{formatFcfa(total.savings)}</dd>
                    </div>
                    <div>
                        <dt className="text-white/80">Votre poche</dt>
                        <dd className="text-on-hero-gold font-bold tabular-nums">{formatFcfa(total.pocket)}</dd>
                    </div>
                    <div>
                        <dt className="text-white/80">Réinvestissement</dt>
                        <dd className="text-on-hero-gold font-bold tabular-nums">{formatFcfa(total.reinvestment)}</dd>
                    </div>
                </dl>
            </div>

            <dl className="glass grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl p-6 sm:grid-cols-3">
                {figures.map((figure) => (
                    <div key={figure.label}>
                        <dt className="text-muted-foreground text-sm">{figure.label}</dt>
                        <dd className="mt-1 text-xl font-bold tabular-nums">{figure.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function AgencyTable({ rows, total }: { rows: Row[]; total: Row }) {
    const cell = (row: Row, column: (typeof columns)[number]) => (column.format ? column.format(row) : formatNumber(row[column.key] as number));

    return (
        <section aria-labelledby="by-agency" className="space-y-3">
            <div className="space-y-1">
                <h2 id="by-agency" className="text-lg font-semibold">
                    Détail par agence
                </h2>
                <p className="text-muted-foreground text-sm">
                    Bénéfice net = chiffre d'affaires − coût d'achat − publicité − closing − livraison − autres frais. Sur téléphone, faites glisser
                    le tableau pour voir toutes les colonnes.
                </p>
            </div>
            <div className="glass overflow-x-auto rounded-2xl">
                <table className="w-full min-w-[960px] text-sm">
                    <caption className="sr-only">Résultats par agence, en francs CFA</caption>
                    <thead className="bg-primary/8 text-left">
                        <tr>
                            <th scope="col" className="px-4 py-3 font-semibold">
                                Agence
                            </th>
                            {columns.map((column) => (
                                <th key={column.key} scope="col" title={column.help} className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.name} className="border-t">
                                <th scope="row" className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                                    {row.name}
                                </th>
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={cn(
                                            'px-3 py-3 text-right font-semibold tabular-nums',
                                            column.key === 'profit' && row.profit < 0 && 'text-destructive',
                                        )}
                                    >
                                        {cell(row, column)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-primary/10 border-primary/30 border-t-2">
                            <th scope="row" className="px-4 py-3 text-left font-bold">
                                Total
                            </th>
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={cn(
                                        'px-3 py-3 text-right font-bold tabular-nums',
                                        column.key === 'profit' && total.profit < 0 && 'text-destructive',
                                    )}
                                >
                                    {cell(total, column)}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </section>
    );
}

function EntryList({ entries }: { entries: Entry[] }) {
    return (
        <section aria-labelledby="entries" className="space-y-3">
            <div className="flex items-center justify-between gap-4">
                <h2 id="entries" className="text-lg font-semibold">
                    Rapports reçus sur la période
                </h2>
                <Button asChild variant="outline">
                    <Link href={route('reports.create')}>
                        <ClipboardPlus aria-hidden="true" />
                        Saisir un rapport
                    </Link>
                </Button>
            </div>

            {entries.length === 0 ? (
                <div className="glass space-y-3 rounded-2xl p-6 text-sm">
                    <p className="font-semibold">Aucun rapport sur cette période</p>
                    <p className="text-muted-foreground">
                        Ajoutez les chiffres de vos agences pour voir votre bénéfice : saisissez le rapport à la main, ou collez le message WhatsApp
                        de l'agence.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm">
                            <Link href={route('reports.create')}>Saisir un rapport</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/messages/coller">Lire un message WhatsApp</Link>
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="glass overflow-x-auto rounded-2xl">
                    <table className="w-full min-w-[760px] text-sm">
                        <caption className="sr-only">Rapports reçus sur la période, en francs CFA</caption>
                        <thead className="bg-primary/8 text-left">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-semibold">
                                    Période
                                </th>
                                <th scope="col" className="px-3 py-3 font-semibold">
                                    Agence
                                </th>
                                <th scope="col" className="px-3 py-3 text-right font-semibold">
                                    Livrés
                                </th>
                                <th scope="col" className="px-3 py-3 text-right font-semibold" title="Total calculé à partir des produits livrés">
                                    Ventes
                                </th>
                                <th scope="col" className="px-3 py-3 text-right font-semibold" title="Total écrit par l'agence dans son rapport">
                                    Total de l'agence
                                </th>
                                <th scope="col" className="px-3 py-3 text-right font-semibold">
                                    Livraison
                                </th>
                                <th scope="col" className="px-4 py-3 font-semibold">
                                    Statut et source
                                </th>
                                <th scope="col" className="w-20 px-2 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr key={entry.id} className="border-t">
                                    <td className="px-4 py-2.5 whitespace-nowrap">{formatPeriod(entry.period_start, entry.period_end)}</td>
                                    <td className="px-3 py-2.5">{entry.agency}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatNumber(entry.delivered)}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatNumber(entry.revenue)}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {entry.announced_total === null ? (
                                            '–'
                                        ) : entry.announced_total !== entry.revenue ? (
                                            <span
                                                className="text-destructive inline-flex items-center gap-1 font-semibold"
                                                title="Le total écrit par l'agence ne correspond pas aux ventes calculées : vérifiez le rapport"
                                            >
                                                <CircleAlert className="size-3.5" aria-hidden="true" />
                                                {formatNumber(entry.announced_total)}
                                                <span className="sr-only">, différent des ventes calculées</span>
                                            </span>
                                        ) : (
                                            formatNumber(entry.announced_total)
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(entry.delivery_fees)}</td>
                                    <td className="px-4 py-2.5">
                                        <span
                                            title={statusHelp[entry.status]}
                                            className={cn(
                                                'rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
                                                entry.status === 'counted' && 'bg-primary/12 text-primary',
                                                entry.status === 'detail' && 'bg-muted text-muted-foreground',
                                                entry.status === 'to_verify' && 'bg-secondary/30 text-secondary-foreground dark:text-secondary',
                                            )}
                                        >
                                            {statusLabels[entry.status]}
                                        </span>
                                        <span className="text-muted-foreground mt-1 block text-xs">{sourceLabels[entry.source]}</span>
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <div className="flex justify-end">
                                            {entry.source === 'sheet' ? (
                                                <span
                                                    role="img"
                                                    aria-label="Importé d'un Google Sheet : pour le corriger, supprimez-le puis saisissez-le à nouveau"
                                                    className="text-muted-foreground flex size-10 items-center justify-center"
                                                    title="Importé d'un Google Sheet : pour le corriger, supprimez-le puis saisissez-le à nouveau"
                                                >
                                                    <FileSpreadsheet className="size-4" aria-hidden="true" />
                                                </span>
                                            ) : (
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:text-primary size-10"
                                                    title="Modifier ce rapport"
                                                >
                                                    <Link
                                                        href={route('reports.edit', entry.id)}
                                                        aria-label={`Modifier le rapport ${entry.agency} ${formatPeriod(entry.period_start, entry.period_end)}`}
                                                    >
                                                        <Pencil className="size-4" aria-hidden="true" />
                                                    </Link>
                                                </Button>
                                            )}
                                            <DeleteButton
                                                label={`Supprimer le rapport ${entry.agency} ${formatPeriod(entry.period_start, entry.period_end)}`}
                                                title="Supprimer ce rapport ?"
                                                description={`${entry.agency}, ${formatPeriod(entry.period_start, entry.period_end)} : ${formatNumber(entry.revenue)} F de ventes. Le bénéfice de la période sera recalculé. Cette action est définitive.`}
                                                url={route('reports.destroy', entry.id)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function EmptyAccount() {
    return (
        <div className="glass mx-auto mt-10 max-w-md space-y-4 rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Bienvenue ! Commencez par décrire votre activité</h1>
            <p className="text-muted-foreground text-sm">
                CODCompta calcule votre bénéfice pays par pays et agence par agence, avec le prix d'achat de chaque produit. Ajoutez-les une seule
                fois (2 minutes), puis envoyez vos rapports.
            </p>
            <ol className="text-muted-foreground space-y-1 text-left text-sm">
                <li>1. Vos pays de vente et leurs agences de livraison</li>
                <li>2. Vos produits et leur prix d'achat</li>
                <li>3. Vos rapports : à la main ou en collant le message WhatsApp de l'agence</li>
            </ol>
            <Button asChild>
                <Link href={route('reference.index')}>Ajouter mes pays, agences et produits</Link>
            </Button>
        </div>
    );
}

/**
 * Country, period type and dates. "Dates au choix" lets the merchant pick any start and end day.
 */
function PeriodPicker({ countries, countryId, period }: { countries: Country[]; countryId: number | null; period: Period }) {
    const { errors } = usePage<SharedData & { errors: Record<string, string> }>().props;
    const [custom, setCustom] = useState(period.type === 'custom');
    const [from, setFrom] = useState(period.from);
    const [to, setTo] = useState(period.to);

    useEffect(() => {
        setCustom(period.type === 'custom');
        setFrom(period.from);
        setTo(period.to);
    }, [period.type, period.from, period.to]);

    const show = (params: Record<string, string | number | undefined>) =>
        router.get(route('reports.index'), { country: countryId ?? undefined, ...params }, { preserveScroll: true, preserveState: true });

    const showRange = (start: string, end: string) => show({ period: 'custom', du: start, au: end });

    const showType = (type: PeriodType) => {
        if (type === 'custom') {
            setCustom(true);

            return;
        }

        setCustom(false);

        // Already on this kind of period: closing the "Dates au choix" panel is enough.
        if (type === period.type) {
            return;
        }

        // Keep the day being looked at: Jour → Semaine shows that day's week, and so on.
        show({ period: type, date: period.type === 'custom' ? period.to : period.from });
    };

    const showToday = () => show({ period: period.type === 'custom' ? 'week' : period.type, date: isoDate(new Date()) });

    const submitRange = (event: FormEvent) => {
        event.preventDefault();
        showRange(from, to);
    };

    const fixed = period.type !== 'custom';
    const activeType: PeriodType = custom ? 'custom' : period.type;

    return (
        <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                    <Label htmlFor="report-country">Pays</Label>
                    <NativeSelect
                        id="report-country"
                        className="w-auto"
                        value={countryId ?? ''}
                        onChange={(e) =>
                            show(
                                period.type === 'custom'
                                    ? { country: Number(e.target.value), period: 'custom', du: period.from, au: period.to }
                                    : { country: Number(e.target.value), period: period.type, date: period.from },
                            )
                        }
                    >
                        {countries.map((country) => (
                            <option key={country.id} value={country.id}>
                                {country.name}
                            </option>
                        ))}
                    </NativeSelect>
                </div>

                <div className="grid gap-1.5">
                    <span id="report-period" className="text-sm font-medium">
                        Afficher
                    </span>
                    <div role="group" aria-labelledby="report-period" className="glass flex h-10 items-center rounded-full p-1">
                        {periodChoices.map((choice) => (
                            <button
                                key={choice.value}
                                type="button"
                                aria-pressed={activeType === choice.value}
                                onClick={() => showType(choice.value)}
                                className={cn(
                                    'rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors',
                                    activeType === choice.value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {choice.label}
                            </button>
                        ))}
                    </div>
                </div>

                {!custom && fixed && (
                    <div className="grid gap-1.5">
                        <Label htmlFor="report-date">Date</Label>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Période précédente"
                                onClick={() => show({ period: period.type, date: period.previous })}
                            >
                                <ChevronLeft aria-hidden="true" />
                            </Button>
                            <input
                                id="report-date"
                                type="date"
                                value={period.from}
                                onChange={(e) => e.target.value && show({ period: period.type, date: e.target.value })}
                                className="border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-hidden"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Période suivante"
                                onClick={() => show({ period: period.type, date: period.next })}
                            >
                                <ChevronRight aria-hidden="true" />
                            </Button>
                            {!period.is_current && (
                                <Button variant="ghost" onClick={showToday}>
                                    Aujourd'hui
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {custom && (
                <form onSubmit={submitRange} aria-label="Choisir les dates" className="glass w-full space-y-3 rounded-2xl p-4 lg:w-auto">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="range-from">Du</Label>
                            <input
                                id="range-from"
                                type="date"
                                required
                                value={from}
                                max={to || undefined}
                                aria-invalid={errors.du ? true : undefined}
                                onChange={(e) => setFrom(e.target.value)}
                                className="border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-hidden"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="range-to">Au</Label>
                            <input
                                id="range-to"
                                type="date"
                                required
                                value={to}
                                min={from || undefined}
                                aria-invalid={errors.au ? true : undefined}
                                onChange={(e) => setTo(e.target.value)}
                                className="border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-hidden"
                            />
                        </div>
                        <Button type="submit">
                            <CalendarRange aria-hidden="true" />
                            Voir les résultats
                        </Button>
                        {period.type === 'custom' && (
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={`Les ${period.days} jours d'avant`}
                                    title={`Les ${period.days} jours d'avant`}
                                    onClick={() => showRange(period.previous, period.previous_to)}
                                >
                                    <ChevronLeft aria-hidden="true" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={`Les ${period.days} jours d'après`}
                                    title={`Les ${period.days} jours d'après`}
                                    onClick={() => showRange(period.next, period.next_to)}
                                >
                                    <ChevronRight aria-hidden="true" />
                                </Button>
                            </div>
                        )}
                    </div>
                    <InputError message={errors.du ?? errors.au} />
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Raccourcis">
                        {presets.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => showRange(...preset.range())}
                                className="bg-background/70 hover:border-primary/60 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </form>
            )}
        </div>
    );
}

/**
 * Goals in progress, and those that ended in the last few days, all countries together.
 */
function GoalsOverview({ goals }: { goals: GoalProgress[] }) {
    const shown = goals.filter((goal) => goal.status !== 'upcoming');
    const reached = shown.filter((goal) => goal.status === 'reached');
    const missed = shown.filter((goal) => goal.status === 'missed');

    if (shown.length === 0) {
        return null;
    }

    return (
        <section aria-labelledby="goals-title" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1">
                    <h2 id="goals-title" className="flex items-center gap-2 text-lg font-semibold">
                        <Target className="text-primary size-5" aria-hidden="true" />
                        Mes objectifs
                    </h2>
                    <p className="text-muted-foreground text-sm">Tous les pays ensemble, chacun sur ses propres dates.</p>
                </div>
                <Link href={route('goals.index')} className="text-primary text-sm font-semibold underline-offset-4 hover:underline">
                    Gérer mes objectifs
                </Link>
            </div>

            {reached.length > 0 && (
                <p
                    role="status"
                    className="border-secondary/70 bg-secondary/20 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
                >
                    <Trophy className="text-secondary-foreground dark:text-secondary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Bravo, objectif{reached.length > 1 ? 's' : ''} atteint{reached.length > 1 ? 's' : ''} :{' '}
                    {reached.map((goal) => goal.title).join(', ')} !
                </p>
            )}

            {missed.length > 0 && (
                <p className="border-destructive/30 bg-destructive/8 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm">
                    <CircleAlert className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>Non atteint : {missed.map((goal) => goal.title).join(', ')}. Le détail est sur la carte.</span>
                </p>
            )}

            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[...shown.filter(isActive), ...shown.filter((goal) => !isActive(goal))].map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                ))}
            </ul>
        </section>
    );
}

/**
 * Placeholder with the shape of the charts while their figures load.
 */
function TrendSkeleton() {
    return (
        <section aria-label="Chargement de la progression" aria-busy="true" className="space-y-3">
            <div className="bg-muted h-6 w-40 animate-pulse rounded" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((index) => (
                    <div key={index} className="glass h-64 animate-pulse rounded-2xl" />
                ))}
            </div>
        </section>
    );
}
