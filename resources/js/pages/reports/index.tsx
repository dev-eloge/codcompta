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
import {
    ArrowDownRight,
    ArrowUpRight,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    ClipboardPlus,
    FileSpreadsheet,
    MessageSquareText,
    Pencil,
    Trophy,
} from 'lucide-react';
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

interface Pending {
    kind: 'message_parsed' | 'message_failed' | 'reports_to_verify';
    id: number | null;
    agency: string | null;
    count: number;
    date: string | null;
}

interface Props {
    countries: Country[];
    countryId: number | null;
    period: Period;
    report: { agencies: Row[]; total: Row } | null;
    entries: Entry[];
    pending?: Pending[];
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

export default function ReportsIndex({ countries, countryId, period, report, entries, pending = [], trend }: Props) {
    const { goals = [] } = usePage<SharedData>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rapports" />

            <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <h1 className="text-[28px] font-bold md:text-[32px]">Mes rapports</h1>
                    {countries.length > 0 && (
                        <div className="hidden flex-wrap gap-2.5 md:flex">
                            <Button asChild variant="outline">
                                <Link href={route('messages.create')} prefetch>
                                    <MessageSquareText aria-hidden="true" />
                                    Coller un message WhatsApp
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={route('reports.create')} prefetch>
                                    <ClipboardPlus aria-hidden="true" />
                                    Saisir un rapport
                                </Link>
                            </Button>
                        </div>
                    )}
                </header>

                <ReportTabs />

                <FlashMessage />

                {countries.length === 0 ? (
                    <EmptyAccount />
                ) : (
                    <>
                        <PeriodPicker countries={countries} countryId={countryId} period={period} />

                        <h2 className="sr-only first-letter:uppercase">{periodTitle(period)}</h2>

                        {pending.length > 0 && <PendingList items={pending} />}

                        {report && <Summary total={report.total} period={period} trend={trend} />}

                        {goals.length > 0 && <GoalsOverview goals={goals} />}

                        {report && <AgencyTable rows={report.agencies} total={report.total} />}

                        <Deferred data="trend" fallback={<TrendSkeleton />}>
                            {trend ? <TrendCharts trend={trend} /> : <></>}
                        </Deferred>

                        <EntryList entries={entries} countryId={countryId} period={period} />
                    </>
                )}
            </div>
        </AppLayout>
    );
}

const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/**
 * What may make the figures wrong, with the action that fixes it. Shown before the results.
 */
function PendingList({ items }: { items: Pending[] }) {
    const total = items.reduce((sum, item) => sum + item.count, 0);

    return (
        <section aria-labelledby="todo-title" className="bg-warning-bg/60 border-warning-fg/20 flex flex-col gap-3 rounded-2xl border p-4 md:p-5">
            <h2 id="todo-title" className="flex items-center gap-2 font-[family-name:var(--font-sans)] text-base font-bold">
                <CircleAlert className="text-warning-fg size-5 shrink-0" aria-hidden="true" />
                {total > 1 ? `${total} choses à régler pour des chiffres justes` : 'Une chose à régler pour des chiffres justes'}
            </h2>
            <ul className="grid gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
                {items.map((item) => (
                    <li key={`${item.kind}-${item.id ?? 'all'}`} className="bg-card flex items-center justify-between gap-3 rounded-xl px-4 py-3">
                        <span className="text-[15px]">
                            {item.kind === 'message_parsed' && (
                                <>
                                    Message de <strong>{item.agency}</strong> lu, pas encore enregistré.
                                </>
                            )}
                            {item.kind === 'message_failed' && (
                                <>
                                    Le message de <strong>{item.agency}</strong> du {dayMonth.format(new Date(`${item.date}T00:00:00Z`))} n'a pas pu
                                    être lu.
                                </>
                            )}
                            {item.kind === 'reports_to_verify' && (
                                <>
                                    {item.count > 1 ? `${item.count} rapports` : '1 rapport'} <strong>à vérifier</strong>, pas encore compté
                                    {item.count > 1 ? 's' : ''}.
                                </>
                            )}
                        </span>
                        <Link
                            href={
                                item.kind === 'reports_to_verify'
                                    ? route('reports.history', { statut: 'to_verify' })
                                    : route('messages.show', item.id!)
                            }
                            className="text-primary inline-flex min-h-11 shrink-0 items-center font-bold whitespace-nowrap underline-offset-4 hover:underline"
                        >
                            {item.kind === 'message_parsed' ? 'Enregistrer' : item.kind === 'message_failed' ? 'Relire' : 'Vérifier'}
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Change against the previous period of the same length, in words and with an arrow, never by colour alone. */
function Change({ now, before, compact = false }: { now: number; before: number; compact?: boolean }) {
    if (before === 0) {
        return null;
    }

    const ratio = (now - before) / Math.abs(before);
    const up = ratio >= 0;
    const label = `${up ? '+' : '−'}${Math.abs(Math.round(ratio * 100))} %`;

    if (compact) {
        return (
            <p className={cn('mt-1 text-[13px] font-semibold', up ? 'text-primary' : 'text-danger-fg')}>
                {label} <span className="text-muted-foreground font-medium">vs période d'avant</span>
            </p>
        );
    }

    return (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[15px]">
            <span
                className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold tabular-nums',
                    up ? 'bg-on-hero-up/15 text-on-hero-up' : 'bg-on-hero-loss/15 text-on-hero-loss',
                )}
            >
                {up ? <ArrowUpRight className="size-4" aria-hidden="true" /> : <ArrowDownRight className="size-4" aria-hidden="true" />}
                {label}
            </span>
            <span className="text-hero-muted">
                par rapport à la période d'avant (<span className="tabular-nums">{formatFcfa(before)}</span>)
            </span>
        </p>
    );
}

function Summary({ total, period, trend }: { total: Row; period: Period; trend?: Trend | null }) {
    // The comparison only makes sense when the charts cover exactly this period.
    const previous = trend && !trend.extended ? trend.previous : null;
    const shares = [
        { label: 'Épargne, 40 %', value: total.savings },
        { label: 'Votre poche, 20 %', value: total.pocket },
        { label: 'À réinvestir, 40 %', value: total.reinvestment },
    ];
    const adShare = total.revenue > 0 ? total.ad_spend / total.revenue : 0;

    return (
        <section aria-label="Résumé de la période" className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="glass-hero flex flex-col gap-5 rounded-2xl p-5 md:p-7">
                <div>
                    <p className="text-hero-muted text-[15px] first-letter:uppercase">
                        Bénéfice net, {period.label}
                        {period.days > 1 ? ` (${period.days} jours)` : ''}
                    </p>
                    <p className="sr-only">{total.profit < 0 ? 'Perte sur la période' : 'Gain sur la période'}</p>
                    <p
                        className={cn(
                            'mt-2 font-[family-name:var(--font-display)] text-[40px] leading-[1.05] font-bold tracking-[-0.03em] tabular-nums md:text-[56px]',
                            total.profit < 0 && 'text-on-hero-loss',
                        )}
                    >
                        {formatFcfa(total.profit)}
                    </p>
                    {total.profit < 0 && <p className="text-on-hero-loss mt-1 text-sm font-semibold">Perte : les dépenses dépassent les ventes.</p>}
                    {previous && <Change now={total.profit} before={previous.profit} />}
                </div>
                <div>
                    <p className="text-hero-muted mb-2.5 text-sm">Comment le partager, selon la règle 40/20/40</p>
                    <dl className="grid grid-cols-3 gap-2 sm:gap-2.5">
                        {shares.map((share) => (
                            <div key={share.label} className="hero-tile rounded-xl p-2.5 sm:p-3">
                                <dt className="text-hero-muted text-[13px]">{share.label}</dt>
                                <dd className="text-on-hero-gold mt-1 font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums sm:text-lg">
                                    {formatFcfa(share.value)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>

            <dl className="grid grid-cols-2 gap-3">
                <Figure label="Chiffre d'affaires" value={formatFcfa(total.revenue)}>
                    {previous && <Change compact now={total.revenue} before={previous.revenue} />}
                </Figure>
                <Figure label="Dépenses publicitaires" value={formatFcfa(total.ad_spend)}>
                    {total.revenue > 0 && <p className="text-muted-foreground mt-1 text-[13px]">{formatPercent(adShare)} du chiffre d'affaires</p>}
                </Figure>
                <Figure label="Produits livrés" value={formatNumber(total.delivered)}>
                    {period.days > 1 && (
                        <p className="text-muted-foreground mt-1 text-[13px]">{formatNumber(total.delivered / period.days)} par jour en moyenne</p>
                    )}
                </Figure>
                <Figure label="Marge" value={formatPercent(total.margin)} />
                <Figure label="La pub vous coûte, par produit livré" value={formatFcfa(total.ad_spend_per_delivered)} wide />
            </dl>
        </section>
    );
}

function Figure({ label, value, wide = false, children }: { label: string; value: string; wide?: boolean; children?: React.ReactNode }) {
    return (
        <div className={cn('glass rounded-2xl p-4 md:p-[18px]', wide && 'col-span-2')}>
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="mt-1.5 font-[family-name:var(--font-display)] text-[22px] font-semibold tabular-nums md:text-[26px]">{value}</dd>
            {children}
        </div>
    );
}

function AgencyTable({ rows, total }: { rows: Row[]; total: Row }) {
    const cell = (row: Row, column: (typeof columns)[number]) => (column.format ? column.format(row) : formatNumber(row[column.key] as number));
    const ranked = [...rows].sort((a, b) => b.profit - a.profit);
    const positiveTotal = ranked.reduce((sum, row) => sum + Math.max(0, row.profit), 0);

    return (
        <section aria-labelledby="by-agency" className="glass rounded-2xl px-4 pt-5 pb-2 md:px-5">
            <h2 id="by-agency" className="text-lg font-semibold">
                {ranked.length > 1 ? 'Vos agences, de la plus rentable à la moins rentable' : 'Votre agence'}
            </h2>

            <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[680px] text-[15px]">
                    <caption className="sr-only">Résultats par agence, en francs CFA, classés par bénéfice net</caption>
                    <thead className="text-muted-foreground text-left text-[13px]">
                        <tr>
                            <th scope="col" className="px-2 py-2.5 font-bold">
                                Agence
                            </th>
                            <th scope="col" className="px-2 py-2.5 text-right font-bold">
                                Ventes
                            </th>
                            <th scope="col" className="px-2 py-2.5 text-right font-bold">
                                Livrés
                            </th>
                            <th
                                scope="col"
                                className="px-2 py-2.5 text-right font-bold"
                                title="Coût d'achat, publicité, closing, livraison et autres frais"
                            >
                                Coûts et pub
                            </th>
                            <th scope="col" className="px-2 py-2.5 text-right font-bold">
                                Bénéfice net
                            </th>
                            <th scope="col" className="w-[200px] px-2 py-2.5 font-bold">
                                Part du bénéfice
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranked.map((row) => {
                            const costs = row.revenue - row.profit;
                            const share = positiveTotal > 0 && row.profit > 0 ? row.profit / positiveTotal : 0;

                            return (
                                <tr key={row.name} className="border-t">
                                    <th scope="row" className="px-2 py-3.5 text-left font-bold whitespace-nowrap">
                                        {row.name}
                                    </th>
                                    <td className="px-2 py-3.5 text-right tabular-nums">{formatFcfa(row.revenue)}</td>
                                    <td className="px-2 py-3.5 text-right tabular-nums">{formatNumber(row.delivered)}</td>
                                    <td className="px-2 py-3.5 text-right tabular-nums">{formatFcfa(costs)}</td>
                                    <td className={cn('px-2 py-3.5 text-right font-bold tabular-nums', row.profit < 0 && 'text-danger-fg')}>
                                        {row.profit < 0 && <span className="sr-only">Perte de </span>}
                                        {formatFcfa(row.profit)}
                                    </td>
                                    <td className="px-2 py-3.5">
                                        {row.profit < 0 ? (
                                            <span className="badge-danger inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold">
                                                <ArrowDownRight className="size-3.5" aria-hidden="true" />
                                                En perte
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2.5">
                                                <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full" aria-hidden="true">
                                                    <span
                                                        className="bg-chart-1 block h-full rounded-full"
                                                        style={{ width: `${Math.round(share * 100)}%` }}
                                                    />
                                                </span>
                                                <span className="w-11 text-right text-sm font-bold tabular-nums">{Math.round(share * 100)} %</span>
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <details className="group border-t py-1">
                <summary className="text-primary flex min-h-11 items-center gap-1.5 text-sm font-bold">
                    <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden="true" />
                    Voir toutes les colonnes
                </summary>
                <div className="overflow-x-auto pb-3">
                    <table className="w-full min-w-[960px] text-sm">
                        <caption className="sr-only">Détail complet par agence, en francs CFA</caption>
                        <thead className="text-muted-foreground text-left text-[13px]">
                            <tr>
                                <th scope="col" className="px-2 py-2.5 font-bold">
                                    Agence
                                </th>
                                {columns.map((column) => (
                                    <th
                                        key={column.key}
                                        scope="col"
                                        title={column.help}
                                        className="px-2 py-2.5 text-right font-bold whitespace-nowrap"
                                    >
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ranked.map((row) => (
                                <tr key={row.name} className="border-t">
                                    <th scope="row" className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">
                                        {row.name}
                                    </th>
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={cn(
                                                'px-2 py-2.5 text-right tabular-nums',
                                                column.key === 'profit' && row.profit < 0 && 'text-danger-fg font-bold',
                                            )}
                                        >
                                            {cell(row, column)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-foreground/20 border-t-2">
                                <th scope="row" className="px-2 py-2.5 text-left font-bold">
                                    Total
                                </th>
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={cn(
                                            'px-2 py-2.5 text-right font-bold tabular-nums',
                                            column.key === 'profit' && total.profit < 0 && 'text-danger-fg',
                                        )}
                                    >
                                        {cell(total, column)}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </details>
        </section>
    );
}

const ENTRIES_SHOWN = 8;

function EntryList({ entries, countryId, period }: { entries: Entry[]; countryId: number | null; period: Period }) {
    const [all, setAll] = useState(false);
    // Newest first: the report just added is the one the merchant looks for.
    const shown = (all ? [...entries] : entries.slice(-ENTRIES_SHOWN)).reverse();

    return (
        <section aria-labelledby="entries" className="space-y-3">
            <div className="flex items-center justify-between gap-4">
                <h2 id="entries" className="text-lg font-semibold">
                    Rapports reçus sur la période
                </h2>
            </div>

            {entries.length === 0 ? (
                <div className="glass space-y-3 rounded-2xl p-6 text-sm">
                    <p className="text-base font-bold">Aucun rapport sur cette période</p>
                    <p className="text-muted-foreground">Collez le message WhatsApp de l'agence, ou saisissez ses chiffres à la main.</p>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild>
                            <Link href={route('messages.create')}>Coller un message WhatsApp</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={route('reports.create')}>Saisir un rapport</Link>
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="glass overflow-x-auto rounded-2xl">
                    <table className="w-full min-w-[760px] text-sm">
                        <caption className="sr-only">Rapports reçus sur la période, en francs CFA</caption>
                        <thead className="text-muted-foreground text-left text-[13px]">
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
                            {shown.map((entry) => (
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
                                                className="text-danger-fg inline-flex items-center gap-1 font-semibold"
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
                                                'rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
                                                entry.status === 'counted' && 'badge-success',
                                                entry.status === 'detail' && 'badge-neutral',
                                                entry.status === 'to_verify' && 'badge-warning',
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
                    {entries.length > ENTRIES_SHOWN && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-sm">
                            <span className="text-muted-foreground">
                                {all ? `${entries.length} rapports` : `Les ${ENTRIES_SHOWN} plus récents sur ${entries.length}`}
                            </span>
                            <span className="flex flex-wrap gap-4">
                                <button
                                    type="button"
                                    onClick={() => setAll(!all)}
                                    className="text-primary min-h-11 font-bold underline-offset-4 hover:underline"
                                >
                                    {all ? 'Voir moins' : 'Tout afficher'}
                                </button>
                                <Link
                                    href={route('reports.history', { pays: countryId ?? undefined, du: period.from, au: period.to })}
                                    className="text-primary inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline"
                                >
                                    Ouvrir dans l'historique
                                </Link>
                            </span>
                        </div>
                    )}
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

    const dateInput =
        'border-input bg-card focus-visible:ring-ring h-11 rounded-xl border px-3 text-[15px] font-medium tabular-nums focus-visible:ring-[3px] focus-visible:outline-hidden';
    const changeCountry = (id: number) =>
        show(
            period.type === 'custom'
                ? { country: id, period: 'custom', du: period.from, au: period.to }
                : { country: id, period: period.type, date: period.from },
        );

    return (
        <section aria-label="Filtres" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {countries.length <= 4 ? (
                    <div role="group" aria-label="Pays" className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
                        {countries.map((country) => (
                            <button
                                key={country.id}
                                type="button"
                                aria-pressed={country.id === countryId}
                                onClick={() => country.id !== countryId && changeCountry(country.id)}
                                className={cn(
                                    'h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors duration-150',
                                    country.id === countryId ? 'bg-foreground text-background border-foreground' : 'bg-card hover:bg-accent',
                                )}
                            >
                                {country.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Label htmlFor="report-country">Pays</Label>
                        <NativeSelect
                            id="report-country"
                            className="h-11 w-auto"
                            value={countryId ?? ''}
                            onChange={(e) => changeCountry(Number(e.target.value))}
                        >
                            {countries.map((country) => (
                                <option key={country.id} value={country.id}>
                                    {country.name}
                                </option>
                            ))}
                        </NativeSelect>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <div role="group" aria-label="Période" className="bg-muted flex max-w-full gap-0.5 overflow-x-auto rounded-[14px] p-1">
                        {periodChoices.map((choice) => (
                            <button
                                key={choice.value}
                                type="button"
                                aria-pressed={activeType === choice.value}
                                onClick={() => showType(choice.value)}
                                className={cn(
                                    'min-h-10 rounded-[10px] px-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150',
                                    activeType === choice.value
                                        ? 'bg-card text-foreground font-bold shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {choice.label}
                            </button>
                        ))}
                    </div>

                    {!custom && fixed && (
                        <div className="flex flex-wrap items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Période précédente"
                                onClick={() => show({ period: period.type, date: period.previous })}
                            >
                                <ChevronLeft aria-hidden="true" />
                            </Button>
                            <label htmlFor="report-date" className="sr-only">
                                Date
                            </label>
                            <input
                                id="report-date"
                                type="date"
                                value={period.from}
                                onChange={(e) => e.target.value && show({ period: period.type, date: e.target.value })}
                                className={dateInput}
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
                    )}
                </div>
            </div>

            {custom && (
                <form onSubmit={submitRange} aria-label="Choisir les dates" className="glass w-full space-y-3 rounded-2xl p-4">
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
                                className={dateInput}
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
                                className={dateInput}
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
                                className="bg-card hover:bg-accent min-h-10 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-150"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </form>
            )}
        </section>
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
                <h2 id="goals-title" className="text-lg font-semibold">
                    Mes objectifs
                </h2>
                <Link
                    href={route('goals.index')}
                    className="text-primary inline-flex min-h-11 items-center text-sm font-bold underline-offset-4 hover:underline"
                >
                    Voir mes objectifs
                </Link>
            </div>

            {reached.length > 0 && (
                <p role="status" className="badge-success flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold">
                    <Trophy className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Bravo, objectif{reached.length > 1 ? 's' : ''} atteint{reached.length > 1 ? 's' : ''} :{' '}
                    {reached.map((goal) => goal.title).join(', ')} !
                </p>
            )}

            {missed.length > 0 && (
                <p className="badge-danger flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
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
