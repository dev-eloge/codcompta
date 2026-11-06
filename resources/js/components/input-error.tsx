import { cn } from '@/lib/utils';
import { CircleAlert } from 'lucide-react';
import { HTMLAttributes } from 'react';

/**
 * Field error: text plus icon (never colour alone), announced as soon as it appears.
 */
export default function InputError({ message, className = '', ...props }: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p role="alert" {...props} className={cn('text-danger-fg flex items-start gap-1.5 text-sm font-semibold', className)}>
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </p>
    ) : null;
}
