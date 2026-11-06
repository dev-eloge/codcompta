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
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
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

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pays, agences et produits', href: '/referentiel' }];

export default function ReferenceIndex({ countries, products, today }: Props) {
    const agencyCount = countries.reduce((sum, country) => sum + country.agencies.length, 0);
    const steps = [
        { label: 'Un pays de vente', done: countries.length > 0 },
        { label: 'Une agence de livraison', done: agencyCount > 0 },
        { label: "Un produit avec son prix d'achat", done: products.some((product) => product.unit_cost !== null) },
    ];
    const ready = steps.every((step) => step.done);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pays, agences et produits" />

            <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
                <FlashMessage />

                <h1 className="text-[28px] font-bold md:text-[32px]">Pays, agences et produits</h1>

                {!ready && (
                    <section aria-labelledby="setup-title" className="glass space-y-3 rounded-2xl p-5">
                        <h2 id="setup-title" className="text-base font-semibold">
                            Pour commencer, il vous faut au minimum :
                        </h2>
                        <ol className="grid gap-2 text-sm sm:grid-cols-3">
                            {steps.map((step, index) => (
                                <li key={step.label} className="flex items-center gap-2">
                                    {step.done ? (
                                        <CircleCheck className="text-primary size-5 shrink-0" aria-hidden="true" />
                                    ) : (
                                        <span
                                            aria-hidden="true"
                                            className="border-muted-foreground/50 text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
                                        >
                                            {index + 1}
                                        </span>
                                    )}
                                    <span className={step.done ? 'text-muted-foreground line-through' : 'font-medium'}>{step.label}</span>
                                    <span className="sr-only">{step.done ? ' : fait' : ' : à faire'}</span>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                <section aria-labelledby="countries-title" className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 id="countries-title" className="text-lg font-semibold">
                                Pays et agences de livraison
                            </h2>
                        </div>
                        {countries.length === 0 && (
                            <p className="glass text-muted-foreground rounded-2xl p-5 text-sm">
                                Aucun pays pour l'instant. Ajoutez votre premier pays de vente avec le formulaire.
                            </p>
                        )}
                        {countries.map((country) => (
                            <CountryCard key={country.id} country={country} countries={countries} />
                        ))}
                    </div>

                    <div className="space-y-6">
                        <CountryForm />
                        {countries.length > 0 && <AgencyForm countries={countries} />}
                    </div>
                </section>

                <section aria-labelledby="products-title" className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 id="products-title" className="text-lg font-semibold">
                                Produits et prix d'achat
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                Le prix d'achat (fournisseur, transport compris) sert à calculer votre vrai bénéfice. S'il change, ajoutez le nouveau
                                prix : les anciens rapports gardent l'ancien.
                            </p>
                        </div>
                        {products.length === 0 ? (
                            <p className="glass text-muted-foreground rounded-2xl p-5 text-sm">
                                Aucun produit pour l'instant. Ajoutez vos produits avec le formulaire.
                            </p>
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
            <div className="grid grid-cols-[1fr_6rem] gap-3">
                <div className="grid gap-1">
                    <Label htmlFor="country-name">Nom du pays *</Label>
                    <Input id="country-name" required value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Togo" />
                    <InputError message={errors.name} />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="country-code">Code *</Label>
                    <Input
                        id="country-code"
                        required
                        maxLength={2}
                        autoCapitalize="characters"
                        aria-describedby="country-code-help"
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                        placeholder="TG"
                    />
                    <InputError message={errors.code} />
                </div>
            </div>
            <p id="country-code-help" className="text-muted-foreground text-xs">
                Le code à 2 lettres du pays : TG, SN, CI, BJ…
            </p>
            <Button type="submit" disabled={processing}>
                {processing && <LoaderCircle className="animate-spin" aria-hidden="true" />}
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
                <Label htmlFor="agency-country">Pays *</Label>
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
                <Label htmlFor="agency-name">Nom de l'agence *</Label>
                <Input id="agency-name" required value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Agence 1" />
                <InputError message={errors.name} />
            </div>
            <div className="grid gap-1">
                <Label htmlFor="agency-contact">Numéro WhatsApp (facultatif)</Label>
                <Input
                    id="agency-contact"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    value={data.contact}
                    onChange={(e) => setData('contact', e.target.value)}
                    placeholder="+228 90 00 00 00"
                />
                <InputError message={errors.contact} />
            </div>
            <div className="grid gap-1">
                <Label htmlFor="agency-alert">Me prévenir après combien de jours sans rapport ?</Label>
                <Input
                    id="agency-alert"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    className="w-28"
                    aria-describedby="agency-alert-help"
                    value={data.alert_after_days}
                    onChange={(e) => setData('alert_after_days', e.target.value)}
                />
                <p id="agency-alert-help" className="text-muted-foreground text-xs">
                    L'agence est marquée « en retard » si elle ne vous a rien envoyé depuis ce nombre de jours.
                </p>
                <InputError message={errors.alert_after_days} />
            </div>
            <Button type="submit" disabled={processing}>
                {processing && <LoaderCircle className="animate-spin" aria-hidden="true" />}
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
                <Label htmlFor="product-name">Nom du produit *</Label>
                <Input id="product-name" required value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Produit 1" />
                <InputError message={errors.name} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                    <Label htmlFor="product-cost">Prix d'achat (F) *</Label>
                    <Input
                        id="product-cost"
                        type="number"
                        inputMode="numeric"
                        required
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
                        inputMode="numeric"
                        aria-describedby="product-price-help"
                        min={0}
                        value={data.reference_price}
                        onChange={(e) => setData('reference_price', e.target.value)}
                        placeholder="0"
                    />
                    <p id="product-price-help" className="text-muted-foreground text-xs">
                        Remplit tout seul l'argent encaissé dans vos rapports.
                    </p>
                    <InputError message={errors.reference_price} />
                </div>
            </div>
            <div className="grid gap-1">
                <Label htmlFor="product-from">Prix d'achat valable à partir du</Label>
                <Input id="product-from" type="date" value={data.valid_from} onChange={(e) => setData('valid_from', e.target.value)} />
                <InputError message={errors.valid_from} />
            </div>
            <Button type="submit" disabled={processing}>
                {processing && <LoaderCircle className="animate-spin" aria-hidden="true" />}
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
                    <span className="text-muted-foreground ml-2 text-xs font-normal">{plural(country.agencies.length, 'agence')}</span>
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
                                ? `Seront aussi supprimés : ${consequences.join(', ')}. Les résultats de ce pays disparaîtront. Cette action est définitive.`
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
                <p className="text-muted-foreground px-4 py-3 text-sm">Aucune agence dans ce pays : ajoutez-en une avec le formulaire.</p>
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
                    <p className={agency.is_late ? 'text-danger-fg flex items-center gap-1 font-semibold' : 'text-muted-foreground'}>
                        {agency.is_late && <CircleAlert className="size-4" aria-hidden="true" />}
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
                            Numéro WhatsApp
                        </Label>
                        <Input
                            id={`agency-contact-${agency.id}`}
                            type="tel"
                            inputMode="tel"
                            value={data.contact}
                            onChange={(e) => setData('contact', e.target.value)}
                        />
                        <InputError message={errors.contact} />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor={`agency-alert-${agency.id}`} className="text-xs">
                            Prévenir après (jours sans rapport)
                        </Label>
                        <Input
                            id={`agency-alert-${agency.id}`}
                            type="number"
                            inputMode="numeric"
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
            <Button type="submit" disabled={processing}>
                {processing && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                Enregistrer
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
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
                        Achat{' '}
                        <strong className={product.unit_cost === null ? 'text-danger-fg' : 'tabular-nums'}>
                            {product.unit_cost === null ? 'à renseigner' : formatFcfa(product.unit_cost)}
                        </strong>
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
                        aria-controls={`costs-${product.id}`}
                    >
                        {mode === 'cost' ? 'Fermer' : "Changer le prix d'achat"}
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
                            Nom du produit
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
                            inputMode="numeric"
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
                <div id={`costs-${product.id}`} className="animate-in fade-in slide-in-from-top-1 space-y-3">
                    <p className="text-xs font-medium">Historique des prix d'achat</p>
                    <ul className="bg-muted/50 divide-y rounded-xl border">
                        {product.costs.map((entry) => (
                            <li key={entry.id} className="flex items-center justify-between gap-2 py-1 pr-1 pl-3">
                                <span>
                                    <strong className="tabular-nums">{formatFcfa(entry.unit_cost)}</strong>
                                    <span className="text-muted-foreground"> depuis le {formatShortDate(entry.valid_from)}</span>
                                </span>
                                {product.costs.length > 1 && (
                                    <DeleteButton
                                        label={`Supprimer le prix d'achat du ${formatShortDate(entry.valid_from)}`}
                                        title="Supprimer ce prix d'achat ?"
                                        description="Les rapports déjà enregistrés gardent le prix avec lequel ils ont été saisis. Les prochains rapports utiliseront le prix précédent."
                                        url={route('reference.products.costs.destroy', [product.id, entry.id])}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                    <form onSubmit={saveCost} className="flex flex-wrap items-end gap-3">
                        <div className="grid gap-1">
                            <Label htmlFor={`cost-${product.id}`} className="text-xs">
                                Nouveau prix d'achat (F)
                            </Label>
                            <Input
                                id={`cost-${product.id}`}
                                type="number"
                                inputMode="numeric"
                                required
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
                        <Button type="submit" disabled={cost.processing}>
                            {cost.processing && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                            Enregistrer ce prix
                        </Button>
                        <InputError message={cost.errors.unit_cost ?? cost.errors.valid_from} className="w-full" />
                        <p className="text-muted-foreground w-full text-xs">Les rapports déjà saisis gardent l'ancien prix.</p>
                    </form>
                </div>
            )}
        </li>
    );
}
