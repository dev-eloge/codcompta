import AppLogoIcon from '@/components/app-logo-icon';
import { LegalLinks } from '@/components/legal/legal-links';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { type ReactNode } from 'react';

export interface LegalInfo {
    publisher: string | null;
    responsible: string | null;
    registration: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    host: string | null;
    host_address: string | null;
    jurisdiction: string | null;
    updated_on: string;
}

export interface LegalPageProps {
    legal: LegalInfo;
    appUrl: string;
}

export function formatUpdatedOn(date: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

/**
 * Readable page for the legal texts: logo, title, last update, then the sections.
 */
export default function LegalLayout({ title, intro, updatedOn, children }: { title: string; intro: string; updatedOn: string; children: ReactNode }) {
    return (
        <>
            <Head title={title} />
            <div className="min-h-svh">
                <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-5 md:px-8">
                    <Link href={route('home')} className="flex items-center gap-2.5" aria-label="CODCompta, accueil">
                        <AppLogoIcon variant="mark" className="size-8" />
                        <span className="text-ink-brand font-[family-name:var(--font-display)] text-base font-bold tracking-[-0.035em] dark:text-white">
                            COD<span className="text-primary font-semibold">Compta</span>
                        </span>
                    </Link>
                    <Link
                        href={route('home')}
                        className="text-muted-foreground hover:text-primary inline-flex min-h-11 items-center gap-1.5 text-sm font-medium transition-colors"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Retour à l'accueil
                    </Link>
                </header>

                <main className="mx-auto w-full max-w-3xl px-5 pb-16 md:px-8">
                    <article className="glass rounded-3xl p-6 md:p-10">
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
                        <p className="text-muted-foreground mt-3 text-base leading-relaxed">{intro}</p>
                        <p className="text-muted-foreground mt-2 text-sm">Dernière mise à jour : {formatUpdatedOn(updatedOn)}</p>
                        <div className="legal-text mt-8 space-y-8">{children}</div>
                    </article>
                </main>

                <footer className="text-muted-foreground mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-5 pb-10 text-sm md:px-8">
                    <span className="flex items-center gap-2">
                        <AppLogoIcon variant="mark" className="size-5" />
                        CODCompta
                    </span>
                    <LegalLinks />
                </footer>
            </div>
        </>
    );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
    const id = title
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    return (
        <section aria-labelledby={id} className="space-y-3">
            <h2 id={id} className="text-xl font-semibold tracking-tight">
                {title}
            </h2>
            <div className="text-foreground/90 space-y-3 leading-relaxed">{children}</div>
        </section>
    );
}

export function Contact({ legal }: { legal: LegalInfo }) {
    if (!legal.email) {
        return <>auprès de l'éditeur indiqué dans les mentions légales</>;
    }

    return (
        <a href={`mailto:${legal.email}`} className="text-primary font-semibold underline-offset-4 hover:underline">
            {legal.email}
        </a>
    );
}
