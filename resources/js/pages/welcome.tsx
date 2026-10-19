import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { BellRing, CopyCheck, Globe2, Megaphone, PiggyBank, Receipt } from 'lucide-react';

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

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Le bénéfice réel de votre e-commerce en paiement à la livraison" />

            <div className="relative min-h-svh overflow-hidden">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
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
                            <h1 className="max-w-xl text-4xl leading-[1.08] font-bold tracking-tight md:text-5xl lg:text-6xl">
                                Ce que vos agences encaissent, ce qu'il vous reste vraiment.
                            </h1>
                            <p className="text-muted-foreground max-w-lg text-lg leading-relaxed">
                                CODCompta transforme les rapports de vos agences de livraison en bénéfice net du jour, de la semaine et du mois. Fini
                                les soirées à recopier des messages WhatsApp dans un tableur.
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                                    <Link href={auth.user ? route('reports.index') : route('register')}>
                                        {auth.user ? 'Ouvrir mes rapports' : 'Créer mon espace gratuitement'}
                                    </Link>
                                </Button>
                                {!auth.user && (
                                    <Link href={route('login')} className="text-primary text-sm font-semibold underline-offset-4 hover:underline">
                                        J'ai déjà un compte
                                    </Link>
                                )}
                            </div>
                            <p className="text-muted-foreground text-sm">
                                Pensé pour le e-commerce en paiement à la livraison en Afrique de l'Ouest et centrale.
                            </p>
                        </div>

                        <HeroPreview />
                    </section>

                    <section aria-labelledby="how" className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8">
                        <h2 id="how" className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
                            Trois gestes, chaque matin
                        </h2>
                        <ol className="grid gap-5 md:grid-cols-3">
                            {steps.map((step, index) => (
                                <li key={step.title} className="glass relative rounded-3xl p-6">
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
                        <h2 id="features" className="mb-8 max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
                            Les règles de votre tableur, sans ses erreurs
                        </h2>
                        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature) => (
                                <div key={feature.title} className="flex gap-4">
                                    <span className="bg-primary/12 text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl">
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
                        <div className="glass-hero flex flex-col items-start justify-between gap-6 rounded-3xl p-8 md:flex-row md:items-center md:p-10">
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
    return (
        <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
            <div className="glass absolute -top-6 -left-2 z-10 w-64 rotate-[-4deg] rounded-2xl p-4 text-xs shadow-xl sm:-left-8">
                <p className="mb-2 font-semibold text-emerald-700 dark:text-emerald-300">Agence 1</p>
                <p className="font-semibold">RAPPORT DU 14/10/2026</p>
                <p className="text-muted-foreground">Commandes livrées : 13</p>
                <p className="text-muted-foreground">Total : 150 000 FCFA</p>
                <p className="text-muted-foreground">Frais de livraison : 30 000 FCFA</p>
            </div>

            <div className="glass rounded-3xl p-5 pt-32 sm:p-7 sm:pt-28">
                <div className="glass-hero mb-5 rounded-2xl p-5">
                    <p className="text-sm text-white/80">Bénéfice net, semaine du 12 au 18 octobre</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold">328 000 F</p>
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

            <div className="bg-secondary/80 absolute -right-3 -bottom-5 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur-md sm:-right-6">
                Marge 50,5 %
            </div>
        </div>
    );
}
