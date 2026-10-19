import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { FormEventHandler } from 'react';

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

const emptyLine: Line = { product_id: '', quantity: '1', amount: '' };

const toNumber = (value: string) => (value === '' ? 0 : Number(value));

const amountText = (value: number | null) => (value === null || value === 0 ? '' : String(value));

export default function ReportsCreate({ agencies, products, today, report }: Props) {
    const editing = report !== undefined;
    const title = editing ? 'Modifier un rapport' : 'Saisir un rapport';
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Rapports', href: '/rapports' },
        { title, href: editing ? `/rapports/${report.id}/modifier` : '/rapports/saisie' },
    ];

    const { data, setData, post, put, processing, errors } = useForm<ReportForm>(
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
                  lines: report.lines.map((line) => ({
                      product_id: String(line.product_id),
                      quantity: String(line.quantity),
                      amount: String(line.amount),
                  })),
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

    const updateLine = (index: number, changes: Partial<Line>) => {
        setData(
            'lines',
            data.lines.map((line, i) => (i === index ? { ...line, ...changes } : line)),
        );
    };

    const productById = (id: string) => products.find((product) => String(product.id) === id);

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
                    <h1 className="text-xl font-semibold">Il manque des agences ou des produits</h1>
                    <p className="text-muted-foreground text-sm">
                        Ajoutez au moins une agence et un produit avec son coût d'achat avant de saisir un rapport.
                    </p>
                    <Button asChild>
                        <Link href={route('reference.index')}>Ouvrir le référentiel</Link>
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <form onSubmit={submit} className="glass mx-auto my-4 flex w-full max-w-3xl flex-col gap-8 rounded-2xl p-5 md:my-6 md:p-8">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{editing ? 'Modifier le rapport' : "Saisir un rapport d'agence"}</h1>
                    <p className="text-muted-foreground text-sm">
                        Un rapport d'un jour : même date au début et à la fin. Un récap de semaine : toute la période.
                    </p>
                </div>

                <section className="grid gap-4 sm:grid-cols-3">
                    <div className="grid gap-2 sm:col-span-3">
                        <Label htmlFor="agency_id">Agence</Label>
                        <NativeSelect id="agency_id" value={data.agency_id} disabled={editing} onChange={(e) => setData('agency_id', e.target.value)}>
                            <option value="">Choisir une agence</option>
                            {agencies.map((agency) => (
                                <option key={agency.id} value={agency.id}>
                                    {agency.name} ({agency.country})
                                </option>
                            ))}
                        </NativeSelect>
                        <InputError message={errors.agency_id} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="period_start">Du</Label>
                        <Input
                            id="period_start"
                            type="date"
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
                        <Label htmlFor="period_end">Au</Label>
                        <Input id="period_end" type="date" value={data.period_end} onChange={(e) => setData('period_end', e.target.value)} />
                        <InputError message={errors.period_end} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="status">Compter dans les totaux</Label>
                        <NativeSelect id="status" value={data.status} onChange={(e) => setData('status', e.target.value as ReportForm['status'])}>
                            <option value="counted">Oui (compté)</option>
                            <option value="detail">Non, détail d'un récap</option>
                            <option value="to_verify">Non, à vérifier</option>
                        </NativeSelect>
                        <InputError message={errors.status} />
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Produits livrés</h2>
                        <Button type="button" variant="outline" size="sm" onClick={() => setData('lines', [...data.lines, { ...emptyLine }])}>
                            <Plus />
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
                                    className="bg-background/70 grid grid-cols-[1fr_auto] items-start gap-3 rounded-xl border p-3 sm:grid-cols-[minmax(0,2fr)_6rem_minmax(0,1fr)_auto]"
                                >
                                    <div className="col-span-2 grid gap-1 sm:col-span-1">
                                        <Label htmlFor={`product-${index}`} className="sr-only">
                                            Produit
                                        </Label>
                                        <NativeSelect
                                            id={`product-${index}`}
                                            value={line.product_id}
                                            onChange={(e) => updateLine(index, { product_id: e.target.value })}
                                        >
                                            <option value="">Produit</option>
                                            {products.map((option) => (
                                                <option key={option.id} value={option.id}>
                                                    {option.name}
                                                </option>
                                            ))}
                                        </NativeSelect>
                                        {product && (
                                            <p className="text-muted-foreground text-xs">
                                                Coût d'achat : {product.unit_cost === null ? 'non renseigné' : formatFcfa(product.unit_cost)}
                                            </p>
                                        )}
                                        <InputError message={fieldError(`lines.${index}.product_id`)} />
                                    </div>

                                    <div className="grid gap-1">
                                        <Label htmlFor={`quantity-${index}`} className="text-muted-foreground text-xs">
                                            Quantité
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
                                            Montant encaissé (F)
                                        </Label>
                                        <Input
                                            id={`amount-${index}`}
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
                                        aria-label="Retirer ce produit"
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
                            );
                        })}
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                    <h2 className="text-lg font-semibold sm:col-span-2">Frais et contrôle</h2>
                    <MoneyField
                        id="delivery_fees"
                        label="Frais de livraison (F)"
                        value={data.delivery_fees}
                        error={errors.delivery_fees}
                        onChange={(v) => setData('delivery_fees', v)}
                    />
                    <MoneyField
                        id="closing_fees"
                        label="Frais de closing et crédit (F)"
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
                        label="Total des ventes annoncé par l'agence (F)"
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
                            placeholder="Ex. 2 expéditions vers une autre ville"
                        />
                        <InputError message={errors.note} />
                    </div>
                </section>

                <section aria-label="Récapitulatif" className="border-primary/25 bg-primary/8 space-y-2 rounded-xl border p-4 text-sm">
                    <SummaryLine label="Ventes" value={formatFcfa(salesTotal)} />
                    <SummaryLine label="Coût d'achat estimé" value={`− ${formatFcfa(purchaseCost)}`} />
                    <SummaryLine label="Frais" value={`− ${formatFcfa(fees)}`} />
                    <SummaryLine label="Résultat avant pub" value={formatFcfa(salesTotal - purchaseCost - fees)} strong />
                    {announcedMismatch && (
                        <p className="font-medium text-amber-700 dark:text-amber-300">
                            Les ventes saisies ({formatFcfa(salesTotal)}) diffèrent du total annoncé ({formatFcfa(toNumber(data.announced_total))}) :
                            le rapport sera marqué « à vérifier ».
                        </p>
                    )}
                </section>

                <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={processing}>
                        {editing ? 'Enregistrer les modifications' : 'Enregistrer le rapport'}
                    </Button>
                    <Button asChild variant="ghost">
                        <Link href={route('reports.index')}>Annuler</Link>
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}

function MoneyField({
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
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type="number" inputMode="numeric" min={0} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" />
            <InputError message={error} />
        </div>
    );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className={strong ? 'flex justify-between border-t pt-2 text-base font-bold' : 'flex justify-between'}>
            <span>{label}</span>
            <span className="font-semibold tabular-nums">{value}</span>
        </div>
    );
}
