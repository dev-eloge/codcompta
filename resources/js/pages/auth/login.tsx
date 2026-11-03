import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import { GoogleSignInButton } from '@/components/google-sign-in-button';
import InputError from '@/components/input-error';
import { PasswordInput } from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    googleSignIn: boolean;
}

export default function Login({ status, canResetPassword, googleSignIn }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="Connexion à CODCompta" description="Content de vous revoir. Entrez votre email et votre mot de passe.">
            <Head title="Connexion" />

            {status && (
                <div
                    role="status"
                    className="border-primary/30 bg-primary/10 text-primary rounded-lg border px-4 py-3 text-center text-sm font-medium"
                >
                    {status}
                </div>
            )}

            {googleSignIn && <GoogleSignInButton />}

            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Adresse email</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="vous@exemple.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Mot de passe</Label>
                            {canResetPassword && (
                                <TextLink href={route('password.request')} className="ml-auto text-sm">
                                    Mot de passe oublié ?
                                </TextLink>
                            )}
                        </div>
                        <PasswordInput
                            id="password"
                            required
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Mot de passe"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            name="remember"
                            checked={data.remember}
                            onCheckedChange={(checked) => setData('remember', checked === true)}
                        />
                        <Label htmlFor="remember">Rester connecté sur cet appareil</Label>
                    </div>

                    <Button type="submit" className="mt-4 w-full" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        Se connecter
                    </Button>
                </div>

                <div className="text-muted-foreground text-center text-sm">
                    Pas encore de compte ? <TextLink href={route('register')}>Créer un compte</TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
