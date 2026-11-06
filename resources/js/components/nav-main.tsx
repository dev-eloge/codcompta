import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

/**
 * Exact match, plus a section's own sub-pages (a report's detail keeps "Mes rapports" active, a merchant's keeps "Commerçants").
 * Sub-pages that have their own menu entry (/rapports/saisie) stay with that entry.
 */
export const isCurrent = (url: string, path: string, all: string[] = allUrls) => {
    if (path === url) {
        return true;
    }

    if (url === '/admin' || !path.startsWith(`${url}/`)) {
        return false;
    }

    return !all.some((other) => other !== url && other.startsWith(url) && (path === other || path.startsWith(`${other}/`)));
};

export const allUrls = [
    '/rapports',
    '/rapports/historique',
    '/rapports/saisie',
    '/messages/coller',
    '/messages',
    '/pub',
    '/referentiel',
    '/objectifs',
    '/admin',
    '/admin/commercants',
    '/admin/journal',
];

/**
 * One group of the menu. The administration group sits on the dark surface so the super admin always
 * knows which space they are in.
 */
export function NavMain({ items = [], label = 'Comptabilité', tone = 'default' }: { items: NavItem[]; label?: string; tone?: 'default' | 'admin' }) {
    const page = usePage();
    const admin = tone === 'admin';

    return (
        <SidebarGroup
            className={cn(
                'px-2 py-0',
                admin && 'bg-hero mx-2 w-auto rounded-2xl px-1.5 py-2 group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:px-0',
            )}
        >
            <SidebarGroupLabel className={cn(admin && 'text-on-hero-gold')}>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const active = isCurrent(item.url, page.url.split('?')[0]);

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={active}
                                tooltip={item.title}
                                className={cn(
                                    admin &&
                                        'text-hero-muted hover:text-hero-foreground active:text-hero-foreground data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground hover:bg-white/10 active:bg-white/10',
                                )}
                            >
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
