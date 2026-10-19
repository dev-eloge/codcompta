import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { useCountUp, useReveal } from '@/hooks/use-reveal';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { BellRing, CopyCheck, Globe2, Megaphone, PiggyBank, Play, Receipt } from 'lucide-react';
import { type CSSProperties } from 'react';

const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

const steps = [
    {
        title: "Collez le rapport de l'agence",
        text: "Le message WhatsApp tel que l'agence l'envoie, un jour ou une semaine entière. Ou saisissez-le à la main en une minute.",
    },
    {
        title: 'Vérifiez les lignes proposées',
        text: "Produits, quantités, montants et frais de livraison sont rangés pour vous. Un écart avec le total annoncé par l'agence est signalé.",
    },
    {
        title: 'Lisez votre bénéfice réel',
        text: 'Par jour, par semaine ou par mois, par pays et par agence, après coût d’achat, pub, closing et livraison.',
    },
];

const features = [
    {
        icon: Globe2,
        title: 'Plusieurs pays, plusieurs agences',
        text: 'Chaque agence a sa ligne, chaque pays son total, et le tout se cumule tout seul.',
    },
    {
        icon: Megaphone,
        title: 'La pub répartie toute seule',
        text: 'Une dépense pour tout le pays est partagée entre les agences selon leurs ventes.',
    },
    {
        icon: PiggyBank,
        title: 'Épargne, poche, réinvestissement',
        text: 'Votre règle de répartition 40 / 20 / 40 appliquée à chaque bénéfice.',
    },
    {
        icon: CopyCheck,
        title: 'Aucun jour compté deux fois',
        text: 'Un récap de semaine qui reprend des jours déjà saisis est arrêté avant de fausser le total.',
    },
    {
        icon: BellRing,
        title: 'Les agences silencieuses repérées',
        text: 'Une agence sans rapport depuis plus de 2 jours apparaît en rouge.',
    },
    {
        icon: Receipt,
        title: "Le bon coût d'achat, même s'il change",
        text: 'Un nouveau prix fournisseur compte à partir de sa date ; les anciens bénéfices ne bougent pas.',
    },
];

export default function Welcome({ demoVideoUrl }: { demoVideoUrl: string | null }) {
    const { auth } = usePage<SharedData>().props;
    useReveal();

    return (
        <>
            <Head title="Le bénéfice réel de votre e-commerce en paiement à la livraison" />

            <div className="relative min-h-svh overflow-hidden">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <span className="light-blob top-[-8rem] left-[-6rem] size-[26rem] bg-[#5fd3b0]/40" />
                    <span className="light-blob top-[10rem] right-[-8rem] size-[24rem] bg-[#f4b23e]/30" style={delay(-6000)} />
                    <span className="light-blob top-[70rem] left-[20%] size-[28rem] bg-[#0f8a6c]/15" style={delay(-11000)} />
                </div>

                <header className="rise mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
                    <Link href={route('home')} className="flex items-center gap-2.5" aria-label="CODCompta, accueil">
                        <AppLogoIcon className="size-9" />
                        <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                            COD<span className="text-primary">Compta</span>
                        </span>
                    </Link>
                    <nav className="flex items-center gap-2">
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
                                Ce que vos agences encaissent, ce qu'il vous reste vraiment.
                            </h1>
                            <p style={delay(200)} className="rise text-muted-foreground max-w-lg text-lg leading-relaxed">
                                CODCompta transforme les rapports de vos agences de livraison en bénéfice net du jour, de la semaine et du mois. Fini
                                les soirées à recopier des messages WhatsApp dans un tableur.
                            </p>
                            <div style={delay(320)} className="rise flex flex-wrap items-center gap-3">
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-12 rounded-full px-6 text-base shadow-lg shadow-emerald-900/20 transition-transform hover:-translate-y-0.5"
                                >
                                    <Link href={auth.user ? route('reports.index') : route('register')}>
                                        {auth.user ? 'Ouvrir mes rapports' : 'Créer mon espace gratuitement'}
                                    </Link>
                                </Button>
                                <a
                                    href="#demo"
                                    className="glass text-foreground hover:text-primary inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors"
                                >
                                    <span className="bg-secondary text-secondary-foreground flex size-6 items-center justify-center rounded-full">
                                        <Play className="size-3 fill-current" />
                                    </span>
                                    Voir la démo
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
                                Pensé pour le e-commerce en paiement à la livraison en Afrique de l'Ouest et centrale.
                            </p>
                        </div>

                        <HeroPreview />
                    </section>

                    <DemoVideo url={demoVideoUrl} />

                    <section aria-labelledby="how" className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8">
                        <h2 id="how" className="reveal mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
                            Trois gestes, chaque matin
                        </h2>
                        <ol className="grid gap-5 md:grid-cols-3">
                            {steps.map((step, index) => (
                                <li
                                    key={step.title}
                                    style={delay(index * 120)}
                                    className="reveal glass relative rounded-3xl p-6 transition-shadow hover:shadow-xl"
                                >
                                    <span className="bg-secondary text-secondary-foreground mb-5 inline-flex size-9 items-center justify-center rounded-full font-[family-name:var(--font-display)] font-bold">
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
                            Les règles de votre tableur, sans ses erreurs
                        </h2>
                        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature, index) => (
                                <div key={feature.title} style={delay((index % 3) * 110)} className="reveal group flex gap-4">
                                    <span className="bg-primary/12 text-primary group-hover:bg-primary flex size-11 shrink-0 items-center justify-center rounded-2xl transition-colors group-hover:text-white">
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

                    <section className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-8">
                        <div className="reveal glass-hero flex flex-col items-start justify-between gap-6 rounded-3xl p-8 md:flex-row md:items-center md:p-10">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold text-white md:text-3xl">Votre prochaine semaine, déjà comptée.</h2>
                                <p className="text-white/80">Ajoutez vos pays, vos agences et vos produits une fois. Le reste se calcule.</p>
                            </div>
                            <Button
                                asChild
                                size="lg"
                                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-12 rounded-full px-6 text-base"
                            >
                                <Link href={auth.user ? route('reports.index') : route('register')}>
                                    {auth.user ? 'Ouvrir mes rapports' : 'Commencer'}
                                </Link>
                            </Button>
                        </div>
                    </section>
                </main>

                <footer className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 pb-10 text-sm md:px-8">
                    <span className="flex items-center gap-2">
                        <AppLogoIcon className="size-5" />
                        CODCompta
                    </span>
                    <span>Pensé pour le e-commerce en paiement à la livraison.</span>
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
                <p className="mb-2 font-semibold text-emerald-700 dark:text-emerald-300">Agence 1</p>
                <p className="font-semibold">RAPPORT DU 14/10/2026</p>
                <p className="text-muted-foreground">Commandes livrées : 13</p>
                <p className="text-muted-foreground">Total : 150 000 FCFA</p>
                <p className="text-muted-foreground">Frais de livraison : 30 000 FCFA</p>
            </div>

            <div className="glass rounded-3xl p-5 pt-32 sm:p-7 sm:pt-28">
                <div className="glass-hero mb-5 rounded-2xl p-5">
                    <p className="text-sm text-white/80">Bénéfice net, semaine du 12 au 18 octobre</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums">
                        {new Intl.NumberFormat('fr-FR').format(profit).replace(/\u202f|\u00a0/g, ' ')} F
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-xs">
                        <span>
                            <span className="block text-white/70">Épargne</span>
                            <strong className="text-[#FFD98A]">131 200 F</strong>
                        </span>
                        <span>
                            <span className="block text-white/70">Poche</span>
                            <strong className="text-[#FFD98A]">65 600 F</strong>
                        </span>
                        <span>
                            <span className="block text-white/70">Réinvest.</span>
                            <strong className="text-[#FFD98A]">131 200 F</strong>
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
function DemoVideo({ url }: { url: string | null }) {
    const embed = url ? toEmbed(url) : null;

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
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#0b2a33]">
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
                                <Play className="ml-1 size-7 fill-current md:size-8" />
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
