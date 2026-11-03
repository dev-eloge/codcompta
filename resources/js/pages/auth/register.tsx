import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import { GoogleSignInButton } from '@/components/google-sign-in-button';
import InputError from '@/components/input-error';
import { PasswordInput } from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface RegisterForm {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export default function Register({ googleSignIn }: { googleSignIn: boolean }) {
    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout title="Créer un compte" description="Votre vrai bénéfice, pays par pays et agence par agence. Inscription en une minute.">
            <Head title="Inscription" />
            {googleSignIn && <GoogleSignInButton label="S'inscrire avec Google" />}
            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Votre nom ou celui de votre boutique</Label>
                        <Input
                            id="name"
                            type="text"
                            required
                            autoFocus
                            autoComplete="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={processing}
                            placeholder="Boutique 1"
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Adresse email</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            disabled={processing}
                            placeholder="vous@exemple.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Mot de passe</Label>
                        <PasswordInput
                            id="password"
                            required
                            autoComplete="new-password"
                            aria-describedby="password-help"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            disabled={processing}
                            placeholder="Mot de passe"
                        />
                        <p id="password-help" className="text-muted-foreground text-xs">
                            8 caractères minimum.
                        </p>
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Retapez le mot de passe</Label>
                        <PasswordInput
                            id="password_confirmation"
                            required
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            disabled={processing}
                            placeholder="Le même mot de passe"
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <Button type="submit" className="mt-2 w-full" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        Créer mon compte
                    </Button>
                </div>

                <div className="text-muted-foreground text-center text-sm">
                    Déjà un compte ? <TextLink href={route('login')}>Se connecter</TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
