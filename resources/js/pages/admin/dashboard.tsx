import { type AdminMerchant, MerchantStatus, formatDate, timeAgo } from '@/components/admin/merchant-status';
import AppLayout from '@/layouts/app-layout';
import { formatNumber } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Bot, LogIn, MessageSquareText, Store, UserPlus, Users } from 'lucide-react';
import { type ReactNode } from 'react';

interface Props {
    metrics: {
        merchants: number;
        new_7d: number;
        new_30d: number;
        active_7d: number;
        suspended: number;
        reports_7d: number;
        messages_30d: number;
        messages_failed_30d: number;
        ai_input_tokens_30d: number;
        ai_output_tokens_30d: number;
        google_sign_ins: number;
    };
    signupsByWeek: { week_start: string; count: number }[];
    recentMerchants: AdminMerchant[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Administration', href: '/admin' }];
const weekLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

export default function AdminDashboard({ metrics, signupsByWeek, recentMerchants }: Props) {
    const activeShare = metrics.merchants > 0 ? Math.round((metrics.active_7d / metrics.merchants) * 100) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Administration" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <header className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Vue d'ensemble de la plateforme</h1>
                    <p className="text-muted-foreground text-sm">Tous les commerçants inscrits sur CODCompta. Chiffres des 7 et 30 derniers jours.</p>
                </header>

                <section aria-label="Chiffres clés" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                        icon={<Store className="size-5" />}
                        label="Commerçants inscrits"
                        value={formatNumber(metrics.merchants)}
                        hint={metrics.suspended > 0 ? `dont ${metrics.suspended} suspendu${metrics.suspended > 1 ? 's' : ''}` : 'aucun suspendu'}
                        highlight
                    />
                    <Metric
                        icon={<UserPlus className="size-5" />}
                        label="Nouveaux inscrits"
                        value={`+${formatNumber(metrics.new_7d)}`}
                        hint={`cette semaine, ${formatNumber(metrics.new_30d)} sur 30 jours`}
                    />
                    <Metric
                        icon={<Users className="size-5" />}
                        label="Actifs cette semaine"
                        value={formatNumber(metrics.active_7d)}
                        hint={`${activeShare} % des commerçants, ${formatNumber(metrics.reports_7d)} rapports saisis`}
                    />
                    <Metric
                        icon={<MessageSquareText className="size-5" />}
                        label="Messages lus (30 j)"
                        value={formatNumber(metrics.messages_30d)}
                        hint={metrics.messages_failed_30d > 0 ? `${metrics.messages_failed_30d} en échec` : 'aucun échec'}
                    />
                </section>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <SignupChart weeks={signupsByWeek} />

                    <section aria-labelledby="usage-title" className="glass flex flex-col gap-4 rounded-2xl p-5 md:p-6">
                        <h2 id="usage-title" className="text-base font-semibold">
                            Services connectés
                        </h2>
                        <UsageRow
                            icon={<Bot className="size-4" />}
                            label="API Claude, 30 derniers jours"
                            value={`${formatNumber(metrics.ai_input_tokens_30d + metrics.ai_output_tokens_30d)} jetons`}
                            detail={`${formatNumber(metrics.ai_input_tokens_30d)} lus, ${formatNumber(metrics.ai_output_tokens_30d)} écrits. Le coût exact est sur console.anthropic.com.`}
                        />
                        <UsageRow
                            icon={<LogIn className="size-4" />}
                            label="Connexion avec Google"
                            value={`${formatNumber(metrics.google_sign_ins)} utilisateur${metrics.google_sign_ins > 1 ? 's' : ''}`}
                            detail="Utilisateurs qui se connectent avec leur compte Google plutôt qu'avec un mot de passe."
                        />
                    </section>
                </div>

                <section aria-labelledby="recent-title" className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <h2 id="recent-title" className="text-lg font-semibold">
                            Dernières inscriptions
                        </h2>
                        <Link
                            href={route('admin.merchants.index')}
                            className="text-primary flex items-center gap-1 text-sm font-semibold hover:underline"
                        >
                            Tous les commerçants
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </div>
                    {recentMerchants.length === 0 ? (
                        <p className="glass text-muted-foreground rounded-2xl p-6 text-sm">Aucun commerçant inscrit pour l'instant.</p>
                    ) : (
                        <ul className="glass divide-y rounded-2xl">
                            {recentMerchants.map((merchant) => (
                                <li key={merchant.id}>
                                    <Link
                                        href={route('admin.merchants.show', merchant.id)}
                                        className="hover:bg-primary/5 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">{merchant.name}</p>
                                            <p className="text-muted-foreground truncate text-sm">{merchant.owner?.email ?? 'Sans utilisateur'}</p>
                                        </div>
                                        <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                            <span>Inscrit le {formatDate(merchant.created_at)}</span>
                                            <span className="hidden sm:inline">Activité : {timeAgo(merchant.last_activity_at)}</span>
                                            <MerchantStatus suspended={merchant.suspended_at !== null} />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}

function Metric({
    icon,
    label,
    value,
    hint,
    highlight = false,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    hint: string;
    highlight?: boolean;
}) {
    return (
        <div className={highlight ? 'glass-hero rounded-2xl p-5' : 'glass rounded-2xl p-5'}>
            <div className={`flex items-center gap-2 text-sm ${highlight ? 'text-white/80' : 'text-muted-foreground'}`}>
                <span aria-hidden="true" className={highlight ? 'text-secondary' : 'text-primary'}>
                    {icon}
                </span>
                {label}
            </div>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight tabular-nums">{value}</p>
            <p className={`mt-1 text-xs ${highlight ? 'text-white/75' : 'text-muted-foreground'}`}>{hint}</p>
        </div>
    );
}

function UsageRow({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
    return (
        <div className="bg-background/60 flex gap-3 rounded-xl border p-4">
            <span aria-hidden="true" className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="font-semibold tabular-nums">{value}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{detail}</p>
            </div>
        </div>
    );
}

/**
 * Sign-ups per week, labelled directly on each bar (a few values: no axis needed).
 */
function SignupChart({ weeks }: { weeks: Props['signupsByWeek'] }) {
    const max = Math.max(1, ...weeks.map((week) => week.count));
    const total = weeks.reduce((sum, week) => sum + week.count, 0);

    return (
        <section aria-labelledby="signups-title" className="glass flex flex-col gap-4 rounded-2xl p-5 md:p-6">
            <div>
                <h2 id="signups-title" className="text-base font-semibold">
                    Inscriptions par semaine
                </h2>
                <p className="text-muted-foreground text-sm">
                    {total} inscription{total > 1 ? 's' : ''} sur les 8 dernières semaines
                </p>
            </div>
            <ol className="flex h-44 items-end gap-2" aria-label="Inscriptions des 8 dernières semaines">
                {weeks.map((week, index) => (
                    <li key={week.week_start} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                        <span className="text-xs font-semibold tabular-nums">{week.count}</span>
                        <span
                            aria-hidden="true"
                            className={`w-full max-w-12 rounded-t-md ${index === weeks.length - 1 ? 'bg-secondary' : 'bg-primary/70'}`}
                            style={{ height: `${Math.max(4, (week.count / max) * 100)}%` }}
                        />
                        <span className="text-muted-foreground text-[11px] whitespace-nowrap">
                            <span className="sr-only">Semaine du </span>
                            {weekLabel.format(new Date(week.week_start))}
                        </span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
