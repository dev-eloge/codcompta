import FlashMessage from '@/components/flash-message';
import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { DeleteButton, EditButton } from '@/components/row-actions';
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
    reports_count: number;
    contact: string | null;
    alert_after_days: number;
    last_report_at: string | null;
    is_late: boolean;
}

interface Country {
    id: number;
    name: string;
    code: string;
    ad_spends_count: number;
    reports_count: number;
    agencies: Agency[];
}

interface Product {
    id: number;
    name: string;
    reference_price: number | null;
    unit_cost: number | null;
    used_in_reports: number;
    costs: { id: number; unit_cost: number; valid_from: string }[];
}

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;

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
                            <CountryCard key={country.id} country={country} countries={countries} />
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

function CountryCard({ country, countries }: { country: Country; countries: Country[] }) {
    const [editing, setEditing] = useState(false);
    const { data, setData, put, processing, errors, reset } = useForm({ name: country.name, code: country.code });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('reference.countries.update', country.id), { preserveScroll: true, onSuccess: () => setEditing(false) });
    };

    const consequences = [
        country.agencies.length > 0 && plural(country.agencies.length, 'agence'),
        country.reports_count > 0 && plural(country.reports_count, 'rapport'),
        country.ad_spends_count > 0 && plural(country.ad_spends_count, 'dépense pub'),
    ].filter(Boolean);

    return (
        <div className="glass animate-in fade-in rounded-2xl duration-300">
            <div className="bg-primary/8 flex items-center justify-between gap-2 rounded-t-2xl py-2 pr-2 pl-4">
                <h3 className="font-semibold">
                    {country.name} <span className="text-muted-foreground ml-1 text-sm font-normal">{country.code}</span>
                </h3>
                <div className="flex items-center">
                    <EditButton
                        label={`Modifier le pays ${country.name}`}
                        active={editing}
                        onClick={() => {
                            reset();
                            setEditing(!editing);
                        }}
                    />
                    <DeleteButton
                        label={`Supprimer le pays ${country.name}`}
                        title={`Supprimer ${country.name} ?`}
                        description={
                            consequences.length > 0
                                ? `Seront aussi supprimés : ${consequences.join(', ')}. Les bénéfices déjà calculés pour ce pays disparaîtront. Cette action est définitive.`
                                : 'Ce pays est vide. Cette action est définitive.'
                        }
                        url={route('reference.countries.destroy', country.id)}
                    />
                </div>
            </div>
            {editing && (
                <form onSubmit={submit} className="grid grid-cols-[1fr_5rem_auto] items-start gap-3 border-b px-4 py-3">
                    <div className="grid gap-1">
                        <Label htmlFor={`country-name-${country.id}`} className="text-xs">
                            Nom
                        </Label>
                        <Input id={`country-name-${country.id}`} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor={`country-code-${country.id}`} className="text-xs">
                            Code
                        </Label>
                        <Input
                            id={`country-code-${country.id}`}
                            maxLength={2}
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value.toUpperCase())}
                        />
                        <InputError message={errors.code} />
                    </div>
                    <EditActions processing={processing} onCancel={() => setEditing(false)} />
                </form>
            )}
            {country.agencies.length === 0 ? (
                <p className="text-muted-foreground px-4 py-3 text-sm">Aucune agence.</p>
            ) : (
                <ul className="divide-y">
                    {country.agencies.map((agency) => (
                        <AgencyRow key={agency.id} agency={agency} countryId={country.id} countries={countries} />
                    ))}
                </ul>
            )}
        </div>
    );
}

function AgencyRow({ agency, countryId, countries }: { agency: Agency; countryId: number; countries: Country[] }) {
    const [editing, setEditing] = useState(false);
    const { data, setData, put, processing, errors, reset } = useForm({
        country_id: String(countryId),
        name: agency.name,
        contact: agency.contact ?? '',
        alert_after_days: String(agency.alert_after_days),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('reference.agencies.update', agency.id), { preserveScroll: true, onSuccess: () => setEditing(false) });
    };

    return (
        <li className="px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="font-semibold">{agency.name}</p>
                    {agency.contact && <p className="text-muted-foreground">{agency.contact}</p>}
                </div>
                <div className="flex items-center gap-2">
                    <p className={agency.is_late ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                        {agency.last_report_at
                            ? `Dernier rapport le ${formatShortDate(agency.last_report_at)}${agency.is_late ? ' : en retard' : ''}`
                            : 'Aucun rapport reçu'}
                    </p>
                    <EditButton
                        label={`Modifier l'agence ${agency.name}`}
                        active={editing}
                        onClick={() => {
                            reset();
                            setEditing(!editing);
                        }}
                    />
                    <DeleteButton
                        label={`Supprimer l'agence ${agency.name}`}
                        title={`Supprimer ${agency.name} ?`}
                        description={
                            agency.reports_count > 0
                                ? `${agency.reports_count === 1 ? 'Son rapport' : `Ses ${agency.reports_count} rapports`} et ses messages collés seront aussi supprimés, et les totaux du pays changeront. Cette action est définitive.`
                                : "Cette agence n'a aucun rapport. Cette action est définitive."
                        }
                        url={route('reference.agencies.destroy', agency.id)}
                    />
                </div>
            </div>
            {editing && (
                <form onSubmit={submit} className="animate-in fade-in slide-in-from-top-1 mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1">
                        <Label htmlFor={`agency-name-${agency.id}`} className="text-xs">
                            Nom
                        </Label>
                        <Input id={`agency-name-${agency.id}`} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor={`agency-country-${agency.id}`} className="text-xs">
                            Pays
                        </Label>
                        <NativeSelect
                            id={`agency-country-${agency.id}`}
                            value={data.country_id}
                            onChange={(e) => setData('country_id', e.target.value)}
                        >
                            {countries.map((country) => (
                                <option key={country.id} value={country.id}>
                                    {country.name}
                                </option>
                            ))}
                        </NativeSelect>
                        <InputError message={errors.country_id} />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor={`agency-contact-${agency.id}`} className="text-xs">
                            Contact
                        </Label>
                        <Input id={`agency-contact-${agency.id}`} value={data.contact} onChange={(e) => setData('contact', e.target.value)} />
                        <InputError message={errors.contact} />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor={`agency-alert-${agency.id}`} className="text-xs">
                            Alerte après (jours)
                        </Label>
                        <Input
                            id={`agency-alert-${agency.id}`}
                            type="number"
                            min={1}
                            max={30}
                            value={data.alert_after_days}
                            onChange={(e) => setData('alert_after_days', e.target.value)}
                        />
                        <InputError message={errors.alert_after_days} />
                    </div>
                    <div className="sm:col-span-2">
                        <EditActions processing={processing} onCancel={() => setEditing(false)} />
                    </div>
                </form>
            )}
        </li>
    );
}

function EditActions({ processing, onCancel }: { processing: boolean; onCancel: () => void }) {
    return (
        <div className="flex gap-2 self-end">
            <Button type="submit" size="sm" disabled={processing}>
                Enregistrer
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
                Annuler
            </Button>
        </div>
    );
}

function ProductRow({ product, today }: { product: Product; today: string }) {
    const [mode, setMode] = useState<'view' | 'edit' | 'cost'>('view');
    const details = useForm({ name: product.name, reference_price: product.reference_price === null ? '' : String(product.reference_price) });
    const cost = useForm({ unit_cost: '', valid_from: today });

    const saveDetails: FormEventHandler = (e) => {
        e.preventDefault();
        details.put(route('reference.products.update', product.id), { preserveScroll: true, onSuccess: () => setMode('view') });
    };

    const saveCost: FormEventHandler = (e) => {
        e.preventDefault();
        cost.post(route('reference.products.costs.store', product.id), {
            preserveScroll: true,
            onSuccess: () => {
                cost.reset('unit_cost');
                setMode('view');
            },
        });
    };

    return (
        <li className="space-y-3 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{product.name}</p>
                <div className="flex items-center gap-2">
                    <span>
                        Coût <strong className="tabular-nums">{product.unit_cost === null ? 'non renseigné' : formatFcfa(product.unit_cost)}</strong>
                        {product.reference_price !== null && (
                            <>
                                , vente <strong className="tabular-nums">{formatFcfa(product.reference_price)}</strong>
                            </>
                        )}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMode(mode === 'cost' ? 'view' : 'cost')}
                        aria-expanded={mode === 'cost'}
                    >
                        Coûts
                    </Button>
                    <EditButton
                        label={`Modifier le produit ${product.name}`}
                        active={mode === 'edit'}
                        onClick={() => {
                            details.reset();
                            setMode(mode === 'edit' ? 'view' : 'edit');
                        }}
                    />
                    <DeleteButton
                        label={`Supprimer le produit ${product.name}`}
                        title={`Supprimer ${product.name} ?`}
                        description={
                            product.used_in_reports > 0
                                ? `Ce produit apparaît dans ${plural(product.used_in_reports, 'ligne')} de rapport : il ne pourra pas être supprimé tant que ces rapports existent.`
                                : 'Ce produit et son historique de coûts seront supprimés. Cette action est définitive.'
                        }
                        url={route('reference.products.destroy', product.id)}
                    />
                </div>
            </div>

            {mode === 'edit' && (
                <form onSubmit={saveDetails} className="animate-in fade-in slide-in-from-top-1 grid gap-3 sm:grid-cols-[1fr_9rem_auto]">
                    <div className="grid gap-1">
                        <Label htmlFor={`product-name-${product.id}`} className="text-xs">
                            Nom
                        </Label>
                        <Input
                            id={`product-name-${product.id}`}
                            value={details.data.name}
                            onChange={(e) => details.setData('name', e.target.value)}
                        />
                        <InputError message={details.errors.name} />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor={`product-price-${product.id}`} className="text-xs">
                            Prix de vente (F)
                        </Label>
                        <Input
                            id={`product-price-${product.id}`}
                            type="number"
                            min={0}
                            value={details.data.reference_price}
                            onChange={(e) => details.setData('reference_price', e.target.value)}
                        />
                        <InputError message={details.errors.reference_price} />
                    </div>
                    <EditActions processing={details.processing} onCancel={() => setMode('view')} />
                </form>
            )}

            {mode === 'cost' && (
                <div className="animate-in fade-in slide-in-from-top-1 space-y-3">
                    <ul className="bg-background/60 divide-y rounded-xl border">
                        {product.costs.map((entry) => (
                            <li key={entry.id} className="flex items-center justify-between gap-2 py-1 pr-1 pl-3">
                                <span>
                                    <strong className="tabular-nums">{formatFcfa(entry.unit_cost)}</strong>
                                    <span className="text-muted-foreground"> depuis le {formatShortDate(entry.valid_from)}</span>
                                </span>
                                {product.costs.length > 1 && (
                                    <DeleteButton
                                        label={`Supprimer le coût du ${formatShortDate(entry.valid_from)}`}
                                        title="Supprimer ce coût d'achat ?"
                                        description="Les rapports déjà enregistrés gardent le coût avec lequel ils ont été saisis. Les prochains rapports utiliseront le coût précédent."
                                        url={route('reference.products.costs.destroy', [product.id, entry.id])}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                    <form onSubmit={saveCost} className="flex flex-wrap items-end gap-3">
                        <div className="grid gap-1">
                            <Label htmlFor={`cost-${product.id}`} className="text-xs">
                                Nouveau coût (F)
                            </Label>
                            <Input
                                id={`cost-${product.id}`}
                                type="number"
                                min={0}
                                className="w-32"
                                value={cost.data.unit_cost}
                                onChange={(e) => cost.setData('unit_cost', e.target.value)}
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor={`cost-from-${product.id}`} className="text-xs">
                                À partir du
                            </Label>
                            <Input
                                id={`cost-from-${product.id}`}
                                type="date"
                                value={cost.data.valid_from}
                                onChange={(e) => cost.setData('valid_from', e.target.value)}
                            />
                        </div>
                        <Button type="submit" size="sm" disabled={cost.processing}>
                            Ajouter ce coût
                        </Button>
                        <InputError message={cost.errors.unit_cost ?? cost.errors.valid_from} className="w-full" />
                        <p className="text-muted-foreground w-full text-xs">Les rapports déjà saisis gardent l'ancien coût.</p>
                    </form>
                </div>
            )}
        </li>
    );
}
