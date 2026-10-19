import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { CircleAlert } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Field = 'label' | 'delivered' | 'revenue' | 'purchase_cost' | 'ad_spend' | 'closing_fees' | 'delivery_fees' | 'other_fees' | 'profit';

interface Country {
    id: number;
    name: string;
    agencies: { id: number; name: string }[];
}

interface Props {
    link: string;
    tab: string;
    spreadsheet: { id: string; title: string; sheets: { title: string; rows: number }[] } | null;
    preview: { rows: string[][]; header_row: number; columns: Record<Field, number | null> } | null;
    error: string | null;
    fields: Record<Field, string>;
    requiredFields: Field[];
    countries: Country[];
    source: { id: number; country_id: number; default_agency_id: number | null; auto_sync: boolean } | null;
}

type SourceForm = {
    spreadsheet_id: string;
    spreadsheet_title: string;
    sheet_title: string;
    country_id: string;
    default_agency_id: string;
    header_row: string;
    auto_sync: boolean;
    columns: Record<Field, string>;
};

const letter = (index: number) => String.fromCharCode(65 + index);

export default function SheetsCreate(props: Props) {
    const { link, tab, spreadsheet, preview, error, source } = props;
    const [draftLink, setDraftLink] = useState(link);
    const title = source ? 'Modifier un onglet relié' : 'Relier un onglet';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Google Sheets', href: '/sheets' },
        { title, href: '/sheets/relier' },
    ];

    const open = (params: Record<string, string>) =>
        router.get(source ? route('sheets.edit', source.id) : route('sheets.create'), params, { preserveScroll: true });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground text-sm">Trois étapes : le lien du Sheet, l'onglet, puis le sens de chaque colonne.</p>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        open({ lien: draftLink });
                    }}
                    className="glass space-y-3 rounded-2xl p-5"
                >
                    <Label htmlFor="link">1. Lien du Google Sheet</Label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            id="link"
                            value={draftLink}
                            onChange={(e) => setDraftLink(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/…"
                            disabled={source !== null}
                        />
                        {source === null && (
                            <Button type="submit" disabled={draftLink.trim() === ''}>
                                Lire le Sheet
                            </Button>
                        )}
                    </div>
                    {error && (
                        <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
                            <CircleAlert className="mt-0.5 size-4 shrink-0" />
                            {error}
                        </p>
                    )}
                </form>

                {spreadsheet && (
                    <section className="glass space-y-3 rounded-2xl p-5" aria-labelledby="tabs-title">
                        <h2 id="tabs-title" className="text-sm font-medium">
                            2. Onglet de « {spreadsheet.title} »
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {spreadsheet.sheets.map((sheet) => (
                                <button
                                    key={sheet.title}
                                    type="button"
                                    disabled={source !== null}
                                    onClick={() => open({ lien: link, onglet: sheet.title })}
                                    aria-pressed={sheet.title === tab}
                                    className={cn(
                                        'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                                        sheet.title === tab ? 'bg-primary border-primary text-white' : 'bg-background/70 hover:border-primary/60',
                                    )}
                                >
                                    {sheet.title}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {spreadsheet && preview && <ColumnsForm {...props} spreadsheet={spreadsheet} preview={preview} />}
            </div>
        </AppLayout>
    );
}

function ColumnsForm({
    tab,
    spreadsheet,
    preview,
    fields,
    requiredFields,
    countries,
    source,
}: Props & { spreadsheet: NonNullable<Props['spreadsheet']>; preview: NonNullable<Props['preview']> }) {
    const initialColumns = Object.fromEntries(
        (Object.keys(fields) as Field[]).map((field) => [field, preview.columns[field] === null ? '' : String(preview.columns[field])]),
    ) as Record<Field, string>;

    const { data, setData, post, put, processing, errors } = useForm<SourceForm>({
        spreadsheet_id: spreadsheet.id,
        spreadsheet_title: spreadsheet.title,
        sheet_title: tab,
        country_id: String(source?.country_id ?? countries[0]?.id ?? ''),
        default_agency_id: source?.default_agency_id ? String(source.default_agency_id) : '',
        header_row: String(preview.header_row),
        auto_sync: source?.auto_sync ?? true,
        columns: initialColumns,
    });

    const fieldError = (key: string) => (errors as Record<string, string | undefined>)[key];
    const headerIndex = Math.max(0, Number(data.header_row) - 1);
    const headers = preview.rows[headerIndex] ?? [];
    const columnCount = Math.max(...preview.rows.map((row) => row.length), headers.length, 1);
    const agencies = countries.find((country) => String(country.id) === data.country_id)?.agencies ?? [];
    const mapped = new Map(
        Object.entries(data.columns)
            .filter(([, column]) => column !== '')
            .map(([field, column]) => [Number(column), field as Field]),
    );

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const transform = { preserveScroll: true };

        if (source) {
            put(route('sheets.update', source.id), transform);
        } else {
            post(route('sheets.store'), transform);
        }
    };

    return (
        <form onSubmit={submit} className="glass space-y-6 rounded-2xl p-5 md:p-6">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">3. Ce que contient chaque colonne</h2>
                <p className="text-muted-foreground text-sm">
                    Les colonnes ont été devinées d'après leurs titres : vérifiez-les. Le bénéfice sert seulement à contrôler le calcul.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-1">
                    <Label htmlFor="country_id">Pays de cet onglet</Label>
                    <NativeSelect
                        id="country_id"
                        value={data.country_id}
                        onChange={(e) => setData((current) => ({ ...current, country_id: e.target.value, default_agency_id: '' }))}
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
                    <Label htmlFor="default_agency_id">Agence des lignes sans agence</Label>
                    <NativeSelect
                        id="default_agency_id"
                        value={data.default_agency_id}
                        onChange={(e) => setData('default_agency_id', e.target.value)}
                    >
                        <option value="">À choisir ligne par ligne</option>
                        {agencies.map((agency) => (
                            <option key={agency.id} value={agency.id}>
                                {agency.name}
                            </option>
                        ))}
                    </NativeSelect>
                    <InputError message={errors.default_agency_id} />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="header_row">Ligne des titres</Label>
                    <Input
                        id="header_row"
                        type="number"
                        min={1}
                        max={40}
                        value={data.header_row}
                        onChange={(e) => setData('header_row', e.target.value)}
                    />
                    <InputError message={errors.header_row} />
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(fields) as Field[]).map((field) => (
                    <div key={field} className="grid gap-1">
                        <Label htmlFor={`column-${field}`}>
                            {fields[field]}
                            {requiredFields.includes(field) && <span className="text-destructive"> *</span>}
                        </Label>
                        <NativeSelect
                            id={`column-${field}`}
                            value={data.columns[field]}
                            onChange={(e) => setData('columns', { ...data.columns, [field]: e.target.value })}
                        >
                            <option value="">{requiredFields.includes(field) ? 'Choisir une colonne' : 'Pas dans ce Sheet'}</option>
                            {Array.from({ length: columnCount }, (_, index) => (
                                <option key={index} value={index}>
                                    {letter(index)} {headers[index] ? `· ${headers[index]}` : ''}
                                </option>
                            ))}
                        </NativeSelect>
                        <InputError message={fieldError(`columns.${field}`)} />
                    </div>
                ))}
            </div>
            <InputError message={fieldError('columns') ?? fieldError('sheet_title')} />

            <div className="space-y-2">
                <p className="text-sm font-medium">Aperçu des premières lignes</p>
                <div className="bg-background/70 max-h-96 overflow-auto rounded-xl border">
                    <table className="w-max min-w-full text-xs">
                        <thead className="bg-primary/8 sticky top-0">
                            <tr>
                                <th scope="col" className="px-2 py-2 text-left font-medium">
                                    #
                                </th>
                                {Array.from({ length: columnCount }, (_, index) => (
                                    <th key={index} scope="col" className="px-3 py-2 text-left font-medium whitespace-nowrap">
                                        {letter(index)}
                                        {mapped.has(index) && <span className="text-primary block font-semibold">{fields[mapped.get(index)!]}</span>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {preview.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className={cn('border-t', rowIndex === headerIndex && 'bg-secondary/20 font-semibold')}>
                                    <td className="text-muted-foreground px-2 py-1.5">{rowIndex + 1}</td>
                                    {Array.from({ length: columnCount }, (_, index) => (
                                        <td
                                            key={index}
                                            className={cn('max-w-48 truncate px-3 py-1.5 whitespace-nowrap', mapped.has(index) && 'bg-primary/6')}
                                        >
                                            {row[index] ?? ''}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={data.auto_sync}
                    onChange={(e) => setData('auto_sync', e.target.checked)}
                    className="accent-primary size-4"
                />
                Relire cet onglet chaque matin à 6 h (les nouvelles lignes attendent votre vérification)
            </label>

            <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={processing}>
                    {source ? 'Enregistrer et relire' : 'Relier et lire les lignes'}
                </Button>
                <Button asChild variant="ghost">
                    <Link href={route('sheets.index')}>Annuler</Link>
                </Button>
            </div>
        </form>
    );
}
