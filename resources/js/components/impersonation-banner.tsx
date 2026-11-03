import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Eye } from 'lucide-react';

/**
 * Shown on every page while a super admin consults a merchant's account.
 */
export function ImpersonationBanner() {
    const { impersonation } = usePage<SharedData>().props;

    if (!impersonation) {
        return null;
    }

    return (
        <div
            role="status"
            className="border-secondary/60 bg-secondary/25 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 text-sm text-amber-950 backdrop-blur-md md:rounded-t-xl dark:text-amber-100"
        >
            <p className="flex items-center gap-2">
                <Eye className="size-4 shrink-0" aria-hidden="true" />
                <span>
                    Vous consultez le compte de <strong>« {impersonation.merchant} »</strong>. Vos actions sont enregistrées.
                </span>
            </p>
            <Button size="sm" variant="outline" className="bg-white/80" onClick={() => router.post(route('admin.impersonation.stop'))}>
                Revenir à l'administration
            </Button>
        </div>
    );
}
