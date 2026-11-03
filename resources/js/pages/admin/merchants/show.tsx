import { type AdminMerchant, MerchantStatus, formatDate, formatDateTime, timeAgo } from '@/components/admin/merchant-status';
import FlashMessage from '@/components/flash-message';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa, formatNumber, formatPeriod } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Ban, Eye, Globe2, LoaderCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';

interface MerchantDetail extends AdminMerchant {
    timezone: string;
    currency: string;
    users: { id: number; name: string; email: string; role: string; google: boolean; is_super_admin: boolean; created_at: string | null }[];
    countries: { id: number; name: string; agencies: { name: string; reports_count: number; last_report_at: string | null }[] }[];
    products_count: number;
    messages_count: number;
}

interface Props {
    merchant: MerchantDetail;
    recentReports: {
        id: number;
        agency: string;
        period_start: string;
        period_end: string;
        revenue: number;
        source: string;
        status: string;
        created_at: string | null;
    }[];
    auditLogs: { id: number; label: string; admin: string | null; reason: string | null; created_at: string | null }[];
}

const sourceLabels: Record<string, string> = { manual: 'Saisie', message: 'Message WhatsApp', sheet: 'Google Sheet (ancien import)' };
const statusLabels: Record<string, string> = { counted: 'Comptabilisé', detail: 'Détail', to_verify: 'À vérifier' };

export default function MerchantShow({ merchant, recentReports, auditLogs }: Props) {
    const suspended = merchant.suspended_at !== null;
    const [consulting, setConsulting] = useState(false);
    const [reactivating, setReactivating] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/admin' },
        { title: 'Commerçants', href: '/admin/commercants' },
        { title: merchant.name, href: `/admin/commercants/${merchant.id}` },
    ];

    const consult = () =>
        router.post(
            route('admin.merchants.impersonate', merchant.id),
            {},
            { onStart: () => setConsulting(true), onFinish: () => setConsulting(false) },
        );

    const reactivate = () =>
        router.post(
            route('admin.merchants.reactivate', merchant.id),
            {},
            { preserveScroll: true, onStart: () => setReactivating(true), onFinish: () => setReactivating(false) },
        );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={merchant.name} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">{merchant.name}</h1>
                            <MerchantStatus suspended={suspended} />
                            {merchant.is_admin_account && (
                                <span className="bg-secondary/25 text-secondary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                                    Compte super admin
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Inscrit le {formatDate(merchant.created_at)}, dernière activité : {timeAgo(merchant.last_activity_at).toLowerCase()}.
                            Fuseau {merchant.timezone}, devise {merchant.currency}.
                        </p>
                    </div>

                    {!merchant.is_admin_account && (
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={consult} disabled={consulting || merchant.owner === null}>
                                {consulting ? (
                                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Eye className="size-4" aria-hidden="true" />
                                )}
                                Consulter le compte
                            </Button>
                            {suspended ? (
                                <Button variant="outline" onClick={reactivate} disabled={reactivating}>
                                    {reactivating ? (
                                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                                    ) : (
                                        <RotateCcw className="size-4" aria-hidden="true" />
                                    )}
                                    Réactiver le compte
                                </Button>
                            ) : (
                                <SuspendDialog merchant={merchant} />
                            )}
                        </div>
                    )}
                </header>

                <FlashMessage />

                {suspended && (
                    <div role="status" className="border-destructive/30 bg-destructive/8 rounded-2xl border p-4 text-sm">
                        <p className="text-destructive font-semibold">Suspendu le {formatDateTime(merchant.suspended_at)}</p>
                        <p className="mt-1">Raison : {merchant.suspension_reason ?? 'non précisée'}</p>
                        <p className="text-muted-foreground mt-1">
                            Ses utilisateurs ne peuvent plus se connecter. Vous pouvez toujours consulter le compte.
                        </p>
                    </div>
                )}

                <section aria-label="Activité" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <Stat label="Pays" value={merchant.countries_count} />
                    <Stat label="Agences" value={merchant.agencies_count} />
                    <Stat label="Produits" value={merchant.products_count} />
                    <Stat label="Rapports" value={merchant.reports_count} />
                    <Stat label="Messages lus" value={merchant.messages_count} />
                    <Stat label="Utilisateurs" value={merchant.users_count} />
                </section>

                <div className="grid gap-6 xl:grid-cols-2">
                    <Panel title="Utilisateurs">
                        <ul className="divide-y">
                            {merchant.users.map((user) => (
                                <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold">{user.name}</p>
                                        <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                                    </div>
                                    <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                                        <Tag>{user.role === 'owner' ? 'Propriétaire' : 'Membre'}</Tag>
                                        {user.google && <Tag>Connexion Google</Tag>}
                                        {user.is_super_admin && <Tag>Super admin</Tag>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    <Panel title="Pays et agences">
                        {merchant.countries.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Aucun pays configuré : le commerçant n'a pas terminé son installation.</p>
                        ) : (
                            <ul className="space-y-4">
                                {merchant.countries.map((country) => (
                                    <li key={country.id}>
                                        <p className="flex items-center gap-2 font-semibold">
                                            <Globe2 className="text-primary size-4" aria-hidden="true" />
                                            {country.name}
                                        </p>
                                        {country.agencies.length === 0 ? (
                                            <p className="text-muted-foreground mt-1 ml-6 text-sm">Aucune agence</p>
                                        ) : (
                                            <ul className="mt-1 ml-6 space-y-1 text-sm">
                                                {country.agencies.map((agency) => (
                                                    <li key={agency.name} className="flex justify-between gap-3">
                                                        <span>{agency.name}</span>
                                                        <span className="text-muted-foreground tabular-nums">
                                                            {agency.reports_count} rapport{agency.reports_count > 1 ? 's' : ''}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>

                <Panel title="Derniers rapports">
                    {recentReports.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Aucun rapport pour l'instant.</p>
                    ) : (
                        <div className="-mx-5 overflow-x-auto md:-mx-6">
                            <table className="w-full min-w-[620px] text-sm">
                                <caption className="sr-only">Derniers rapports du commerçant</caption>
                                <thead>
                                    <tr className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
                                        <th scope="col" className="px-5 py-2 font-semibold md:px-6">
                                            Période
                                        </th>
                                        <th scope="col" className="px-3 py-2 font-semibold">
                                            Agence
                                        </th>
                                        <th scope="col" className="px-3 py-2 font-semibold">
                                            Source
                                        </th>
                                        <th scope="col" className="px-3 py-2 font-semibold">
                                            Statut
                                        </th>
                                        <th scope="col" className="px-5 py-2 text-right font-semibold md:px-6">
                                            Chiffre d'affaires
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recentReports.map((report) => (
                                        <tr key={report.id}>
                                            <td className="px-5 py-2.5 whitespace-nowrap md:px-6">
                                                {formatPeriod(report.period_start, report.period_end)}
                                            </td>
                                            <td className="px-3 py-2.5">{report.agency}</td>
                                            <td className="px-3 py-2.5">{sourceLabels[report.source] ?? report.source}</td>
                                            <td className="px-3 py-2.5">{statusLabels[report.status] ?? report.status}</td>
                                            <td className="px-5 py-2.5 text-right font-semibold tabular-nums md:px-6">
                                                {formatFcfa(report.revenue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>

                <Panel title="Historique des actions d'administration">
                    {auditLogs.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Aucune action d'administration sur ce compte.</p>
                    ) : (
                        <ol className="space-y-3">
                            {auditLogs.map((log) => (
                                <li key={log.id} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:justify-between sm:gap-4">
                                    <div>
                                        <p className="font-semibold">{log.label}</p>
                                        <p className="text-muted-foreground">
                                            Par {log.admin ?? 'un admin supprimé'}
                                            {log.reason && `. Raison : ${log.reason}`}
                                        </p>
                                    </div>
                                    <time dateTime={log.created_at ?? undefined} className="text-muted-foreground whitespace-nowrap tabular-nums">
                                        {formatDateTime(log.created_at)}
                                    </time>
                                </li>
                            ))}
                        </ol>
                    )}
                </Panel>
            </div>
        </AppLayout>
    );
}

/**
 * Destructive action: confirmation dialog with a required reason, kept in the journal.
 */
function SuspendDialog({ merchant }: { merchant: MerchantDetail }) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({ reason: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(route('admin.merchants.suspend', merchant.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setOpen(false);
            },
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    clearErrors();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button variant="destructive">
                    <Ban className="size-4" aria-hidden="true" />
                    Suspendre
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Suspendre « {merchant.name} » ?</DialogTitle>
                        <DialogDescription>
                            {merchant.users_count > 1
                                ? `Ses ${merchant.users_count} utilisateurs seront déconnectés et ne pourront plus se connecter.`
                                : 'Son utilisateur sera déconnecté et ne pourra plus se connecter.'}{' '}
                            Ses données restent intactes et vous pourrez réactiver le compte à tout moment.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-1.5">
                        <Label htmlFor="suspension-reason">Raison de la suspension</Label>
                        <textarea
                            id="suspension-reason"
                            value={data.reason}
                            onChange={(event) => setData('reason', event.target.value)}
                            rows={3}
                            maxLength={255}
                            required
                            aria-invalid={errors.reason ? true : undefined}
                            aria-describedby="suspension-reason-hint"
                            className="border-input bg-background focus-visible:ring-ring/50 aria-invalid:border-destructive rounded-md border px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
                            placeholder="Exemple : paiement en retard, demande du commerçant"
                        />
                        <p id="suspension-reason-hint" className="text-muted-foreground text-xs">
                            Visible dans le journal d'administration.
                        </p>
                        <InputError message={errors.reason} />
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Annuler
                            </Button>
                        </DialogClose>
                        <Button type="submit" variant="destructive" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                            Suspendre le compte
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="glass rounded-2xl p-4">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">{formatNumber(value)}</p>
        </div>
    );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="glass rounded-2xl p-5 md:p-6">
            <h2 className="mb-4 text-base font-semibold">{title}</h2>
            {children}
        </section>
    );
}

function Tag({ children }: { children: ReactNode }) {
    return <span className="bg-muted rounded-full px-2 py-0.5">{children}</span>;
}
