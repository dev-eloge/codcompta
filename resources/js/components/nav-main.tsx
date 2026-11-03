import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

/**
 * Exact match, plus a section's own sub-pages (a report's detail keeps "Mes rapports" active, a merchant's keeps "Commerçants").
 * Sub-pages that have their own menu entry (/rapports/saisie) stay with that entry.
 */
const isCurrent = (url: string, path: string, all: string[]) => {
    if (path === url) {
        return true;
    }

    if (url === '/admin' || !path.startsWith(`${url}/`)) {
        return false;
    }

    return !all.some((other) => other !== url && other.startsWith(url) && (path === other || path.startsWith(`${other}/`)));
};

const allUrls = [
    '/rapports',
    '/rapports/saisie',
    '/messages/coller',
    '/messages',
    '/pub',
    '/referentiel',
    '/admin',
    '/admin/commercants',
    '/admin/journal',
];

export function NavMain({ items = [], label = 'Comptabilité' }: { items: NavItem[]; label?: string }) {
    const page = usePage();
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const active = isCurrent(item.url, page.url.split('?')[0], allUrls);

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                                <Link href={item.url} prefetch aria-current={active ? 'page' : undefined}>
                                    {item.icon && <item.icon aria-hidden="true" />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
