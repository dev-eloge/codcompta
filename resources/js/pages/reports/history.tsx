import { Pagination, type PaginationLink } from '@/components/admin/pagination';
import FlashMessage from '@/components/flash-message';
import { NativeSelect } from '@/components/native-select';
import { ReportTabs } from '@/components/reports/report-tabs';
import { DeleteButton } from '@/components/row-actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa, formatNumber, formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ClipboardPlus, FileSpreadsheet, History, Pencil, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';

type Status = 'counted' | 'detail' | 'to_verify';
type Source = 'manual' | 'message' | 'sheet';

interface HistoryReport {
    id: number;
    country: string;
    agency: string;
    period_start: string;
    period_end: string;
    delivered: number;
    revenue: number;
    fees: number;
    status: Status;
    source: Source;
    created_at: string | null;
}

interface Filters {
    pays: number | null;
    agence: number | null;
    statut: Status | null;
    source: Source | null;
    du: string | null;
    au: string | null;
}

interface Props {
    reports: { data: HistoryReport[]; links: PaginationLink[]; total: number; from: number | null; to: number | null };
    filters: Filters;
    countries: { id: number; name: string; agencies: { id: number; name: string }[] }[];
    total: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Mes rapports', href: '/rapports' },
    { title: 'Historique', href: '/rapports/historique' },
];

const statusLabels: Record<Status, string> = { counted: 'Compté', detail: 'Détail, non compté', to_verify: 'À vérifier' };
const sourceLabels: Record<Source, string> = { manual: 'Saisi à la main', message: 'Message WhatsApp', sheet: 'Google Sheet' };
const savedAt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const selectClass = 'w-full sm:w-auto';
const dateClass =
    'border-input bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-hidden sm:w-auto';

export default function ReportsHistory({ reports, filters, countries, total }: Props) {
    const [draft, setDraft] = useState({ du: filters.du ?? '', au: filters.au ?? '' });
    const agencies = filters.pays
        ? (countries.find((country) => country.id === filters.pays)?.agencies ?? [])
        : countries.flatMap((country) => country.agencies);
    const filtered = Object.values(filters).some((value) => value !== null && value !== '');

    const visit = (changes: Partial<Record<keyof Filters, string | number | null>>) => {
        const next = { ...filters, ...changes };
        const params = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== null && value !== ''));

        router.get(route('reports.history'), params, { preserveScroll: true, preserveState: true, replace: true });
    };

    const applyDates = (event: FormEvent) => {
        event.preventDefault();
        visit({ du: draft.du || null, au: draft.au || null });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historique des rapports" />

            <div className="flex flex-col gap-5 p-4 md:p-6">
                <ReportTabs />
                <FlashMessage />

                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">Historique des rapports</h1>
                        <p className="text-muted-foreground max-w-2xl text-sm">
                            Tous les rapports reçus de vos agences, du plus récent au plus ancien. Filtrez par pays, agence, statut ou dates pour
                            retrouver un rapport, le corriger ou le supprimer.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="self-start sm:self-auto">
                        <Link href={route('reports.create')}>
                            <ClipboardPlus aria-hidden="true" />
                            Saisir un rapport
                        </Link>
                    </Button>
                </header>

                <section aria-label="Filtres" className="glass grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
                    <div className="grid gap-1.5">
                        <Label htmlFor="history-country">Pays</Label>
                        <NativeSelect
                            id="history-country"
                            className={selectClass}
                            value={filters.pays ?? ''}
                            onChange={(event) => visit({ pays: event.target.value || null, agence: null })}
                        >
                            <option value="">Tous les pays</option>
                            {countries.map((country) => (
                                <option key={country.id} value={country.id}>
                                    {country.name}
                                </option>
                            ))}
                        </NativeSelect>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="history-agency">Agence</Label>
                        <NativeSelect
                            id="history-agency"
                            className={selectClass}
                            value={filters.agence ?? ''}
                            onChange={(event) => visit({ agence: event.target.value || null })}
                        >
                            <option value="">Toutes les agences</option>
                            {agencies.map((agency) => (
                                <option key={agency.id} value={agency.id}>
                                    {agency.name}
                                </option>
                            ))}
                        </NativeSelect>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="history-status">Statut</Label>
                        <NativeSelect
                            id="history-status"
                            className={selectClass}
                            value={filters.statut ?? ''}
                            onChange={(event) => visit({ statut: event.target.value || null })}
                        >
                            <option value="">Tous les statuts</option>
                            <option value="counted">Compté</option>
                            <option value="to_verify">À vérifier</option>
                            <option value="detail">Détail, non compté</option>
                        </NativeSelect>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="history-source">Source</Label>
                        <NativeSelect
                            id="history-source"
                            className={selectClass}
                            value={filters.source ?? ''}
                            onChange={(event) => visit({ source: event.target.value || null })}
                        >
                            <option value="">Toutes</option>
                            <option value="manual">Saisi à la main</option>
                            <option value="message">Message WhatsApp</option>
                            <option value="sheet">Google Sheet (ancien import)</option>
                        </NativeSelect>
                    </div>
                    <form onSubmit={applyDates} className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-1">
                        <div className="grid flex-1 gap-1.5">
                            <Label htmlFor="history-from">Fin de période du</Label>
                            <input
                                id="history-from"
                                type="date"
                                className={dateClass}
                                value={draft.du}
                                max={draft.au || undefined}
                                onChange={(event) => setDraft({ ...draft, du: event.target.value })}
                            />
                        </div>
                        <div className="grid flex-1 gap-1.5">
                            <Label htmlFor="history-to">au</Label>
                            <input
                                id="history-to"
                                type="date"
                                className={dateClass}
                                value={draft.au}
                                min={draft.du || undefined}
                                onChange={(event) => setDraft({ ...draft, au: event.target.value })}
                            />
                        </div>
                        <Button type="submit" variant="outline">
                            Filtrer
                        </Button>
                    </form>
                    {filtered && (
                        <Button
                            variant="ghost"
                            className="justify-self-start"
                            onClick={() => {
                                setDraft({ du: '', au: '' });
                                router.get(route('reports.history'));
                            }}
                        >
                            <X aria-hidden="true" />
                            Effacer les filtres
                        </Button>
                    )}
                </section>

                {reports.data.length === 0 ? (
                    <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
                        <span aria-hidden="true" className="bg-primary/12 text-primary flex size-12 items-center justify-center rounded-full">
                            <History className="size-6" />
                        </span>
                        <p className="font-semibold">{total === 0 ? 'Aucun rapport pour l’instant' : 'Aucun rapport ne correspond à ces filtres'}</p>
                        <p className="text-muted-foreground max-w-sm text-sm">
                            {total === 0
                                ? 'Les rapports que vous saisissez ou que CODCompta lit dans les messages WhatsApp apparaîtront ici.'
                                : 'Essayez d’autres dates ou effacez les filtres.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="glass overflow-x-auto rounded-2xl">
                            <table className="w-full min-w-[860px] text-sm">
                                <caption className="sr-only">Historique des rapports, montants en francs CFA</caption>
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
                                        <th scope="col" className="px-3 py-3 text-right font-semibold">
                                            Ventes
                                        </th>
                                        <th scope="col" className="px-3 py-3 text-right font-semibold">
                                            Frais
                                        </th>
                                        <th scope="col" className="px-3 py-3 font-semibold">
                                            Statut et source
                                        </th>
                                        <th scope="col" className="px-3 py-3 font-semibold">
                                            Enregistré le
                                        </th>
                                        <th scope="col" className="w-24 px-2 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.data.map((report) => (
                                        <tr key={report.id} className="border-t">
                                            <td className="px-4 py-2.5 whitespace-nowrap">{formatPeriod(report.period_start, report.period_end)}</td>
                                            <td className="px-3 py-2.5">
                                                <span className="font-medium">{report.agency}</span>
                                                <span className="text-muted-foreground block text-xs">{report.country}</span>
                                            </td>
                                            <td className="px-3 py-2.5 text-right">{formatNumber(report.delivered)}</td>
                                            <td className="px-3 py-2.5 text-right font-semibold">{formatFcfa(report.revenue)}</td>
                                            <td className="px-3 py-2.5 text-right">{formatFcfa(report.fees)}</td>
                                            <td className="px-3 py-2.5">
                                                <span
                                                    className={cn(
                                                        'rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
                                                        report.status === 'counted' && 'bg-primary/12 text-primary',
                                                        report.status === 'detail' && 'bg-muted text-muted-foreground',
                                                        report.status === 'to_verify' &&
                                                            'bg-secondary/30 text-secondary-foreground dark:text-secondary',
                                                    )}
                                                >
                                                    {statusLabels[report.status]}
                                                </span>
                                                <span className="text-muted-foreground mt-1 block text-xs">{sourceLabels[report.source]}</span>
                                            </td>
                                            <td className="text-muted-foreground px-3 py-2.5 text-xs whitespace-nowrap">
                                                {report.created_at ? savedAt.format(new Date(report.created_at)) : '–'}
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <div className="flex justify-end">
                                                    {report.source === 'sheet' ? (
                                                        <span
                                                            role="img"
                                                            aria-label="Importé d'un Google Sheet : pour le corriger, supprimez-le puis saisissez-le à nouveau"
                                                            title="Importé d'un Google Sheet : pour le corriger, supprimez-le puis saisissez-le à nouveau"
                                                            className="text-muted-foreground flex size-10 items-center justify-center"
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
                                                                href={route('reports.edit', report.id)}
                                                                aria-label={`Modifier le rapport ${report.agency} ${formatPeriod(report.period_start, report.period_end)}`}
                                                            >
                                                                <Pencil className="size-4" aria-hidden="true" />
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    <DeleteButton
                                                        label={`Supprimer le rapport ${report.agency} ${formatPeriod(report.period_start, report.period_end)}`}
                                                        title="Supprimer ce rapport ?"
                                                        description={`${report.agency}, ${formatPeriod(report.period_start, report.period_end)} : ${formatFcfa(report.revenue)} de ventes. Les résultats de la période seront recalculés. Cette action est définitive.`}
                                                        url={route('reports.destroy', report.id)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                            <p className="text-muted-foreground text-sm tabular-nums">
                                {reports.from} à {reports.to} sur {reports.total} rapport{reports.total > 1 ? 's' : ''}
                            </p>
                            <Pagination links={reports.links} />
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
