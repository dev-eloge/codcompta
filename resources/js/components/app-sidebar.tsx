import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { ClipboardPlus, FileSpreadsheet, Megaphone, MessageSquareText, Settings2, TableProperties } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Rapports',
        url: '/rapports',
        icon: TableProperties,
    },
    {
        title: 'Coller un message',
        url: '/messages/coller',
        icon: MessageSquareText,
    },
    {
        title: 'Google Sheets',
        url: '/sheets',
        icon: FileSpreadsheet,
    },
    {
        title: 'Saisir un rapport',
        url: '/rapports/saisie',
        icon: ClipboardPlus,
    },
    {
        title: 'Pub',
        url: '/pub',
        icon: Megaphone,
    },
    {
        title: 'Référentiel',
        url: '/referentiel',
        icon: Settings2,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/rapports" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
