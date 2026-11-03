import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { GoalBuddy } from '@/components/sika/goal-buddy';
import { type BreadcrumbItem } from '@/types';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: { children: React.ReactNode; breadcrumbs?: BreadcrumbItem[] }) {
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
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div id="contenu" tabIndex={-1} className="flex flex-1 flex-col outline-none">
                    {children}
                </div>
                <GoalBuddy />
            </AppContent>
        </AppShell>
    );
}
