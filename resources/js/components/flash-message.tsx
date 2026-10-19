import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CircleAlert, CircleCheck } from 'lucide-react';

export default function FlashMessage() {
    const { flash } = usePage<SharedData>().props;

    if (flash?.warning) {
        return (
            <div
                role="status"
                className="border-secondary/60 bg-secondary/20 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm text-amber-900 backdrop-blur-md dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
            >
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{flash.warning}</span>
            </div>
        );
    }

    if (flash?.success) {
        return (
            <div
                role="status"
                className="border-primary/30 bg-primary/10 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm text-emerald-900 backdrop-blur-md dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
            >
                <CircleCheck className="mt-0.5 size-4 shrink-0" />
                <span>{flash.success}</span>
            </div>
        );
    }

    return null;
}
