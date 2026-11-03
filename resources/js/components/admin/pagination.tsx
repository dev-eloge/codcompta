import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

/**
 * Laravel paginator links, in French and with real links (keyboard and back button work).
 */
export function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    const label = (raw: string) =>
        raw
            .replace('&laquo; Previous', '‹ Précédent')
            .replace('Next &raquo;', 'Suivant ›')
            .replace('pagination.previous', '‹ Précédent')
            .replace('pagination.next', 'Suivant ›');

    return (
        <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-1">
            {links.map((link, index) =>
                link.url ? (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        aria-current={link.active ? 'page' : undefined}
                        className={cn(
                            'min-w-10 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors',
                            link.active ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10',
                        )}
                    >
                        {label(link.label)}
                    </Link>
                ) : (
                    <span key={index} className="text-muted-foreground min-w-10 px-3 py-2 text-center text-sm">
                        {label(link.label)}
                    </span>
                ),
            )}
        </nav>
    );
}
