import FlashMessage from '@/components/flash-message';
import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa, formatPeriod } from '@/lib/format';
import { messageStatus } from '@/pages/messages/create';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePoll } from '@inertiajs/react';
import { CircleAlert, CircleCheck, LoaderCircle, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

type Status = 'counted' | 'detail' | 'to_verify';

interface ProposedLine {
    label: string;
    product_id: number | null;
    quantity: number;
    amount: number;
}

interface Proposal {
    index: number;
    kind: 'day' | 'recap';
    period_start: string;
    period_end: string;
    lines: ProposedLine[];
    delivery_fees: number;
    closing_fees: number;
    other_fees: number;
    announced_total: number | null;
    note: string | null;
    warnings: string[];
    suggested_status: Status;
    recorded: { id: number; status: Status; revenue: number } | null;
}

interface Product {
    id: number;
    name: string;
    unit_cost: number | null;
}

interface Props {
    message: {
        id: number;
        body: string;
        status: 'received' | 'parsed' | 'failed' | 'validated';
        error: string | null;
        received_at: string;
        agency: { id: number; name: string; country: string };
    };
    warnings: string[];
    proposals: Proposal[];
    products: Product[];
}

type Line = {
    label: string;
    product_id: string;
    quantity: string;
    amount: string;
};

type ProposalForm = {
    agency_id: number;
    raw_message_id: number;
    period_start: string;
    period_end: string;
    status: Status;
    delivery_fees: string;
    closing_fees: string;
    other_fees: string;
    announced_total: string;
    note: string;
    lines: Line[];
};

const statusLabels: Record<Status, string> = {
    counted: 'Compté',
    detail: 'Détail',
    to_verify: 'À vérifier',
};

const toNumber = (value: string) => (value === '' ? 0 : Number(value));
const asText = (value: number | null) => (value === null || value === 0 ? '' : String(value));

export default function MessagesShow({ message, warnings, proposals, products }: Props) {
    const reading = message.status === 'received';
    const { stop } = usePoll(2000, { only: ['message', 'warnings', 'proposals'] }, { autoStart: reading });

    useEffect(() => {
        if (!reading) {
            stop();
        }
    }, [reading, stop]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Coller un message', href: '/messages/coller' },
        { title: message.agency.name, href: `/messages/${message.id}` },
    ];

    const recorded = proposals.filter((proposal) => proposal.recorded !== null).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Message de ${message.agency.name}`} />

            <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:p-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
                <aside className="glass h-fit space-y-3 rounded-2xl p-5 lg:sticky lg:top-4">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-semibold">Message reçu</h2>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${messageStatus[message.status].className}`}>
                            {messageStatus[message.status].label}
                        </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                        {message.agency.name}, {message.agency.country}
                    </p>
                    <pre className="bg-background/70 max-h-[28rem] overflow-auto rounded-xl border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                        {message.body}
                    </pre>
                </aside>

                <main className="min-w-0 space-y-5">
                    <FlashMessage />

                    {reading && (
                        <div role="status" className="glass flex items-center gap-3 rounded-2xl p-6">
                            <LoaderCircle className="text-primary size-5 animate-spin" />
                            <div>
                                <p className="font-semibold">Lecture du message…</p>
                                <p className="text-muted-foreground text-sm">
                                    Cela prend en général moins d'une minute. La page se met à jour seule.
                                </p>
                            </div>
                        </div>
                    )}

                    {message.status === 'failed' && (
                        <div role="alert" className="glass space-y-4 rounded-2xl p-6">
                            <div className="flex gap-3">
                                <CircleAlert className="text-destructive mt-0.5 size-5 shrink-0" />
                                <div>
                                    <p className="font-semibold">Le message n'a pas pu être lu</p>
                                    <p className="text-muted-foreground text-sm">{message.error}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button onClick={() => router.post(route('messages.retry', message.id))}>
                                    <RotateCcw />
                                    Relire le message
                                </Button>
                                <Button asChild variant="ghost">
                                    <Link href={route('reports.create')}>Saisir à la main</Link>
                                </Button>
                            </div>
                        </div>
                    )}

                    {!reading && message.status !== 'failed' && (
                        <>
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <h1 className="text-2xl font-semibold tracking-tight">
                                        {proposals.length === 0
                                            ? 'Aucun rapport trouvé'
                                            : `${proposals.length} rapport${proposals.length > 1 ? 's' : ''} à vérifier`}
                                    </h1>
                                    <p className="text-muted-foreground text-sm">
                                        Corrigez si besoin, puis enregistrez chaque rapport. Seuls les rapports « Compté » entrent dans les totaux.
                                    </p>
                                </div>
                                {proposals.length > 0 && (
                                    <p className="text-primary text-sm font-semibold">
                                        {recorded} sur {proposals.length} enregistré{recorded > 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>

                            {warnings.length > 0 && <WarningList warnings={warnings} />}

                            {proposals.map((proposal) =>
                                proposal.recorded ? (
                                    <RecordedCard key={proposal.index} proposal={proposal} />
                                ) : (
                                    <ProposalCard
                                        key={`${proposal.index}-${proposal.period_start}`}
                                        proposal={proposal}
                                        products={products}
                                        agencyId={message.agency.id}
                                        messageId={message.id}
                                    />
                                ),
                            )}

                            {recorded === proposals.length && proposals.length > 0 && (
                                <div className="flex flex-wrap gap-3">
                                    <Button asChild>
                                        <Link href={route('reports.index', { period: 'week', date: proposals[proposals.length - 1].period_end })}>
                                            Voir le rapport de la semaine
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href={route('messages.create')}>Coller un autre message</Link>
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </AppLayout>
    );
}

function WarningList({ warnings }: { warnings: string[] }) {
    return (
        <ul className="border-secondary/50 bg-secondary/15 space-y-1 rounded-xl border px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            {warnings.map((warning) => (
                <li key={warning} className="flex gap-2">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    {warning}
                </li>
            ))}
        </ul>
    );
}

function RecordedCard({ proposal }: { proposal: Proposal }) {
    const recorded = proposal.recorded!;

    return (
        <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-3">
                <CircleCheck className="text-primary size-5" />
                <div>
                    <p className="font-semibold">{formatPeriod(proposal.period_start, proposal.period_end)}</p>
                    <p className="text-muted-foreground text-sm">Enregistré en « {statusLabels[recorded.status]} »</p>
                </div>
            </div>
            <p className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">{formatFcfa(recorded.revenue)}</p>
        </div>
    );
}

function ProposalCard({ proposal, products, agencyId, messageId }: { proposal: Proposal; products: Product[]; agencyId: number; messageId: number }) {
    const { data, setData, post, processing, errors } = useForm<ProposalForm>({
        agency_id: agencyId,
        raw_message_id: messageId,
        period_start: proposal.period_start,
        period_end: proposal.period_end,
        status: proposal.suggested_status,
        delivery_fees: asText(proposal.delivery_fees),
        closing_fees: asText(proposal.closing_fees),
        other_fees: asText(proposal.other_fees),
        announced_total: proposal.announced_total === null ? '' : String(proposal.announced_total),
        note: proposal.note ?? '',
        lines: proposal.lines.map((line) => ({
            label: line.label,
            product_id: line.product_id === null ? '' : String(line.product_id),
            quantity: String(line.quantity),
            amount: String(line.amount),
        })),
    });

    const fieldError = (key: string) => (errors as Record<string, string | undefined>)[key];
    const productById = (id: string) => products.find((product) => String(product.id) === id);

    const updateLine = (index: number, changes: Partial<Line>) =>
        setData(
            'lines',
            data.lines.map((line, i) => (i === index ? { ...line, ...changes } : line)),
        );

    const sales = data.lines.reduce((sum, line) => sum + toNumber(line.amount), 0);
    const purchaseCost = data.lines.reduce((sum, line) => sum + toNumber(line.quantity) * (productById(line.product_id)?.unit_cost ?? 0), 0);
    const fees = toNumber(data.delivery_fees) + toNumber(data.closing_fees) + toNumber(data.other_fees);
    const mismatch = data.announced_total !== '' && toNumber(data.announced_total) !== sales;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('reports.store'), { preserveScroll: true });
    };

    const titleId = `proposal-${proposal.index}`;

    return (
        <form onSubmit={submit} aria-labelledby={titleId} className="glass space-y-5 rounded-2xl p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 id={titleId} className="text-lg font-semibold">
                        {formatPeriod(data.period_start, data.period_end)}
                    </h2>
                    <p className="text-muted-foreground text-sm">{proposal.kind === 'recap' ? 'Récapitulatif' : "Rapport d'un jour"}</p>
                </div>
                <div className="grid gap-1">
                    <Label htmlFor={`${titleId}-status`} className="text-muted-foreground text-xs">
                        Compter dans les totaux
                    </Label>
                    <NativeSelect
                        id={`${titleId}-status`}
                        value={data.status}
                        onChange={(e) => setData('status', e.target.value as Status)}
                        className="h-9 w-44"
                    >
                        <option value="counted">Oui (compté)</option>
                        <option value="detail">Non, détail</option>
                        <option value="to_verify">Non, à vérifier</option>
                    </NativeSelect>
                </div>
            </div>

            {proposal.warnings.length > 0 && <WarningList warnings={proposal.warnings} />}

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                    <Label htmlFor={`${titleId}-start`} className="text-muted-foreground text-xs">
                        Du
                    </Label>
                    <Input id={`${titleId}-start`} type="date" value={data.period_start} onChange={(e) => setData('period_start', e.target.value)} />
                    <InputError message={errors.period_start} />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor={`${titleId}-end`} className="text-muted-foreground text-xs">
                        Au
                    </Label>
                    <Input id={`${titleId}-end`} type="date" value={data.period_end} onChange={(e) => setData('period_end', e.target.value)} />
                    <InputError message={errors.period_end} />
                </div>
            </div>

            <div className="space-y-2">
                <InputError message={errors.lines} />
                {data.lines.map((line, index) => (
                    <div
                        key={index}
                        className="bg-background/70 grid grid-cols-[1fr_1fr_auto] items-start gap-3 rounded-xl border p-3 sm:grid-cols-[minmax(0,2fr)_5.5rem_minmax(0,1fr)_auto]"
                    >
                        <div className="col-span-3 grid gap-1 sm:col-span-1">
                            <Label htmlFor={`${titleId}-product-${index}`} className="text-muted-foreground text-xs">
                                {line.label ? `Écrit « ${line.label} »` : 'Produit'}
                            </Label>
                            <NativeSelect
                                id={`${titleId}-product-${index}`}
                                value={line.product_id}
                                onChange={(e) => updateLine(index, { product_id: e.target.value })}
                                className={line.product_id === '' ? 'border-secondary ring-secondary/40 ring-2' : undefined}
                            >
                                <option value="">Choisir le produit</option>
                                {products.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                    </option>
                                ))}
                            </NativeSelect>
                            <InputError message={fieldError(`lines.${index}.product_id`)} />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor={`${titleId}-quantity-${index}`} className="text-muted-foreground text-xs">
                                Livrés
                            </Label>
                            <Input
                                id={`${titleId}-quantity-${index}`}
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={line.quantity}
                                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                            />
                            <InputError message={fieldError(`lines.${index}.quantity`)} />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor={`${titleId}-amount-${index}`} className="text-muted-foreground text-xs">
                                Encaissé (F)
                            </Label>
                            <Input
                                id={`${titleId}-amount-${index}`}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={line.amount}
                                onChange={(e) => updateLine(index, { amount: e.target.value })}
                            />
                            <InputError message={fieldError(`lines.${index}.amount`)} />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-5"
                            aria-label="Retirer cette ligne"
                            disabled={data.lines.length === 1}
                            onClick={() =>
                                setData(
                                    'lines',
                                    data.lines.filter((_, i) => i !== index),
                                )
                            }
                        >
                            <Trash2 />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setData('lines', [...data.lines, { label: '', product_id: '', quantity: '1', amount: '' }])}
                >
                    <Plus />
                    Ajouter une ligne
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Money
                    id={`${titleId}-delivery`}
                    label="Livraison (F)"
                    value={data.delivery_fees}
                    error={errors.delivery_fees}
                    onChange={(v) => setData('delivery_fees', v)}
                />
                <Money
                    id={`${titleId}-closing`}
                    label="Closing (F)"
                    value={data.closing_fees}
                    error={errors.closing_fees}
                    onChange={(v) => setData('closing_fees', v)}
                />
                <Money
                    id={`${titleId}-other`}
                    label="Autres frais (F)"
                    value={data.other_fees}
                    error={errors.other_fees}
                    onChange={(v) => setData('other_fees', v)}
                />
                <Money
                    id={`${titleId}-announced`}
                    label="Total annoncé (F)"
                    value={data.announced_total}
                    error={errors.announced_total}
                    onChange={(v) => setData('announced_total', v)}
                />
            </div>

            <div className="grid gap-1">
                <Label htmlFor={`${titleId}-note`} className="text-muted-foreground text-xs">
                    Note
                </Label>
                <Input id={`${titleId}-note`} value={data.note} onChange={(e) => setData('note', e.target.value)} />
                <InputError message={errors.note} />
            </div>

            <div className="border-primary/25 bg-primary/8 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
                <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div>
                        <dt className="text-muted-foreground text-xs">Ventes</dt>
                        <dd className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">{formatFcfa(sales)}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground text-xs">Résultat avant pub</dt>
                        <dd className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">
                            {formatFcfa(sales - purchaseCost - fees)}
                        </dd>
                    </div>
                </dl>
                <Button type="submit" disabled={processing}>
                    Enregistrer ce rapport
                </Button>
                {mismatch && (
                    <p className="w-full text-sm font-medium text-amber-800 dark:text-amber-200">
                        Les lignes font {formatFcfa(sales)} mais l'agence annonce {formatFcfa(toNumber(data.announced_total))} : le rapport sera
                        marqué « à vérifier ».
                    </p>
                )}
            </div>
        </form>
    );
}

function Money({
    id,
    label,
    value,
    error,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid gap-1">
            <Label htmlFor={id} className="text-muted-foreground text-xs">
                {label}
            </Label>
            <Input id={id} type="number" inputMode="numeric" min={0} value={value} placeholder="0" onChange={(e) => onChange(e.target.value)} />
            <InputError message={error} />
        </div>
    );
}
