import FlashMessage from '@/components/flash-message';
import { DeleteButton } from '@/components/row-actions';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ExternalLink, FileSpreadsheet, KeyRound, Pencil, Plus, RefreshCw } from 'lucide-react';

interface Source {
    id: number;
    spreadsheet_title: string;
    sheet_title: string;
    url: string;
    country: string;
    default_agency: string | null;
    auto_sync: boolean;
    last_synced_at: string | null;
    reports_count: number;
    latest_import: { id: number; status: 'pending' | 'ready' | 'failed' | 'done'; proposals: number } | null;
}

interface Props {
    googleConfigured: boolean;
    connection: { email: string } | null;
    sources: Source[];
    hasCountries: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Google Sheets', href: '/sheets' }];

const dateTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default function SheetsIndex({ googleConfigured, connection, sources, hasCountries }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Google Sheets" />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
                <FlashMessage />

                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Google Sheets</h1>
                    <p className="text-muted-foreground text-sm">
                        Reliez l'onglet de votre tableur de comptabilité : chaque ligne datée devient un rapport, après votre vérification. Les
                        nouvelles lignes sont relues chaque matin.
                    </p>
                </div>

                {!googleConfigured && <SetupNotice />}

                {googleConfigured && (
                    <section aria-label="Compte Google" className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
                        <div className="flex items-center gap-3">
                            <span className="bg-primary/12 text-primary flex size-11 items-center justify-center rounded-2xl">
                                <FileSpreadsheet className="size-5" />
                            </span>
                            <div>
                                <p className="font-semibold">{connection ? 'Compte Google connecté' : 'Aucun compte Google connecté'}</p>
                                <p className="text-muted-foreground text-sm">
                                    {connection ? connection.email : 'La plateforme lit vos Sheets, sans jamais les modifier.'}
                                </p>
                            </div>
                        </div>
                        {connection ? (
                            <DeleteButton
                                label="Déconnecter le compte Google"
                                title="Déconnecter Google ?"
                                description="La plateforme ne pourra plus lire vos Sheets. Les rapports déjà importés sont gardés."
                                confirmLabel="Déconnecter"
                                text="Déconnecter"
                                url={route('google.disconnect')}
                            />
                        ) : (
                            <Button asChild>
                                <a href={route('google.redirect')}>Connecter mon compte Google</a>
                            </Button>
                        )}
                    </section>
                )}

                {connection && (
                    <section aria-labelledby="sources-title" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 id="sources-title" className="text-lg font-semibold">
                                Onglets reliés
                            </h2>
                            {hasCountries ? (
                                <Button asChild size="sm">
                                    <Link href={route('sheets.create')}>
                                        <Plus />
                                        Relier un onglet
                                    </Link>
                                </Button>
                            ) : (
                                <Link
                                    href={route('reference.index')}
                                    className="text-primary text-sm font-semibold underline-offset-4 hover:underline"
                                >
                                    Ajoutez d'abord un pays dans le référentiel
                                </Link>
                            )}
                        </div>

                        {sources.length === 0 ? (
                            <p className="glass text-muted-foreground rounded-2xl p-6 text-sm">
                                Aucun onglet relié. Reliez par exemple l'onglet d'un pays : ses lignes deviendront les rapports de ses agences.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {sources.map((source) => (
                                    <SourceCard key={source.id} source={source} />
                                ))}
                            </ul>
                        )}
                    </section>
                )}
            </div>
        </AppLayout>
    );
}

function SourceCard({ source }: { source: Source }) {
    const latest = source.latest_import;

    return (
        <li className="glass space-y-4 rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-semibold">
                        {source.spreadsheet_title} <span className="text-muted-foreground font-normal">› {source.sheet_title}</span>
                    </p>
                    <p className="text-muted-foreground text-sm">
                        {source.country}
                        {source.default_agency && `, agence par défaut ${source.default_agency}`}, {source.reports_count} rapport
                        {source.reports_count > 1 ? 's' : ''} importé{source.reports_count > 1 ? 's' : ''}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {source.last_synced_at
                            ? `Dernière synchronisation le ${dateTime.format(new Date(source.last_synced_at))}`
                            : 'Jamais synchronisé'}
                        {source.auto_sync ? ', relu chaque matin à 6 h' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-primary size-8" title="Ouvrir le Sheet">
                        <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${source.spreadsheet_title} dans Google Sheets`}>
                            <ExternalLink className="size-4" />
                        </a>
                    </Button>
                    <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary size-8"
                        title="Modifier les colonnes"
                    >
                        <Link href={route('sheets.edit', source.id)} aria-label={`Modifier l'onglet ${source.sheet_title}`}>
                            <Pencil className="size-4" />
                        </Link>
                    </Button>
                    <DeleteButton
                        label={`Délier l'onglet ${source.sheet_title}`}
                        title={`Délier « ${source.sheet_title} » ?`}
                        description="La plateforme ne lira plus cet onglet. Les rapports déjà importés sont gardés."
                        confirmLabel="Délier"
                        url={route('sheets.destroy', source.id)}
                    />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" onClick={() => router.post(route('sheets.sync', source.id))}>
                    <RefreshCw />
                    Synchroniser
                </Button>
                {latest?.status === 'ready' && latest.proposals > 0 && (
                    <Link
                        href={route('sheets.imports.show', latest.id)}
                        className="bg-secondary/25 rounded-full px-3 py-1 text-sm font-semibold text-amber-900 dark:text-amber-200"
                    >
                        {latest.proposals} ligne{latest.proposals > 1 ? 's' : ''} à vérifier
                    </Link>
                )}
                {latest?.status === 'pending' && (
                    <Link href={route('sheets.imports.show', latest.id)} className="text-muted-foreground text-sm">
                        Lecture en cours…
                    </Link>
                )}
                {latest?.status === 'failed' && (
                    <Link href={route('sheets.imports.show', latest.id)} className="text-destructive text-sm font-semibold">
                        Dernière lecture échouée
                    </Link>
                )}
            </div>
        </li>
    );
}

function SetupNotice() {
    return (
        <section className="border-secondary/50 bg-secondary/15 space-y-3 rounded-2xl border p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold">
                <KeyRound className="size-4 text-amber-700 dark:text-amber-300" />
                La connexion Google n'est pas encore configurée
            </p>
            <ol className="list-decimal space-y-1 pl-5">
                <li>Sur console.cloud.google.com, créez un projet et activez « Google Sheets API ».</li>
                <li>Configurez l'écran de consentement OAuth (type « Externe ») et ajoutez votre email comme utilisateur test.</li>
                <li>
                    Créez un identifiant « ID client OAuth », type « Application Web », avec l'URI de redirection{' '}
                    <code className="font-semibold">{route('google.callback')}</code>.
                </li>
                <li>
                    Copiez l'ID et le code secret dans le fichier <code className="font-semibold">.env</code> :{' '}
                    <code className="font-semibold">GOOGLE_CLIENT_ID</code> et <code className="font-semibold">GOOGLE_CLIENT_SECRET</code>, puis
                    relancez le serveur.
                </li>
            </ol>
        </section>
    );
}
