import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { MobileTabBar } from '@/components/mobile-tab-bar';
import { GoalBuddy } from '@/components/sika/goal-buddy';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
    focusedOnMobile = false,
}: {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    focusedOnMobile?: boolean;
}) {
    // "contents" keeps the wrapped parts laid out (and sticky) exactly as if the wrapper was not there.
    const onDesktopOnly = cn('contents', focusedOnMobile && 'max-md:hidden');

    return (
        <AppShell variant="sidebar">
            <a
                href="#contenu"
                className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
                Aller au contenu
            </a>
            <AppSidebar />
            <AppContent variant="sidebar">
                <ImpersonationBanner />
                <div className={onDesktopOnly}>
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                </div>
                <div id="contenu" tabIndex={-1} className={cn('flex flex-1 flex-col outline-none md:pb-0', !focusedOnMobile && 'pb-28')}>
                    {children}
                </div>
                <div className={onDesktopOnly}>
                    <GoalBuddy />
                </div>
            </AppContent>
            <div className={onDesktopOnly}>
                <MobileTabBar />
            </div>
        </AppShell>
    );
}
