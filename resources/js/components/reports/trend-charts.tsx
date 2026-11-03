import { formatFcfa, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

type Bucket = 'day' | 'week' | 'month';

interface Point {
    from: string;
    to: string;
    revenue: number;
    profit: number;
    delivered: number;
}

export interface Trend {
    bucket: Bucket;
    from: string;
    to: string;
    extended: boolean;
    points: Point[];
    totals: { revenue: number; profit: number; delivered: number };
    previous: { from: string; to: string; revenue: number; profit: number; delivered: number };
}

type Measure = 'revenue' | 'profit' | 'delivered';

const measures: { key: Measure; title: string; format: (value: number) => string }[] = [
    { key: 'revenue', title: "Chiffre d'affaires", format: formatFcfa },
    { key: 'profit', title: 'Bénéfice net', format: formatFcfa },
    { key: 'delivered', title: 'Produits livrés', format: formatNumber },
];

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

function bucketLabel(point: Point, bucket: Bucket): string {
    if (bucket === 'month') {
        return monthFormat.format(utc(point.from));
    }

    if (bucket === 'week') {
        return `sem. du ${dayFormat.format(utc(point.from))}`;
    }

    return dayFormat.format(utc(point.from));
}

const bucketNames: Record<Bucket, string> = { day: 'jour', week: 'semaine', month: 'mois' };

/**
 * Three small charts under the results: revenue, net profit and products delivered, one bar per day
 * (or week, or month), each compared with the same length of time just before.
 */
export function TrendCharts({ trend }: { trend: Trend }) {
    const days = Math.round((utc(trend.to).getTime() - utc(trend.from).getTime()) / 86_400_000) + 1;

    return (
        <section aria-labelledby="trend-title" className="space-y-3">
            <div className="space-y-1">
                <h2 id="trend-title" className="text-lg font-semibold">
                    Progression
                </h2>
                <p className="text-muted-foreground text-sm">
                    Par {bucketNames[trend.bucket]}, du {dayFormat.format(utc(trend.from))} au {dayFormat.format(utc(trend.to))}, comparé aux {days}{' '}
                    jours d'avant.
                    {trend.extended && ' La période affichée étant courte, les graphiques montrent les 14 derniers jours.'} Une publicité compte le
                    jour où elle se termine.
                </p>
            </div>

            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {measures.map((measure) => (
                    <TrendCard key={measure.key} trend={trend} measure={measure} days={days} />
                ))}
            </ul>
        </section>
    );
}

function TrendCard({ trend, measure, days }: { trend: Trend; measure: (typeof measures)[number]; days: number }) {
    const [hovered, setHovered] = useState<number | null>(null);
    const values = trend.points.map((point) => point[measure.key]);
    const total = trend.totals[measure.key];
    const before = trend.previous[measure.key];

    const max = Math.max(0, ...values);
    const min = Math.min(0, ...values);
    const span = max - min || 1;
    const zero = (max / span) * 100; // distance of the zero line from the top, in %
    const titleId = `trend-${measure.key}`;
    const active = hovered === null ? null : trend.points[hovered];
    const labelIndexes = new Set([0, Math.floor((trend.points.length - 1) / 2), trend.points.length - 1]);

    return (
        <li className="glass flex flex-col gap-3 rounded-2xl p-5" aria-labelledby={titleId}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 id={titleId} className="text-muted-foreground text-sm font-medium">
                        {measure.title}
                    </h3>
                    <p className={cn('font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums', total < 0 && 'text-destructive')}>
                        {measure.format(total)}
                    </p>
                </div>
                <Change now={total} before={before} days={days} />
            </div>

            {/* The bars. Hover or tap a bar to read its value; the same figures are in the table below. */}
            <div className="relative">
                <div
                    className="relative h-36"
                    onPointerLeave={() => setHovered(null)}
                    role="img"
                    aria-label={`${measure.title} par ${bucketNames[trend.bucket]}. Le détail est dans le tableau « Voir les chiffres ».`}
                >
                    <span className="border-border absolute inset-x-0 border-t border-dashed" style={{ top: 0 }} aria-hidden="true" />
                    <span className="bg-foreground/30 absolute inset-x-0 h-px" style={{ top: `${zero}%` }} aria-hidden="true" />
                    <div className="absolute inset-0 flex gap-0.5">
                        {trend.points.map((point, index) => {
                            const value = point[measure.key];
                            const height = (Math.abs(value) / span) * 100;
                            const negative = value < 0;

                            return (
                                <div
                                    key={point.from}
                                    className="relative h-full flex-1"
                                    onPointerEnter={() => setHovered(index)}
                                    onClick={() => setHovered(index)}
                                >
                                    {value !== 0 && (
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'absolute inset-x-0 mx-auto max-w-6 transition-opacity',
                                                negative
                                                    ? 'bg-destructive/85 rounded-b-[4px] bg-[repeating-linear-gradient(135deg,transparent_0_3px,rgb(255_255_255/0.35)_3px_5px)]'
                                                    : 'bg-primary rounded-t-[4px]',
                                                hovered !== null && hovered !== index && 'opacity-45',
                                            )}
                                            style={
                                                negative
                                                    ? { top: `${zero}%`, height: `${height}%` }
                                                    : { bottom: `${100 - zero}%`, height: `${height}%` }
                                            }
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-muted-foreground absolute top-0 right-0 -translate-y-full pb-0.5 text-[11px] tabular-nums" aria-hidden="true">
                    {max > 0 ? measure.format(max) : ''}
                </div>

                {active && (
                    <div
                        role="status"
                        className="bg-popover text-popover-foreground pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border px-3 py-1.5 text-xs whitespace-nowrap shadow-md"
                        style={{ left: `${Math.min(80, Math.max(20, ((hovered! + 0.5) / trend.points.length) * 100))}%` }}
                    >
                        <span className="text-muted-foreground">{bucketLabel(active, trend.bucket)} : </span>
                        <strong className="tabular-nums">{measure.format(active[measure.key])}</strong>
                        {active[measure.key] < 0 && <span className="text-destructive"> (perte)</span>}
                    </div>
                )}
            </div>

            <div className="text-muted-foreground relative h-4 text-[11px]" aria-hidden="true">
                {trend.points.map((point, index) =>
                    labelIndexes.has(index) ? (
                        <span
                            key={point.from}
                            className={cn(
                                'absolute whitespace-nowrap',
                                index === 0 ? 'left-0' : index === trend.points.length - 1 ? 'right-0' : '-translate-x-1/2',
                            )}
                            style={
                                index !== 0 && index !== trend.points.length - 1
                                    ? { left: `${((index + 0.5) / trend.points.length) * 100}%` }
                                    : undefined
                            }
                        >
                            {bucketLabel(point, trend.bucket)}
                        </span>
                    ) : null,
                )}
            </div>

            <details className="text-sm">
                <summary className="text-primary w-fit cursor-pointer font-semibold">Voir les chiffres</summary>
                <div className="mt-2 max-h-56 overflow-auto rounded-lg border">
                    <table className="w-full text-xs">
                        <caption className="sr-only">
                            {measure.title} par {bucketNames[trend.bucket]}
                        </caption>
                        <thead className="bg-muted sticky top-0">
                            <tr>
                                <th scope="col" className="px-3 py-1.5 text-left font-semibold">
                                    {bucketNames[trend.bucket].charAt(0).toUpperCase() + bucketNames[trend.bucket].slice(1)}
                                </th>
                                <th scope="col" className="px-3 py-1.5 text-right font-semibold">
                                    {measure.title}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {trend.points.map((point) => (
                                <tr key={point.from} className="border-t">
                                    <td className="px-3 py-1.5">{bucketLabel(point, trend.bucket)}</td>
                                    <td className={cn('px-3 py-1.5 text-right', point[measure.key] < 0 && 'text-destructive font-semibold')}>
                                        {measure.format(point[measure.key])}
                                        {point[measure.key] < 0 && ' (perte)'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </li>
    );
}

/**
 * "+12 % par rapport aux 14 jours d'avant", with an arrow and words, never colour alone.
 */
function Change({ now, before, days }: { now: number; before: number; days: number }) {
    if (before === 0) {
        return <p className="text-muted-foreground max-w-32 text-right text-xs">Rien sur les {days} jours d'avant</p>;
    }

    const change = Math.round(((now - before) / Math.abs(before)) * 100);
    const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;

    return (
        <p
            className={cn(
                'flex max-w-36 shrink-0 items-start gap-1 text-right text-xs font-semibold',
                change > 0 && 'text-primary',
                change < 0 && 'text-destructive',
                change === 0 && 'text-muted-foreground',
            )}
        >
            <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
                {change > 0 ? '+' : ''}
                {change} % <span className="text-muted-foreground font-normal">vs les {days} jours d'avant</span>
            </span>
        </p>
    );
}
