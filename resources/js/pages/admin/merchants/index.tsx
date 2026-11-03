import { type AdminMerchant, MerchantStatus, formatDate, timeAgo } from '@/components/admin/merchant-status';
import { Pagination, type PaginationLink } from '@/components/admin/pagination';
import FlashMessage from '@/components/flash-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Search, Store } from 'lucide-react';
import { type FormEvent, useState } from 'react';

type Status = 'tous' | 'actifs' | 'suspendus';
type Sort = 'recents' | 'activite' | 'nom';

interface Props {
    merchants: { data: AdminMerchant[]; links: PaginationLink[]; total: number; from: number | null; to: number | null };
    filters: { q: string | null; statut: Status; tri: Sort };
    counts: Record<Status, number>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administration', href: '/admin' },
    { title: 'Commerçants', href: '/admin/commercants' },
];

const statusTabs: { value: Status; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'actifs', label: 'Actifs' },
    { value: 'suspendus', label: 'Suspendus' },
];

export default function MerchantsIndex({ merchants, filters, counts }: Props) {
    const [search, setSearch] = useState(filters.q ?? '');

    const visit = (changes: Partial<{ q: string; statut: Status; tri: Sort }>) =>
        router.get(
            route('admin.merchants.index'),
            { q: search || undefined, statut: filters.statut, tri: filters.tri, ...changes },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const submit = (event: FormEvent) => {
        event.preventDefault();
        visit({ q: search || undefined });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Commerçants" />

            <div className="flex flex-col gap-5 p-4 md:p-6">
                <header className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Commerçants</h1>
                    <p className="text-muted-foreground text-sm">
                        Ouvrez un commerçant pour voir son activité, consulter son compte ou le suspendre.
                    </p>
                </header>

                <FlashMessage />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <form onSubmit={submit} role="search" className="flex w-full max-w-md items-end gap-2">
                        <div className="grid flex-1 gap-1.5">
                            <Label htmlFor="merchant-search">Rechercher</Label>
                            <Input
                                id="merchant-search"
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Nom de la boutique, nom ou email"
                                autoComplete="off"
                            />
                        </div>
                        <Button type="submit" variant="outline" className="h-10">
                            <Search className="size-4" aria-hidden="true" />
                            Chercher
                        </Button>
                    </form>

                    <div className="flex flex-wrap items-end gap-3">
                        <div role="tablist" aria-label="Filtrer par statut" className="bg-muted inline-flex rounded-xl p-1">
                            {statusTabs.map((tab) => (
                                <button
                                    key={tab.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={filters.statut === tab.value}
                                    onClick={() => visit({ statut: tab.value })}
                                    className={cn(
                                        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                                        filters.statut === tab.value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {tab.label} <span className="tabular-nums opacity-70">({counts[tab.value]})</span>
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="merchant-sort">Trier par</Label>
                            <select
                                id="merchant-sort"
                                value={filters.tri}
                                onChange={(event) => visit({ tri: event.target.value as Sort })}
                                className="border-input bg-background focus-visible:ring-ring/50 h-10 rounded-md border px-3 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
                            >
                                <option value="recents">Inscription la plus récente</option>
                                <option value="activite">Activité la plus récente</option>
                                <option value="nom">Nom (A à Z)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {merchants.data.length === 0 ? (
                    <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
                        <span aria-hidden="true" className="bg-primary/12 text-primary flex size-12 items-center justify-center rounded-full">
                            <Store className="size-6" />
                        </span>
                        <p className="font-semibold">Aucun commerçant ne correspond</p>
                        <p className="text-muted-foreground max-w-sm text-sm">Essayez un autre mot ou affichez tous les statuts.</p>
                        {(filters.q || filters.statut !== 'tous') && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch('');
                                    router.get(route('admin.merchants.index'));
                                }}
                            >
                                Effacer les filtres
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="glass overflow-x-auto rounded-2xl">
                        <table className="w-full min-w-[760px] text-sm">
                            <caption className="sr-only">Liste des commerçants</caption>
                            <thead>
                                <tr className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
                                    <th scope="col" className="px-5 py-3 font-semibold">
                                        Commerçant
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-semibold">
                                        Inscription
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-right font-semibold">
                                        Pays
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-right font-semibold">
                                        Agences
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-right font-semibold">
                                        Rapports
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-semibold">
                                        Dernière activité
                                    </th>
                                    <th scope="col" className="px-5 py-3 font-semibold">
                                        Statut
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {merchants.data.map((merchant) => (
                                    <tr key={merchant.id} className="hover:bg-primary/5 transition-colors">
                                        <td className="px-5 py-3">
                                            <Link href={route('admin.merchants.show', merchant.id)} className="font-semibold hover:underline">
                                                {merchant.name}
                                            </Link>
                                            <p className="text-muted-foreground text-xs">
                                                {merchant.owner ? `${merchant.owner.name}, ${merchant.owner.email}` : 'Sans utilisateur'}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">{formatDate(merchant.created_at)}</td>
                                        <td className="px-3 py-3 text-right tabular-nums">{merchant.countries_count}</td>
                                        <td className="px-3 py-3 text-right tabular-nums">{merchant.agencies_count}</td>
                                        <td className="px-3 py-3 text-right tabular-nums">{merchant.reports_count}</td>
                                        <td className="px-3 py-3 whitespace-nowrap">{timeAgo(merchant.last_activity_at)}</td>
                                        <td className="px-5 py-3">
                                            <MerchantStatus suspended={merchant.suspended_at !== null} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {merchants.total > 0 && (
                    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                        <p className="text-muted-foreground text-sm tabular-nums">
                            {merchants.from} à {merchants.to} sur {merchants.total} commerçant{merchants.total > 1 ? 's' : ''}
                        </p>
                        <Pagination links={merchants.links} />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
