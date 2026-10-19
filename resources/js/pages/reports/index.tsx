import FlashMessage from '@/components/flash-message';
import { NativeSelect } from '@/components/native-select';
import { DeleteButton } from '@/components/row-actions';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa, formatNumber, formatPercent, formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ClipboardPlus, FileSpreadsheet, Pencil } from 'lucide-react';

type PeriodType = 'day' | 'week' | 'month';

interface Country {
    id: number;
    name: string;
    code: string;
}

interface Period {
    type: PeriodType;
    from: string;
    to: string;
    label: string;
    previous: string;
    next: string;
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

const sourceLabels: Record<Entry['source'], string> = { manual: 'Saisi', message: 'Message', sheet: 'Sheet' };

interface Props {
    countries: Country[];
    countryId: number | null;
    period: Period;
    report: { agencies: Row[]; total: Row } | null;
    entries: Entry[];
    sheetImportsToCheck: { id: number; rows: number }[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Rapports', href: '/rapports' }];

const periodChoices: { value: PeriodType; label: string }[] = [
    { value: 'day', label: 'Jour' },
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
];

const statusLabels: Record<Entry['status'], string> = {
    counted: 'Compté',
    detail: 'Détail',
    to_verify: 'À vérifier',
};

const columns: { key: keyof Row; label: string; format?: (row: Row) => string }[] = [
    { key: 'delivered', label: 'Livrés', format: (row) => formatNumber(row.delivered) },
    { key: 'revenue', label: "Chiffre d'affaires" },
    { key: 'purchase_cost', label: "Coût d'achat" },
    { key: 'ad_spend', label: 'Pub' },
    { key: 'closing_fees', label: 'Closing' },
    { key: 'delivery_fees', label: 'Livraison' },
    { key: 'other_fees', label: 'Autres frais' },
    { key: 'profit', label: 'Bénéfice net' },
    { key: 'savings', label: 'Épargne' },
    { key: 'pocket', label: 'Poche' },
    { key: 'reinvestment', label: 'Réinvest.' },
    { key: 'margin', label: 'Marge', format: (row) => formatPercent(row.margin) },
];

export default function ReportsIndex({ countries, countryId, period, report, entries, sheetImportsToCheck }: Props) {
    const show = (changes: { country?: number; period?: PeriodType; date?: string }) => {
        router.get(
            route('reports.index'),
            { country: countryId ?? undefined, period: period.type, date: period.from, ...changes },
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rapports" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <FlashMessage />

                {sheetImportsToCheck.map((sheetImport) => (
                    <Link
                        key={sheetImport.id}
                        href={route('sheets.imports.show', sheetImport.id)}
                        className="border-secondary/50 bg-secondary/15 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-amber-900 backdrop-blur-md dark:text-amber-100"
                    >
                        <span>
                            {sheetImport.rows} nouvelle{sheetImport.rows > 1 ? 's' : ''} ligne{sheetImport.rows > 1 ? 's' : ''} de votre Google Sheet
                            à vérifier
                        </span>
                        <span className="font-semibold underline-offset-4 hover:underline">Vérifier</span>
                    </Link>
                ))}

                {countries.length === 0 ? (
                    <EmptyAccount />
                ) : (
                    <>
                        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-semibold tracking-tight">Rapport {period.label}</h1>
                                <p className="text-muted-foreground text-sm">
                                    Seuls les rapports « Compté » entrent dans les totaux. Un rapport compte dans la période de sa date de fin.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <NativeSelect
                                    aria-label="Pays"
                                    className="w-auto"
                                    value={countryId ?? ''}
                                    onChange={(e) => show({ country: Number(e.target.value) })}
                                >
                                    {countries.map((country) => (
                                        <option key={country.id} value={country.id}>
                                            {country.name}
                                        </option>
                                    ))}
                                </NativeSelect>

                                <div role="group" aria-label="Période" className="glass flex rounded-full p-1">
                                    {periodChoices.map((choice) => (
                                        <button
                                            key={choice.value}
                                            type="button"
                                            aria-pressed={period.type === choice.value}
                                            onClick={() => show({ period: choice.value })}
                                            className={cn(
                                                'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                                                period.type === choice.value
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {choice.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label="Période précédente"
                                        onClick={() => show({ date: period.previous })}
                                    >
                                        <ChevronLeft />
                                    </Button>
                                    <input
                                        type="date"
                                        aria-label="Date"
                                        value={period.from}
                                        onChange={(e) => e.target.value && show({ date: e.target.value })}
                                        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                                    />
                                    <Button variant="outline" size="icon" aria-label="Période suivante" onClick={() => show({ date: period.next })}>
                                        <ChevronRight />
                                    </Button>
                                </div>
                            </div>
                        </header>

                        {report && <Summary total={report.total} />}

                        {report && <AgencyTable rows={report.agencies} total={report.total} />}

                        <EntryList entries={entries} />
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function Summary({ total }: { total: Row }) {
    const figures = [
        { label: "Chiffre d'affaires", value: formatFcfa(total.revenue) },
        { label: 'Pub', value: formatFcfa(total.ad_spend) },
        { label: 'Produits livrés', value: formatNumber(total.delivered) },
        { label: 'Marge', value: formatPercent(total.margin) },
        { label: 'Pub par produit livré', value: formatFcfa(total.ad_spend_per_delivered) },
    ];

    return (
        <section aria-label="Résumé" className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
            <div className="glass-hero rounded-2xl p-6">
                <p className="text-sm font-medium text-white/80">Bénéfice net</p>
                <p
                    className={cn(
                        'mt-1 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums md:text-5xl',
                        total.profit < 0 && 'text-[#FFC9BC]',
                    )}
                >
                    {formatFcfa(total.profit)}
                </p>
                <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-white/20 pt-4 text-sm">
                    <div>
                        <dt className="text-white/70">Épargne</dt>
                        <dd className="font-bold text-[#FFD98A] tabular-nums">{formatFcfa(total.savings)}</dd>
                    </div>
                    <div>
                        <dt className="text-white/70">Poche</dt>
                        <dd className="font-bold text-[#FFD98A] tabular-nums">{formatFcfa(total.pocket)}</dd>
                    </div>
                    <div>
                        <dt className="text-white/70">Réinvest.</dt>
                        <dd className="font-bold text-[#FFD98A] tabular-nums">{formatFcfa(total.reinvestment)}</dd>
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
            <h2 id="by-agency" className="text-lg font-semibold">
                Par agence
            </h2>
            <div className="glass overflow-x-auto rounded-2xl">
                <table className="w-full min-w-[960px] text-sm">
                    <thead className="bg-primary/8 text-left">
                        <tr>
                            <th scope="col" className="px-4 py-3 font-semibold">
                                Agence
                            </th>
                            {columns.map((column) => (
                                <th key={column.key} scope="col" className="px-3 py-3 text-right font-semibold whitespace-nowrap">
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
                <Button asChild variant="outline" size="sm">
                    <Link href={route('reports.create')}>
                        <ClipboardPlus />
                        Saisir un rapport
                    </Link>
                </Button>
            </div>

            {entries.length === 0 ? (
                <p className="glass text-muted-foreground rounded-2xl p-6 text-sm">
                    Aucun rapport sur cette période. Saisissez les rapports des agences pour voir le bénéfice.
                </p>
            ) : (
                <div className="glass overflow-x-auto rounded-2xl">
                    <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-primary/8 text-left">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-semibold">
                                    Dates
                                </th>
                                <th scope="col" className="px-3 py-3 font-semibold">
                                    Agence
                                </th>
                                <th scope="col" className="px-3 py-3 text-right font-semibold">
                                    Livrés
                                </th>
                                <th scope="col" className="px-3 py-3 text-right font-semibold">
                                    Ventes
                                </th>
                                <th scope="col" className="px-3 py-3 text-right font-semibold">
                                    Total annoncé
                                </th>
                                <th scope="col" className="px-3 py-3 text-right font-semibold">
                                    Livraison
                                </th>
                                <th scope="col" className="px-4 py-3 font-semibold">
                                    Statut
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
                                    <td
                                        className={cn(
                                            'px-3 py-2.5 text-right tabular-nums',
                                            entry.announced_total !== null &&
                                                entry.announced_total !== entry.revenue &&
                                                'font-semibold text-amber-600',
                                        )}
                                    >
                                        {entry.announced_total === null ? '–' : formatNumber(entry.announced_total)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(entry.delivery_fees)}</td>
                                    <td className="px-4 py-2.5">
                                        <span
                                            className={cn(
                                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                                entry.status === 'counted' && 'bg-primary/12 text-primary',
                                                entry.status === 'detail' && 'bg-muted text-muted-foreground',
                                                entry.status === 'to_verify' && 'bg-secondary/30 text-amber-900 dark:text-amber-200',
                                            )}
                                        >
                                            {statusLabels[entry.status]}
                                        </span>
                                        <span className="text-muted-foreground ml-2 text-xs">{sourceLabels[entry.source]}</span>
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <div className="flex justify-end">
                                            {entry.source === 'sheet' ? (
                                                <span
                                                    className="text-muted-foreground/50 flex size-8 items-center justify-center"
                                                    title="Importé du Google Sheet : corrigez la ligne dans le Sheet puis synchronisez"
                                                >
                                                    <FileSpreadsheet className="size-4" aria-label="Importé du Google Sheet" />
                                                </span>
                                            ) : (
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:text-primary size-8"
                                                    title="Modifier ce rapport"
                                                >
                                                    <Link
                                                        href={route('reports.edit', entry.id)}
                                                        aria-label={`Modifier le rapport ${entry.agency} ${formatPeriod(entry.period_start, entry.period_end)}`}
                                                    >
                                                        <Pencil className="size-4" />
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
            <h1 className="text-xl font-semibold">Commencez par vos pays, agences et produits</h1>
            <p className="text-muted-foreground text-sm">
                Les rapports se calculent par pays et par agence, avec le coût d'achat de chaque produit. Ajoutez-les une fois, puis saisissez vos
                rapports.
            </p>
            <Button asChild>
                <Link href={route('reference.index')}>Ouvrir le référentiel</Link>
            </Button>
        </div>
    );
}
