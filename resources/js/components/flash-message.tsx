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
                className="bg-warning-bg text-warning-fg flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
            >
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{flash.warning}</span>
            </div>
        );
    }

    if (flash?.success) {
        return (
            <div
                role="status"
                aria-live="polite"
                className="bg-success-bg text-success-fg flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
            >
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{flash.success}</span>
            </div>
        );
    }

    return null;
}
