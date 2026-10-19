import FlashMessage from '@/components/flash-message';
import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { DeleteButton, EditButton } from '@/components/row-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatNumber, formatPeriod } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';

interface Country {
    id: number;
    name: string;
    agencies: { id: number; name: string }[];
}

interface AdSpend {
    id: number;
    country_id: number;
    agency_id: number | null;
    country: string;
    agency: string | null;
    period_start: string;
    period_end: string;
    amount: number;
    platform: string;
}

interface Props {
    countries: Country[];
    adSpends: AdSpend[];
    platforms: string[];
    today: string;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pub', href: '/pub' }];

const platformLabels: Record<string, string> = { meta: 'Meta (Facebook, Instagram)', tiktok: 'TikTok', autre: 'Autre' };

export default function AdSpendsIndex({ countries, adSpends, platforms, today }: Props) {
    const blank = {
        country_id: countries.length > 0 ? String(countries[0].id) : '',
        agency_id: '',
        period_start: today,
        period_end: today,
        amount: '',
        platform: 'meta',
    };
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(blank);
    const [editingId, setEditingId] = useState<number | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const startEditing = (adSpend: AdSpend) => {
        clearErrors();
        setEditingId(adSpend.id);
        setData({
            country_id: String(adSpend.country_id),
            agency_id: adSpend.agency_id === null ? '' : String(adSpend.agency_id),
            period_start: adSpend.period_start,
            period_end: adSpend.period_end,
            amount: String(adSpend.amount),
            platform: adSpend.platform,
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const stopEditing = () => {
        setEditingId(null);
        clearErrors();
        setData(blank);
    };

    const agencies = countries.find((country) => String(country.id) === data.country_id)?.agencies ?? [];

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingId !== null) {
            put(route('ad-spends.update', editingId), { preserveScroll: true, onSuccess: stopEditing });

            return;
        }

        post(route('ad-spends.store'), { preserveScroll: true, onSuccess: () => reset('amount') });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pub" />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4 md:p-6">
                <FlashMessage />

                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Dépenses pub</h1>
                    <p className="text-muted-foreground text-sm">
                        Une pub payée pour tout le pays est partagée entre les agences selon leurs ventes. Choisissez une agence seulement si la pub
                        ne concerne qu'elle.
                    </p>
                </div>

                {countries.length === 0 ? (
                    <p className="glass text-muted-foreground rounded-2xl p-6 text-sm">
                        Ajoutez d'abord un pays dans le{' '}
                        <Link href={route('reference.index')} className="underline">
                            référentiel
                        </Link>
                        .
                    </p>
                ) : (
                    <form
                        ref={formRef}
                        onSubmit={submit}
                        className={`glass grid scroll-mt-4 gap-4 rounded-2xl p-5 transition-shadow sm:grid-cols-2 md:p-6 ${editingId !== null ? 'ring-primary/50 ring-2' : ''}`}
                    >
                        {editingId !== null && <p className="text-primary text-sm font-semibold sm:col-span-2">Modification d'une dépense</p>}
                        <div className="grid gap-2">
                            <Label htmlFor="country_id">Pays</Label>
                            <NativeSelect
                                id="country_id"
                                value={data.country_id}
                                onChange={(e) => setData((current) => ({ ...current, country_id: e.target.value, agency_id: '' }))}
                            >
                                {countries.map((country) => (
                                    <option key={country.id} value={country.id}>
                                        {country.name}
                                    </option>
                                ))}
                            </NativeSelect>
                            <InputError message={errors.country_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="agency_id">Agence</Label>
                            <NativeSelect id="agency_id" value={data.agency_id} onChange={(e) => setData('agency_id', e.target.value)}>
                                <option value="">Toutes les agences du pays</option>
                                {agencies.map((agency) => (
                                    <option key={agency.id} value={agency.id}>
                                        {agency.name}
                                    </option>
                                ))}
                            </NativeSelect>
                            <InputError message={errors.agency_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="period_start">Du</Label>
                            <Input
                                id="period_start"
                                type="date"
                                value={data.period_start}
                                onChange={(e) => setData('period_start', e.target.value)}
                            />
                            <InputError message={errors.period_start} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="period_end">Au</Label>
                            <Input id="period_end" type="date" value={data.period_end} onChange={(e) => setData('period_end', e.target.value)} />
                            <InputError message={errors.period_end} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="amount">Montant dépensé (F)</Label>
                            <Input
                                id="amount"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                placeholder="0"
                            />
                            <InputError message={errors.amount} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="platform">Plateforme</Label>
                            <NativeSelect id="platform" value={data.platform} onChange={(e) => setData('platform', e.target.value)}>
                                {platforms.map((platform) => (
                                    <option key={platform} value={platform}>
                                        {platformLabels[platform] ?? platform}
                                    </option>
                                ))}
                            </NativeSelect>
                            <InputError message={errors.platform} />
                        </div>

                        <div className="flex gap-2 sm:col-span-2">
                            <Button type="submit" disabled={processing}>
                                {editingId !== null ? 'Enregistrer les modifications' : 'Enregistrer la dépense'}
                            </Button>
                            {editingId !== null && (
                                <Button type="button" variant="ghost" onClick={stopEditing}>
                                    Annuler
                                </Button>
                            )}
                        </div>
                    </form>
                )}

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">Dernières dépenses</h2>
                    {adSpends.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Aucune dépense pub enregistrée.</p>
                    ) : (
                        <div className="glass overflow-x-auto rounded-2xl">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead className="bg-primary/8 text-left">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 font-semibold">
                                            Dates
                                        </th>
                                        <th scope="col" className="px-3 py-3 font-semibold">
                                            Pays
                                        </th>
                                        <th scope="col" className="px-3 py-3 font-semibold">
                                            Agence
                                        </th>
                                        <th scope="col" className="px-3 py-3 font-semibold">
                                            Plateforme
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right font-semibold">
                                            Montant (F)
                                        </th>
                                        <th scope="col" className="w-20 px-2 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adSpends.map((adSpend) => (
                                        <tr key={adSpend.id} className="border-t">
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                {formatPeriod(adSpend.period_start, adSpend.period_end)}
                                            </td>
                                            <td className="px-3 py-2.5">{adSpend.country}</td>
                                            <td className="px-3 py-2.5">{adSpend.agency ?? 'Toutes'}</td>
                                            <td className="px-3 py-2.5">{platformLabels[adSpend.platform] ?? adSpend.platform}</td>
                                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatNumber(adSpend.amount)}</td>
                                            <td className="px-2 py-1.5">
                                                <div className="flex justify-end">
                                                    <EditButton
                                                        label="Modifier cette dépense"
                                                        active={editingId === adSpend.id}
                                                        onClick={() => (editingId === adSpend.id ? stopEditing() : startEditing(adSpend))}
                                                    />
                                                    <DeleteButton
                                                        label="Supprimer cette dépense"
                                                        title="Supprimer cette dépense pub ?"
                                                        description={`${formatNumber(adSpend.amount)} F, ${formatPeriod(adSpend.period_start, adSpend.period_end)}. Le bénéfice de la période sera recalculé.`}
                                                        url={route('ad-spends.destroy', adSpend.id)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
