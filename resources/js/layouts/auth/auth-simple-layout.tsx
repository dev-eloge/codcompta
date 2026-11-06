import AppLogoIcon from '@/components/app-logo-icon';
import { LegalLinks } from '@/components/legal/legal-links';
import { Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

/**
 * Two columns on a computer: the promise on the dark surface, the form on the light one.
 * On a phone, only the logo and the form.
 */
export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="flex min-h-dvh flex-col lg:flex-row">
            <aside className="bg-hero text-hero-foreground hidden flex-col justify-between gap-10 p-12 lg:flex lg:w-[44%] lg:max-w-[620px] xl:p-16">
                <Link href={route('home')} className="flex items-center gap-2.5" aria-label="CODCompta, accueil">
                    <AppLogoIcon className="size-10" />
                    <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]">
                        COD<span className="text-on-hero-up font-semibold">Compta</span>
                    </span>
                </Link>
                <p className="max-w-[28rem] font-[family-name:var(--font-display)] text-[36px] leading-[1.15] font-bold tracking-[-0.02em]">
                    Votre vrai bénéfice, pays par pays et agence par agence.
                </p>
                <p className="text-hero-muted text-sm">Vos chiffres restent privés : chaque boutique ne voit que ses propres données.</p>
            </aside>

            <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 sm:px-6 md:py-12">
                <Link href={route('home')} className="flex items-center gap-2.5 self-start sm:self-center lg:hidden" aria-label="CODCompta, accueil">
                    <AppLogoIcon className="size-10" />
                    <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em]">
                        COD<span className="text-primary font-semibold">Compta</span>
                    </span>
                </Link>

                <div className="flex w-full max-w-[420px] flex-col gap-6">
                    <div className="space-y-1.5">
                        <h1 className="text-[28px] font-bold md:text-[30px]">{title}</h1>
                        {description && <p className="text-muted-foreground text-[15px]">{description}</p>}
                    </div>
                    {children}
                </div>

                <LegalLinks className="text-muted-foreground mt-auto text-xs lg:mt-0" />
            </main>
        </div>
    );
}
