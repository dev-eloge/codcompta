import FlashMessage from '@/components/flash-message';
import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { DeleteButton } from '@/components/row-actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { KeyRound, LoaderCircle, MessageSquareText, Sparkles } from 'lucide-react';
import { FormEventHandler } from 'react';

interface Agency {
    id: number;
    name: string;
    country: string;
}

interface RecentMessage {
    id: number;
    agency: string;
    status: 'received' | 'parsed' | 'failed' | 'validated';
    excerpt: string;
    received_at: string;
    proposals: number;
    recorded: number;
}

interface Props {
    agencies: Agency[];
    recent: RecentMessage[];
    parserReady: boolean;
}

type PasteForm = {
    agency_id: string;
    body: string;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Lire un message WhatsApp', href: '/messages/coller' }];

export const messageStatus: Record<RecentMessage['status'], { label: string; className: string }> = {
    received: { label: 'Lecture en cours', className: 'bg-muted text-muted-foreground' },
    parsed: { label: 'À vérifier', className: 'bg-secondary/30 text-secondary-foreground dark:text-secondary' },
    failed: { label: 'Lecture impossible', className: 'bg-destructive/12 text-destructive' },
    validated: { label: 'Enregistré', className: 'bg-primary/12 text-primary' },
};

const dateTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function MessagesCreate({ agencies, recent, parserReady }: Props) {
    const { auth } = usePage<SharedData>().props;
    const { data, setData, post, processing, errors } = useForm<PasteForm>({
        agency_id: agencies.length === 1 ? String(agencies[0].id) : '',
        body: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('messages.store'));
    };

    if (agencies.length === 0) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Lire un message WhatsApp" />
                <div className="glass mx-auto mt-10 max-w-md space-y-4 rounded-2xl p-8 text-center">
                    <h1 className="text-xl font-semibold">Ajoutez d'abord une agence</h1>
                    <p className="text-muted-foreground text-sm">Chaque message est rangé avec l'agence de livraison qui vous l'a envoyé.</p>
                    <Button asChild>
                        <Link href={route('reference.index')}>Ajouter une agence</Link>
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Lire un message WhatsApp" />

            <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="empty:hidden lg:col-span-2">
                    <FlashMessage />
                </div>
                <form onSubmit={submit} className="glass flex flex-col gap-6 rounded-2xl p-5 md:p-8">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">Lire le rapport WhatsApp d'une agence</h1>
                        <p className="text-muted-foreground text-sm">Pas besoin de recopier les chiffres : CODCompta lit le message pour vous.</p>
                    </div>

                    <ol className="grid gap-3 text-sm sm:grid-cols-3">
                        {[
                            'Dans WhatsApp, appuyez longuement sur le rapport puis « Copier ».',
                            "Choisissez l'agence et collez le message ci-dessous, tel quel.",
                            "Vérifiez les chiffres trouvés, puis enregistrez. Rien n'est compté avant votre accord.",
                        ].map((step, index) => (
                            <li key={step} className="bg-background/60 flex gap-3 rounded-xl border p-3">
                                <span
                                    aria-hidden="true"
                                    className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                >
                                    {index + 1}
                                </span>
                                <span>
                                    <span className="sr-only">Étape {index + 1} : </span>
                                    {step}
                                </span>
                            </li>
                        ))}
                    </ol>

                    {!parserReady && (
                        <div role="status" className="border-secondary/70 bg-secondary/20 flex gap-3 rounded-xl border p-4 text-sm">
                            <KeyRound className="text-secondary-foreground dark:text-secondary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            {auth.isSuperAdmin ? (
                                <p>
                                    La lecture automatique n'est pas activée sur ce serveur. Ajoutez la clé{' '}
                                    <code className="font-semibold">ANTHROPIC_API_KEY</code> dans le fichier{' '}
                                    <code className="font-semibold">.env</code>, puis relancez l'application.
                                </p>
                            ) : (
                                <p>
                                    La lecture automatique est momentanément indisponible. En attendant, vous pouvez{' '}
                                    <Link href={route('reports.create')} className="text-primary font-semibold underline underline-offset-4">
                                        saisir le rapport à la main
                                    </Link>
                                    .
                                </p>
                            )}
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="agency_id">Agence qui a envoyé le message *</Label>
                        <NativeSelect id="agency_id" required value={data.agency_id} onChange={(e) => setData('agency_id', e.target.value)}>
                            <option value="">Choisir une agence</option>
                            {agencies.map((agency) => (
                                <option key={agency.id} value={agency.id}>
                                    {agency.name} ({agency.country})
                                </option>
                            ))}
                        </NativeSelect>
                        <InputError message={errors.agency_id} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="body">Message copié depuis WhatsApp *</Label>
                        <textarea
                            id="body"
                            required
                            aria-describedby="body-help"
                            aria-invalid={errors.body ? true : undefined}
                            value={data.body}
                            onChange={(e) => setData('body', e.target.value)}
                            rows={14}
                            placeholder={
                                'RAPPORT DU 14/10/2026\nCommandes livrées : 6\nProduit 1 : 4 = 48 000\nProduit 2 : 2 = 30 000\nTotal : 78 000 FCFA\nFrais livraison : 12 000 FCFA'
                            }
                            className="border-input bg-background/80 placeholder:text-muted-foreground/70 focus-visible:ring-ring min-h-64 w-full rounded-xl border px-4 py-3 font-mono text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-hidden"
                        />
                        <p id="body-help" className="text-muted-foreground text-xs">
                            Un message peut couvrir plusieurs jours : chaque rapport trouvé vous sera proposé séparément.
                        </p>
                        <InputError message={errors.body} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" size="lg" disabled={processing}>
                            {processing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                            {processing ? 'Envoi…' : 'Lire le message'}
                        </Button>
                        <Button asChild variant="ghost">
                            <Link href={route('reports.create')}>Plutôt saisir à la main</Link>
                        </Button>
                    </div>
                </form>

                <aside aria-labelledby="recent-title" className="glass h-fit rounded-2xl p-5">
                    <h2 id="recent-title" className="mb-4 text-base font-semibold">
                        Derniers messages
                    </h2>
                    <p className="text-muted-foreground -mt-2 mb-3 text-xs">Ouvrez un message pour vérifier ou corriger ce qui a été lu.</p>
                    {recent.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center text-sm">
                            <MessageSquareText className="size-6" aria-hidden="true" />
                            Aucun message pour l'instant. Les messages que vous collez apparaîtront ici.
                        </div>
                    ) : (
                        <ul className="-mx-2 space-y-1">
                            {recent.map((message) => (
                                <li key={message.id} className="flex items-start gap-1">
                                    <Link
                                        href={route('messages.show', message.id)}
                                        className="hover:bg-primary/6 block min-w-0 flex-1 rounded-xl px-2 py-2.5 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-semibold">{message.agency}</span>
                                            <span
                                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${messageStatus[message.status].className}`}
                                            >
                                                {messageStatus[message.status].label}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground truncate text-xs" title={message.excerpt}>
                                            {message.excerpt}
                                        </p>
                                        <p className="text-muted-foreground mt-0.5 text-xs">
                                            {dateTime.format(new Date(message.received_at))}
                                            {message.proposals > 0 &&
                                                `, ${message.recorded} sur ${message.proposals} enregistré${message.recorded > 1 ? 's' : ''}`}
                                        </p>
                                    </Link>
                                    <div className="pt-1.5">
                                        <DeleteButton
                                            label={`Supprimer le message de ${message.agency}`}
                                            title="Supprimer ce message ?"
                                            description="Le texte collé et sa lecture seront supprimés. Les rapports déjà enregistrés depuis ce message sont gardés."
                                            url={route('messages.destroy', message.id)}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>
            </div>
        </AppLayout>
    );
}
