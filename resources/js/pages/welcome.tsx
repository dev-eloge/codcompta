import AppLogoIcon from '@/components/app-logo-icon';
import { InstallBanner } from '@/components/install-app';
import { Button } from '@/components/ui/button';
import { useCountUp, useReveal } from '@/hooks/use-reveal';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ChartColumn, ChevronDown, Megaphone, MessageSquareText, Play, Receipt, ShieldCheck, Target } from 'lucide-react';
import { type CSSProperties } from 'react';

const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

const steps = [
    {
        title: 'Décrivez votre activité, une seule fois',
        text: "Vos pays de vente, vos agences de livraison, vos produits et leur prix d'achat. Deux minutes, et c'est réglé.",
    },
    {
        title: 'Envoyez les rapports de vos agences',
        text: "Collez le message WhatsApp de l'agence tel quel : CODCompta trouve les produits, les quantités et les frais. Ou saisissez le rapport à la main en une minute.",
    },
    {
        title: "Lisez ce qu'il vous reste vraiment",
        text: 'Votre bénéfice net après toutes les dépenses, sur le jour, la semaine, le mois ou les dates de votre choix.',
    },
];

const features = [
    {
        icon: MessageSquareText,
        title: 'Lit les messages WhatsApp',
        text: "Plus besoin de recopier les chiffres. Vous vérifiez ce qui a été lu, puis vous enregistrez : rien n'est compté sans votre accord.",
    },
    {
        icon: Receipt,
        title: 'Compte toutes vos dépenses',
        text: "Prix d'achat, publicité, closing, livraison et autres frais sont déduits : vous voyez un vrai bénéfice, pas seulement un chiffre d'affaires.",
    },
    {
        icon: Megaphone,
        title: 'Répartit la publicité',
        text: 'Une publicité payée pour tout un pays est partagée entre ses agences selon leurs ventes.',
    },
    {
        icon: Target,
        title: 'Suit vos objectifs',
        text: 'Fixez un montant à atteindre entre deux dates. Chaque jour, vous savez combien il reste à faire. Et Sika fête vos réussites.',
    },
    {
        icon: ShieldCheck,
        title: 'Repère les erreurs',
        text: "Un total d'agence qui ne colle pas, un jour déjà compté dans un récap, une agence qui n'envoie plus de rapport : c'est signalé.",
    },
    {
        icon: ChartColumn,
        title: 'Montre votre progression',
        text: "Graphiques par jour, par semaine ou par mois, comparés à la période d'avant, et historique complet de vos rapports.",
    },
];

const faqs = [
    {
        question: 'Mes agences de livraison doivent-elles changer leurs habitudes ?',
        answer: "Non. Elles continuent de vous envoyer leurs rapports sur WhatsApp comme d'habitude. C'est vous qui les collez dans CODCompta.",
    },
    {
        question: 'Et si un message est mal lu ?',
        answer: "Chaque rapport lu vous est montré avant de compter : vous corrigez un produit, une quantité ou un montant, puis vous enregistrez. Un total qui ne colle pas avec celui de l'agence est marqué « à vérifier ».",
    },
    {
        question: 'Je vends dans plusieurs pays, avec plusieurs agences. Ça marche ?',
        answer: 'Oui. Chaque pays a ses agences, chaque agence a sa ligne dans vos résultats, et vos objectifs comptent tous les pays ensemble.',
    },
    {
        question: 'Où va mon bénéfice ?',
        answer: 'CODCompta le range pour vous : 40 % épargne, 20 % pour votre poche, 40 % à réinvestir dans le stock et la publicité.',
    },
];

export default function Welcome({ demoVideoUrl }: { demoVideoUrl: string | null }) {
    const { auth } = usePage<SharedData>().props;
    useReveal();

    return (
        <>
            <Head title="Votre vrai bénéfice en paiement à la livraison" />

            <div className="relative min-h-svh overflow-hidden">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <span className="light-blob bg-mint-brand/40 top-[-8rem] left-[-6rem] size-[26rem]" />
                    <span className="light-blob bg-gold-brand/30 top-[10rem] right-[-8rem] size-[24rem]" style={delay(-6000)} />
                    <span className="light-blob bg-emerald-brand/15 top-[70rem] left-[20%] size-[28rem]" style={delay(-11000)} />
                </div>

                <header className="rise mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
                    <Link href={route('home')} className="flex items-center gap-2.5" aria-label="CODCompta, accueil">
                        <AppLogoIcon variant="mark" className="size-9" />
                        <span className="text-ink-brand font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.035em] dark:text-white">
                            COD<span className="text-primary font-semibold">Compta</span>
                        </span>
                    </Link>
                    <nav aria-label="Compte" className="flex items-center gap-2">
                        {auth.user ? (
                            <Button asChild>
                                <Link href={route('reports.index')}>Ouvrir mes rapports</Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                                    <Link href={route('login')}>Se connecter</Link>
                                </Button>
                                <Button asChild>
                                    <Link href={route('register')}>Créer un compte</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </header>

                <main>
                    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-8 pb-16 md:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pt-16 lg:pb-24">
                        <div className="space-y-7">
                            <h1 style={delay(80)} className="rise max-w-xl text-4xl leading-[1.08] font-bold tracking-tight md:text-5xl lg:text-6xl">
                                Sachez chaque jour combien vous gagnez vraiment.
                            </h1>
                            <p style={delay(200)} className="rise text-muted-foreground max-w-lg text-lg leading-relaxed">
                                Vos agences de livraison vous envoient leurs rapports sur WhatsApp. CODCompta les lit, déduit le prix d'achat, la
                                publicité, le closing et la livraison, et vous montre votre bénéfice net, pays par pays et agence par agence.
                            </p>
                            <div style={delay(320)} className="rise flex flex-wrap items-center gap-3">
                                <Button
                                    asChild
                                    size="lg"
                                    className="shadow-primary/25 h-12 rounded-full px-6 text-base shadow-lg transition-transform hover:-translate-y-0.5"
                                >
                                    <Link href={auth.user ? route('reports.index') : route('register')}>
                                        {auth.user ? 'Ouvrir mes rapports' : 'Créer mon compte'}
                                    </Link>
                                </Button>
                                <a
                                    href={demoVideoUrl ? '#demo' : '#comment'}
                                    className="glass text-foreground hover:text-primary inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors"
                                >
                                    {demoVideoUrl ? (
                                        <>
                                            <span
                                                aria-hidden="true"
                                                className="bg-secondary text-secondary-foreground flex size-6 items-center justify-center rounded-full"
                                            >
                                                <Play className="size-3 fill-current" />
                                            </span>
                                            Voir la démo
                                        </>
                                    ) : (
                                        <>
                                            Comment ça marche
                                            <ChevronDown className="size-4" aria-hidden="true" />
                                        </>
                                    )}
                                </a>
                            </div>
                            {!auth.user && (
                                <p style={delay(400)} className="rise text-sm">
                                    <Link href={route('login')} className="text-primary font-semibold underline-offset-4 hover:underline">
                                        J'ai déjà un compte
                                    </Link>
                                </p>
                            )}
                            <p style={delay(460)} className="rise text-muted-foreground text-sm">
                                Pour les e-commerçants qui vendent en paiement à la livraison, en Afrique de l'Ouest et centrale. Inscription en une
                                minute, avec votre email ou votre compte Google.
                            </p>
                        </div>

                        <HeroPreview />
                    </section>

                    {demoVideoUrl && <DemoVideo url={demoVideoUrl} />}

                    <section id="comment" aria-labelledby="how" className="mx-auto w-full max-w-6xl scroll-mt-6 px-5 pb-20 md:px-8">
                        <h2 id="how" className="reveal mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
                            Comment ça marche, en trois étapes
                        </h2>
                        <ol className="grid gap-5 md:grid-cols-3">
                            {steps.map((step, index) => (
                                <li
                                    key={step.title}
                                    style={delay(index * 120)}
                                    className="reveal glass relative rounded-3xl p-6 transition-shadow hover:shadow-xl"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="bg-secondary text-secondary-foreground mb-5 inline-flex size-9 items-center justify-center rounded-full font-[family-name:var(--font-display)] font-bold"
                                    >
                                        {index + 1}
                                    </span>
                                    <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">{step.text}</p>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section aria-labelledby="features" className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8">
                        <h2 id="features" className="reveal mb-8 max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
                            Ce que CODCompta fait à votre place
                        </h2>
                        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature, index) => (
                                <div key={feature.title} style={delay((index % 3) * 110)} className="reveal group flex gap-4">
                                    <span
                                        aria-hidden="true"
                                        className="bg-primary/12 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl transition-colors"
                                    >
                                        <feature.icon className="size-5" />
                                    </span>
                                    <div>
                                        <h3 className="mb-1 font-semibold">{feature.title}</h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">{feature.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section aria-labelledby="faq-title" className="mx-auto w-full max-w-3xl px-5 pb-20 md:px-8">
                        <h2 id="faq-title" className="reveal mb-6 text-2xl font-semibold tracking-tight md:text-3xl">
                            Vos questions
                        </h2>
                        <div className="space-y-3">
                            {faqs.map((faq) => (
                                <details key={faq.question} className="reveal glass group rounded-2xl px-5 py-4">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                                        {faq.question}
                                        <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                                    </summary>
                                    <p className="text-muted-foreground mt-3 leading-relaxed">{faq.answer}</p>
                                </details>
                            ))}
                        </div>
                    </section>

                    <section className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-8">
                        <div className="reveal glass-hero flex flex-col items-start justify-between gap-6 rounded-3xl p-8 md:flex-row md:items-center md:p-10">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold text-white md:text-3xl">Prêt à savoir ce que vous gagnez vraiment ?</h2>
                                <p className="text-white/85">Créez votre compte, ajoutez vos agences et collez votre premier rapport.</p>
                            </div>
                            <Button
                                asChild
                                size="lg"
                                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-12 rounded-full px-6 text-base"
                            >
                                <Link href={auth.user ? route('reports.index') : route('register')}>
                                    {auth.user ? 'Ouvrir mes rapports' : 'Créer mon compte'}
                                </Link>
                            </Button>
                        </div>
                    </section>
                </main>

                <InstallBanner />

                <footer className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 pb-10 text-sm md:px-8">
                    <span className="flex items-center gap-2">
                        <AppLogoIcon variant="mark" className="size-5" />
                        CODCompta
                    </span>
                    <span>La comptabilité du paiement à la livraison.</span>
                </footer>
            </div>
        </>
    );
}

/**
 * A still picture of the product doing its job: one agency message on top, the week it turns into below.
 * Fictional demo figures, week of 12 to 18 October 2026.
 */
function HeroPreview() {
    const profit = useCountUp(328000, 1600);

    return (
        <div style={delay(250)} className="rise relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
            <div
                style={delay(900)}
                className="glass float-card absolute -top-6 -left-2 z-10 w-64 rotate-[-4deg] rounded-2xl p-4 text-xs shadow-xl sm:-left-8"
            >
                <p className="text-primary mb-2 font-semibold">Message WhatsApp de l'Agence 1</p>
                <p className="font-semibold">RAPPORT DU 14/10/2026</p>
                <p className="text-muted-foreground">Commandes livrées : 13</p>
                <p className="text-muted-foreground">Total : 150 000 FCFA</p>
                <p className="text-muted-foreground">Frais de livraison : 30 000 FCFA</p>
            </div>

            <div className="glass rounded-3xl p-5 pt-32 sm:p-7 sm:pt-28">
                <div className="glass-hero mb-5 rounded-2xl p-5">
                    <p className="text-sm text-white/85">Votre bénéfice net, semaine du 12 au 18 octobre</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums">
                        {new Intl.NumberFormat('fr-FR').format(profit).replace(/\u202f|\u00a0/g, ' ')} F
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-xs">
                        <span>
                            <span className="block text-white/75">Épargne</span>
                            <strong className="text-on-hero-gold">131 200 F</strong>
                        </span>
                        <span>
                            <span className="block text-white/75">Votre poche</span>
                            <strong className="text-on-hero-gold">65 600 F</strong>
                        </span>
                        <span>
                            <span className="block text-white/75">Réinvestir</span>
                            <strong className="text-on-hero-gold">131 200 F</strong>
                        </span>
                    </div>
                </div>
                <table className="w-full text-sm">
                    <thead className="text-muted-foreground text-left text-xs">
                        <tr>
                            <th className="pb-2 font-medium">Agence</th>
                            <th className="pb-2 text-right font-medium">Ventes</th>
                            <th className="pb-2 text-right font-medium">Bénéfice</th>
                        </tr>
                    </thead>
                    <tbody className="font-semibold tabular-nums">
                        <tr className="border-t">
                            <td className="py-2.5">Agence 1</td>
                            <td className="py-2.5 text-right">570 000</td>
                            <td className="text-primary py-2.5 text-right">297 462</td>
                        </tr>
                        <tr className="border-t">
                            <td className="py-2.5">Agence 2</td>
                            <td className="py-2.5 text-right">80 000</td>
                            <td className="text-primary py-2.5 text-right">30 538</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div
                style={delay(1800)}
                className="float-card bg-secondary/80 absolute -right-3 -bottom-5 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur-md sm:-right-6"
            >
                Marge 50,5 %
            </div>
        </div>
    );
}

/**
 * Frame for the explainer video. The link is set with DEMO_VIDEO_URL in the .env file.
 */
function DemoVideo({ url }: { url: string }) {
    const embed = toEmbed(url);

    return (
        <section id="demo" aria-labelledby="demo-title" className="mx-auto w-full max-w-5xl scroll-mt-6 px-5 pb-24 md:px-8">
            <div className="reveal mb-8 space-y-2 text-center">
                <p className="text-primary text-sm font-semibold tracking-wide uppercase">Démo</p>
                <h2 id="demo-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
                    CODCompta expliqué en quelques minutes
                </h2>
                <p className="text-muted-foreground mx-auto max-w-xl">
                    Du message de l'agence au bénéfice de la semaine : regardez une journée de comptabilité faite en quelques clics.
                </p>
            </div>

            <div style={delay(150)} className="reveal glass relative overflow-hidden rounded-3xl p-2 shadow-2xl shadow-emerald-950/10 md:p-3">
                <div className="bg-ink-brand relative aspect-video overflow-hidden rounded-2xl">
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
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[radial-gradient(40rem_24rem_at_30%_20%,hsl(165_70%_35%/0.55),transparent_60%),radial-gradient(30rem_20rem_at_80%_90%,hsl(41_90%_55%/0.35),transparent_60%)] p-6 text-center text-white">
                            <span className="play-halo bg-secondary text-secondary-foreground flex size-16 items-center justify-center rounded-full md:size-20">
                                <Play className="ml-1 size-7 fill-current md:size-8" aria-hidden="true" />
                            </span>
                            <div className="space-y-1">
                                <p className="font-[family-name:var(--font-display)] text-lg font-semibold md:text-xl">La vidéo arrive bientôt</p>
                                <p className="text-sm text-white/70">En attendant, créez votre espace et collez votre premier rapport.</p>
                            </div>
                        </div>
                    )}
                </div>
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
            const id = link.pathname.split('/').filter(Boolean).pop();

            return id ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` } : null;
        }

        return { kind: 'video', src: url };
    } catch {
        return null;
    }
}
