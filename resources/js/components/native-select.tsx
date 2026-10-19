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
            'border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            className,
        )}
        {...props}
    />
));
NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };
