import { cn } from '@/lib/utils';

/**
 * Active / suspended label: always text plus colour, never colour alone.
 */
export function MerchantStatus({ suspended, className }: { suspended: boolean; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                suspended ? 'bg-destructive/12 text-destructive' : 'bg-primary/12 text-primary',
                className,
            )}
        >
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', suspended ? 'bg-destructive' : 'bg-primary')} />
            {suspended ? 'Suspendu' : 'Actif'}
        </span>
    );
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatDate = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : '–');
export const formatDateTime = (iso: string | null) => (iso ? dateTimeFormat.format(new Date(iso)) : '–');

/**
 * "Il y a 3 jours", for last-activity columns.
 */
export function timeAgo(iso: string | null): string {
    if (!iso) {
        return 'Jamais';
    }

    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

    if (days <= 0) {
        return "Aujourd'hui";
    }

    if (days === 1) {
        return 'Hier';
    }

    return days < 30 ? `Il y a ${days} jours` : formatDate(iso);
}

export interface AdminMerchant {
    id: number;
    name: string;
    owner: { id: number; name: string; email: string; google: boolean } | null;
    created_at: string | null;
    countries_count: number;
    agencies_count: number;
    users_count: number;
    reports_count: number;
    last_activity_at: string | null;
    suspended_at: string | null;
    suspension_reason: string | null;
    is_admin_account: boolean;
}
