import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { History, TableProperties } from 'lucide-react';

const tabs = [
    { title: 'Résultats', href: '/rapports', icon: TableProperties },
    { title: 'Historique des rapports', href: '/rapports/historique', icon: History },
];

/**
 * The two views of the "Mes rapports" section: results of a period, and every report received.
 */
export function ReportTabs() {
    const path = usePage().url.split('?')[0];

    return (
        <nav aria-label="Mes rapports" className="bg-muted inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl p-1">
            {tabs.map((tab) => {
                const active = path === tab.href;

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        prefetch
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                            active ? 'bg-background text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <tab.icon className="size-4" aria-hidden="true" />
                        {tab.title}
                    </Link>
                );
            })}
        </nav>
    );
}
