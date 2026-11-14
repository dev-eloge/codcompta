import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type AdPlatform, adPlatformLabel, adPlatformLabels } from '@/lib/ad-platforms';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Check, CircleAlert, Info, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, ReactNode, useEffect, useRef } from 'react';

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

type AdChoice = 'same' | 'separate';

/** The ad typed for one product of the report. */
type AdEntry = {
    platform: AdPlatform | '';
    amount: string;
    facebook_amount: string;
    tiktok_amount: string;
    orders_received: string;
    /** Only when another report already noted the ad of this product. */
    choice: AdChoice;
};

/** An ad of a product already noted for this country and these days, by another report. */
interface SharedAd {
    id: number;
    product_id: number;
    platform: AdPlatform | null;
    amount: number;
    facebook_amount: number | null;
    tiktok_amount: number | null;
    noted_by: string | null;
}

/** One ad as the server receives it. */
type SentAd = {
    product_id: string;
    choice: AdChoice | null;
    platform?: AdPlatform | '';
    amount?: string | null;
    facebook_amount?: string | null;
    tiktok_amount?: string | null;
    orders_received?: string;
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
    /** Keyed by product id. */
    ads: Record<string, AdEntry>;
    no_ads: boolean;
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
    ads: {
        product_id: number;
        choice: AdChoice | null;
        platform: AdPlatform | null;
        amount: number;
        facebook_amount: number | null;
        tiktok_amount: number | null;
        orders_received: number | null;
    }[];
}

interface Props {
    agencies: Agency[];
    products: Product[];
    today: string;
    sharedAds: SharedAd[];
    report?: EditedReport;
}

const emptyLine: Line = { product_id: '', quantity: '1', amount: '', auto: true };

const emptyAd: AdEntry = { platform: '', amount: '', facebook_amount: '', tiktok_amount: '', orders_received: '', choice: 'same' };

const sharedAdText = (ad: SharedAd) =>
    ad.platform === 'facebook_tiktok'
        ? `Facebook ${formatFcfa(ad.facebook_amount)} et TikTok ${formatFcfa(ad.tiktok_amount)}`
        : `${adPlatformLabel(ad.platform)} : ${formatFcfa(ad.amount)}`;

const toNumber = (value: string) => (value === '' ? 0 : Number(value));

const amountText = (value: number | null) => (value === null || value === 0 ? '' : String(value));

export default function ReportsCreate({ agencies, products, today, sharedAds, report }: Props) {
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
                  ads: Object.fromEntries(
                      report.ads.map((ad) => [
                          String(ad.product_id),
                          {
                              platform: ad.platform ?? '',
                              amount: ad.platform === 'facebook_tiktok' ? '' : String(ad.amount),
                              facebook_amount: amountText(ad.facebook_amount),
                              tiktok_amount: amountText(ad.tiktok_amount),
                              orders_received: ad.orders_received === null ? '' : String(ad.orders_received),
                              choice: ad.choice ?? 'same',
                          },
                      ]),
                  ),
                  no_ads: false,
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
                  ads: {},
                  no_ads: false,
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

    // The ads already noted by another agency depend on the agency and the days of the report.
    useEffect(() => {
        if (data.agency_id === '' || data.period_start === '' || data.period_end < data.period_start) {
            return;
        }

        router.reload({
            only: ['sharedAds'],
            data: { agency_id: data.agency_id, period_start: data.period_start, period_end: data.period_end },
        });
    }, [data.agency_id, data.period_start, data.period_end]);

    const sharedAdOf = (productId: string) => sharedAds.find((ad) => String(ad.product_id) === productId);

    /** Products of the report, once each, in the order of the lines: one ad card per product. */
    const adProducts = [...new Set(data.lines.map((line) => line.product_id).filter((id) => id !== ''))];

    /**
     * The ads sent with the report, in a fixed order so that a server error "ads.2.amount" finds its field.
     * A product with no platform chosen has no ad; a product whose ad is already noted elsewhere sends the choice.
     */
    const adsToSend = (form: ReportForm): SentAd[] =>
        form.no_ads
            ? []
            : [...new Set(form.lines.map((line) => line.product_id).filter((id) => id !== ''))].flatMap((productId): SentAd[] => {
                  const entry = form.ads[productId] ?? emptyAd;
                  const shared = sharedAdOf(productId) !== undefined;

                  if (shared && entry.choice === 'same') {
                      return [{ product_id: productId, choice: 'same' }];
                  }

                  if (entry.platform === '') {
                      return shared ? [{ product_id: productId, choice: 'separate', platform: '' }] : [];
                  }

                  const both = entry.platform === 'facebook_tiktok';

                  return [
                      {
                          product_id: productId,
                          choice: shared ? 'separate' : null,
                          platform: entry.platform,
                          amount: both ? null : entry.amount,
                          facebook_amount: both ? entry.facebook_amount : null,
                          tiktok_amount: both ? entry.tiktok_amount : null,
                          orders_received: entry.orders_received,
                      },
                  ];
              });

    const sentAds = adsToSend(data);
    const adError = (productId: string, field: string) => {
        const index = sentAds.findIndex((ad) => ad.product_id === productId);

        return index === -1 ? undefined : fieldError(`ads.${index}.${field}`);
    };

    const adEntry = (productId: string) => data.ads[productId] ?? emptyAd;
    const updateAd = (productId: string, changes: Partial<AdEntry>) =>
        setData('ads', { ...data.ads, [productId]: { ...adEntry(productId), ...changes } });

    /** What this agency pays for the ad of a product; nothing when it shares an ad noted by another agency. */
    const adCost = (productId: string) => {
        const entry = adEntry(productId);

        if (data.no_ads || (sharedAdOf(productId) && entry.choice === 'same')) {
            return 0;
        }

        return entry.platform === 'facebook_tiktok' ? toNumber(entry.facebook_amount) + toNumber(entry.tiktok_amount) : toNumber(entry.amount);
    };

    transform((current) => ({
        ...current,
        lines: current.lines.map(({ auto: _auto, ...line }) => line),
        ads: adsToSend(current),
    }));

    const salesTotal = data.lines.reduce((sum, line) => sum + toNumber(line.amount), 0);
    const purchaseCost = data.lines.reduce((sum, line) => sum + toNumber(line.quantity) * (productById(line.product_id)?.unit_cost ?? 0), 0);
    const fees = toNumber(data.delivery_fees) + toNumber(data.closing_fees) + toNumber(data.other_fees);
    const announcedMismatch = data.announced_total !== '' && toNumber(data.announced_total) !== salesTotal;
    const adTotal = adProducts.reduce((sum, productId) => sum + adCost(productId), 0);
    const netProfit = salesTotal - purchaseCost - fees - adTotal;
    const sharedNotes = data.no_ads
        ? []
        : adProducts.flatMap((productId) => {
              const shared = sharedAdOf(productId);

              return shared && adEntry(productId).choice === 'same' ? [{ productId, shared }] : [];
          });

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
                        <StepTitle id="who-title" step={1} className="sm:col-span-3">
                            Quelle agence, quel jour ?
                        </StepTitle>
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
                            <StepTitle id="lines-title" step={2}>
                                Produits livrés
                            </StepTitle>
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

                    <section aria-labelledby="ads-title" className="glass space-y-4 rounded-2xl p-5 md:p-6">
                        <div>
                            <StepTitle id="ads-title" step={3}>
                                Publicité du jour, pour ces produits
                            </StepTitle>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Ce que vous avez payé aujourd'hui pour les produits de ce rapport. Une même pub n'est jamais comptée deux fois.
                            </p>
                        </div>

                        {adProducts.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Choisissez d'abord les produits livrés : une carte apparaît pour chacun.</p>
                        ) : (
                            !data.no_ads &&
                            adProducts.map((productId) => {
                                const name = productById(productId)?.name ?? 'Produit';
                                const shared = sharedAdOf(productId);
                                const entry = adEntry(productId);
                                const showFields = !shared || entry.choice === 'separate';

                                return (
                                    <div key={productId} className={cn('flex flex-col gap-3.5 rounded-2xl border p-4', shared && 'bg-muted/60')}>
                                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                                            <h3 className="text-[15px] font-bold">{name}</h3>
                                            {shared && (
                                                <span className="badge-info inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold">
                                                    <Info className="size-3.5" aria-hidden="true" />
                                                    Pub déjà notée aujourd'hui
                                                </span>
                                            )}
                                        </div>

                                        {shared && (
                                            <>
                                                <p className="text-[15px]">
                                                    <span className="font-semibold tabular-nums">{sharedAdText(shared)}</span>,{' '}
                                                    {shared.noted_by
                                                        ? `notés dans le rapport d'${shared.noted_by}. Ce produit est aussi livré par cette agence.`
                                                        : 'notés dans « Dépenses publicitaires ».'}
                                                </p>
                                                <fieldset className="flex flex-col gap-2">
                                                    <legend className="mb-2 text-sm font-bold">Pour cette agence :</legend>
                                                    <ChoiceCard
                                                        name={`ad-choice-${productId}`}
                                                        checked={entry.choice === 'same'}
                                                        onSelect={() => updateAd(productId, { choice: 'same' })}
                                                        title="C'est la même pub pour les deux agences"
                                                        help={`Les ${formatFcfa(shared.amount)} sont partagés selon les livraisons de chaque agence. Rien à retaper.`}
                                                    />
                                                    <ChoiceCard
                                                        name={`ad-choice-${productId}`}
                                                        checked={entry.choice === 'separate'}
                                                        onSelect={() => updateAd(productId, { choice: 'separate' })}
                                                        title="J'ai payé une pub à part pour cette agence"
                                                        help="Vous notez son montant ici, comme pour un autre produit."
                                                    />
                                                </fieldset>
                                            </>
                                        )}

                                        {showFields && (
                                            <AdFields
                                                productId={productId}
                                                entry={entry}
                                                cost={adCost(productId)}
                                                error={(field) => adError(productId, field)}
                                                onChange={(changes) => updateAd(productId, changes)}
                                            />
                                        )}

                                        {shared && (
                                            <Link
                                                href={route('ad-spends.index')}
                                                className="text-primary inline-flex min-h-11 items-center self-start font-bold underline underline-offset-4"
                                            >
                                                {shared.noted_by ? `Modifier la pub d'${shared.noted_by}` : 'Modifier cette pub'}
                                            </Link>
                                        )}
                                    </div>
                                );
                            })
                        )}

                        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-[15px] font-semibold">
                            <input
                                type="checkbox"
                                className="accent-primary size-5"
                                checked={data.no_ads}
                                onChange={(e) => setData('no_ads', e.target.checked)}
                            />
                            Pas de publicité aujourd'hui pour ces produits
                        </label>
                    </section>

                    <section aria-labelledby="fees-title" className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-2 md:p-6">
                        <div className="sm:col-span-2">
                            <StepTitle id="fees-title" step={4}>
                                Frais de l'agence
                            </StepTitle>
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
                    <h2 id="recap-title" className="hidden font-[family-name:var(--font-sans)] text-lg font-bold lg:block">
                        Ce qu'il vous reste
                    </h2>
                    <dl className="hidden flex-col gap-1.5 border-b border-white/15 pb-3 text-sm lg:flex">
                        <SummaryLine label="Argent encaissé" value={formatFcfa(salesTotal)} />
                        <SummaryLine label="Prix d'achat des produits" value={`− ${formatFcfa(purchaseCost)}`} />
                        <SummaryLine label="Frais de l'agence" value={`− ${formatFcfa(fees)}`} />
                        <SummaryLine label="Pub du jour" value={`− ${formatFcfa(adTotal)}`} />
                    </dl>
                    <div className="min-w-0 lg:flex lg:items-baseline lg:justify-between lg:gap-3">
                        <p className="text-hero-muted lg:text-hero-foreground text-sm font-semibold">Bénéfice net du jour</p>
                        <p
                            className={cn(
                                'mt-1 font-[family-name:var(--font-display)] text-[26px] leading-none font-bold tabular-nums lg:mt-0 lg:text-[32px]',
                                netProfit < 0 && 'text-on-hero-loss',
                            )}
                            aria-live="polite"
                        >
                            {formatFcfa(netProfit)}
                        </p>
                    </div>
                    {sharedNotes.map(({ productId, shared }) => (
                        <p key={productId} className="text-hero-muted hidden text-xs lg:block">
                            {productById(productId)?.name} : la pub {shared.noted_by ? `d'${shared.noted_by}` : 'déjà notée'} est partagée selon les
                            livraisons. Elle n'est pas retirée une deuxième fois.
                        </p>
                    ))}
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

function StepTitle({ id, step, className, children }: { id: string; step: number; className?: string; children: ReactNode }) {
    return (
        <h2 id={id} className={cn('flex items-center gap-2.5 text-lg font-semibold', className)}>
            <span
                aria-hidden="true"
                className="bg-foreground text-background grid size-7 shrink-0 place-items-center rounded-full text-sm tabular-nums"
            >
                {step}
            </span>
            {children}
        </h2>
    );
}

/**
 * A radio choice shown as a card, with a title and one line of help.
 */
function ChoiceCard({ name, checked, onSelect, title, help }: { name: string; checked: boolean; onSelect: () => void; title: string; help: string }) {
    return (
        <label
            className={cn(
                'bg-card has-[:focus-visible]:ring-ring/50 flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-[15px] has-[:focus-visible]:ring-[3px]',
                checked ? 'border-primary border-2' : 'border-input',
            )}
        >
            <input type="radio" name={name} checked={checked} onChange={onSelect} className="accent-primary mt-0.5 size-5 shrink-0" />
            <span>
                <span className="block font-bold">{title}</span>
                <span className="text-muted-foreground block text-xs">{help}</span>
            </span>
        </label>
    );
}

/**
 * Where the ad of one product runs, and only the amounts that this choice needs.
 */
function AdFields({
    productId,
    entry,
    cost,
    error,
    onChange,
}: {
    productId: string;
    entry: AdEntry;
    cost: number;
    error: (field: string) => string | undefined;
    onChange: (changes: Partial<AdEntry>) => void;
}) {
    const both = entry.platform === 'facebook_tiktok';
    const field = (name: string) => `ad-${productId}-${name}`;

    return (
        <>
            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold">Où tourne la pub ?</legend>
                <div className="flex flex-wrap gap-2">
                    {(Object.keys(adPlatformLabels) as AdPlatform[]).map((platform) => {
                        const checked = entry.platform === platform;

                        return (
                            <label
                                key={platform}
                                className={cn(
                                    'has-[:focus-visible]:ring-ring/50 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors duration-150 has-[:focus-visible]:ring-[3px]',
                                    checked
                                        ? 'border-primary bg-success-bg text-success-fg border-2 font-bold'
                                        : 'border-input bg-card hover:bg-accent border',
                                )}
                            >
                                <input
                                    type="radio"
                                    name={field('platform')}
                                    value={platform}
                                    checked={checked}
                                    onChange={() => onChange({ platform })}
                                    className="sr-only"
                                />
                                {checked && <Check className="size-4 stroke-[2.8]" aria-hidden="true" />}
                                {adPlatformLabels[platform]}
                            </label>
                        );
                    })}
                </div>
                <InputError message={error('platform')} />
            </fieldset>

            {entry.platform !== '' && (
                <>
                    <div className="grid items-start gap-3 sm:grid-cols-3">
                        {both ? (
                            <>
                                <AdNumberField
                                    id={field('facebook')}
                                    label="Dépensé sur Facebook (F)"
                                    value={entry.facebook_amount}
                                    error={error('facebook_amount')}
                                    onChange={(value) => onChange({ facebook_amount: value })}
                                />
                                <AdNumberField
                                    id={field('tiktok')}
                                    label="Dépensé sur TikTok (F)"
                                    value={entry.tiktok_amount}
                                    error={error('tiktok_amount')}
                                    onChange={(value) => onChange({ tiktok_amount: value })}
                                />
                            </>
                        ) : (
                            <AdNumberField
                                id={field('amount')}
                                label={`Dépensé sur ${entry.platform === 'autre' ? 'la pub' : adPlatformLabels[entry.platform]} (F)`}
                                value={entry.amount}
                                error={error('amount')}
                                onChange={(value) => onChange({ amount: value })}
                            />
                        )}
                        <AdNumberField
                            id={field('orders')}
                            label={both ? 'Commandes reçues (les deux)' : 'Commandes reçues'}
                            placeholder="Facultatif"
                            value={entry.orders_received}
                            error={error('orders_received')}
                            onChange={(value) => onChange({ orders_received: value })}
                        />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                        {both ? (
                            <p className="text-muted-foreground max-w-xl text-xs">
                                Avec les deux en même temps, on ne sépare pas les commandes : ce produit est suivi comme « Facebook et TikTok » pour
                                ces jours-là.
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onChange({ platform: '', amount: '', facebook_amount: '', tiktok_amount: '', orders_received: '' })}
                                className="text-muted-foreground hover:text-foreground min-h-11 text-sm font-semibold underline underline-offset-4"
                            >
                                Pas de pub pour ce produit
                            </button>
                        )}
                        <p className="text-sm font-bold tabular-nums">Pub du produit : {formatFcfa(cost)}</p>
                    </div>
                </>
            )}
        </>
    );
}

function AdNumberField({
    id,
    label,
    value,
    error,
    placeholder = '0',
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    error?: string;
    placeholder?: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                value={value}
                placeholder={placeholder}
                aria-invalid={error ? true : undefined}
                className="tabular-nums"
                onChange={(e) => onChange(e.target.value)}
            />
            <InputError message={error} />
        </div>
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
