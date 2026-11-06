import { AdminBadge, formatDateTime } from '@/components/admin/merchant-status';
import { Pagination, type PaginationLink } from '@/components/admin/pagination';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ScrollText } from 'lucide-react';

interface Log {
    id: number;
    action: string;
    label: string;
    admin: string | null;
    merchant: { id: number; name: string } | null;
    reason: string | null;
    ip: string | null;
    created_at: string | null;
}

interface Props {
    logs: { data: Log[]; links: PaginationLink[]; total: number };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administration', href: '/admin' },
    { title: 'Journal', href: '/admin/journal' },
];

const tone: Record<string, string> = {
    'merchant.suspended': 'bg-destructive',
    'merchant.reactivated': 'bg-primary',
    'impersonation.started': 'bg-secondary',
    'impersonation.stopped': 'bg-muted-foreground',
};

export default function Journal({ logs }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Journal d'administration" />

            <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
                <header className="flex flex-col items-start gap-2.5">
                    <AdminBadge />
                    <h1 className="text-[28px] font-bold md:text-[32px]">Journal</h1>
                    <p className="text-muted-foreground text-[15px]">Suspensions, réactivations et consultations de comptes.</p>
                </header>

                {logs.data.length === 0 ? (
                    <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
                        <span aria-hidden="true" className="badge-success flex size-12 items-center justify-center rounded-full">
                            <ScrollText className="size-6" />
                        </span>
                        <p className="font-semibold">Le journal est vide</p>
                        <p className="text-muted-foreground max-w-sm text-sm">Les actions sur les comptes des commerçants apparaîtront ici.</p>
                    </div>
                ) : (
                    <ol className="glass divide-y rounded-2xl">
                        {logs.data.map((log) => (
                            <li key={log.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                                <div className="flex gap-3">
                                    <span
                                        aria-hidden="true"
                                        className={`mt-1.5 size-2 shrink-0 rounded-full ${tone[log.action] ?? 'bg-muted-foreground'}`}
                                    />
                                    <div>
                                        <p className="font-semibold">
                                            {log.label}
                                            {log.merchant && (
                                                <>
                                                    {' : '}
                                                    <Link
                                                        href={route('admin.merchants.show', log.merchant.id)}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {log.merchant.name}
                                                    </Link>
                                                </>
                                            )}
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                            Par {log.admin ?? 'un admin supprimé'}
                                            {log.reason && `. Raison : ${log.reason}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-muted-foreground pl-5 text-sm whitespace-nowrap tabular-nums sm:pl-0 sm:text-right">
                                    <time dateTime={log.created_at ?? undefined}>{formatDateTime(log.created_at)}</time>
                                    {log.ip && <p className="text-xs">IP {log.ip}</p>}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}

                <Pagination links={logs.links} />
            </div>
        </AppLayout>
    );
}
