import { useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useRef } from 'react';

// Components...
import InputError from '@/components/input-error';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import HeadingSmall from '@/components/heading-small';

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({ password: '' });

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        clearErrors();
        reset();
    };

    return (
        <div className="space-y-6">
            <HeadingSmall title="Supprimer le compte" description="Supprimez votre compte et toutes ses données" />
            <div className="border-destructive/30 bg-destructive/8 space-y-4 rounded-lg border p-4">
                <div className="relative space-y-0.5">
                    <p className="text-destructive font-semibold">Attention, action définitive</p>
                    <p className="text-sm">Tous vos rapports, agences, produits et messages seront effacés. Ils ne pourront pas être récupérés.</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">Supprimer le compte</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Supprimer définitivement votre compte ?</DialogTitle>
                        <DialogDescription>Tous vos rapports et données seront effacés. Entrez votre mot de passe pour confirmer.</DialogDescription>
                        <form className="space-y-6" onSubmit={deleteUser}>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Votre mot de passe</Label>

                                <PasswordInput
                                    id="password"
                                    name="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Mot de passe"
                                    autoComplete="current-password"
                                />

                                <InputError message={errors.password} />
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" onClick={closeModal}>
                                        Annuler
                                    </Button>
                                </DialogClose>

                                <Button type="submit" variant="destructive" disabled={processing}>
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                    Supprimer définitivement
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
