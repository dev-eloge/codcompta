import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';

const tabs = [
    { title: 'Toutes les pubs', href: '/pub' },
    { title: 'Quelle plateforme rapporte le plus', href: '/pub/plateformes' },
];

/**
 * The two views of "Dépenses publicitaires": every ad noted, and which platform pays best.
 */
export function AdSpendTabs() {
    const path = usePage().url.split('?')[0];

    return (
        <nav aria-label="Dépenses publicitaires" className="flex max-w-full gap-6 overflow-x-auto border-b">
            {tabs.map((tab) => {
                const active = path === tab.href;

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        prefetch
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            '-mb-px flex min-h-11 items-center border-b-[3px] px-0.5 text-[15px] whitespace-nowrap transition-colors duration-150',
                            active
                                ? 'border-primary text-foreground font-bold'
                                : 'text-muted-foreground hover:text-foreground border-transparent font-semibold',
                        )}
                    >
                        {tab.title}
                    </Link>
                );
            })}
        </nav>
    );
}
