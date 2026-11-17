import { AdSpendTabs } from '@/components/ad-spends/ad-spend-tabs';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { adPlatformLabel } from '@/lib/ad-platforms';
import { formatFcfa, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, CircleAlert, Trophy } from 'lucide-react';

interface Group {
    platform: string;
    days: number;
    ad_spend: number;
    orders: number | null;
    delivered: number;
    revenue: number;
    cost_per_order: number | null;
    cost_per_delivery: number | null;
    profit: number;
    profit_per_day: number;
}

interface ProductComparison {
    product_id: number;
    product: string;
    groups: Group[];
    winner: string | null;
    unnoted_days: number;
}

interface Period {
    type: 'day' | 'week' | 'month' | 'custom';
    from: string;
    to: string;
    label: string;
    previous: string;
    next: string;
}

interface Props {
    countries: { id: number; name: string }[];
    countryId: number | null;
    period: Period;
    products: ProductComparison[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dépenses publicitaires', href: '/pub' },
    { title: 'Quelle plateforme rapporte le plus', href: '/pub/plateformes' },
];

const periodChoices = [
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
] as const;

/** "Facebook et TikTok ensemble", "TikTok". */
const winnerName = (platform: string) => (platform === 'facebook_tiktok' ? 'Facebook et TikTok ensemble' : adPlatformLabel(platform));

const money = (value: number | null) => (value === null ? 'Pas de donnée' : formatFcfa(value));

export default function AdSpendPlatforms({ countries, countryId, period, products }: Props) {
    const show = (params: Record<string, string | number>) =>
        router.get(
            route('ad-spends.platforms'),
            { pays: countryId ?? '', period: period.type, date: period.from, ...params },
            { preserveScroll: true },
        );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quelle plateforme rapporte le plus" />

            <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
                <h1 className="text-[28px] font-bold md:text-[32px]">Dépenses publicitaires</h1>
                <AdSpendTabs />

                <section aria-label="Filtres" className="flex flex-wrap items-center gap-3">
                    {countries.length > 1 && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="platforms-country" className="sr-only">
                                Pays
                            </Label>
                            <NativeSelect
                                id="platforms-country"
                                className="h-11 w-auto"
                                value={countryId ?? ''}
                                onChange={(e) => show({ pays: e.target.value })}
                            >
                                {countries.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                    </option>
                                ))}
                            </NativeSelect>
                        </div>
                    )}
                    <div role="group" aria-label="Période" className="bg-muted flex gap-0.5 rounded-[14px] p-1">
                        {periodChoices.map((choice) => (
                            <button
                                key={choice.value}
                                type="button"
                                aria-pressed={period.type === choice.value}
                                onClick={() => period.type !== choice.value && show({ period: choice.value })}
                                className={cn(
                                    'min-h-10 cursor-pointer rounded-[10px] px-3.5 text-sm font-semibold transition-colors duration-150',
                                    period.type === choice.value
                                        ? 'bg-card text-foreground font-bold shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {choice.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" aria-label="Période précédente" onClick={() => show({ date: period.previous })}>
                            <ChevronLeft aria-hidden="true" />
                        </Button>
                        <p className="min-w-40 px-2 text-center text-[15px] font-semibold first-letter:uppercase">{period.label}</p>
                        <Button variant="outline" size="icon" aria-label="Période suivante" onClick={() => show({ date: period.next })}>
                            <ChevronRight aria-hidden="true" />
                        </Button>
                    </div>
                </section>

                <p className="text-muted-foreground text-sm">On compare les jours selon la plateforme utilisée, avec les vraies livraisons.</p>

                {products.length === 0 ? (
                    <div className="glass text-muted-foreground rounded-2xl p-6 text-[15px]">
                        Aucune pub notée pour un produit sur cette période. Notez la pub de chaque produit dans « Saisir un rapport » pour savoir
                        quelle plateforme rapporte le plus.
                    </div>
                ) : (
                    products.map((product) => <ProductCard key={product.product_id} product={product} />)
                )}
            </div>
        </AppLayout>
    );
}

function ProductCard({ product }: { product: ProductComparison }) {
    const best = product.groups[0];
    const titleId = `product-${product.product_id}`;

    return (
        <section aria-labelledby={titleId} className="glass flex flex-col gap-4 rounded-2xl p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id={titleId} className="text-[22px] font-bold">
                    {product.product}
                </h2>
                {product.winner && best && (
                    <p className="badge-success flex items-center gap-2 rounded-xl px-3 py-2 text-[15px] font-bold">
                        <Trophy className="size-4 shrink-0" aria-hidden="true" />
                        <span>
                            {winnerName(product.winner)} {product.winner === 'facebook_tiktok' ? 'rapportent' : 'rapporte'} le plus :{' '}
                            <span className="tabular-nums">{formatFcfa(best.profit_per_day)}</span> par jour
                        </span>
                    </p>
                )}
                {product.groups.length === 1 && (
                    <p className="badge-neutral rounded-xl px-3 py-2 text-[15px] font-semibold">Une seule plateforme : rien à comparer</p>
                )}
            </div>

            {product.groups.length > 0 && (
                <>
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[760px] text-[15px]">
                            <caption className="sr-only">Résultats de {product.product} selon la plateforme de pub</caption>
                            <thead className="text-muted-foreground text-left text-[13px]">
                                <tr className="border-b">
                                    <th scope="col" className="px-2.5 py-2.5 font-semibold">
                                        Pub sur
                                    </th>
                                    <Th>Jours</Th>
                                    <Th>Pub payée</Th>
                                    <Th>Commandes</Th>
                                    <Th>Livraisons</Th>
                                    <Th>Coût par livraison</Th>
                                    <Th>Bénéfice après pub</Th>
                                    <Th>Bénéfice par jour</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {product.groups.map((group) => (
                                    <tr key={group.platform} className="border-b last:border-b-0">
                                        <th scope="row" className="px-2.5 py-3 text-left font-bold">
                                            {adPlatformLabel(group.platform)}
                                        </th>
                                        <Td>{formatNumber(group.days)}</Td>
                                        <Td>{formatFcfa(group.ad_spend)}</Td>
                                        <Td>{group.orders === null ? 'Non notées' : formatNumber(group.orders)}</Td>
                                        <Td>{formatNumber(group.delivered)}</Td>
                                        <Td>{money(group.cost_per_delivery)}</Td>
                                        <Td className={cn(group.profit < 0 && 'text-danger-fg')}>{formatFcfa(group.profit)}</Td>
                                        <Td className={cn('font-bold', group.profit_per_day < 0 && 'text-danger-fg')}>
                                            {formatFcfa(group.profit_per_day)}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {product.groups.length > 1 && <Bars groups={product.groups} winner={product.winner} />}

                    {product.groups.length === 1 && (
                        <p className="text-[15px] tabular-nums md:hidden">
                            {adPlatformLabel(best.platform)} uniquement : {formatFcfa(best.ad_spend)} de pub, {formatNumber(best.delivered)} livrés,{' '}
                            {money(best.cost_per_delivery)} par livraison, {formatFcfa(best.profit)} de bénéfice après pub.
                        </p>
                    )}
                </>
            )}

            {product.unnoted_days > 0 && (
                <div className="bg-warning-bg/60 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
                    <p className="text-warning-fg flex items-start gap-2 text-[15px] font-semibold">
                        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {product.unnoted_days} jour{product.unnoted_days > 1 ? 's' : ''} de pub sans plateforme notée : ces jours ne sont pas comptés.
                    </p>
                    <Button asChild variant="outline">
                        <Link href={route('ad-spends.index', { sans_plateforme: 1, produit: product.product_id })}>Compléter</Link>
                    </Button>
                </div>
            )}
        </section>
    );
}

/**
 * Profit per day (higher is better) and cost per delivery (lower is better), as bars.
 * On phones, this is the only view: one block per platform with its numbers written out.
 */
function Bars({ groups, winner }: { groups: Group[]; winner: string | null }) {
    const maxProfit = Math.max(1, ...groups.map((group) => group.profit_per_day));
    const costs = groups.filter((group) => group.cost_per_delivery !== null).sort((a, b) => a.cost_per_delivery! - b.cost_per_delivery!);
    const maxCost = Math.max(1, ...costs.map((group) => group.cost_per_delivery!));

    return (
        <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2.5">
                <h3 className="text-[15px] font-bold">Bénéfice par jour (le plus haut est le mieux)</h3>
                {groups.map((group) => (
                    <Bar
                        key={group.platform}
                        label={adPlatformLabel(group.platform)}
                        value={`${formatFcfa(group.profit_per_day)} par jour`}
                        ratio={group.profit_per_day / maxProfit}
                        strong={group.platform === winner}
                        detail={`${group.days} jour${group.days > 1 ? 's' : ''}, ${group.delivered} livrés, ${money(group.cost_per_delivery)} par livraison`}
                    />
                ))}
            </div>
            {costs.length > 1 && (
                <div className="hidden flex-col gap-2.5 md:flex">
                    <h3 className="text-[15px] font-bold">Coût par livraison (le plus bas est le mieux)</h3>
                    {costs.map((group, index) => (
                        <Bar
                            key={group.platform}
                            label={adPlatformLabel(group.platform)}
                            value={formatFcfa(group.cost_per_delivery)}
                            ratio={group.cost_per_delivery! / maxCost}
                            strong={index === 0}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function Bar({ label, value, ratio, strong, detail }: { label: string; value: string; ratio: number; strong: boolean; detail?: string }) {
    return (
        <div className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={cn(strong && 'font-bold')}>{label}</span>
                <span className="font-bold tabular-nums">{value}</span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
                <div
                    className={cn('h-full rounded-full', strong ? 'bg-primary' : 'bg-muted-foreground/60')}
                    style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
                />
            </div>
            {detail && <p className="text-muted-foreground text-xs tabular-nums md:hidden">{detail}</p>}
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th scope="col" className="px-2.5 py-2.5 text-right font-semibold whitespace-nowrap">
            {children}
        </th>
    );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
    return <td className={cn('px-2.5 py-3 text-right whitespace-nowrap tabular-nums', className)}>{children}</td>;
}
