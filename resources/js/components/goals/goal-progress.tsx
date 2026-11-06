import { Sika } from '@/components/sika/sika';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type GoalMetric, type GoalProgress } from '@/types';
import { Link } from '@inertiajs/react';
import { CalendarClock, CircleAlert, Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { type ReactNode } from 'react';

export const metricNames: Record<GoalMetric, string> = {
    profit: 'bénéfice net',
    revenue: "chiffre d'affaires",
};

/** "64 %", and "plus de 999 %" when a goal is crushed. */
export const percentText = (percent: number) => (percent > 999 ? 'plus de 999 %' : `${percent} %`);

const longDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "1er novembre 2026", "15 novembre 2026". */
export const formatLongDate = (iso: string) => longDate.format(new Date(`${iso}T00:00:00Z`)).replace(/^1 /, '1er ');

export const daysText = (days: number) => `${days} jour${days > 1 ? 's' : ''}`;

/** A goal still running, or reached while its dates are not over yet. */
export const isActive = (goal: GoalProgress) => goal.status === 'in_progress' || (goal.status === 'reached' && goal.days_left > 0);

function badge(goal: GoalProgress): { text: string; icon: typeof Trophy; className: string } {
    switch (goal.status) {
        case 'reached':
            return { text: 'Objectif atteint', icon: Trophy, className: 'badge-warning' };
        case 'missed':
            return { text: 'Non atteint', icon: CircleAlert, className: 'badge-danger' };
        case 'upcoming':
            return { text: 'À venir', icon: CalendarClock, className: 'bg-muted text-muted-foreground' };
        default:
            return goal.pace === 'behind'
                ? { text: 'En retard sur le rythme', icon: TrendingDown, className: 'badge-danger' }
                : { text: 'En bonne voie', icon: TrendingUp, className: 'badge-success' };
    }
}

/**
 * Progress bar with text: the state is always written, never shown by colour alone.
 */
export function GoalBar({ goal, className }: { goal: GoalProgress; className?: string }) {
    const width = Math.min(100, goal.percent);

    return (
        <div
            role="progressbar"
            aria-label={goal.title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={width}
            aria-valuetext={`${percentText(goal.percent)}, ${badge(goal).text}`}
            className={cn('bg-muted relative h-2.5 overflow-hidden rounded-full', className)}
        >
            <span
                className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                    goal.status === 'reached' ? 'bg-secondary' : goal.status === 'missed' || goal.pace === 'behind' ? 'bg-chart-5' : 'bg-primary',
                )}
                style={{ width: `${width}%` }}
            />
            {goal.status === 'in_progress' && goal.expected_percent > 0 && goal.expected_percent < 100 && (
                <span
                    aria-hidden="true"
                    title="Où vous devriez en être aujourd'hui"
                    className="bg-foreground absolute inset-y-0 w-1 -translate-x-1/2 rounded-full"
                    style={{ left: `${goal.expected_percent}%` }}
                />
            )}
        </div>
    );
}

/**
 * The detail sentence under the bar: what is done, what is left, and per day.
 */
function GoalDetail({ goal }: { goal: GoalProgress }) {
    const strong = (children: ReactNode) => <strong className="tabular-nums">{children}</strong>;

    switch (goal.status) {
        case 'upcoming':
            return (
                <p className="text-sm">
                    Commence le {strong(formatLongDate(goal.from))}. Il faudra environ {strong(formatFcfa(goal.per_day_target))} par jour pendant{' '}
                    {daysText(goal.days)}.
                </p>
            );
        case 'reached':
            return (
                <p className="text-sm">
                    Bravo ! {strong(percentText(goal.percent))} de l'objectif.
                    {goal.days_left > 0 ? ` Encore ${daysText(goal.days_left)} pour aller plus loin.` : ''}
                </p>
            );
        case 'missed':
            return (
                <p className="text-sm">
                    Terminé le {formatLongDate(goal.to)} à {strong(percentText(goal.percent))} : il a manqué {strong(formatFcfa(goal.remaining))}.
                </p>
            );
        default:
            return (
                <div className="space-y-1 text-sm">
                    <p>
                        {strong(percentText(goal.percent))} atteint
                        {goal.expected_percent > 0 && goal.expected_percent < 100 ? (
                            <span className="text-muted-foreground">, {goal.expected_percent} % attendu aujourd'hui (le trait)</span>
                        ) : null}
                        .
                    </p>
                    <p>
                        Il manque {strong(formatFcfa(goal.remaining))} : environ {strong(formatFcfa(goal.per_day_needed))} par jour pendant{' '}
                        {daysText(goal.days_left)}.
                    </p>
                </div>
            );
    }
}

/**
 * One goal: name, dates, money done against the target, and where it stands.
 */
export function GoalCard({ goal, actions }: { goal: GoalProgress; actions?: ReactNode }) {
    const state = badge(goal);
    const Icon = state.icon;

    return (
        <li className={cn('glass flex flex-col gap-3 rounded-2xl p-5', goal.status === 'reached' && 'ring-secondary/70 ring-2')}>
            <div className="flex items-start justify-between gap-2">
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', state.className)}>
                    <Icon className="size-3.5" aria-hidden="true" />
                    {state.text}
                </span>
                {actions && <div className="-mt-1 -mr-2 flex shrink-0 items-center">{actions}</div>}
            </div>

            <div>
                <h3 className="font-semibold">{goal.title}</h3>
                <p className="text-muted-foreground text-xs">
                    Du {formatLongDate(goal.from)} au {formatLongDate(goal.to)}, {daysText(goal.days)}
                </p>
            </div>

            <div>
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">{formatFcfa(goal.achieved)}</p>
                <p className="text-muted-foreground text-sm tabular-nums">
                    sur {formatFcfa(goal.target)} de {metricNames[goal.metric]}
                </p>
            </div>

            <GoalBar goal={goal} />
            <GoalDetail goal={goal} />
        </li>
    );
}

/**
 * Compact reminder in the sidebar, on every page: the running goal that ends first.
 */
export function GoalSidebarBadge({ goals }: { goals: GoalProgress[] }) {
    const goal = goals.find((item) => item.status === 'in_progress') ?? goals.find(isActive);

    if (!goal) {
        const upcoming = goals.find((item) => item.status === 'upcoming');

        return (
            <Link
                href={route('goals.index')}
                className="border-sidebar-border hover:bg-sidebar-accent flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-xs transition-colors group-data-[collapsible=icon]:hidden"
            >
                <Sika mood="nudge" className="size-8 shrink-0" />
                <span>
                    <span className="block font-semibold">{upcoming ? 'Objectif à venir' : 'Pas d’objectif en cours'}</span>
                    {upcoming ? `Commence le ${formatLongDate(upcoming.from)}` : 'Sika t’aide à en fixer un'}
                </span>
            </Link>
        );
    }

    const reached = goal.status === 'reached';

    return (
        <Link
            href={route('goals.index')}
            className={cn(
                'block rounded-lg border p-2.5 text-xs transition-colors group-data-[collapsible=icon]:hidden',
                reached ? 'badge-warning hover:bg-secondary/30 border-transparent' : 'border-sidebar-border hover:bg-sidebar-accent',
            )}
        >
            <span className="mb-1.5 flex items-center justify-between gap-2 font-semibold">
                <span className="flex min-w-0 items-center gap-1.5">
                    {reached ? (
                        <Trophy className="size-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                        <Target className="text-primary size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate" title={goal.title}>
                        {goal.title}
                    </span>
                </span>
                <span className="tabular-nums">{percentText(goal.percent)}</span>
            </span>
            <GoalBar goal={goal} />
            <span className="text-muted-foreground mt-1.5 block">
                {reached
                    ? 'Atteint, bravo !'
                    : `Il manque ${formatFcfa(goal.remaining)}, ${daysText(goal.days_left)} restant${goal.days_left > 1 ? 's' : ''}`}
                {goal.pace === 'behind' && ' (en retard)'}
            </span>
        </Link>
    );
}
