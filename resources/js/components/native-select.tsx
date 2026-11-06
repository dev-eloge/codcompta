import { cn } from '@/lib/utils';
import * as React from 'react';

/**
 * A plain <select> styled like the other inputs. Native selects open the phone's own picker,
 * which is easier to use on the small screens the agencies' reports are entered from.
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(({ className, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'border-input bg-card ring-offset-background focus-visible:ring-ring aria-invalid:border-destructive flex h-12 w-full rounded-xl border px-3.5 py-2 text-base font-medium focus-visible:ring-[3px] focus-visible:ring-offset-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-2',
            className,
        )}
        {...props}
    />
));
NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };
