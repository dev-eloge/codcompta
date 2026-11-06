import AppLogoIcon from '@/components/app-logo-icon';
import { InstallBanner } from '@/components/install-app';
import { LegalLinks } from '@/components/legal/legal-links';
import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, ChartColumn, ChevronDown, Megaphone, MessageSquareText, PiggyBank, Play, Smartphone, Target } from 'lucide-react';
import { type MouseEvent } from 'react';

/**
 * Glides down to a section of the page instead of jumping, then moves keyboard focus there.
 * People who asked their device to reduce motion get the instant jump.
 */
function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target) {
        return;
    }

    event.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
    target.focus({ preventScroll: true });
}

const steps = [
    { title: 'Décrivez votre activité', text: 'Pays, agences, produits et prix. Une seule fois.' },
    { title: "Collez le message de l'agence", text: 'Tel quel. CODCompta lit les chiffres, vous vérifiez.' },
    { title: 'Voyez votre vrai bénéfice', text: "Prix d'achat, pub, closing et livraison retirés." },
];

const features = [
    { icon: MessageSquareText, title: 'Lecture des messages WhatsApp', text: 'Fini de recopier les chiffres un par un.' },
    { icon: ChartColumn, title: 'Bénéfice net par agence', text: "Pub, prix d'achat et frais compris." },
    { icon: Megaphone, title: 'La pub bien répartie', text: 'Partagée entre les agences selon leurs ventes.' },
    { icon: Target, title: 'Objectifs suivis par Sika', text: 'Sika vous dit si vous êtes dans les temps.' },
    { icon: PiggyBank, title: 'Partage 40/20/40', text: 'Épargner, vous payer, réinvestir.' },
    { icon: Smartphone, title: 'Une application sur votre téléphone', text: 'Installée en un geste, sans store.' },
];

const faqs = [
    { question: 'Mes agences doivent-elles utiliser CODCompta ?', answer: 'Non. Elles continuent de vous écrire sur WhatsApp.' },
    { question: 'Et si la lecture automatique se trompe ?', answer: "Vous vérifiez chaque ligne avant d'enregistrer." },
    { question: 'Je vends dans plusieurs pays, ça marche ?', answer: "Oui, avec autant de pays et d'agences que vous voulez." },
];

const wrap = 'mx-auto w-full max-w-[1200px] px-4 md:px-8';

export default function Welcome({ demoVideoUrl }: { demoVideoUrl: string | null }) {
    const { auth } = usePage<SharedData>().props;
    const mainAction = auth.user
        ? { href: route('reports.index'), label: 'Ouvrir mes rapports' }
        : { href: route('register'), label: 'Créer mon compte' };
    const anchors = [
        { id: 'comment', label: 'Comment ça marche' },
        ...(demoVideoUrl ? [{ id: 'demo', label: 'Démo' }] : []),
        { id: 'questions', label: 'Questions' },
    ];

    return (
        <>
            <Head title="Votre vrai bénéfice en paiement à la livraison" />

            <div className="bg-background min-h-dvh">
                <header className={`${wrap} flex items-center justify-between gap-4 py-4`}>
                    <Link href={route('home')} className="flex items-center gap-2.5" aria-label="CODCompta, accueil">
                        <AppLogoIcon variant="mark" className="size-9" />
                        <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.035em]">
                            COD<span className="text-primary font-semibold">Compta</span>
                        </span>
                    </Link>
                    <nav aria-label="Sur cette page" className="hidden items-center gap-1 lg:flex">
                        {anchors.map((anchor) => (
                            <a
                                key={anchor.id}
                                href={`#${anchor.id}`}
                                onClick={(event) => scrollToSection(event, anchor.id)}
                                className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center rounded-lg px-3 text-[15px] font-semibold transition-colors duration-150"
                            >
                                {anchor.label}
                            </a>
                        ))}
                    </nav>
                    <nav aria-label="Compte" className="flex items-center gap-2">
                        {auth.user ? (
                            <Button asChild>
                                <Link href={route('reports.index')}>Ouvrir mes rapports</Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="outline">
                                    <Link href={route('login')}>Se connecter</Link>
                                </Button>
                                <Button asChild className="hidden sm:inline-flex">
                                    <Link href={route('register')}>Créer mon compte</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </header>

                <main>
                    <section
                        className={`${wrap} grid items-center gap-10 pt-8 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pt-14 lg:pb-24`}
                    >
                        <div className="flex flex-col gap-5">
                            <p className="text-primary text-[13px] font-bold tracking-[0.06em] uppercase">
                                Pour les e-commerçants en paiement à la livraison
                            </p>
                            <h1 className="text-[36px] leading-[1.08] font-bold tracking-[-0.03em] md:text-[56px]">
                                Sachez chaque jour combien vous gagnez <span className="text-primary">vraiment.</span>
                            </h1>
                            <p className="text-muted-foreground max-w-[34rem] text-[17px] leading-relaxed md:text-lg">
                                Collez les messages WhatsApp de vos agences, voyez votre bénéfice net, agence par agence.
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                <Button asChild size="lg">
                                    <Link href={mainAction.href}>
                                        {mainAction.label}
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="outline">
                                    <a
                                        href={demoVideoUrl ? '#demo' : '#comment'}
                                        onClick={(event) => scrollToSection(event, demoVideoUrl ? 'demo' : 'comment')}
                                    >
                                        {demoVideoUrl ? (
                                            <>
                                                <Play className="text-primary fill-current" aria-hidden="true" />
                                                Voir la démo
                                            </>
                                        ) : (
                                            <>
                                                Comment ça marche
                                                <ChevronDown aria-hidden="true" />
                                            </>
                                        )}
                                    </a>
                                </Button>
                            </div>
                        </div>

                        <HeroPreview />
                    </section>

                    <section id="comment" tabIndex={-1} aria-labelledby="how" className="bg-card scroll-mt-4 border-y py-14 outline-none md:py-20">
                        <div className={wrap}>
                            <h2 id="how" className="mb-8 text-[26px] font-bold md:text-[32px]">
                                Comment ça marche
                            </h2>
                            <ol className="grid gap-4 md:grid-cols-3">
                                {steps.map((step, index) => (
                                    <li key={step.title} className="bg-background flex gap-4 rounded-2xl p-5 md:flex-col md:p-6">
                                        <span
                                            aria-hidden="true"
                                            className="bg-hero text-hero-foreground grid size-10 shrink-0 place-items-center rounded-xl font-[family-name:var(--font-display)] font-bold"
                                        >
                                            {index + 1}
                                        </span>
                                        <div>
                                            <h3 className="mb-1 font-[family-name:var(--font-sans)] text-lg font-bold">{step.title}</h3>
                                            <p className="text-muted-foreground">{step.text}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>

                    {demoVideoUrl && <DemoVideo url={demoVideoUrl} />}

                    <section aria-labelledby="features" className={`${wrap} ${demoVideoUrl ? 'pb-16 md:pb-20' : 'py-16 md:py-20'}`}>
                        <h2 id="features" className="mb-8 text-[26px] font-bold md:text-[32px]">
                            Ce que vous obtenez
                        </h2>
                        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature) => (
                                <li key={feature.title} className="flex gap-4">
                                    <span aria-hidden="true" className="badge-success grid size-11 shrink-0 place-items-center rounded-xl">
                                        <feature.icon className="size-5" />
                                    </span>
                                    <div>
                                        <h3 className="font-[family-name:var(--font-sans)] text-base font-bold">{feature.title}</h3>
                                        <p className="text-muted-foreground">{feature.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section
                        id="questions"
                        tabIndex={-1}
                        aria-labelledby="faq-title"
                        className={`${wrap} grid scroll-mt-4 gap-6 pb-16 outline-none md:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]`}
                    >
                        <h2 id="faq-title" className="text-[26px] font-bold md:text-[32px]">
                            Questions
                        </h2>
                        <div className="space-y-2.5">
                            {faqs.map((faq, index) => (
                                <details key={faq.question} open={index === 0} className="bg-card group rounded-xl border px-4">
                                    <summary className="flex min-h-14 list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
                                        {faq.question}
                                        <ChevronDown
                                            className="size-5 shrink-0 transition-transform duration-200 group-open:rotate-180"
                                            aria-hidden="true"
                                        />
                                    </summary>
                                    <p className="text-muted-foreground pb-4 leading-relaxed">{faq.answer}</p>
                                </details>
                            ))}
                        </div>
                    </section>

                    <section aria-labelledby="cta-title" className={`${wrap} pb-14`}>
                        <div className="glass-hero flex flex-col items-start justify-between gap-5 rounded-2xl p-6 md:flex-row md:items-center md:p-10">
                            <h2 id="cta-title" className="text-[24px] font-bold md:text-[30px]">
                                Ce soir, sachez enfin ce qu'il vous reste.
                            </h2>
                            <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full sm:w-auto">
                                <Link href={mainAction.href}>{mainAction.label}</Link>
                            </Button>
                        </div>
                    </section>
                </main>

                <InstallBanner />

                <footer className={`${wrap} text-muted-foreground flex flex-wrap items-center justify-between gap-4 border-t pt-6 pb-10 text-sm`}>
                    <span className="flex items-center gap-2">
                        <AppLogoIcon variant="mark" className="size-5" />
                        CODCompta, la comptabilité du paiement à la livraison.
                    </span>
                    <LegalLinks />
                </footer>
            </div>
        </>
    );
}

/**
 * A real view of the product, in a browser frame: the week's net profit and the agencies behind it.
 * Fictional demo figures, week of 12 to 18 October 2026.
 */
function HeroPreview() {
    const shares = [
        { label: 'Épargne', value: '131 200 F' },
        { label: 'Votre poche', value: '65 600 F' },
        { label: 'À réinvestir', value: '131 200 F' },
    ];

    return (
        <figure aria-label="Aperçu du tableau de bord CODCompta" className="m-0">
            <div className="bg-card overflow-hidden rounded-2xl border shadow-[var(--shadow-raised)]">
                <div aria-hidden="true" className="bg-muted flex gap-2 border-b px-4 py-3">
                    <span className="bg-window-close size-3 rounded-full" />
                    <span className="bg-window-minimize size-3 rounded-full" />
                    <span className="bg-window-zoom size-3 rounded-full" />
                </div>
                <div className="flex flex-col gap-4 p-4 md:p-6">
                    <div className="glass-hero rounded-xl p-4 md:p-5">
                        <p className="text-hero-muted text-sm">Bénéfice net, semaine du 12 au 18 octobre</p>
                        <p className="mt-1 font-[family-name:var(--font-display)] text-[32px] font-bold tabular-nums md:text-[40px]">328 000 F</p>
                        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs md:text-[13px]">
                            {shares.map((share) => (
                                <div key={share.label} className="hero-tile rounded-lg p-2">
                                    <dt className="text-hero-muted">{share.label}</dt>
                                    <dd className="text-on-hero-gold font-bold tabular-nums">{share.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                    <table className="w-full text-sm md:text-[15px]">
                        <caption className="sr-only">Exemple de résultats par agence</caption>
                        <thead className="text-muted-foreground text-left text-xs">
                            <tr>
                                <th scope="col" className="pb-2 font-bold">
                                    Agence
                                </th>
                                <th scope="col" className="pb-2 text-right font-bold">
                                    Ventes
                                </th>
                                <th scope="col" className="pb-2 text-right font-bold">
                                    Bénéfice net
                                </th>
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            <tr className="border-t">
                                <th scope="row" className="py-2.5 text-left font-bold">
                                    Agence 1
                                </th>
                                <td className="py-2.5 text-right">570 000 F</td>
                                <td className="py-2.5 text-right font-bold">297 462 F</td>
                            </tr>
                            <tr className="border-t">
                                <th scope="row" className="py-2.5 text-left font-bold">
                                    Agence 2
                                </th>
                                <td className="py-2.5 text-right">80 000 F</td>
                                <td className="py-2.5 text-right font-bold">30 538 F</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <figcaption className="text-muted-foreground mt-2.5 text-[13px]">Exemple avec des chiffres fictifs.</figcaption>
        </figure>
    );
}

/**
 * Frame for the explainer video. The link is set with DEMO_VIDEO_URL in the .env file.
 */
function DemoVideo({ url }: { url: string }) {
    const embed = toEmbed(url);

    return (
        <section id="demo" tabIndex={-1} aria-labelledby="demo-title" className={`${wrap} scroll-mt-4 py-16 outline-none md:py-20`}>
            <h2 id="demo-title" className="mb-6 text-[26px] font-bold md:text-[32px]">
                CODCompta en 5 minutes
            </h2>

            <div className="bg-hero relative aspect-video overflow-hidden rounded-2xl">
                {embed?.kind === 'iframe' && (
                    <iframe
                        src={embed.src}
                        title="Vidéo de présentation de CODCompta"
                        className="absolute inset-0 size-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                    />
                )}
                {embed?.kind === 'video' && (
                    <video src={embed.src} controls preload="metadata" className="absolute inset-0 size-full object-cover">
                        Votre navigateur ne lit pas cette vidéo.
                    </video>
                )}
                {!embed && (
                    <div className="text-hero-foreground absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                        <span className="bg-secondary text-secondary-foreground grid size-16 place-items-center rounded-full">
                            <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
                        </span>
                        <p className="font-[family-name:var(--font-display)] text-lg font-semibold">La vidéo arrive bientôt</p>
                    </div>
                )}
            </div>
        </section>
    );
}

function toEmbed(url: string): { kind: 'iframe' | 'video'; src: string } | null {
    try {
        const link = new URL(url);
        const host = link.hostname.replace(/^www\./, '');

        if (host === 'youtu.be') {
            return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${link.pathname.slice(1)}?rel=0` };
        }

        if (host.endsWith('youtube.com')) {
            const id = link.searchParams.get('v') ?? link.pathname.split('/').filter(Boolean).pop();

            return id ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` } : null;
        }

        if (host.endsWith('vimeo.com')) {
            // vimeo.com/123, vimeo.com/123/abc (unlisted), player.vimeo.com/video/123?h=abc
            const parts = link.pathname.split('/').filter(Boolean);
            const index = parts.findIndex((part) => /^\d+$/.test(part));
            if (index === -1) {
                return null;
            }
            const hash = link.searchParams.get('h') ?? (/^[a-f0-9]{6,}$/i.test(parts[index + 1] ?? '') ? parts[index + 1] : null);

            return { kind: 'iframe', src: `https://player.vimeo.com/video/${parts[index]}?dnt=1${hash ? `&h=${hash}` : ''}` };
        }

        return { kind: 'video', src: url };
    } catch {
        return null;
    }
}
