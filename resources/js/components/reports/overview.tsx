import { InFcfa, type SplitPart, SplitTiles } from '@/components/reports/profit-split';
import { adPlatformLabel } from '@/lib/ad-platforms';
import { formatNumber, formatPercent } from '@/lib/format';
import { useMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleAlert } from 'lucide-react';
import { ReactNode } from 'react';

export interface CountryResult {
    id: number;
    name: string;
    revenue: number;
    ad_spend: number;
    delivered: number;
    profit: number;
    margin: number;
    previous_profit: number;
    pending: number;
    share: number;
}

export interface Overview {
    total: {
        revenue: number;
        ad_spend: number;
        delivered: number;
        profit: number;
        margin: number;
        split: SplitPart[];
    };
    previous_profit: number;
    countries: CountryResult[];
    products: { product_id: number; name: string; profit: number }[];
    platforms: { platform: string; ad_spend: number; delivered: number; cost_per_delivery: number | null }[];
    pending: number;
}

interface OverviewPeriod {
    type: string;
    from: string;
    to: string;
    days: number;
    label: string;
}

/** Link to one country, for the same period. */
const countryHref = (id: number, period: OverviewPeriod) =>
    route(
        'reports.index',
        period.type === 'custom'
            ? { country: id, period: 'custom', du: period.from, au: period.to }
            : { country: id, period: period.type, date: period.from },
    );

const periodName = (period: OverviewPeriod) =>
    period.type === 'day' ? 'du jour' : period.type === 'month' ? 'du mois' : period.type === 'week' ? 'de la semaine' : 'de la période';

/** "+12 %", "−6 %", or "Passe en perte": always in words with an arrow, never by colour alone. */
function ChangeBadge({ now, before, onHero = false }: { now: number; before: number; onHero?: boolean }) {
    if (now < 0 && before >= 0) {
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                    onHero ? 'bg-on-hero-loss/15 text-on-hero-loss' : 'badge-danger',
                )}
            >
                <ArrowDownRight className="size-3.5" aria-hidden="true" />
                Passe en perte
            </span>
        );
    }

    if (before === 0) {
        return null;
    }

    const ratio = (now - before) / Math.abs(before);
    const up = ratio >= 0;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
                onHero ? (up ? 'bg-on-hero-up/15 text-on-hero-up' : 'bg-on-hero-loss/15 text-on-hero-loss') : up ? 'badge-success' : 'badge-danger',
            )}
        >
            {up ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <ArrowDownRight className="size-3.5" aria-hidden="true" />}
            {up ? '+' : '−'}
            {Math.abs(Math.round(ratio * 100))} %
        </span>
    );
}

function PendingBanner({ overview, period, onShowCountries }: { overview: Overview; period: OverviewPeriod; onShowCountries: () => void }) {
    if (overview.pending === 0) {
        return null;
    }

    const where = overview.countries
        .filter((country) => country.pending > 0)
        .map((country) => `${country.name} ${country.pending}`)
        .join(', ');
    const onlyOne = overview.countries.filter((country) => country.pending > 0);

    return (
        <section
            aria-label="Choses à régler"
            className="bg-warning-bg/60 border-warning-fg/20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 md:px-5"
        >
            <p className="flex items-center gap-2 text-[15px] font-bold">
                <CircleAlert className="text-warning-fg size-5 shrink-0" aria-hidden="true" />
                {overview.pending > 1 ? `${overview.pending} choses à régler` : 'Une chose à régler'}
                <span className="hidden font-semibold md:inline"> : {where}</span>
            </p>
            {onlyOne.length === 1 ? (
                <Link
                    href={countryHref(onlyOne[0].id, period)}
                    className="text-primary min-h-11 content-center font-bold underline underline-offset-4"
                >
                    Voir le détail
                </Link>
            ) : (
                <button
                    type="button"
                    onClick={onShowCountries}
                    className="text-primary min-h-11 cursor-pointer font-bold underline underline-offset-4"
                >
                    Voir le détail
                </button>
            )}
        </section>
    );
}

function Figure({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
    return (
        <div className="glass rounded-2xl p-4 md:p-[18px]">
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="mt-1.5 font-[family-name:var(--font-display)] text-[22px] font-semibold tabular-nums md:text-[26px]">{value}</dd>
            {children}
        </div>
    );
}

/**
 * "Vue générale": the net profit of every country together, its split, the key figures,
 * what to settle, and the results by country, by product and by ad platform.
 */
export function GeneralView({ overview, period, onShowCountries }: { overview: Overview; period: OverviewPeriod; onShowCountries: () => void }) {
    const { total } = overview;
    const count = overview.countries.length;
    const { format: formatFcfa } = useMoney();
    const bestProduct = Math.max(1, ...overview.products.map((product) => product.profit));

    return (
        <>
            <section aria-label="Résumé de tous les pays" className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div className="glass-hero flex flex-col gap-5 rounded-2xl p-5 md:p-7">
                    <div>
                        <p className="text-hero-muted text-[15px]">
                            Bénéfice net, {count} pays, {period.label}
                        </p>
                        <p
                            className={cn(
                                'mt-2 font-[family-name:var(--font-display)] text-[40px] leading-[1.05] font-bold tracking-[-0.03em] tabular-nums md:text-[56px]',
                                total.profit < 0 && 'text-on-hero-loss',
                            )}
                        >
                            {formatFcfa(total.profit)}
                        </p>
                        <InFcfa amount={total.profit} className="text-hero-muted mt-1 text-[15px]" />
                        {overview.previous_profit !== 0 && (
                            <p className="mt-3 flex flex-wrap items-center gap-2 text-[15px]">
                                <ChangeBadge now={total.profit} before={overview.previous_profit} onHero />
                                <span className="text-hero-muted">
                                    par rapport à la période d'avant (<span className="tabular-nums">{formatFcfa(overview.previous_profit)}</span>)
                                </span>
                            </p>
                        )}
                    </div>
                    <SplitTiles split={total.split} />
                </div>

                <dl className="grid grid-cols-2 gap-3">
                    <Figure label="Chiffre d'affaires" value={formatFcfa(total.revenue)} />
                    <Figure label="Dépenses publicitaires" value={formatFcfa(total.ad_spend)}>
                        {total.revenue > 0 && (
                            <p className="text-muted-foreground mt-1 text-[13px]">
                                {formatPercent(total.ad_spend / total.revenue)} du chiffre d'affaires
                            </p>
                        )}
                    </Figure>
                    <Figure label="Produits livrés" value={formatNumber(total.delivered)}>
                        {period.days > 1 && (
                            <p className="text-muted-foreground mt-1 text-[13px]">
                                {formatNumber(total.delivered / period.days)} par jour en moyenne
                            </p>
                        )}
                    </Figure>
                    <Figure label="Marge" value={formatPercent(total.margin)} />
                </dl>
            </section>

            <PendingBanner overview={overview} period={period} onShowCountries={onShowCountries} />

            <div className="grid items-start gap-5 lg:grid-cols-3">
                <section aria-labelledby="by-country" className="glass flex flex-col gap-3 rounded-2xl p-4 md:p-5">
                    <h2 id="by-country" className="text-lg font-semibold">
                        Par pays
                    </h2>
                    <ul className="flex flex-col">
                        {overview.countries.map((country) => (
                            <li key={country.id} className="border-b last:border-b-0">
                                <Link
                                    href={countryHref(country.id, period)}
                                    className="hover:bg-accent -mx-2 flex min-h-12 items-center justify-between gap-3 rounded-lg px-2 py-2"
                                >
                                    <span className="min-w-0">
                                        <span className="block font-semibold">{country.name}</span>
                                        {country.profit < 0 && <span className="text-danger-fg block text-xs font-semibold">En perte</span>}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className={cn('font-bold tabular-nums', country.profit < 0 && 'text-danger-fg')}>
                                            {formatFcfa(country.profit)}
                                        </span>
                                        <ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        onClick={onShowCountries}
                        className="text-primary min-h-11 cursor-pointer self-start font-bold underline underline-offset-4"
                    >
                        Comparer les pays
                    </button>
                </section>

                <section aria-labelledby="by-product" className="glass flex flex-col gap-3 rounded-2xl p-4 md:p-5">
                    <h2 id="by-product" className="text-lg font-semibold">
                        Par produit
                    </h2>
                    {overview.products.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Aucun produit livré sur cette période.</p>
                    ) : (
                        <ul className="flex flex-col gap-3.5">
                            {overview.products.map((product) => (
                                <li key={product.product_id} className="grid gap-1.5">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span className="font-semibold">{product.name}</span>
                                        <span className={cn('tabular-nums', product.profit < 0 && 'text-danger-fg')}>
                                            {formatFcfa(product.profit)}
                                        </span>
                                    </div>
                                    <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
                                        <div
                                            className="bg-primary h-full rounded-full"
                                            style={{ width: `${Math.max(0, product.profit / bestProduct) * 100}%` }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section aria-labelledby="by-platform" className="glass flex flex-col gap-3 rounded-2xl p-4 md:p-5">
                    <h2 id="by-platform" className="text-lg font-semibold">
                        Selon la plateforme de pub
                    </h2>
                    {overview.platforms.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Aucune pub notée par produit sur cette période.</p>
                    ) : (
                        <table className="w-full text-[15px]">
                            <caption className="sr-only">Pub payée et livraisons selon la plateforme</caption>
                            <thead className="text-muted-foreground text-left text-[13px]">
                                <tr className="border-b">
                                    <th scope="col" className="py-2 font-semibold">
                                        Pub sur
                                    </th>
                                    <th scope="col" className="py-2 pl-3 text-right font-semibold whitespace-nowrap">
                                        Pub
                                    </th>
                                    <th scope="col" className="py-2 pl-3 text-right font-semibold whitespace-nowrap">
                                        Livrés
                                    </th>
                                    <th scope="col" className="py-2 pl-3 text-right font-semibold whitespace-nowrap">
                                        Par livré
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {overview.platforms.map((row) => (
                                    <tr key={row.platform} className="border-b last:border-b-0">
                                        <th scope="row" className="py-2.5 pr-2 text-left font-semibold">
                                            {adPlatformLabel(row.platform)}
                                        </th>
                                        <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums">{formatFcfa(row.ad_spend)}</td>
                                        <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums">{formatNumber(row.delivered)}</td>
                                        <td className="py-2.5 pl-3 text-right font-bold whitespace-nowrap tabular-nums">
                                            {row.cost_per_delivery === null ? 'Pas de donnée' : formatFcfa(row.cost_per_delivery)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <Link
                        href={route('ad-spends.platforms')}
                        className="text-primary min-h-11 content-center self-start font-bold underline underline-offset-4"
                    >
                        Voir par produit
                    </Link>
                </section>
            </div>

            <p className="text-muted-foreground text-sm">
                Le franc CFA d'Afrique de l'Ouest et celui d'Afrique centrale valent la même chose : les pays s'additionnent sans conversion.
            </p>
        </>
    );
}

/**
 * "Tous les pays": one card per country, most profitable first, then a table to compare them.
 */
export function AllCountriesView({ overview, period }: { overview: Overview; period: OverviewPeriod }) {
    const { total } = overview;
    const { format: formatFcfa } = useMoney();

    return (
        <>
            <p className="text-muted-foreground text-[15px] first-letter:uppercase">
                {period.label}. Du plus rentable au moins rentable, avec l'écart par rapport à la période d'avant.
            </p>

            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overview.countries.map((country) => {
                    const loss = country.profit < 0;

                    return (
                        <li key={country.id} className={cn('glass flex flex-col gap-4 rounded-2xl p-5', loss && 'border-danger-fg/40')}>
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-xl font-bold">{country.name}</h2>
                                <ChangeBadge now={country.profit} before={country.previous_profit} />
                            </div>
                            <div>
                                <p className="text-muted-foreground text-sm">Bénéfice net</p>
                                <p
                                    className={cn(
                                        'font-[family-name:var(--font-display)] text-[32px] leading-tight font-bold tabular-nums',
                                        loss && 'text-danger-fg',
                                    )}
                                >
                                    {formatFcfa(country.profit)}
                                </p>
                            </div>
                            <div className="grid gap-1.5">
                                <div className="flex items-baseline justify-between gap-2 text-sm">
                                    <span className="text-muted-foreground">Part du bénéfice total</span>
                                    <span className="font-bold tabular-nums">{loss ? 'Aucune, en perte' : formatPercent(country.share)}</span>
                                </div>
                                <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
                                    <div className="bg-primary h-full rounded-full" style={{ width: `${country.share * 100}%` }} />
                                </div>
                            </div>
                            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                                <CardFigure label="Chiffre d'affaires" value={formatFcfa(country.revenue)} />
                                <CardFigure label="Pub" value={formatFcfa(country.ad_spend)} />
                                <CardFigure label="Livrés" value={formatNumber(country.delivered)} />
                                <CardFigure label="Marge" value={formatPercent(country.margin)} />
                            </dl>
                            <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-sm">
                                {country.pending > 0 ? (
                                    <span className="text-warning-fg flex items-center gap-1.5 font-semibold">
                                        <CircleAlert className="size-4" aria-hidden="true" />
                                        {country.pending > 1 ? `${country.pending} choses à régler` : '1 chose à régler'}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">Rien à régler</span>
                                )}
                                <Link
                                    href={countryHref(country.id, period)}
                                    className="text-primary inline-flex min-h-11 items-center gap-1 font-bold underline underline-offset-4"
                                    aria-label={`Ouvrir ${country.name}`}
                                >
                                    Ouvrir
                                    <ChevronRight className="size-4" aria-hidden="true" />
                                </Link>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <section aria-labelledby="compare-title" className="glass rounded-2xl px-4 pt-5 pb-2 md:px-5">
                <h2 id="compare-title" className="text-lg font-semibold">
                    Comparer en un coup d'œil
                </h2>
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-[15px]">
                        <caption className="sr-only">Résultats {periodName(period)} par pays</caption>
                        <thead className="text-muted-foreground text-[13px]">
                            <tr className="border-b">
                                <th scope="col" className="px-2 py-2.5 text-left font-semibold">
                                    Pays
                                </th>
                                {["Chiffre d'affaires", 'Pub', "Pub / chiffre d'affaires", 'Livrés', 'Bénéfice par livraison', 'Bénéfice net'].map(
                                    (label) => (
                                        <th key={label} scope="col" className="px-2 py-2.5 text-right font-semibold">
                                            {label}
                                        </th>
                                    ),
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {overview.countries.map((country) => (
                                <CompareRow key={country.id} name={country.name} row={country} />
                            ))}
                        </tbody>
                        <tfoot>
                            <CompareRow name="Total" row={total} isTotal />
                        </tfoot>
                    </table>
                </div>
            </section>
        </>
    );
}

function CardFigure({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-bold tabular-nums">{value}</dd>
        </div>
    );
}

function CompareRow({
    name,
    row,
    isTotal = false,
}: {
    name: string;
    row: { revenue: number; ad_spend: number; delivered: number; profit: number };
    isTotal?: boolean;
}) {
    const { format: formatFcfa } = useMoney();
    const perDelivery = row.delivered > 0 ? Math.round(row.profit / row.delivered) : null;
    const cell = 'px-2 py-3 text-right tabular-nums';

    return (
        <tr className={cn(isTotal ? 'border-foreground border-t-2 font-bold' : 'border-b last:border-b-0')}>
            <th scope="row" className="px-2 py-3 text-left font-semibold">
                {name}
            </th>
            <td className={cell}>{formatFcfa(row.revenue)}</td>
            <td className={cell}>{formatFcfa(row.ad_spend)}</td>
            <td className={cell}>{row.revenue > 0 ? formatPercent(row.ad_spend / row.revenue) : 'Pas de vente'}</td>
            <td className={cell}>{formatNumber(row.delivered)}</td>
            <td className={cn(cell, perDelivery !== null && perDelivery < 0 && 'text-danger-fg')}>
                {perDelivery === null ? 'Pas de livraison' : formatFcfa(perDelivery)}
            </td>
            <td className={cn(cell, 'font-bold', row.profit < 0 && 'text-danger-fg')}>{formatFcfa(row.profit)}</td>
        </tr>
    );
}
