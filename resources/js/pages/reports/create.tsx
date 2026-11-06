import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { CircleAlert, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useEffect, useRef } from 'react';

interface Agency {
    id: number;
    name: string;
    country: string;
}

interface Product {
    id: number;
    name: string;
    unit_cost: number | null;
    reference_price: number | null;
}

type Line = {
    product_id: string;
    quantity: string;
    amount: string;
    /** True while the amount follows quantity × selling price; false once the merchant types their own amount. */
    auto: boolean;
};

type ReportForm = {
    agency_id: string;
    period_start: string;
    period_end: string;
    status: 'counted' | 'detail' | 'to_verify';
    delivery_fees: string;
    closing_fees: string;
    other_fees: string;
    announced_total: string;
    note: string;
    lines: Line[];
};

interface EditedReport {
    id: number;
    agency_id: number;
    period_start: string;
    period_end: string;
    status: ReportForm['status'];
    delivery_fees: number;
    closing_fees: number;
    other_fees: number;
    announced_total: number | null;
    note: string | null;
    lines: { product_id: number; quantity: number; amount: number }[];
}

interface Props {
    agencies: Agency[];
    products: Product[];
    today: string;
    report?: EditedReport;
}

const emptyLine: Line = { product_id: '', quantity: '1', amount: '', auto: true };

const toNumber = (value: string) => (value === '' ? 0 : Number(value));

const amountText = (value: number | null) => (value === null || value === 0 ? '' : String(value));

export default function ReportsCreate({ agencies, products, today, report }: Props) {
    const editing = report !== undefined;
    const title = editing ? 'Modifier un rapport' : 'Saisir un rapport';
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Mes rapports', href: '/rapports' },
        { title, href: editing ? `/rapports/${report.id}/modifier` : '/rapports/saisie' },
    ];

    const { data, setData, post, put, processing, errors, transform } = useForm<ReportForm>(
        report
            ? {
                  agency_id: String(report.agency_id),
                  period_start: report.period_start,
                  period_end: report.period_end,
                  status: report.status,
                  delivery_fees: amountText(report.delivery_fees),
                  closing_fees: amountText(report.closing_fees),
                  other_fees: amountText(report.other_fees),
                  announced_total: report.announced_total === null ? '' : String(report.announced_total),
                  note: report.note ?? '',
                  lines: report.lines.map((line) => {
                      const price = products.find((product) => product.id === line.product_id)?.reference_price ?? null;

                      return {
                          product_id: String(line.product_id),
                          quantity: String(line.quantity),
                          amount: String(line.amount),
                          auto: price !== null && price * line.quantity === line.amount,
                      };
                  }),
              }
            : {
                  agency_id: agencies.length === 1 ? String(agencies[0].id) : '',
                  period_start: today,
                  period_end: today,
                  status: 'counted',
                  delivery_fees: '',
                  closing_fees: '',
                  other_fees: '',
                  announced_total: '',
                  note: '',
                  lines: [{ ...emptyLine }],
              },
    );

    const fieldError = (key: string) => (errors as Record<string, string | undefined>)[key];
    const errorCount = Object.keys(errors).length;
    const errorSummary = useRef<HTMLDivElement>(null);

    // After a refused save, bring the list of problems into view and to the screen reader.
    useEffect(() => {
        if (errorCount > 0) {
            errorSummary.current?.focus();
        }
    }, [errorCount]);

    const productById = (id: string) => products.find((product) => String(product.id) === id);

    /** quantity × selling price, or null when the product has no selling price. */
    const expectedAmount = (line: Pick<Line, 'product_id' | 'quantity'>) => {
        const price = productById(line.product_id)?.reference_price ?? null;

        return price === null || line.quantity === '' ? null : price * toNumber(line.quantity);
    };

    // A line whose amount was never typed by hand follows quantity × selling price.
    const updateLine = (index: number, changes: Partial<Line>) => {
        setData(
            'lines',
            data.lines.map((line, i) => {
                if (i !== index) {
                    return line;
                }

                const next = { ...line, ...changes };
                const expected = expectedAmount(next);

                return next.auto && expected !== null && changes.amount === undefined ? { ...next, amount: String(expected) } : next;
            }),
        );
    };

    const recalculate = (index: number) => {
        const expected = expectedAmount(data.lines[index]);

        setData(
            'lines',
            data.lines.map((line, i) => (i === index && expected !== null ? { ...line, amount: String(expected), auto: true } : line)),
        );
    };

    transform((current) => ({ ...current, lines: current.lines.map(({ auto: _auto, ...line }) => line) }));

    const salesTotal = data.lines.reduce((sum, line) => sum + toNumber(line.amount), 0);
    const purchaseCost = data.lines.reduce((sum, line) => sum + toNumber(line.quantity) * (productById(line.product_id)?.unit_cost ?? 0), 0);
    const fees = toNumber(data.delivery_fees) + toNumber(data.closing_fees) + toNumber(data.other_fees);
    const announcedMismatch = data.announced_total !== '' && toNumber(data.announced_total) !== salesTotal;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (report) {
            put(route('reports.update', report.id), { preserveScroll: true });

            return;
        }

        post(route('reports.store'), { preserveScroll: true });
    };

    if (agencies.length === 0 || products.length === 0) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={title} />
                <div className="glass mx-auto mt-10 max-w-md space-y-4 rounded-2xl p-8 text-center">
                    <h1 className="text-xl font-semibold">Ajoutez d'abord une agence et un produit</h1>
                    <p className="text-muted-foreground text-sm">
                        {agencies.length === 0
                            ? "Un rapport vient toujours d'une agence de livraison : ajoutez au moins une agence et un produit avec son prix d'achat."
                            : "Ajoutez au moins un produit avec son prix d'achat : c'est lui qui permet de calculer votre bénéfice."}
                    </p>
                    <Button asChild>
                        <Link href={route('reference.index')}>Ajouter mes agences et produits</Link>
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <form
                onSubmit={submit}
                className="mx-auto grid w-full max-w-[1240px] items-start gap-6 px-4 py-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1fr)_340px]"
            >
                <div className="flex min-w-0 flex-col gap-5">
                    <header className="flex flex-wrap items-end justify-between gap-3">
                        <h1 className="text-[28px] font-bold md:text-[32px]">{editing ? 'Modifier le rapport' : "Saisir le rapport d'une agence"}</h1>
                        <p className="text-muted-foreground text-sm">* obligatoire</p>
                    </header>

                    {errorCount > 0 && (
                        <div
                            ref={errorSummary}
                            tabIndex={-1}
                            role="alert"
                            className="badge-danger flex items-start gap-2 rounded-xl p-4 text-sm outline-none"
                        >
                            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <p>
                                <span className="font-semibold">Le rapport n'est pas enregistré.</span>{' '}
                                {errorCount > 1 ? `${errorCount} champs sont à corriger` : 'Un champ est à corriger'} : le message est écrit sous
                                chaque champ concerné.
                            </p>
                        </div>
                    )}

                    <section aria-labelledby="who-title" className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-3 md:p-6">
                        <h2 id="who-title" className="text-lg font-semibold sm:col-span-3">
                            Agence et dates
                        </h2>
                        <div className="grid gap-2 sm:col-span-3">
                            <Label htmlFor="agency_id">Agence *</Label>
                            <NativeSelect
                                id="agency_id"
                                required
                                value={data.agency_id}
                                disabled={editing}
                                aria-describedby={editing ? 'agency-help' : undefined}
                                onChange={(e) => setData('agency_id', e.target.value)}
                            >
                                <option value="">Choisir une agence</option>
                                {agencies.map((agency) => (
                                    <option key={agency.id} value={agency.id}>
                                        {agency.name} ({agency.country})
                                    </option>
                                ))}
                            </NativeSelect>
                            {editing && (
                                <p id="agency-help" className="text-muted-foreground text-xs">
                                    L'agence d'un rapport ne change pas. Supprimez-le et saisissez-en un nouveau si l'agence est fausse.
                                </p>
                            )}
                            <InputError message={errors.agency_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="period_start">Du *</Label>
                            <Input
                                id="period_start"
                                type="date"
                                required
                                aria-describedby="period-help"
                                value={data.period_start}
                                onChange={(e) => {
                                    const start = e.target.value;
                                    setData((current) => ({
                                        ...current,
                                        period_start: start,
                                        period_end: current.period_end < start ? start : current.period_end,
                                    }));
                                }}
                            />
                            <InputError message={errors.period_start} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="period_end">Au *</Label>
                            <Input
                                id="period_end"
                                type="date"
                                required
                                min={data.period_start}
                                aria-describedby="period-help"
                                value={data.period_end}
                                onChange={(e) => setData('period_end', e.target.value)}
                            />
                            <InputError message={errors.period_end} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">Compter dans le bénéfice ?</Label>
                            <NativeSelect
                                id="status"
                                aria-describedby="status-help"
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value as ReportForm['status'])}
                            >
                                <option value="counted">Oui, le compter</option>
                                <option value="detail">Non, détail d'un récap déjà saisi</option>
                                <option value="to_verify">Non, à vérifier d'abord</option>
                            </NativeSelect>
                            <InputError message={errors.status} />
                        </div>

                        <p id="period-help" className="text-muted-foreground text-xs sm:col-span-2">
                            Rapport d'un seul jour : mettez la même date dans « Du » et « Au ». Récap de la semaine : du premier au dernier jour.
                        </p>
                        <p id="status-help" className="text-muted-foreground text-xs">
                            Choisissez « détail » pour un rapport journalier déjà inclus dans un récap : ses ventes ne seront pas comptées deux fois.
                        </p>
                    </section>

                    <section aria-labelledby="lines-title" className="glass space-y-4 rounded-2xl p-5 md:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 id="lines-title" className="text-lg font-semibold">
                                Produits livrés
                            </h2>
                            <Button type="button" variant="outline" onClick={() => setData('lines', [...data.lines, { ...emptyLine }])}>
                                <Plus aria-hidden="true" />
                                Ajouter un produit
                            </Button>
                        </div>
                        <InputError message={errors.lines} />

                        <div className="space-y-3">
                            {data.lines.map((line, index) => {
                                const product = productById(line.product_id);

                                return (
                                    <div
                                        key={index}
                                        className="bg-muted/60 grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-start gap-3 rounded-xl p-3 sm:grid-cols-[minmax(0,2fr)_6.5rem_minmax(0,1fr)_auto]"
                                    >
                                        <div className="col-span-3 grid gap-1 sm:col-span-1">
                                            <Label htmlFor={`product-${index}`} className="text-muted-foreground text-xs">
                                                Produit {data.lines.length > 1 ? index + 1 : ''} *
                                            </Label>
                                            <NativeSelect
                                                id={`product-${index}`}
                                                value={line.product_id}
                                                onChange={(e) => updateLine(index, { product_id: e.target.value })}
                                            >
                                                <option value="">Choisir un produit</option>
                                                {products.map((option) => (
                                                    <option key={option.id} value={option.id}>
                                                        {option.name}
                                                    </option>
                                                ))}
                                            </NativeSelect>
                                            {product && (
                                                <p className="text-muted-foreground text-xs">
                                                    Prix d'achat :{' '}
                                                    {product.unit_cost === null
                                                        ? 'non renseigné (à ajouter dans Pays, agences et produits)'
                                                        : `${formatFcfa(product.unit_cost)} l'unité`}
                                                </p>
                                            )}
                                            <InputError message={fieldError(`lines.${index}.product_id`)} />
                                        </div>

                                        <div className="grid gap-1">
                                            <Label htmlFor={`quantity-${index}`} className="text-muted-foreground text-xs">
                                                Quantité livrée *
                                            </Label>
                                            <Input
                                                id={`quantity-${index}`}
                                                type="number"
                                                inputMode="numeric"
                                                min={1}
                                                value={line.quantity}
                                                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                                            />
                                            <InputError message={fieldError(`lines.${index}.quantity`)} />
                                        </div>

                                        <div className="grid gap-1">
                                            <Label htmlFor={`amount-${index}`} className="text-muted-foreground text-xs">
                                                Argent encaissé (F) *
                                            </Label>
                                            <Input
                                                id={`amount-${index}`}
                                                type="number"
                                                inputMode="numeric"
                                                min={0}
                                                value={line.amount}
                                                aria-describedby={`amount-${index}-help`}
                                                onChange={(e) => updateLine(index, { amount: e.target.value, auto: false })}
                                            />
                                            <AmountHint
                                                id={`amount-${index}-help`}
                                                line={line}
                                                price={product?.reference_price ?? null}
                                                expected={expectedAmount(line)}
                                                onRecalculate={() => recalculate(index)}
                                            />
                                            <InputError message={fieldError(`lines.${index}.amount`)} />
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:bg-danger-bg hover:text-danger-fg mt-6"
                                            aria-label={`Retirer la ligne ${product ? product.name : index + 1}`}
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
                                );
                            })}
                        </div>
                    </section>

                    <section aria-labelledby="fees-title" className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-2 md:p-6">
                        <div className="sm:col-span-2">
                            <h2 id="fees-title" className="text-lg font-semibold">
                                Frais de l'agence
                            </h2>
                            <p className="text-muted-foreground text-sm">Laissez vide ce qui ne s'applique pas.</p>
                        </div>
                        <MoneyField
                            id="delivery_fees"
                            label="Frais de livraison (F)"
                            value={data.delivery_fees}
                            error={errors.delivery_fees}
                            onChange={(v) => setData('delivery_fees', v)}
                        />
                        <MoneyField
                            id="closing_fees"
                            label="Closing et crédit d'appel (F)"
                            help="Commissions des personnes qui confirment les commandes, et crédit téléphonique"
                            value={data.closing_fees}
                            error={errors.closing_fees}
                            onChange={(v) => setData('closing_fees', v)}
                        />
                        <MoneyField
                            id="other_fees"
                            label="Autres frais (F)"
                            value={data.other_fees}
                            error={errors.other_fees}
                            onChange={(v) => setData('other_fees', v)}
                        />
                        <MoneyField
                            id="announced_total"
                            label="Total écrit par l'agence (F)"
                            help="Facultatif. Sert de contrôle : s'il ne correspond pas à vos lignes, le rapport sera marqué « à vérifier »"
                            value={data.announced_total}
                            error={errors.announced_total}
                            onChange={(v) => setData('announced_total', v)}
                        />
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="note">Note (facultatif)</Label>
                            <Input
                                id="note"
                                value={data.note}
                                onChange={(e) => setData('note', e.target.value)}
                                placeholder="Exemple : 2 colis envoyés dans une autre ville"
                            />
                            <InputError message={errors.note} />
                        </div>
                    </section>
                </div>

                <aside
                    aria-labelledby="recap-title"
                    className="glass-hero sticky bottom-[92px] z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-4 shadow-[var(--shadow-raised)] md:bottom-4 lg:top-6 lg:bottom-auto lg:flex lg:flex-col lg:items-stretch lg:p-6"
                >
                    <div className="min-w-0">
                        <h2 id="recap-title" className="text-hero-muted font-[family-name:var(--font-sans)] text-sm font-semibold">
                            Ce qu'il vous reste, avant la pub
                        </h2>
                        <p
                            className={cn(
                                'mt-1 font-[family-name:var(--font-display)] text-[26px] leading-none font-bold tabular-nums lg:mt-3 lg:text-[40px]',
                                salesTotal - purchaseCost - fees < 0 && 'text-on-hero-loss',
                            )}
                            aria-live="polite"
                        >
                            {formatFcfa(salesTotal - purchaseCost - fees)}
                        </p>
                    </div>
                    <dl className="col-span-2 hidden flex-col gap-1.5 border-t border-white/15 pt-3 text-sm lg:flex">
                        <SummaryLine label="Argent encaissé" value={formatFcfa(salesTotal)} />
                        <SummaryLine label="Prix d'achat" value={`− ${formatFcfa(purchaseCost)}`} />
                        <SummaryLine label="Frais de l'agence" value={`− ${formatFcfa(fees)}`} />
                    </dl>
                    {announcedMismatch && (
                        <p role="status" className="text-on-hero-gold col-span-2 flex items-start gap-2 text-sm font-semibold">
                            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <span>L'agence a écrit {formatFcfa(toNumber(data.announced_total))} : le rapport sera « à vérifier ».</span>
                        </p>
                    )}
                    <div className="flex gap-2 lg:flex-col">
                        <Button
                            type="submit"
                            size="lg"
                            disabled={processing}
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 flex-1 lg:w-full lg:flex-none"
                        >
                            {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                            <span className="lg:hidden">Enregistrer</span>
                            <span className="hidden lg:inline">{editing ? 'Enregistrer les modifications' : 'Enregistrer le rapport'}</span>
                        </Button>
                        <Button
                            asChild
                            variant="ghost"
                            className="text-hero-foreground hover:text-hero-foreground hidden hover:bg-white/10 lg:inline-flex"
                        >
                            <Link href={route('reports.index')}>Annuler</Link>
                        </Button>
                    </div>
                </aside>
            </form>
        </AppLayout>
    );
}

function MoneyField({
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
function AmountHint({
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
        return (
            <p id={id} className="text-muted-foreground text-xs">
                Rempli tout seul après le choix du produit.
            </p>
        );
    }

    if (price === null || expected === null) {
        return (
            <p id={id} className="text-muted-foreground text-xs">
                Pas de prix de vente pour ce produit : tapez le montant. Ajoutez son prix dans « Pays, agences et produits » pour ne plus avoir à le
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

function SummaryLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-hero-muted">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
        </div>
    );
}
