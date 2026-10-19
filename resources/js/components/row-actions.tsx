import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Pencil button to open the edit form of a row.
 */
export function EditButton({ label, active = false, onClick }: { label: string; active?: boolean; onClick: () => void }) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('text-muted-foreground hover:text-primary size-8', active && 'bg-primary/10 text-primary')}
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={onClick}
        >
            <Pencil className="size-4" />
        </Button>
    );
}

/**
 * Bin button that asks for confirmation, then sends a DELETE request.
 */
export function DeleteButton({
    label,
    title,
    description,
    url,
    confirmLabel = 'Supprimer',
    text,
}: {
    label: string;
    title: string;
    description: string;
    url: string;
    confirmLabel?: string;
    /** Shows a text button instead of the bin icon. */
    text?: string;
}) {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const confirm = () => {
        router.delete(url, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                setOpen(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {text ? (
                    <Button type="button" variant="outline" size="sm" aria-label={label}>
                        {text}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-8"
                        aria-label={label}
                        title={label}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="border-white/70 bg-white shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-[#0d2f38]">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="outline">Annuler</Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={confirm} disabled={processing}>
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
