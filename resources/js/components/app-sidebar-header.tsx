import AppLogoIcon from '@/components/app-logo-icon';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    return (
        <header className="bg-card flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:bg-transparent">
            <div className="flex min-w-0 items-center gap-2">
                <Link
                    href="/rapports"
                    prefetch
                    aria-label="CODCompta, mes rapports"
                    className="-ml-1 grid size-11 place-items-center rounded-xl md:hidden"
                >
                    <AppLogoIcon className="size-8" />
                </Link>
                <SidebarTrigger className="-ml-1 hidden size-11 md:inline-flex" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <Link
                href="/objectifs#notifications"
                aria-label="Notifications de Sika"
                className="hover:bg-accent ml-auto grid size-11 shrink-0 place-items-center rounded-xl border transition-colors duration-150 md:hidden"
            >
                <Bell className="size-5" aria-hidden="true" />
            </Link>
        </header>
    );
}
