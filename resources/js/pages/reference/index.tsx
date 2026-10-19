import FlashMessage from '@/components/flash-message';
import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa, formatShortDate } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Agency {
    id: number;
    name: string;
    contact: string | null;
    alert_after_days: number;
    last_report_at: string | null;
    is_late: boolean;
}

interface Country {
    id: number;
    name: string;
    code: string;
    agencies: Agency[];
}

interface Product {
    id: number;
    name: string;
    reference_price: number | null;
    unit_cost: number | null;
}

interface Props {
    countries: Country[];
    products: Product[];
    today: string;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Référentiel', href: '/referentiel' }];

export default function ReferenceIndex({ countries, products, today }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Référentiel" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-4 md:p-6">
                <FlashMessage />

                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Référentiel</h1>
                    <p className="text-muted-foreground text-sm">
                        Vos pays, agences et produits. On les ajoute une fois, puis tous les rapports s'appuient dessus.
                    </p>
                </div>

                <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Pays et agences</h2>
                        {countries.length === 0 && <p className="text-muted-foreground text-sm">Aucun pays pour l'instant.</p>}
                        {countries.map((country) => (
                            <div key={country.id} className="glass rounded-2xl">
                                <div className="bg-primary/8 flex items-center justify-between rounded-t-2xl px-4 py-3">
                                    <h3 className="font-semibold">{country.name}</h3>
                                    <span className="text-muted-foreground text-sm">{country.code}</span>
                                </div>
                                {country.agencies.length === 0 ? (
                                    <p className="text-muted-foreground px-4 py-3 text-sm">Aucune agence.</p>
                                ) : (
                                    <ul className="divide-y">
                                        {country.agencies.map((agency) => (
                                            <li key={agency.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                                                <div>
                                                    <p className="font-semibold">{agency.name}</p>
                                                    {agency.contact && <p className="text-muted-foreground">{agency.contact}</p>}
                                                </div>
                                                <p className={agency.is_late ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                                                    {agency.last_report_at
                                                        ? `Dernier rapport le ${formatShortDate(agency.last_report_at)}${agency.is_late ? ' : en retard' : ''}`
                                                        : 'Aucun rapport reçu'}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-6">
                        <CountryForm />
                        {countries.length > 0 && <AgencyForm countries={countries} />}
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Produits et coûts d'achat</h2>
                        {products.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Aucun produit pour l'instant.</p>
                        ) : (
                            <ul className="glass divide-y rounded-2xl">
                                {products.map((product) => (
                                    <ProductRow key={product.id} product={product} today={today} />
                                ))}
                            </ul>
                        )}
                    </div>

                    <ProductForm today={today} />
                </section>
            </div>
        </AppLayout>
    );
}

function CountryForm() {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '', code: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('reference.countries.store'), { preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-4">
            <h3 className="font-semibold">Ajouter un pays</h3>
            <div className="grid grid-cols-[1fr_5rem] gap-3">
                <div className="grid gap-1">
                    <Label htmlFor="country-name">Nom</Label>
                    <Input id="country-name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Nom du pays" />
                    <InputError message={errors.name} />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="country-code">Code</Label>
                    <Input
                        id="country-code"
                        maxLength={2}
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                        placeholder="Code"
                    />
                    <InputError message={errors.code} />
                </div>
            </div>
            <Button type="submit" size="sm" disabled={processing}>
                Ajouter le pays
            </Button>
        </form>
    );
}

function AgencyForm({ countries }: { countries: Country[] }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        country_id: String(countries[0].id),
        name: '',
        contact: '',
        alert_after_days: '2',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('reference.agencies.store'), { preserveScroll: true, onSuccess: () => reset('name', 'contact') });
    };

    return (
        <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-4">
            <h3 className="font-semibold">Ajouter une agence</h3>
            <div className="grid gap-1">
                <Label htmlFor="agency-country">Pays</Label>
                <NativeSelect id="agency-country" value={data.country_id} onChange={(e) => setData('country_id', e.target.value)}>
                    {countries.map((country) => (
                        <option key={country.id} value={country.id}>
                            {country.name}
                        </option>
                    ))}
                </NativeSelect>
                <InputError message={errors.country_id} />
            </div>
            <div className="grid gap-1">
                <Label htmlFor="agency-name">Nom</Label>
                <Input id="agency-name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Agence 1" />
                <InputError message={errors.name} />
            </div>
            <div className="grid grid-cols-[1fr_7rem] gap-3">
                <div className="grid gap-1">
                    <Label htmlFor="agency-contact">Contact</Label>
                    <Input
                        id="agency-contact"
                        value={data.contact}
                        onChange={(e) => setData('contact', e.target.value)}
                        placeholder="Téléphone WhatsApp"
                    />
                    <InputError message={errors.contact} />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="agency-alert">Alerte après (jours)</Label>
                    <Input
                        id="agency-alert"
                        type="number"
                        min={1}
                        max={30}
                        value={data.alert_after_days}
                        onChange={(e) => setData('alert_after_days', e.target.value)}
                    />
                    <InputError message={errors.alert_after_days} />
                </div>
            </div>
            <Button type="submit" size="sm" disabled={processing}>
                Ajouter l'agence
            </Button>
        </form>
    );
}

function ProductForm({ today }: { today: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        reference_price: '',
        unit_cost: '',
        valid_from: today,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('reference.products.store'), { preserveScroll: true, onSuccess: () => reset('name', 'reference_price', 'unit_cost') });
    };

    return (
        <form onSubmit={submit} className="glass space-y-3 self-start rounded-2xl p-4">
            <h3 className="font-semibold">Ajouter un produit</h3>
            <div className="grid gap-1">
                <Label htmlFor="product-name">Nom</Label>
                <Input id="product-name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Produit 1" />
                <InputError message={errors.name} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                    <Label htmlFor="product-cost">Coût d'achat (F)</Label>
                    <Input
                        id="product-cost"
                        type="number"
                        min={0}
                        value={data.unit_cost}
                        onChange={(e) => setData('unit_cost', e.target.value)}
                        placeholder="0"
                    />
                    <InputError message={errors.unit_cost} />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="product-price">Prix de vente (F)</Label>
                    <Input
                        id="product-price"
                        type="number"
                        min={0}
                        value={data.reference_price}
                        onChange={(e) => setData('reference_price', e.target.value)}
                        placeholder="0"
                    />
                    <InputError message={errors.reference_price} />
                </div>
            </div>
            <div className="grid gap-1">
                <Label htmlFor="product-from">Coût valable à partir du</Label>
                <Input id="product-from" type="date" value={data.valid_from} onChange={(e) => setData('valid_from', e.target.value)} />
                <InputError message={errors.valid_from} />
            </div>
            <Button type="submit" size="sm" disabled={processing}>
                Ajouter le produit
            </Button>
        </form>
    );
}

function ProductRow({ product, today }: { product: Product; today: string }) {
    const [editing, setEditing] = useState(false);
    const { data, setData, post, processing, errors } = useForm({ unit_cost: '', valid_from: today });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('reference.products.costs.store', product.id), { preserveScroll: true, onSuccess: () => setEditing(false) });
    };

    return (
        <li className="space-y-3 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{product.name}</p>
                <div className="flex items-center gap-3">
                    <span>
                        Coût <strong className="tabular-nums">{product.unit_cost === null ? 'non renseigné' : formatFcfa(product.unit_cost)}</strong>
                        {product.reference_price !== null && (
                            <>
                                , vente <strong className="tabular-nums">{formatFcfa(product.reference_price)}</strong>
                            </>
                        )}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(!editing)} aria-expanded={editing}>
                        Changer le coût
                    </Button>
                </div>
            </div>
            {editing && (
                <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-1">
                        <Label htmlFor={`cost-${product.id}`}>Nouveau coût (F)</Label>
                        <Input
                            id={`cost-${product.id}`}
                            type="number"
                            min={0}
                            className="w-32"
                            value={data.unit_cost}
                            onChange={(e) => setData('unit_cost', e.target.value)}
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor={`cost-from-${product.id}`}>À partir du</Label>
                        <Input
                            id={`cost-from-${product.id}`}
                            type="date"
                            value={data.valid_from}
                            onChange={(e) => setData('valid_from', e.target.value)}
                        />
                    </div>
                    <Button type="submit" size="sm" disabled={processing}>
                        Enregistrer
                    </Button>
                    <InputError message={errors.unit_cost ?? errors.valid_from} className="w-full" />
                    <p className="text-muted-foreground w-full text-xs">Les rapports déjà saisis gardent l'ancien coût.</p>
                </form>
            )}
        </li>
    );
}
