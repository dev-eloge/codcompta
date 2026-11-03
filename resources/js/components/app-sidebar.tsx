import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ClipboardPlus, LayoutDashboard, Megaphone, MessageSquareText, ScrollText, Settings2, Store, TableProperties, Target } from 'lucide-react';
import AppLogo from './app-logo';
import { GoalSidebarBadge } from './goals/goal-progress';
import { InstallSidebarButton } from './install-app';

// Grouped by what the merchant wants to do: see results, add the week's figures, set up the business.
const resultNavItems: NavItem[] = [
    { title: 'Mes rapports', url: '/rapports', icon: TableProperties },
    { title: 'Mes objectifs', url: '/objectifs', icon: Target },
];

const inputNavItems: NavItem[] = [
    { title: 'Saisir un rapport', url: '/rapports/saisie', icon: ClipboardPlus },
    { title: 'Lire un message WhatsApp', url: '/messages/coller', icon: MessageSquareText },
    { title: 'Dépenses publicitaires', url: '/pub', icon: Megaphone },
];

const setupNavItems: NavItem[] = [{ title: 'Pays, agences et produits', url: '/referentiel', icon: Settings2 }];

const adminNavItems: NavItem[] = [
    { title: 'Tableau de bord', url: '/admin', icon: LayoutDashboard },
    { title: 'Commerçants', url: '/admin/commercants', icon: Store },
    { title: 'Journal', url: '/admin/journal', icon: ScrollText },
];

export function AppSidebar() {
    const { auth, goals } = usePage<SharedData>().props;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/rapports" prefetch aria-label="CODCompta, retour à mes rapports">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={resultNavItems} label="Résultats" />
                <NavMain items={inputNavItems} label="Ajouter des chiffres" />
                <NavMain items={setupNavItems} label="Configuration" />
                {auth.isSuperAdmin && <NavMain items={adminNavItems} label="Administration" />}
            </SidebarContent>

            <SidebarFooter>
                <GoalSidebarBadge goals={goals ?? []} />
                <InstallSidebarButton />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
