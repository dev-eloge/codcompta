import { isCurrent } from '@/components/nav-main';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { ChartLine, History, Menu, Plus, Target, type LucideIcon } from 'lucide-react';

const tabClass =
    'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold text-muted-foreground transition-colors duration-150 hover:text-foreground aria-[current=page]:text-primary';

function Tab({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
    const path = usePage().url.split('?')[0];
    const active = isCurrent(href, path);

    return (
        <Link href={href} prefetch className={tabClass} aria-current={active ? 'page' : undefined}>
            <Icon className="size-[22px]" aria-hidden="true" />
            {label}
        </Link>
    );
}

/**
 * Phone navigation: the four places merchants go every day, plus the central button to add the day's figures.
 * "Plus" opens the full menu.
 */
export function MobileTabBar() {
    const { setOpenMobile, openMobile } = useSidebar();
    const path = usePage().url.split('?')[0];
    const adding = path === '/messages/coller' || path === '/rapports/saisie';

    return (
        <nav
            aria-label="Navigation"
            className="bg-card fixed inset-x-0 bottom-0 z-30 flex items-center border-t px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
        >
            <Tab href="/rapports" label="Rapports" icon={ChartLine} />
            <Tab href="/rapports/historique" label="Historique" icon={History} />
            <Link
                href="/messages/coller"
                prefetch
                aria-label="Ajouter un rapport"
                aria-current={adding ? 'page' : undefined}
                className={cn(
                    'bg-primary text-primary-foreground hover:bg-primary-hover mx-1.5 -mt-7 grid size-[60px] shrink-0 place-items-center rounded-2xl shadow-[0_4px_12px_rgb(15_138_108/0.25)] transition-colors duration-150',
                )}
            >
                <Plus className="size-7" strokeWidth={2.6} aria-hidden="true" />
            </Link>
            <Tab href="/objectifs" label="Objectifs" icon={Target} />
            <button type="button" className={tabClass} aria-expanded={openMobile} onClick={() => setOpenMobile(true)}>
                <Menu className="size-[22px]" aria-hidden="true" />
                Plus
            </button>
        </nav>
    );
}
