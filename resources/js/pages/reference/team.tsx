import FlashMessage from '@/components/flash-message';
import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { ChoiceCard } from '@/components/report-form/fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa } from '@/lib/format';
import { amountLabels, closerPayLabels, courierPayLabels, type TeamMember } from '@/lib/team-pay';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Info, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler } from 'react';

type DeliveryMode = 'agency' | 'team' | 'both';

interface Props {
    country: { id: number; name: string; delivery_mode: DeliveryMode; bike_rent: number; phone_credit: number; storage_rent: number };
    couriers: TeamMember[];
    closers: TeamMember[];
}

type MemberRow = { id: number | null; name: string; pay_mode: string; pay_amount: string };

type TeamForm = {
    delivery_mode: DeliveryMode;
    couriers: MemberRow[];
    closers: MemberRow[];
    bike_rent: string;
    phone_credit: string;
    storage_rent: string;
};

const deliveryChoices: { value: DeliveryMode; title: string; help: string }[] = [
    { value: 'agency', title: 'Agence de livraison', help: 'Elle garde le stock, livre et vous envoie son rapport.' },
    { value: 'team', title: 'Équipe interne', help: 'Vos livreurs, payés par vous. Vous gardez le stock.' },
    { value: 'both', title: 'Agence et équipe interne', help: 'Une partie par vos livreurs, une partie par une agence.' },
];

const toRow = (member: TeamMember): MemberRow => ({
    id: member.id,
    name: member.name,
    pay_mode: member.pay_mode,
    pay_amount: String(member.pay_amount),
});
const money = (value: number) => (value === 0 ? '' : String(value));
const toNumber = (value: string) => (value === '' ? 0 : Number(value));

export default function Team({ country, couriers, closers }: Props) {
    const title = `${country.name} : livraison`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Pays, livraison et produits', href: '/referentiel' },
        { title, href: `/referentiel/pays/${country.id}/equipe` },
    ];

    const { data, setData, put, processing, errors } = useForm<TeamForm>({
        delivery_mode: country.delivery_mode,
        couriers: couriers.map(toRow),
        closers: closers.map(toRow),
        bike_rent: money(country.bike_rent),
        phone_credit: money(country.phone_credit),
        storage_rent: money(country.storage_rent),
    });
    const fieldError = (key: string) => (errors as Record<string, string | undefined>)[key];

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('reference.team.update', country.id), { preserveScroll: true });
    };

    const monthly =
        [...data.couriers, ...data.closers].filter((row) => row.pay_mode === 'monthly').reduce((sum, row) => sum + toNumber(row.pay_amount), 0) +
        toNumber(data.bike_rent) +
        toNumber(data.phone_credit) +
        toNumber(data.storage_rent);
    const hasTeam = data.delivery_mode !== 'agency';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <form onSubmit={submit} className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
                <FlashMessage />
                <div className="space-y-1">
                    <h1 className="text-[28px] font-bold md:text-[32px]">{title}</h1>
                </div>

                <section className="glass rounded-2xl p-5 md:p-6">
                    <fieldset className="flex flex-col gap-3">
                        <legend className="mb-3 text-lg font-bold">Mode de livraison</legend>
                        <div className="grid gap-3 md:grid-cols-3">
                            {deliveryChoices.map((choice) => (
                                <ChoiceCard
                                    key={choice.value}
                                    name="delivery_mode"
                                    checked={data.delivery_mode === choice.value}
                                    onSelect={() => setData('delivery_mode', choice.value)}
                                    title={choice.title}
                                    help={choice.help}
                                />
                            ))}
                        </div>
                        <InputError message={errors.delivery_mode} />
                    </fieldset>
                </section>

                {hasTeam && (
                    <>
                        <MembersSection
                            kind="couriers"
                            title="Mes livreurs"
                            countLabel={(n) => `${n} livreur${n > 1 ? 's' : ''}`}
                            payLabel="Comment il est payé"
                            payModes={courierPayLabels}
                            defaultPayMode="per_delivery"
                            addLabel="Ajouter un livreur"
                            placeholder="Livreur 1"
                            rows={data.couriers}
                            onChange={(rows) => setData('couriers', rows)}
                            fieldError={fieldError}
                        />
                        <MembersSection
                            kind="closers"
                            title="Mes closeuses"
                            help="Elles appellent les clients et confirment les commandes."
                            countLabel={(n) => `${n} closeuse${n > 1 ? 's' : ''}`}
                            payLabel="Comment elle est payée"
                            payModes={closerPayLabels}
                            defaultPayMode="per_delivered_order"
                            addLabel="Ajouter une closeuse"
                            placeholder="Closeuse 1"
                            rows={data.closers}
                            onChange={(rows) => setData('closers', rows)}
                            fieldError={fieldError}
                        />

                        <section aria-labelledby="fixed-title" className="glass flex flex-col gap-4 rounded-2xl p-5 md:p-6">
                            <div>
                                <h2 id="fixed-title" className="text-lg font-bold">
                                    Frais fixes du mois
                                </h2>
                                <p className="text-muted-foreground text-sm">Ce que vous payez chaque mois, même sans livraison.</p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-3">
                                <MoneyInput
                                    id="bike_rent"
                                    label="Location moto (F)"
                                    value={data.bike_rent}
                                    error={errors.bike_rent}
                                    onChange={(v) => setData('bike_rent', v)}
                                />
                                <MoneyInput
                                    id="phone_credit"
                                    label="Crédit téléphone (F)"
                                    value={data.phone_credit}
                                    error={errors.phone_credit}
                                    onChange={(v) => setData('phone_credit', v)}
                                />
                                <MoneyInput
                                    id="storage_rent"
                                    label="Magasin ou stockage (F)"
                                    value={data.storage_rent}
                                    error={errors.storage_rent}
                                    onChange={(v) => setData('storage_rent', v)}
                                />
                            </div>
                            <p className="badge-info flex items-start gap-2 rounded-xl px-4 py-3 text-sm">
                                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                <span>
                                    Salaires et frais fixes : <span className="tabular-nums">{formatFcfa(monthly)}</span>, retirés une fois par mois
                                    du bénéfice.
                                </span>
                            </p>
                        </section>
                    </>
                )}

                <div className="flex gap-3">
                    <Button type="submit" size="lg" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                        Enregistrer
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href={route('reference.index')}>Annuler</Link>
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}

function MembersSection({
    kind,
    title,
    help,
    countLabel,
    payLabel,
    payModes,
    defaultPayMode,
    addLabel,
    placeholder,
    rows,
    onChange,
    fieldError,
}: {
    kind: 'couriers' | 'closers';
    title: string;
    help?: string;
    countLabel: (count: number) => string;
    payLabel: string;
    payModes: Record<string, string>;
    defaultPayMode: string;
    addLabel: string;
    placeholder: string;
    rows: MemberRow[];
    onChange: (rows: MemberRow[]) => void;
    fieldError: (key: string) => string | undefined;
}) {
    const update = (index: number, changes: Partial<MemberRow>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));

    return (
        <section aria-labelledby={`${kind}-title`} className="glass flex flex-col gap-4 rounded-2xl p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 id={`${kind}-title`} className="text-lg font-bold">
                        {title}
                    </h2>
                    {help && <p className="text-muted-foreground text-sm">{help}</p>}
                </div>
                <p className="text-muted-foreground text-sm">{countLabel(rows.length)}</p>
            </div>

            {rows.map((row, index) => (
                <div
                    key={row.id ?? `new-${index}`}
                    className="grid items-start gap-3 border-t pt-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                    <div className="grid gap-2">
                        <Label htmlFor={`${kind}-${index}-name`}>Nom</Label>
                        <Input
                            id={`${kind}-${index}-name`}
                            value={row.name}
                            placeholder={placeholder}
                            onChange={(e) => update(index, { name: e.target.value })}
                        />
                        <InputError message={fieldError(`${kind}.${index}.name`)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`${kind}-${index}-mode`}>{payLabel}</Label>
                        <NativeSelect id={`${kind}-${index}-mode`} value={row.pay_mode} onChange={(e) => update(index, { pay_mode: e.target.value })}>
                            {Object.entries(payModes).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </NativeSelect>
                        <InputError message={fieldError(`${kind}.${index}.pay_mode`)} />
                    </div>
                    <MoneyInput
                        id={`${kind}-${index}-amount`}
                        label={amountLabels[row.pay_mode as keyof typeof amountLabels]}
                        value={row.pay_amount}
                        error={fieldError(`${kind}.${index}.pay_amount`)}
                        onChange={(v) => update(index, { pay_amount: v })}
                    />
                    <button
                        type="button"
                        onClick={() => onChange(rows.filter((_, i) => i !== index))}
                        aria-label={`Retirer ${row.name || 'cette ligne'}`}
                        className="text-muted-foreground hover:bg-danger-bg hover:text-danger-fg grid size-11 cursor-pointer place-items-center self-end rounded-xl border md:mb-0.5"
                    >
                        <Trash2 className="size-5" aria-hidden="true" />
                    </button>
                </div>
            ))}

            <Button
                type="button"
                variant="outline"
                className="self-start border-dashed"
                onClick={() => onChange([...rows, { id: null, name: '', pay_mode: defaultPayMode, pay_amount: '' }])}
            >
                <Plus aria-hidden="true" />
                {addLabel}
            </Button>
        </section>
    );
}

function MoneyInput({
    id,
    label,
    value,
    error,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                value={value}
                placeholder="0"
                className="tabular-nums"
                aria-invalid={error ? true : undefined}
                onChange={(e) => onChange(e.target.value)}
            />
            <InputError message={error} />
        </div>
    );
}
