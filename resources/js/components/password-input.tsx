import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';

/**
 * Password field with an eye button to show or hide what is typed.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<'input'>, 'type'>>(({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const label = visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe';

    return (
        <div className="relative">
            <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} {...props} />
            <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={label}
                aria-pressed={visible}
                title={label}
                className="text-muted-foreground hover:text-primary focus-visible:ring-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
            >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </div>
    );
});

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
