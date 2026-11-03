// Components
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <AuthLayout
            title="Mot de passe oublié"
            description="Entrez l'email de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe."
        >
            <Head title="Mot de passe oublié" />

            {status && (
                <div
                    role="status"
                    className="border-primary/30 bg-primary/10 text-primary mb-4 rounded-lg border px-4 py-3 text-center text-sm font-medium"
                >
                    {status}
                </div>
            )}

            <div className="space-y-6">
                <form onSubmit={submit}>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Adresse email</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            required
                            value={data.email}
                            autoFocus
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="vous@exemple.com"
                        />

                        <InputError message={errors.email} />
                    </div>

                    <div className="my-6 flex items-center justify-start">
                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            Recevoir le lien
                        </Button>
                    </div>
                </form>

                <div className="text-muted-foreground space-x-1 text-center text-sm">
                    <span>Vous vous en souvenez ?</span>
                    <TextLink href={route('login')}>Se connecter</TextLink>
                </div>
            </div>
        </AuthLayout>
    );
}
