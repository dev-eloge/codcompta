import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { AdFields, AmountHint, ChoiceCard, MoneyField, QuantityStepper } from '@/components/report-form/fields';
import { TeamFees } from '@/components/report-form/team-fees';
import { type Agency, emptyLine, type Product, type ReportFormState, sharedAdText, toNumber } from '@/components/report-form/use-report-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adPlatformLabel } from '@/lib/ad-platforms';
import { formatFcfa, formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { ArrowRight, Check, CircleAlert, Info, LoaderCircle, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';

type Step = 1 | 2 | 3 | 4;

const steps: { label: string; next: string }[] = [
    { label: 'Qui livre', next: 'Suivant : les produits' },
    { label: 'Produits', next: 'Suivant : la pub' },
    { label: 'Pub', next: 'Suivant : les frais' },
    { label: 'Frais', next: 'Enregistrer' },
];

const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

const reportDays = (start: string, end: string) =>
    start === end ? dayFormat.format(new Date(`${start}T00:00:00Z`)) : `du ${formatPeriod(start, end)}`;

/** The step that holds a field refused by the server, so the merchant lands where the problem is. */
const stepOfError = (key: string): Step => {
    if (key.startsWith('lines')) {
        return 2;
    }

    if (key.startsWith('ads')) {
        return 3;
    }

    return ['agency_id', 'period_start', 'period_end', 'status'].includes(key) ? 1 : 4;
};

/**
 * The report form on phones: four short screens (who delivers, products, ad, fees) in one Inertia form,
 * so nothing typed is lost when going back and forth.
 */
export function MobileReportFlow({ form, agencies, products }: { form: ReportFormState; agencies: Agency[]; products: Product[] }) {
    const { editing, data, setData, processing, errors, isDirty, errorCount, errorSummary, productById } = form;

    const [step, setStep] = useState<Step>(1);
    const [openLine, setOpenLine] = useState<number | null>(() => (data.lines.length === 1 && data.lines[0].product_id === '' ? 0 : null));
    const [openAd, setOpenAd] = useState<string | null>(null);
    const [stepError, setStepError] = useState<string | null>(null);
    const [quitting, setQuitting] = useState(false);
    const [severalDays, setSeveralDays] = useState(data.period_start !== data.period_end);
    const stepTitle = useRef<HTMLHeadingElement>(null);
    const firstRender = useRef(true);

    // A new screen starts at the top, with its title read out.
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }

        window.scrollTo({ top: 0 });
        stepTitle.current?.focus({ preventScroll: true });
    }, [step]);

    // A refused save brings the merchant back to the first screen with a problem.
    useEffect(() => {
        if (errorCount > 0) {
            setStep(Math.min(...Object.keys(errors).map(stepOfError)) as Step);
        }
    }, [errorCount, errors]);

    const agency = agencies.find((option) => String(option.id) === data.agency_id);

    const goTo = (next: Step) => {
        setStepError(null);

        if (next === 3 && openAd === null) {
            // Opens the first product whose ad is not noted yet.
            setOpenAd(form.adProducts.find((productId) => data.ads[productId] === undefined && !form.sharedAdOf(productId)) ?? null);
        }

        setStep(next);
    };

    const goNext = () => {
        if (step === 1 && (data.agency_id === '' || data.period_start === '' || data.period_end < data.period_start)) {
            setStepError(data.agency_id === '' ? 'Choisissez qui a livré.' : 'Choisissez la date du rapport.');

            return;
        }

        if (step === 2) {
            if (form.adProducts.length === 0) {
                setStepError('Ajoutez au moins un produit livré.');

                return;
            }

            if (data.lines.some((line) => line.product_id === '' || toNumber(line.quantity) < 1)) {
                setStepError('Un produit est incomplet : choisissez le produit et sa quantité, ou retirez-le.');

                return;
            }

            setOpenLine(null);
        }

        goTo((step + 1) as Step);
    };

    const onSubmit = (e: FormEvent) => {
        if (step < 4) {
            e.preventDefault();
            goNext();

            return;
        }

        form.submit(e);
    };

    const quit = () => (isDirty ? setQuitting(true) : router.visit(route('reports.index')));

    const addLine = () => {
        setStepError(null);
        setData('lines', [...data.lines, { ...emptyLine }]);
        setOpenLine(data.lines.length);
    };

    const removeLine = (index: number) => {
        if (data.lines.length === 1) {
            setData('lines', [{ ...emptyLine }]);
            setOpenLine(0);

            return;
        }

        setData(
            'lines',
            data.lines.filter((_, i) => i !== index),
        );
        setOpenLine(null);
    };

    const beforeAd = form.salesTotal - form.purchaseCost - form.fees;
    const bar = step <= 2 ? { label: 'Reste avant la pub', amount: beforeAd } : { label: 'Bénéfice du jour', amount: form.netProfit };

    return (
        <form onSubmit={onSubmit} noValidate className="flex min-h-svh flex-col">
            <header className="bg-card sticky top-0 z-20 border-b px-4 pt-2 pb-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={quit}
                        aria-label="Quitter la saisie"
                        className="hover:bg-accent -ml-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl"
                    >
                        <X className="size-6" aria-hidden="true" />
                    </button>
                    <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{editing ? 'Modifier le rapport' : 'Nouveau rapport'}</h1>
                    <p className="text-muted-foreground shrink-0 text-sm font-semibold">
                        Étape {step} sur {steps.length}
                    </p>
                </div>
                <ol className="mt-2 grid grid-cols-4 gap-1.5" aria-label="Étapes du rapport">
                    {steps.map(({ label }, index) => {
                        const number = index + 1;

                        return (
                            <li key={label} aria-current={number === step ? 'step' : undefined} className="flex flex-col gap-1.5">
                                <span aria-hidden="true" className={cn('h-1 rounded-full', number <= step ? 'bg-primary' : 'bg-muted')} />
                                <span
                                    className={cn(
                                        'text-xs',
                                        number === step
                                            ? 'text-foreground font-bold'
                                            : number < step
                                              ? 'text-primary font-semibold'
                                              : 'text-muted-foreground',
                                    )}
                                >
                                    {label}
                                    {number < step && <span className="sr-only"> (fait)</span>}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </header>

            <div className="bg-background flex flex-1 flex-col gap-4 px-4 pt-4 pb-32">
                {errorCount > 0 && (
                    <div
                        ref={errorSummary}
                        tabIndex={-1}
                        role="alert"
                        className="badge-danger flex items-start gap-2 rounded-xl p-4 text-sm outline-none"
                    >
                        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <p>
                            <span className="font-semibold">Le rapport n'est pas enregistré.</span> Corrigez ce qui est écrit en rouge.
                        </p>
                    </div>
                )}

                {step > 1 && agency && (
                    <div className="bg-card flex items-center justify-between gap-3 rounded-2xl border px-4 py-2">
                        <p className="min-w-0 text-[15px]">
                            <span className="font-bold">{agency.is_own_team ? 'Mon équipe' : agency.name}</span>,{' '}
                            {reportDays(data.period_start, data.period_end)}
                        </p>
                        <button
                            type="button"
                            onClick={() => goTo(1)}
                            className="text-primary min-h-11 shrink-0 cursor-pointer font-bold underline underline-offset-4"
                        >
                            Modifier
                        </button>
                    </div>
                )}

                <h2 ref={stepTitle} tabIndex={-1} className="text-[22px] font-bold outline-none">
                    {step === 1 && 'Qui livre, quel jour ?'}
                    {step === 2 && 'Produits livrés'}
                    {step === 3 && 'La pub du jour'}
                    {step === 4 && (form.isTeam ? 'Frais du jour' : "Frais de l'agence")}
                </h2>

                {step === 1 && (
                    <div className="flex flex-col gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="m-agency_id">Qui a livré ?</Label>
                            <NativeSelect
                                id="m-agency_id"
                                value={data.agency_id}
                                disabled={editing}
                                onChange={(e) => setData('agency_id', e.target.value)}
                            >
                                <option value="">Choisir une agence</option>
                                {agencies.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.is_own_team ? `Mon équipe (${option.country})` : `${option.name} (${option.country})`}
                                    </option>
                                ))}
                            </NativeSelect>
                            {editing && <p className="text-muted-foreground text-xs">L'agence d'un rapport ne change pas.</p>}
                            <InputError message={errors.agency_id} />
                        </div>

                        {severalDays ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="m-period_start">Du</Label>
                                    <Input
                                        id="m-period_start"
                                        type="date"
                                        value={data.period_start}
                                        onChange={(e) => {
                                            const start = e.target.value;
                                            setData((current) => ({
                                                ...current,
                                                period_start: start,
                                                period_end: current.period_end < start ? start : current.period_end,
                                            }));
                                        }}
                                    />
                                    <InputError message={errors.period_start} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="m-period_end">Au</Label>
                                    <Input
                                        id="m-period_end"
                                        type="date"
                                        min={data.period_start}
                                        value={data.period_end}
                                        onChange={(e) => setData('period_end', e.target.value)}
                                    />
                                    <InputError message={errors.period_end} />
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="m-day">Date du rapport</Label>
                                <Input
                                    id="m-day"
                                    type="date"
                                    value={data.period_start}
                                    onChange={(e) => setData((current) => ({ ...current, period_start: e.target.value, period_end: e.target.value }))}
                                />
                                <InputError message={errors.period_start ?? errors.period_end} />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (severalDays) {
                                    setData('period_end', data.period_start);
                                }
                                setSeveralDays(!severalDays);
                            }}
                            className="text-primary min-h-11 cursor-pointer self-start text-sm font-bold underline underline-offset-4"
                        >
                            {severalDays ? 'Un seul jour' : 'Le rapport couvre plusieurs jours ?'}
                        </button>

                        <div className="grid gap-2">
                            <Label htmlFor="m-status">Compter dans le bénéfice ?</Label>
                            <NativeSelect id="m-status" value={data.status} onChange={(e) => setData('status', e.target.value as typeof data.status)}>
                                <option value="counted">Oui, le compter</option>
                                <option value="detail">Non, détail d'un récap déjà saisi</option>
                                <option value="to_verify">Non, à vérifier d'abord</option>
                            </NativeSelect>
                            <InputError message={errors.status} />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={addLine}
                            className="border-primary text-foreground hover:bg-success-bg flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-base font-bold transition-colors duration-150"
                        >
                            <Plus className="size-5" aria-hidden="true" />
                            Ajouter un produit
                        </button>
                        <InputError message={errors.lines} />

                        {openLine !== null && data.lines[openLine] && (
                            <OpenLine
                                form={form}
                                products={products}
                                index={openLine}
                                onRemove={() => removeLine(openLine)}
                                onDone={() => setOpenLine(null)}
                            />
                        )}

                        {data.lines.map((line, index) => {
                            if (index === openLine) {
                                return null;
                            }

                            const hasError = Object.keys(errors).some((key) => key.startsWith(`lines.${index}.`));

                            return (
                                <CollapsedRow
                                    key={index}
                                    title={productById(line.product_id)?.name ?? 'Produit à choisir'}
                                    detail={`${line.quantity || 0} livré${toNumber(line.quantity) > 1 ? 's' : ''}, ${formatFcfa(toNumber(line.amount))} encaissés`}
                                    icon={hasError ? 'error' : 'done'}
                                    onEdit={() => setOpenLine(index)}
                                />
                            );
                        })}

                        <p className="text-muted-foreground text-center text-sm">
                            {form.adProducts.length} produit{form.adProducts.length > 1 ? 's' : ''} dans ce rapport
                        </p>
                    </div>
                )}

                {step === 3 && (
                    <div className="flex flex-col gap-3">
                        <p className="text-muted-foreground -mt-2 text-[15px]">Ce que vous avez payé aujourd'hui pour ces produits.</p>

                        {!data.no_ads &&
                            form.adProducts.map((productId) =>
                                openAd === productId ? (
                                    <OpenAd key={productId} form={form} productId={productId} onDone={() => setOpenAd(null)} />
                                ) : (
                                    <CollapsedAd key={productId} form={form} productId={productId} onEdit={() => setOpenAd(productId)} />
                                ),
                            )}

                        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-[15px] font-semibold">
                            <input
                                type="checkbox"
                                className="accent-primary size-5"
                                checked={data.no_ads}
                                onChange={(e) => setData('no_ads', e.target.checked)}
                            />
                            Pas de publicité aujourd'hui pour ces produits
                        </label>
                    </div>
                )}

                {step === 4 && (
                    <div className="flex flex-col gap-4">
                        {form.isTeam ? (
                            <TeamFees form={form} idPrefix="m-" />
                        ) : (
                            <>
                                <p className="text-muted-foreground -mt-2 text-[15px]">Laissez vide ce qui ne s'applique pas.</p>
                                <MoneyField
                                    id="m-delivery_fees"
                                    label="Livraison (F)"
                                    value={data.delivery_fees}
                                    error={errors.delivery_fees}
                                    onChange={(v) => setData('delivery_fees', v)}
                                />
                                <MoneyField
                                    id="m-closing_fees"
                                    label="Closing et appels (F)"
                                    value={data.closing_fees}
                                    error={errors.closing_fees}
                                    onChange={(v) => setData('closing_fees', v)}
                                />
                                <MoneyField
                                    id="m-other_fees"
                                    label="Autres frais (F)"
                                    value={data.other_fees}
                                    error={errors.other_fees}
                                    onChange={(v) => setData('other_fees', v)}
                                />
                                <MoneyField
                                    id="m-announced_total"
                                    label="Total écrit par l'agence (facultatif)"
                                    value={data.announced_total}
                                    error={errors.announced_total}
                                    onChange={(v) => setData('announced_total', v)}
                                />
                                {data.announced_total !== '' && (
                                    <p
                                        role="status"
                                        className={cn(
                                            'flex items-center gap-2 text-sm font-semibold',
                                            form.announcedMismatch ? 'text-warning-fg' : 'text-success-fg',
                                        )}
                                    >
                                        {form.announcedMismatch ? (
                                            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                                        ) : (
                                            <Check className="size-4 shrink-0" aria-hidden="true" />
                                        )}
                                        {form.announcedMismatch
                                            ? `Les produits font ${formatFcfa(form.salesTotal)} : le rapport sera « à vérifier ».`
                                            : 'Correspond au détail des produits'}
                                    </p>
                                )}
                            </>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="m-note">Note (facultatif)</Label>
                            <Input id="m-note" value={data.note} onChange={(e) => setData('note', e.target.value)} />
                            <InputError message={errors.note} />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-card fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {stepError && (
                    <p role="alert" className="text-danger-fg mb-2 flex items-start gap-2 text-sm font-semibold">
                        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {stepError}
                    </p>
                )}
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-sm">{bar.label}</p>
                        <p
                            aria-live="polite"
                            className={cn(
                                'font-[family-name:var(--font-display)] text-[22px] leading-tight font-bold tabular-nums',
                                bar.amount < 0 && 'text-danger-fg',
                            )}
                        >
                            {formatFcfa(bar.amount)}
                        </p>
                    </div>
                    <Button type="submit" size="lg" disabled={processing} className="h-12 shrink-0 rounded-xl px-5 text-base font-bold">
                        {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                        {steps[step - 1].next}
                        <ArrowRight className="size-5" aria-hidden="true" />
                    </Button>
                </div>
            </div>

            <Dialog open={quitting} onOpenChange={setQuitting}>
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>Quitter sans enregistrer ?</DialogTitle>
                    <DialogDescription>Ce que vous avez tapé dans ce rapport sera perdu.</DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" className="h-11">
                                Continuer la saisie
                            </Button>
                        </DialogClose>
                        <Button variant="destructive" className="h-11" onClick={() => router.visit(route('reports.index'))}>
                            Quitter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </form>
    );
}

/**
 * The product being typed: its name, quantity and money collected.
 */
function OpenLine({
    form,
    products,
    index,
    onRemove,
    onDone,
}: {
    form: ReportFormState;
    products: Product[];
    index: number;
    onRemove: () => void;
    onDone: () => void;
}) {
    const { data, productById, fieldError, updateLine, expectedAmount, recalculate } = form;
    const line = data.lines[index];
    const product = productById(line.product_id);
    const [incomplete, setIncomplete] = useState(false);

    return (
        <div className="border-primary bg-card flex flex-col gap-4 rounded-2xl border-2 p-4">
            <div className="flex items-start justify-between gap-3">
                {product ? (
                    <h3 className="pt-2 text-[17px] font-bold">{product.name}</h3>
                ) : (
                    <div className="grid min-w-0 flex-1 gap-2">
                        <Label htmlFor={`m-product-${index}`}>Produit</Label>
                        <NativeSelect
                            id={`m-product-${index}`}
                            value={line.product_id}
                            onChange={(e) => updateLine(index, { product_id: e.target.value })}
                        >
                            <option value="">Choisir un produit</option>
                            {products
                                .filter(
                                    (option) =>
                                        String(option.id) === line.product_id || !data.lines.some((other) => other.product_id === String(option.id)),
                                )
                                .map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                    </option>
                                ))}
                        </NativeSelect>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Retirer ${product?.name ?? 'ce produit'}`}
                    className="text-muted-foreground hover:bg-danger-bg hover:text-danger-fg mt-auto grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border"
                >
                    <Trash2 className="size-5" aria-hidden="true" />
                </button>
            </div>
            <InputError message={fieldError(`lines.${index}.product_id`)} />

            <QuantityStepper
                id={`m-quantity-${index}`}
                label="Quantité livrée"
                value={line.quantity}
                error={fieldError(`lines.${index}.quantity`)}
                onChange={(quantity) => updateLine(index, { quantity })}
            />

            <div className="grid gap-2">
                <Label htmlFor={`m-amount-${index}`}>Argent encaissé (F)</Label>
                <Input
                    id={`m-amount-${index}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={line.amount}
                    aria-describedby={`m-amount-${index}-help`}
                    className="tabular-nums"
                    onChange={(e) => updateLine(index, { amount: e.target.value, auto: false })}
                />
                <AmountHint
                    id={`m-amount-${index}-help`}
                    line={line}
                    price={product?.reference_price ?? null}
                    expected={expectedAmount(line)}
                    onRecalculate={() => recalculate(index)}
                />
                <InputError message={fieldError(`lines.${index}.amount`)} />
            </div>

            {incomplete && (
                <p role="alert" className="text-danger-fg text-sm font-semibold">
                    Choisissez le produit et sa quantité.
                </p>
            )}
            <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl text-base font-bold"
                onClick={() => {
                    if (line.product_id === '' || toNumber(line.quantity) < 1) {
                        setIncomplete(true);

                        return;
                    }
                    onDone();
                }}
            >
                Valider ce produit
            </Button>
        </div>
    );
}

/**
 * The ad of one product being typed, or the choice to share the ad another agency already noted.
 */
function OpenAd({ form, productId, onDone }: { form: ReportFormState; productId: string; onDone: () => void }) {
    const { data, productById, sharedAdOf, adEntry, updateAd, adCost, adError } = form;
    const shared = sharedAdOf(productId);
    const entry = adEntry(productId);

    return (
        <div className="border-primary bg-card flex flex-col gap-4 rounded-2xl border-2 p-4">
            <h3 className="text-[17px] font-bold">{productById(productId)?.name}</h3>

            {shared && (
                <>
                    <p className="badge-info flex items-start gap-2 rounded-xl px-3 py-2 text-sm">
                        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>
                            Pub déjà notée aujourd'hui : <span className="font-semibold tabular-nums">{sharedAdText(shared)}</span>
                            {shared.noted_by ? `, dans le rapport d'${shared.noted_by}.` : '.'}
                        </span>
                    </p>
                    <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 text-sm font-bold">Pour cette agence :</legend>
                        <ChoiceCard
                            name={`m-ad-choice-${productId}`}
                            checked={entry.choice === 'same'}
                            onSelect={() => updateAd(productId, { choice: 'same' })}
                            title="C'est la même pub"
                            help={`Les ${formatFcfa(shared.amount)} sont partagés selon les livraisons. Rien à retaper.`}
                        />
                        <ChoiceCard
                            name={`m-ad-choice-${productId}`}
                            checked={entry.choice === 'separate'}
                            onSelect={() => updateAd(productId, { choice: 'separate' })}
                            title="J'ai payé une pub à part"
                            help="Vous notez son montant ici."
                        />
                    </fieldset>
                </>
            )}

            {(!shared || entry.choice === 'separate') && (
                <AdFields
                    productId={`m-${productId}`}
                    entry={entry}
                    cost={adCost(productId)}
                    error={(field) => adError(productId, field)}
                    onChange={(changes) => updateAd(productId, changes)}
                    variant="phone"
                    noAdChosen={data.ads[productId] !== undefined}
                />
            )}

            <Button type="button" variant="outline" className="h-12 rounded-xl text-base font-bold" onClick={onDone}>
                Valider la pub de ce produit
            </Button>
        </div>
    );
}

function CollapsedAd({ form, productId, onEdit }: { form: ReportFormState; productId: string; onEdit: () => void }) {
    const { data, productById, sharedAdOf, adEntry, adCost, sentAdErrors } = form;
    const shared = sharedAdOf(productId);
    const entry = adEntry(productId);
    const sharing = shared !== undefined && entry.choice === 'same';

    let detail = 'Pub à noter';
    if (sharing) {
        detail = `Même pub ${shared.noted_by ? `qu'${shared.noted_by}` : 'que déjà notée'}, ${formatFcfa(shared.amount)}`;
    } else if (entry.platform !== '') {
        detail = `${adPlatformLabel(entry.platform)}, ${formatFcfa(adCost(productId))}`;
    } else if (data.ads[productId] !== undefined) {
        detail = 'Pas de pub';
    }

    return (
        <CollapsedRow
            title={productById(productId)?.name ?? 'Produit'}
            detail={detail}
            icon={sentAdErrors(productId) ? 'error' : sharing ? 'info' : data.ads[productId] !== undefined ? 'done' : 'todo'}
            onEdit={onEdit}
        />
    );
}

/**
 * A product already typed, folded to one line with a "Modifier" button.
 */
function CollapsedRow({
    title,
    detail,
    icon,
    onEdit,
}: {
    title: string;
    detail: string;
    icon: 'done' | 'info' | 'error' | 'todo';
    onEdit: () => void;
}) {
    const icons: Record<typeof icon, ReactNode> = {
        done: (
            <span className="badge-success grid size-8 shrink-0 place-items-center rounded-full">
                <Check className="size-4 stroke-[2.8]" aria-hidden="true" />
            </span>
        ),
        info: (
            <span className="badge-info grid size-8 shrink-0 place-items-center rounded-full">
                <Info className="size-4" aria-hidden="true" />
            </span>
        ),
        error: (
            <span className="badge-danger grid size-8 shrink-0 place-items-center rounded-full">
                <CircleAlert className="size-4" aria-hidden="true" />
            </span>
        ),
        todo: <span className="border-input size-8 shrink-0 rounded-full border-2 border-dashed" aria-hidden="true" />,
    };

    return (
        <div className="bg-card flex items-center gap-3 rounded-2xl border px-4 py-3">
            {icons[icon]}
            <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{title}</p>
                <p className="text-muted-foreground truncate text-sm tabular-nums">
                    {icon === 'error' ? <span className="text-danger-fg font-semibold">À corriger. </span> : null}
                    {detail}
                </p>
            </div>
            <button
                type="button"
                onClick={onEdit}
                className="text-primary min-h-11 shrink-0 cursor-pointer px-1 font-bold"
                aria-label={`Modifier ${title}`}
            >
                Modifier
            </button>
        </div>
    );
}
