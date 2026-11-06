import FlashMessage from '@/components/flash-message';
import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { DeleteButton } from '@/components/row-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa, formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';
import { messageStatus } from '@/pages/messages/create';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePoll } from '@inertiajs/react';
import { CircleAlert, CircleCheck, LoaderCircle, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

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
    detail: 'Détail, non compté',
    to_verify: 'À vérifier',
};

const toNumber = (value: string) => (value === '' ? 0 : Number(value));
const asText = (value: number | null) => (value === null || value === 0 ? '' : String(value));

export default function MessagesShow({ message, warnings, proposals, products }: Props) {
    const reading = message.status === 'received';
    const poll = usePoll(2000, { only: ['message', 'warnings', 'proposals'] }, { autoStart: false });
    const pollRef = useRef(poll);
    pollRef.current = poll;
    const [slow, setSlow] = useState(false);

    // Ask the server every 2 seconds while the message is being read, including after "Réessayer",
    // so the reports appear without reloading the page.
    useEffect(() => {
        if (!reading) {
            pollRef.current.stop();
            setSlow(false);

            return;
        }

        pollRef.current.start();
        const timer = window.setTimeout(() => setSlow(true), 90_000);

        return () => {
            window.clearTimeout(timer);
            pollRef.current.stop();
        };
    }, [reading]);

    const [retrying, setRetrying] = useState(false);
    const retry = () =>
        router.post(route('messages.retry', message.id), {}, { onStart: () => setRetrying(true), onFinish: () => setRetrying(false) });
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Lire un message WhatsApp', href: '/messages/coller' },
        { title: message.agency.name, href: `/messages/${message.id}` },
    ];

    const recorded = proposals.filter((proposal) => proposal.recorded !== null).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Message de ${message.agency.name}`} />

            <h1 className="sr-only">Message WhatsApp de {message.agency.name}</h1>
            <div className="mx-auto grid w-full max-w-[1240px] items-start gap-6 px-4 py-6 md:px-8 md:py-8 lg:grid-cols-[24rem_minmax(0,1fr)]">
                <aside aria-label="Message collé" className="glass h-fit space-y-3 rounded-2xl p-5 lg:sticky lg:top-4">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-semibold">Message collé</h2>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${messageStatus[message.status].className}`}>
                            {messageStatus[message.status].label}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-muted-foreground text-xs">
                            {message.agency.name}, {message.agency.country}
                        </p>
                        <DeleteButton
                            label="Supprimer ce message"
                            title="Supprimer ce message ?"
                            description="Le texte collé et sa lecture seront supprimés. Les rapports déjà enregistrés depuis ce message sont gardés."
                            url={route('messages.destroy', message.id)}
                        />
                    </div>
                    <ol
                        tabIndex={0}
                        aria-label="Texte du message, ligne par ligne"
                        className="bg-muted/50 focus-visible:ring-ring max-h-[32rem] overflow-auto rounded-xl py-2 font-mono text-[13px] leading-relaxed focus-visible:ring-[3px] focus-visible:outline-hidden"
                    >
                        {message.body.split('\n').map((text, index) => (
                            <li key={index} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2 pr-3">
                                <span className="text-muted-foreground text-right tabular-nums select-none" aria-hidden="true">
                                    {index + 1}
                                </span>
                                <span className="break-words whitespace-pre-wrap">{text || '\u00a0'}</span>
                            </li>
                        ))}
                    </ol>
                </aside>

                <div className="min-w-0 space-y-5">
                    <FlashMessage />

                    {reading && (
                        <div role="status" className="glass space-y-4 rounded-2xl p-6">
                            <div className="flex items-center gap-3">
                                <LoaderCircle className="text-primary size-5 shrink-0 animate-spin" aria-hidden="true" />
                                <div>
                                    <p className="font-semibold">{slow ? 'La lecture prend plus de temps que prévu' : 'CODCompta lit le message…'}</p>
                                    <p className="text-muted-foreground text-sm">
                                        {slow
                                            ? 'Le service est peut-être chargé. Vous pouvez relancer la lecture, ou saisir ce rapport à la main pour ne pas attendre.'
                                            : "En général moins d'une minute. Restez sur cette page : les rapports trouvés s'afficheront tout seuls."}
                                    </p>
                                </div>
                            </div>
                            {slow && (
                                <div className="flex flex-wrap gap-3">
                                    <Button variant="outline" disabled={retrying} onClick={retry}>
                                        {retrying ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
                                        Relancer la lecture
                                    </Button>
                                    <Button asChild variant="ghost">
                                        <Link href={route('reports.create')}>Saisir à la main</Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {message.status === 'failed' && (
                        <div role="alert" className="glass space-y-4 rounded-2xl p-6">
                            <div className="flex gap-3">
                                <CircleAlert className="text-danger-fg mt-0.5 size-5 shrink-0" aria-hidden="true" />
                                <div>
                                    <p className="font-semibold">Le message n'a pas pu être lu</p>
                                    <p className="text-muted-foreground text-sm">{message.error}</p>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        Réessayez dans un instant, ou saisissez ce rapport à la main pour ne pas attendre.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button disabled={retrying} onClick={retry}>
                                    {retrying ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
                                    Réessayer la lecture
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
                                    <h2 className="text-[26px] font-bold">
                                        {proposals.length === 0
                                            ? 'Aucun rapport trouvé dans ce message'
                                            : `${proposals.length} rapport${proposals.length > 1 ? 's' : ''} trouvé${proposals.length > 1 ? 's' : ''} : vérifiez avant d'enregistrer`}
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        {proposals.length === 0
                                            ? 'Le message ne contient peut-être pas de chiffres de livraison. Vérifiez le texte, ou saisissez le rapport à la main.'
                                            : 'Comparez chaque ligne avec le message, puis enregistrez.'}
                                    </p>
                                </div>
                                {proposals.length > 0 && (
                                    <p role="status" className="badge-success rounded-full px-3 py-1 text-sm font-bold tabular-nums">
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
                                            Voir mes résultats de la semaine
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href={route('messages.create')}>Lire un autre message</Link>
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function WarningList({ warnings }: { warnings: string[] }) {
    return (
        <ul aria-label="Points à vérifier" className="badge-warning space-y-1 rounded-xl px-4 py-3 text-sm font-semibold">
            {warnings.map((warning) => (
                <li key={warning} className="flex gap-2">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
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
                <CircleCheck className="text-primary size-5" aria-hidden="true" />
                <div>
                    <p className="font-semibold">{formatPeriod(proposal.period_start, proposal.period_end)}</p>
                    <p className="text-muted-foreground text-sm">Enregistré, statut « {statusLabels[recorded.status]} »</p>
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
                    <h3 id={titleId} className="text-lg font-semibold">
                        {formatPeriod(data.period_start, data.period_end)}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        {proposal.kind === 'recap' ? 'Récapitulatif de plusieurs jours' : "Rapport d'un jour"}
                    </p>
                </div>
                <div className="grid gap-1">
                    <Label htmlFor={`${titleId}-status`} className="text-muted-foreground text-xs">
                        Compter dans le bénéfice ?
                    </Label>
                    <NativeSelect
                        id={`${titleId}-status`}
                        value={data.status}
                        onChange={(e) => setData('status', e.target.value as Status)}
                        className="w-56"
                    >
                        <option value="counted">Oui, le compter</option>
                        <option value="detail">Non, détail d'un récap</option>
                        <option value="to_verify">Non, à vérifier d'abord</option>
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
                        className="bg-muted/50 grid grid-cols-[1fr_1fr_auto] items-start gap-3 rounded-xl p-3 sm:grid-cols-[minmax(0,2fr)_6rem_minmax(0,1fr)_auto]"
                    >
                        <div className="col-span-3 grid gap-1 sm:col-span-1">
                            <Label htmlFor={`${titleId}-product-${index}`} className="flex items-center gap-2 text-xs">
                                <span
                                    className={cn(
                                        'grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold tabular-nums',
                                        line.product_id === '' ? 'badge-warning' : 'bg-foreground text-background',
                                    )}
                                    aria-hidden="true"
                                >
                                    {index + 1}
                                </span>
                                <span className="text-muted-foreground">{line.label ? `L'agence a écrit « ${line.label} »` : 'Produit'}</span>
                            </Label>
                            <NativeSelect
                                id={`${titleId}-product-${index}`}
                                aria-describedby={line.product_id === '' ? `${titleId}-product-${index}-help` : undefined}
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
                            {line.product_id === '' && (
                                <p id={`${titleId}-product-${index}-help`} className="flex items-center gap-1 text-xs font-medium">
                                    <CircleAlert className="size-3.5" aria-hidden="true" />
                                    Produit non reconnu : choisissez-le, CODCompta s'en souviendra.
                                </p>
                            )}
                            <InputError message={fieldError(`lines.${index}.product_id`)} />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor={`${titleId}-quantity-${index}`} className="text-muted-foreground text-xs">
                                Quantité livrée
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
                                Argent encaissé (F)
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
                            className="text-muted-foreground hover:bg-danger-bg hover:text-danger-fg mt-5"
                            aria-label={`Retirer la ligne ${index + 1}`}
                            title="Retirer cette ligne"
                            disabled={data.lines.length === 1}
                            onClick={() =>
                                setData(
                                    'lines',
                                    data.lines.filter((_, i) => i !== index),
                                )
                            }
                        >
                            <Trash2 aria-hidden="true" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setData('lines', [...data.lines, { label: '', product_id: '', quantity: '1', amount: '' }])}
                >
                    <Plus aria-hidden="true" />
                    Ajouter une ligne
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Money
                    id={`${titleId}-delivery`}
                    label="Frais de livraison (F)"
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
                    label="Total écrit par l'agence (F)"
                    value={data.announced_total}
                    error={errors.announced_total}
                    onChange={(v) => setData('announced_total', v)}
                />
            </div>

            <div className="grid gap-1">
                <Label htmlFor={`${titleId}-note`} className="text-muted-foreground text-xs">
                    Note (facultatif)
                </Label>
                <Input id={`${titleId}-note`} value={data.note} onChange={(e) => setData('note', e.target.value)} />
                <InputError message={errors.note} />
            </div>

            <div className="border-primary/25 bg-primary/8 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
                <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div>
                        <dt className="text-muted-foreground text-xs">Argent encaissé</dt>
                        <dd className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">{formatFcfa(sales)}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground text-xs">Reste avant publicité</dt>
                        <dd className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">
                            {formatFcfa(sales - purchaseCost - fees)}
                        </dd>
                    </div>
                </dl>
                <Button type="submit" disabled={processing}>
                    {processing && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                    Enregistrer ce rapport
                </Button>
                {mismatch && (
                    <p role="status" className="flex w-full items-start gap-2 text-sm font-medium">
                        <CircleAlert className="text-danger-fg mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>
                            Les lignes font {formatFcfa(sales)} mais l'agence a écrit {formatFcfa(toNumber(data.announced_total))} : le rapport sera
                            marqué « à vérifier ».
                        </span>
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
