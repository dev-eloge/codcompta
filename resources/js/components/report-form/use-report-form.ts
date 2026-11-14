import { type AdPlatform, adPlatformLabel } from '@/lib/ad-platforms';
import { formatFcfa } from '@/lib/format';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useRef } from 'react';

export interface Agency {
    id: number;
    name: string;
    country: string;
}

export interface Product {
    id: number;
    name: string;
    unit_cost: number | null;
    reference_price: number | null;
}

export type Line = {
    product_id: string;
    quantity: string;
    amount: string;
    /** True while the amount follows quantity × selling price; false once the merchant types their own amount. */
    auto: boolean;
};

export type AdChoice = 'same' | 'separate';

/** The ad typed for one product of the report. */
export type AdEntry = {
    platform: AdPlatform | '';
    amount: string;
    facebook_amount: string;
    tiktok_amount: string;
    orders_received: string;
    /** Only when another report already noted the ad of this product. */
    choice: AdChoice;
};

/** An ad of a product already noted for this country and these days, by another report. */
export interface SharedAd {
    id: number;
    product_id: number;
    platform: AdPlatform | null;
    amount: number;
    facebook_amount: number | null;
    tiktok_amount: number | null;
    noted_by: string | null;
}

/** One ad as the server receives it. */
export type SentAd = {
    product_id: string;
    choice: AdChoice | null;
    platform?: AdPlatform | '';
    amount?: string | null;
    facebook_amount?: string | null;
    tiktok_amount?: string | null;
    orders_received?: string;
};

export type ReportForm = {
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

export interface EditedReport {
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

export interface Props {
    agencies: Agency[];
    products: Product[];
    today: string;
    sharedAds: SharedAd[];
    report?: EditedReport;
}

export const emptyLine: Line = { product_id: '', quantity: '1', amount: '', auto: true };

export const emptyAd: AdEntry = { platform: '', amount: '', facebook_amount: '', tiktok_amount: '', orders_received: '', choice: 'same' };

export const sharedAdText = (ad: SharedAd) =>
    ad.platform === 'facebook_tiktok'
        ? `Facebook ${formatFcfa(ad.facebook_amount)} et TikTok ${formatFcfa(ad.tiktok_amount)}`
        : `${adPlatformLabel(ad.platform)} : ${formatFcfa(ad.amount)}`;

export const toNumber = (value: string) => (value === '' ? 0 : Number(value));

export const amountText = (value: number | null) => (value === null || value === 0 ? '' : String(value));

/**
 * State and figures of the report form, shared by the desktop page and the phone steps.
 */
export function useReportForm({ agencies, products, today, sharedAds, report }: Props) {
    const editing = report !== undefined;

    const { data, setData, post, put, processing, errors, transform, isDirty } = useForm<ReportForm>(
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

    /** True when the server refused one of the fields of the ad of this product. */
    const sentAdErrors = (productId: string) => {
        const index = sentAds.findIndex((ad) => ad.product_id === productId);

        return index !== -1 && Object.keys(errors).some((key) => key.startsWith(`ads.${index}.`));
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

    return {
        editing,
        data,
        setData,
        processing,
        errors,
        isDirty,
        fieldError,
        errorCount,
        errorSummary,
        productById,
        expectedAmount,
        updateLine,
        recalculate,
        sharedAdOf,
        adProducts,
        adError,
        sentAdErrors,
        adEntry,
        updateAd,
        adCost,
        salesTotal,
        purchaseCost,
        fees,
        announcedMismatch,
        adTotal,
        netProfit,
        sharedNotes,
        submit,
    };
}

export type ReportFormState = ReturnType<typeof useReportForm>;
