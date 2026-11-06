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
import { LoaderCircle, Megaphone } from 'lucide-react';
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

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dépenses publicitaires', href: '/pub' }];

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
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        formRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
        formRef.current?.querySelector<HTMLElement>('#amount')?.focus({ preventScroll: true });
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
            <Head title="Dépenses publicitaires" />

            <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
                <FlashMessage />

                <div className="space-y-1">
                    <h1 className="text-[28px] font-bold md:text-[32px]">Dépenses publicitaires</h1>
                    <p className="text-muted-foreground text-[15px]">Ce que vous payez sur Facebook ou TikTok, déduit de votre bénéfice.</p>
                </div>

                {countries.length === 0 ? (
                    <div className="glass space-y-3 rounded-2xl p-6 text-sm">
                        <p className="font-semibold">Ajoutez d'abord un pays de vente</p>
                        <p className="text-muted-foreground">Une dépense publicitaire est toujours rattachée au pays où la publicité est diffusée.</p>
                        <Button asChild size="sm">
                            <Link href={route('reference.index')}>Ajouter un pays</Link>
                        </Button>
                    </div>
                ) : (
                    <form
                        ref={formRef}
                        onSubmit={submit}
                        aria-labelledby="ad-form-title"
                        className={`glass grid scroll-mt-4 gap-4 rounded-2xl p-5 transition-shadow sm:grid-cols-2 md:p-6 ${editingId !== null ? 'ring-primary/50 ring-2' : ''}`}
                    >
                        <h2 id="ad-form-title" className="text-base font-semibold sm:col-span-2">
                            {editingId !== null ? 'Modifier une dépense' : 'Ajouter une dépense'}
                        </h2>
                        <div className="grid gap-2">
                            <Label htmlFor="country_id">Pays où la publicité est diffusée *</Label>
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
                            <Label htmlFor="agency_id">Pour quelle agence ?</Label>
                            <NativeSelect
                                id="agency_id"
                                aria-describedby="agency-help"
                                value={data.agency_id}
                                onChange={(e) => setData('agency_id', e.target.value)}
                            >
                                <option value="">Toutes les agences du pays (répartie)</option>
                                {agencies.map((agency) => (
                                    <option key={agency.id} value={agency.id}>
                                        {agency.name}
                                    </option>
                                ))}
                            </NativeSelect>
                            <p id="agency-help" className="text-muted-foreground text-xs">
                                Choisissez une agence seulement si la publicité ne concerne que sa ville.
                            </p>
                            <InputError message={errors.agency_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="period_start">Du *</Label>
                            <Input
                                id="period_start"
                                type="date"
                                required
                                value={data.period_start}
                                onChange={(e) => setData('period_start', e.target.value)}
                            />
                            <InputError message={errors.period_start} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="period_end">Au *</Label>
                            <Input
                                id="period_end"
                                type="date"
                                required
                                min={data.period_start}
                                value={data.period_end}
                                onChange={(e) => setData('period_end', e.target.value)}
                            />
                            <InputError message={errors.period_end} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="amount">Montant dépensé (F CFA) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                required
                                aria-describedby="amount-help"
                                inputMode="numeric"
                                min={1}
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                placeholder="0"
                            />
                            <p id="amount-help" className="text-muted-foreground text-xs">
                                Le montant réellement débité, converti en francs CFA.
                            </p>
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
                                {processing && <LoaderCircle className="animate-spin" aria-hidden="true" />}
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

                <section aria-labelledby="ad-list-title" className="space-y-3">
                    <h2 id="ad-list-title" className="text-lg font-semibold">
                        Dernières dépenses
                    </h2>
                    {adSpends.length === 0 ? (
                        <div className="glass text-muted-foreground flex items-center gap-3 rounded-2xl p-6 text-sm">
                            <Megaphone className="text-primary size-5 shrink-0" aria-hidden="true" />
                            Aucune dépense pour l'instant. Sans dépense publicitaire, votre bénéfice paraîtra plus élevé qu'il n'est.
                        </div>
                    ) : (
                        <div className="glass overflow-x-auto rounded-2xl">
                            <table className="w-full min-w-[640px] text-sm">
                                <caption className="sr-only">Dernières dépenses publicitaires</caption>
                                <thead className="bg-primary/8 text-left">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 font-semibold">
                                            Période
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
                                            <td className="px-3 py-2.5">{adSpend.agency ?? 'Toutes (répartie)'}</td>
                                            <td className="px-3 py-2.5">{platformLabels[adSpend.platform] ?? adSpend.platform}</td>
                                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatNumber(adSpend.amount)}</td>
                                            <td className="px-2 py-1.5">
                                                <div className="flex justify-end">
                                                    <EditButton
                                                        label={`Modifier la dépense du ${formatPeriod(adSpend.period_start, adSpend.period_end)}`}
                                                        active={editingId === adSpend.id}
                                                        onClick={() => (editingId === adSpend.id ? stopEditing() : startEditing(adSpend))}
                                                    />
                                                    <DeleteButton
                                                        label={`Supprimer la dépense du ${formatPeriod(adSpend.period_start, adSpend.period_end)}`}
                                                        title="Supprimer cette dépense publicitaire ?"
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
