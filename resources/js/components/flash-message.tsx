import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CircleAlert, CircleCheck } from 'lucide-react';

/**
 * Result of the last action (saved, deleted, refused). Announced politely to screen readers.
 */
export default function FlashMessage() {
    const { flash } = usePage<SharedData>().props;

    if (flash?.warning) {
        return (
            <div
                role="status"
                aria-live="polite"
                className="border-secondary/70 bg-secondary/20 text-foreground flex items-start gap-2 rounded-lg border px-4 py-3 text-sm"
            >
                <CircleAlert className="text-secondary-foreground dark:text-secondary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{flash.warning}</span>
            </div>
        );
    }

    if (flash?.success) {
        return (
            <div
                role="status"
                aria-live="polite"
                className="border-primary/30 bg-primary/10 text-foreground flex items-start gap-2 rounded-lg border px-4 py-3 text-sm"
            >
                <CircleCheck className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{flash.success}</span>
            </div>
        );
    }

    return null;
}
