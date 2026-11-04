import AppLogoIcon from '@/components/app-logo-icon';
import { LegalLinks } from '@/components/legal/legal-links';
import { Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4 sm:p-6 md:p-10">
            <div className="glass w-full max-w-sm rounded-3xl p-7 md:p-8">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link href={route('home')} className="flex flex-col items-center gap-2 font-medium">
                            <AppLogoIcon className="size-11" aria-hidden="true" />
                            <span className="sr-only">Retour à l'accueil de CODCompta</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-semibold">{title}</h1>
                            <p className="text-muted-foreground text-center text-sm">{description}</p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
            <LegalLinks className="text-muted-foreground text-xs" />
        </main>
    );
}
