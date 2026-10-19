import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa, formatNumber, formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePoll } from '@inertiajs/react';
import { CircleAlert, CircleCheck, LoaderCircle, RotateCcw } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

interface Proposal {
    row: number;
    kind: 'report' | 'ad_spend';
    shared: boolean;
    changed: boolean;
    label: string;
    period_start: string | null;
    period_end: string | null;
    agency_id: number | null;
    delivered: number;
    revenue: number;
    purchase_cost: number;
    ad_spend: number;
    closing_fees: number;
    delivery_fees: number;
    other_fees: number;
    profit: number;
    sheet_profit: number | null;
    status: 'counted' | 'detail';
    selected: boolean;
    warnings: string[];
}

interface Props {
    import: {
        id: number;
        status: 'pending' | 'ready' | 'failed' | 'done';
        error: string | null;
        warnings: string[];
        rows_read: number;
        proposals: Proposal[];
    };
    source: { id: number; spreadsheet_title: string; sheet_title: string; url: string; country: string };
    agencies: { id: number; name: string }[];
}

type Row = {
    row: number;
    selected: boolean;
    period_start: string;
    period_end: string;
    agency_id: string;
    status: 'counted' | 'detail';
};

export default function SheetsImport({ import: sheetImport, source, agencies }: Props) {
    const reading = sheetImport.status === 'pending';
    const { stop } = usePoll(2000, { only: ['import'] }, { autoStart: reading });

    useEffect(() => {
        if (!reading) {
            stop();
        }
    }, [reading, stop]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Google Sheets', href: '/sheets' },
        { title: source.sheet_title, href: `/sheets/lectures/${sheetImport.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Lignes de ${source.sheet_title}`} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {source.spreadsheet_title} › {source.sheet_title}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {source.country}.{' '}
                        <a href={source.url} target="_blank" rel="noreferrer" className="text-primary font-medium underline-offset-4 hover:underline">
                            Ouvrir le Sheet
                        </a>
                    </p>
                </div>

                {reading && (
                    <div role="status" className="glass flex items-center gap-3 rounded-2xl p-6">
                        <LoaderCircle className="text-primary size-5 animate-spin" />
                        <div>
                            <p className="font-semibold">Lecture du Sheet…</p>
                            <p className="text-muted-foreground text-sm">Quelques secondes en général. La page se met à jour seule.</p>
                        </div>
                    </div>
                )}

                {sheetImport.status === 'failed' && (
                    <div role="alert" className="glass space-y-4 rounded-2xl p-6">
                        <p className="flex items-start gap-2 font-semibold">
                            <CircleAlert className="text-destructive mt-0.5 size-5 shrink-0" />
                            {sheetImport.error}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button onClick={() => router.post(route('sheets.sync', source.id))}>
                                <RotateCcw />
                                Relire le Sheet
                            </Button>
                            <Button asChild variant="ghost">
                                <Link href={route('sheets.edit', source.id)}>Vérifier les colonnes</Link>
                            </Button>
                        </div>
                    </div>
                )}

                {sheetImport.status === 'done' && (
                    <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
                        <p className="flex items-center gap-2 font-semibold">
                            <CircleCheck className="text-primary size-5" />
                            {sheetImport.proposals.length === 0
                                ? 'Aucune nouvelle ligne : le Sheet est déjà à jour.'
                                : 'Cette lecture a été importée.'}
                        </p>
                        <Button asChild>
                            <Link href={route('reports.index')}>Voir les rapports</Link>
                        </Button>
                    </div>
                )}

                {sheetImport.warnings.length > 0 && (
                    <ul className="border-secondary/50 bg-secondary/15 space-y-1 rounded-xl border px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                        {sheetImport.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                )}

                {sheetImport.status === 'ready' && sheetImport.proposals.length > 0 && (
                    <ReviewForm importId={sheetImport.id} proposals={sheetImport.proposals} agencies={agencies} />
                )}
            </div>
        </AppLayout>
    );
}

function ReviewForm({ importId, proposals, agencies }: { importId: number; proposals: Proposal[]; agencies: Props['agencies'] }) {
    const { data, setData, transform, post, processing, errors } = useForm<{ rows: Row[] }>({
        rows: proposals.map((proposal) => ({
            row: proposal.row,
            selected: proposal.selected,
            period_start: proposal.period_start ?? '',
            period_end: proposal.period_end ?? '',
            agency_id: proposal.agency_id === null ? '' : String(proposal.agency_id),
            status: proposal.status,
        })),
    });

    const update = (index: number, changes: Partial<Row>) =>
        setData(
            'rows',
            data.rows.map((row, i) => (i === index ? { ...row, ...changes } : row)),
        );

    const chosen = data.rows.filter((row) => row.selected);
    const chosenProposals = proposals.filter((_, index) => data.rows[index].selected);
    const totalRevenue = chosenProposals.reduce((sum, proposal) => sum + proposal.revenue, 0);
    const totalProfit = chosenProposals.reduce((sum, proposal) => sum + proposal.profit, 0);
    const allSelected = chosen.length === data.rows.length;
    const fieldError = (key: string) => (errors as Record<string, string | undefined>)[key];

    transform((current) => ({ rows: current.rows.filter((row) => row.selected) }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('sheets.imports.confirm', importId), { preserveScroll: true });
    };

    const errorFor = (index: number) => {
        const position = chosen.indexOf(data.rows[index]);

        return position === -1
            ? undefined
            : (fieldError(`rows.${position}.period_start`) ?? fieldError(`rows.${position}.period_end`) ?? fieldError(`rows.${position}.agency_id`));
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">
                        {proposals.length} ligne{proposals.length > 1 ? 's' : ''} à vérifier
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Les montants viennent du Sheet. Corrigez si besoin la date, l'agence ou le statut, décochez ce qui ne doit pas entrer.
                    </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                        type="checkbox"
                        className="accent-primary size-4"
                        checked={allSelected}
                        onChange={(e) =>
                            setData(
                                'rows',
                                data.rows.map((row) => ({ ...row, selected: e.target.checked })),
                            )
                        }
                    />
                    Tout cocher
                </label>
            </div>

            <InputError message={fieldError('rows')} />

            <div className="glass overflow-x-auto rounded-2xl">
                <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-primary/8 text-left">
                        <tr>
                            <th scope="col" className="w-10 px-3 py-3">
                                <span className="sr-only">Importer</span>
                            </th>
                            <th scope="col" className="px-3 py-3 font-semibold">
                                Ligne du Sheet
                            </th>
                            <th scope="col" className="px-3 py-3 font-semibold">
                                Dates
                            </th>
                            <th scope="col" className="px-3 py-3 font-semibold">
                                Agence
                            </th>
                            <th scope="col" className="px-3 py-3 text-right font-semibold">
                                Livrés
                            </th>
                            <th scope="col" className="px-3 py-3 text-right font-semibold">
                                CA
                            </th>
                            <th scope="col" className="px-3 py-3 text-right font-semibold">
                                Achat
                            </th>
                            <th scope="col" className="px-3 py-3 text-right font-semibold">
                                Pub
                            </th>
                            <th scope="col" className="px-3 py-3 text-right font-semibold">
                                Frais
                            </th>
                            <th scope="col" className="px-3 py-3 text-right font-semibold">
                                Bénéfice
                            </th>
                            <th scope="col" className="px-3 py-3 font-semibold">
                                Statut
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {proposals.map((proposal, index) => {
                            const row = data.rows[index];
                            const fees = proposal.closing_fees + proposal.delivery_fees + proposal.other_fees;
                            const error = errorFor(index);

                            return (
                                <tr key={proposal.row} className={cn('border-t align-top', !row.selected && 'opacity-55')}>
                                    <td className="px-3 py-3">
                                        <input
                                            type="checkbox"
                                            className="accent-primary mt-1 size-4"
                                            aria-label={`Importer la ligne ${proposal.row}`}
                                            checked={row.selected}
                                            onChange={(e) => update(index, { selected: e.target.checked })}
                                        />
                                    </td>
                                    <td className="max-w-52 px-3 py-3">
                                        <p className="text-muted-foreground text-xs">Ligne {proposal.row}</p>
                                        <p className="font-medium">{proposal.label}</p>
                                        {proposal.kind === 'ad_spend' && (
                                            <span className="bg-muted text-muted-foreground mt-1 mr-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium">
                                                Pub seule
                                            </span>
                                        )}
                                        {proposal.changed && (
                                            <span className="bg-secondary/25 mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-200">
                                                Modifiée depuis le dernier import
                                            </span>
                                        )}
                                        {proposal.warnings.map((warning) => (
                                            <p key={warning} className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                                                {warning}
                                            </p>
                                        ))}
                                        {error && <InputError message={error} className="mt-1" />}
                                    </td>
                                    <td className="px-3 py-3">
                                        {proposal.period_start &&
                                        row.period_start === proposal.period_start &&
                                        row.period_end === proposal.period_end ? (
                                            <span className="whitespace-nowrap">{formatPeriod(row.period_start, row.period_end)}</span>
                                        ) : (
                                            <div className="grid gap-1">
                                                <input
                                                    type="date"
                                                    aria-label={`Début, ligne ${proposal.row}`}
                                                    value={row.period_start}
                                                    onChange={(e) => update(index, { period_start: e.target.value })}
                                                    className="border-input bg-background rounded-md border px-2 py-1 text-xs"
                                                />
                                                <input
                                                    type="date"
                                                    aria-label={`Fin, ligne ${proposal.row}`}
                                                    value={row.period_end}
                                                    onChange={(e) => update(index, { period_end: e.target.value })}
                                                    className="border-input bg-background rounded-md border px-2 py-1 text-xs"
                                                />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-3">
                                        <NativeSelect
                                            aria-label={`Agence, ligne ${proposal.row}`}
                                            value={row.agency_id}
                                            onChange={(e) => update(index, { agency_id: e.target.value })}
                                            className={cn(
                                                'h-8 w-32 text-xs',
                                                row.agency_id === '' && proposal.kind === 'report' && 'border-secondary ring-secondary/40 ring-2',
                                            )}
                                        >
                                            <option value="">{proposal.kind === 'ad_spend' ? 'Tout le pays' : 'Choisir'}</option>
                                            {agencies.map((agency) => (
                                                <option key={agency.id} value={agency.id}>
                                                    {agency.name}
                                                </option>
                                            ))}
                                        </NativeSelect>
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums">{formatNumber(proposal.delivered)}</td>
                                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatNumber(proposal.revenue)}</td>
                                    <td className="px-3 py-3 text-right tabular-nums">{formatNumber(proposal.purchase_cost)}</td>
                                    <td className="px-3 py-3 text-right tabular-nums">{formatNumber(proposal.ad_spend)}</td>
                                    <td className="px-3 py-3 text-right tabular-nums">{formatNumber(fees)}</td>
                                    <td
                                        className={cn(
                                            'px-3 py-3 text-right font-semibold tabular-nums',
                                            proposal.profit < 0 ? 'text-destructive' : 'text-primary',
                                        )}
                                    >
                                        {formatNumber(proposal.profit)}
                                    </td>
                                    <td className="px-3 py-3">
                                        {proposal.kind === 'ad_spend' ? (
                                            <span className="text-muted-foreground text-xs">
                                                {row.agency_id === '' ? 'Partagée selon les ventes' : "Pub de l'agence"}
                                            </span>
                                        ) : (
                                            <NativeSelect
                                                aria-label={`Statut, ligne ${proposal.row}`}
                                                value={row.status}
                                                onChange={(e) => update(index, { status: e.target.value as Row['status'] })}
                                                className="h-8 w-24 text-xs"
                                            >
                                                <option value="counted">Compté</option>
                                                <option value="detail">Détail</option>
                                            </NativeSelect>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-xl dark:border-white/10 dark:bg-[#0d2f38]/95">
                <p className="text-sm">
                    <strong>{chosen.length}</strong> ligne{chosen.length > 1 ? 's' : ''} cochée{chosen.length > 1 ? 's' : ''} :{' '}
                    {formatFcfa(totalRevenue)} de CA, {formatFcfa(totalProfit)} de bénéfice avant pub partagée.
                </p>
                <Button type="submit" disabled={processing || chosen.length === 0}>
                    Importer {chosen.length} ligne{chosen.length > 1 ? 's' : ''}
                </Button>
            </div>
        </form>
    );
}
