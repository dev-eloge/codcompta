import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { AdFields, AmountHint, ChoiceCard, MoneyField, StepTitle, SummaryLine } from '@/components/report-form/fields';
import { MobileReportFlow } from '@/components/report-form/mobile-report-flow';
import { emptyLine, type Props, type ReportForm, sharedAdText, toNumber, useReportForm } from '@/components/report-form/use-report-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CircleAlert, Info, LoaderCircle, Plus, Trash2 } from 'lucide-react';

export default function ReportsCreate(props: Props) {
    const { agencies, products, report } = props;
    const form = useReportForm(props);
    const isMobile = useIsMobile();
    const {
        editing,
        data,
        setData,
        processing,
        errors,
        fieldError,
        errorCount,
        errorSummary,
        productById,
        expectedAmount,
        updateLine,
        recalculate,
        sharedAdOf,
        adProducts,
        adError,
        adEntry,
        updateAd,
        adCost,
        salesTotal,
        purchaseCost,
        fees,
        announcedMismatch,
        adTotal,
        netProfit,
        sharedNotes,
        submit,
    } = form;
    const title = editing ? 'Modifier un rapport' : 'Saisir un rapport';
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Mes rapports', href: '/rapports' },
        { title, href: report ? `/rapports/${report.id}/modifier` : '/rapports/saisie' },
    ];

    if (agencies.length === 0 || products.length === 0) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={title} />
                <div className="glass mx-auto mt-10 max-w-md space-y-4 rounded-2xl p-8 text-center">
                    <h1 className="text-xl font-semibold">Ajoutez d'abord une agence et un produit</h1>
                    <p className="text-muted-foreground text-sm">
                        {agencies.length === 0
                            ? "Un rapport vient toujours d'une agence de livraison : ajoutez au moins une agence et un produit avec son prix d'achat."
                            : "Ajoutez au moins un produit avec son prix d'achat : c'est lui qui permet de calculer votre bénéfice."}
                    </p>
                    <Button asChild>
                        <Link href={route('reference.index')}>Ajouter mes agences et produits</Link>
                    </Button>
                </div>
            </AppLayout>
        );
    }

    // Under 768 px the same form becomes four short screens.
    if (isMobile) {
        return (
            <AppLayout breadcrumbs={breadcrumbs} focusedOnMobile>
                <Head title={title} />
                <MobileReportFlow form={form} agencies={agencies} products={products} />
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <form
                onSubmit={submit}
                className="mx-auto grid w-full max-w-[1240px] items-start gap-6 px-4 py-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1fr)_340px]"
            >
                <div className="flex min-w-0 flex-col gap-5">
                    <header className="flex flex-wrap items-end justify-between gap-3">
                        <h1 className="text-[28px] font-bold md:text-[32px]">{editing ? 'Modifier le rapport' : "Saisir le rapport d'une agence"}</h1>
                        <p className="text-muted-foreground text-sm">* obligatoire</p>
                    </header>

                    {errorCount > 0 && (
                        <div
                            ref={errorSummary}
                            tabIndex={-1}
                            role="alert"
                            className="badge-danger flex items-start gap-2 rounded-xl p-4 text-sm outline-none"
                        >
                            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <p>
                                <span className="font-semibold">Le rapport n'est pas enregistré.</span>{' '}
                                {errorCount > 1 ? `${errorCount} champs sont à corriger` : 'Un champ est à corriger'} : le message est écrit sous
                                chaque champ concerné.
                            </p>
                        </div>
                    )}

                    <section aria-labelledby="who-title" className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-3 md:p-6">
                        <StepTitle id="who-title" step={1} className="sm:col-span-3">
                            Quelle agence, quel jour ?
                        </StepTitle>
                        <div className="grid gap-2 sm:col-span-3">
                            <Label htmlFor="agency_id">Agence *</Label>
                            <NativeSelect
                                id="agency_id"
                                required
                                value={data.agency_id}
                                disabled={editing}
                                aria-describedby={editing ? 'agency-help' : undefined}
                                onChange={(e) => setData('agency_id', e.target.value)}
                            >
                                <option value="">Choisir une agence</option>
                                {agencies.map((agency) => (
                                    <option key={agency.id} value={agency.id}>
                                        {agency.name} ({agency.country})
                                    </option>
                                ))}
                            </NativeSelect>
                            {editing && (
                                <p id="agency-help" className="text-muted-foreground text-xs">
                                    L'agence d'un rapport ne change pas. Supprimez-le et saisissez-en un nouveau si l'agence est fausse.
                                </p>
                            )}
                            <InputError message={errors.agency_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="period_start">Du *</Label>
                            <Input
                                id="period_start"
                                type="date"
                                required
                                aria-describedby="period-help"
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
                            <Label htmlFor="period_end">Au *</Label>
                            <Input
                                id="period_end"
                                type="date"
                                required
                                min={data.period_start}
                                aria-describedby="period-help"
                                value={data.period_end}
                                onChange={(e) => setData('period_end', e.target.value)}
                            />
                            <InputError message={errors.period_end} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">Compter dans le bénéfice ?</Label>
                            <NativeSelect
                                id="status"
                                aria-describedby="status-help"
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value as ReportForm['status'])}
                            >
                                <option value="counted">Oui, le compter</option>
                                <option value="detail">Non, détail d'un récap déjà saisi</option>
                                <option value="to_verify">Non, à vérifier d'abord</option>
                            </NativeSelect>
                            <InputError message={errors.status} />
                        </div>

                        <p id="period-help" className="text-muted-foreground text-xs sm:col-span-2">
                            Rapport d'un seul jour : mettez la même date dans « Du » et « Au ». Récap de la semaine : du premier au dernier jour.
                        </p>
                        <p id="status-help" className="text-muted-foreground text-xs">
                            Choisissez « détail » pour un rapport journalier déjà inclus dans un récap : ses ventes ne seront pas comptées deux fois.
                        </p>
                    </section>

                    <section aria-labelledby="lines-title" className="glass space-y-4 rounded-2xl p-5 md:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <StepTitle id="lines-title" step={2}>
                                Produits livrés
                            </StepTitle>
                            <Button type="button" variant="outline" onClick={() => setData('lines', [...data.lines, { ...emptyLine }])}>
                                <Plus aria-hidden="true" />
                                Ajouter un produit
                            </Button>
                        </div>
                        <InputError message={errors.lines} />

                        <div className="space-y-3">
                            {data.lines.map((line, index) => {
                                const product = productById(line.product_id);

                                return (
                                    <div
                                        key={index}
                                        className="bg-muted/60 grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-start gap-3 rounded-xl p-3 sm:grid-cols-[minmax(0,2fr)_6.5rem_minmax(0,1fr)_auto]"
                                    >
                                        <div className="col-span-3 grid gap-1 sm:col-span-1">
                                            <Label htmlFor={`product-${index}`} className="text-muted-foreground text-xs">
                                                Produit {data.lines.length > 1 ? index + 1 : ''} *
                                            </Label>
                                            <NativeSelect
                                                id={`product-${index}`}
                                                value={line.product_id}
                                                onChange={(e) => updateLine(index, { product_id: e.target.value })}
                                            >
                                                <option value="">Choisir un produit</option>
                                                {products.map((option) => (
                                                    <option key={option.id} value={option.id}>
                                                        {option.name}
                                                    </option>
                                                ))}
                                            </NativeSelect>
                                            {product && (
                                                <p className="text-muted-foreground text-xs">
                                                    Prix d'achat :{' '}
                                                    {product.unit_cost === null
                                                        ? 'non renseigné (à ajouter dans Pays, agences et produits)'
                                                        : `${formatFcfa(product.unit_cost)} l'unité`}
                                                </p>
                                            )}
                                            <InputError message={fieldError(`lines.${index}.product_id`)} />
                                        </div>

                                        <div className="grid gap-1">
                                            <Label htmlFor={`quantity-${index}`} className="text-muted-foreground text-xs">
                                                Quantité livrée *
                                            </Label>
                                            <Input
                                                id={`quantity-${index}`}
                                                type="number"
                                                inputMode="numeric"
                                                min={1}
                                                value={line.quantity}
                                                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                                            />
                                            <InputError message={fieldError(`lines.${index}.quantity`)} />
                                        </div>

                                        <div className="grid gap-1">
                                            <Label htmlFor={`amount-${index}`} className="text-muted-foreground text-xs">
                                                Argent encaissé (F) *
                                            </Label>
                                            <Input
                                                id={`amount-${index}`}
                                                type="number"
                                                inputMode="numeric"
                                                min={0}
                                                value={line.amount}
                                                aria-describedby={`amount-${index}-help`}
                                                onChange={(e) => updateLine(index, { amount: e.target.value, auto: false })}
                                            />
                                            <AmountHint
                                                id={`amount-${index}-help`}
                                                line={line}
                                                price={product?.reference_price ?? null}
                                                expected={expectedAmount(line)}
                                                onRecalculate={() => recalculate(index)}
                                            />
                                            <InputError message={fieldError(`lines.${index}.amount`)} />
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:bg-danger-bg hover:text-danger-fg mt-6"
                                            aria-label={`Retirer la ligne ${product ? product.name : index + 1}`}
                                            title="Retirer cette ligne"
                                            disabled={data.lines.length === 1}
                                            onClick={() =>
                                                setData(
                                                    'lines',
                                                    data.lines.filter((_, i) => i !== index),
                                                )
                                            }
                                        >
                                            <Trash2 aria-hidden="true" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section aria-labelledby="ads-title" className="glass space-y-4 rounded-2xl p-5 md:p-6">
                        <div>
                            <StepTitle id="ads-title" step={3}>
                                Publicité du jour, pour ces produits
                            </StepTitle>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Ce que vous avez payé aujourd'hui pour les produits de ce rapport. Une même pub n'est jamais comptée deux fois.
                            </p>
                        </div>

                        {adProducts.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Choisissez d'abord les produits livrés : une carte apparaît pour chacun.</p>
                        ) : (
                            !data.no_ads &&
                            adProducts.map((productId) => {
                                const name = productById(productId)?.name ?? 'Produit';
                                const shared = sharedAdOf(productId);
                                const entry = adEntry(productId);
                                const showFields = !shared || entry.choice === 'separate';

                                return (
                                    <div key={productId} className={cn('flex flex-col gap-3.5 rounded-2xl border p-4', shared && 'bg-muted/60')}>
                                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                                            <h3 className="text-[15px] font-bold">{name}</h3>
                                            {shared && (
                                                <span className="badge-info inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold">
                                                    <Info className="size-3.5" aria-hidden="true" />
                                                    Pub déjà notée aujourd'hui
                                                </span>
                                            )}
                                        </div>

                                        {shared && (
                                            <>
                                                <p className="text-[15px]">
                                                    <span className="font-semibold tabular-nums">{sharedAdText(shared)}</span>,{' '}
                                                    {shared.noted_by
                                                        ? `notés dans le rapport d'${shared.noted_by}. Ce produit est aussi livré par cette agence.`
                                                        : 'notés dans « Dépenses publicitaires ».'}
                                                </p>
                                                <fieldset className="flex flex-col gap-2">
                                                    <legend className="mb-2 text-sm font-bold">Pour cette agence :</legend>
                                                    <ChoiceCard
                                                        name={`ad-choice-${productId}`}
                                                        checked={entry.choice === 'same'}
                                                        onSelect={() => updateAd(productId, { choice: 'same' })}
                                                        title="C'est la même pub pour les deux agences"
                                                        help={`Les ${formatFcfa(shared.amount)} sont partagés selon les livraisons de chaque agence. Rien à retaper.`}
                                                    />
                                                    <ChoiceCard
                                                        name={`ad-choice-${productId}`}
                                                        checked={entry.choice === 'separate'}
                                                        onSelect={() => updateAd(productId, { choice: 'separate' })}
                                                        title="J'ai payé une pub à part pour cette agence"
                                                        help="Vous notez son montant ici, comme pour un autre produit."
                                                    />
                                                </fieldset>
                                            </>
                                        )}

                                        {showFields && (
                                            <AdFields
                                                productId={productId}
                                                entry={entry}
                                                cost={adCost(productId)}
                                                error={(field) => adError(productId, field)}
                                                onChange={(changes) => updateAd(productId, changes)}
                                            />
                                        )}

                                        {shared && (
                                            <Link
                                                href={route('ad-spends.index')}
                                                className="text-primary inline-flex min-h-11 items-center self-start font-bold underline underline-offset-4"
                                            >
                                                {shared.noted_by ? `Modifier la pub d'${shared.noted_by}` : 'Modifier cette pub'}
                                            </Link>
                                        )}
                                    </div>
                                );
                            })
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
                    </section>

                    <section aria-labelledby="fees-title" className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-2 md:p-6">
                        <div className="sm:col-span-2">
                            <StepTitle id="fees-title" step={4}>
                                Frais de l'agence
                            </StepTitle>
                            <p className="text-muted-foreground text-sm">Laissez vide ce qui ne s'applique pas.</p>
                        </div>
                        <MoneyField
                            id="delivery_fees"
                            label="Frais de livraison (F)"
                            value={data.delivery_fees}
                            error={errors.delivery_fees}
                            onChange={(v) => setData('delivery_fees', v)}
                        />
                        <MoneyField
                            id="closing_fees"
                            label="Closing et crédit d'appel (F)"
                            help="Commissions des personnes qui confirment les commandes, et crédit téléphonique"
                            value={data.closing_fees}
                            error={errors.closing_fees}
                            onChange={(v) => setData('closing_fees', v)}
                        />
                        <MoneyField
                            id="other_fees"
                            label="Autres frais (F)"
                            value={data.other_fees}
                            error={errors.other_fees}
                            onChange={(v) => setData('other_fees', v)}
                        />
                        <MoneyField
                            id="announced_total"
                            label="Total écrit par l'agence (F)"
                            help="Facultatif. Sert de contrôle : s'il ne correspond pas à vos lignes, le rapport sera marqué « à vérifier »"
                            value={data.announced_total}
                            error={errors.announced_total}
                            onChange={(v) => setData('announced_total', v)}
                        />
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="note">Note (facultatif)</Label>
                            <Input
                                id="note"
                                value={data.note}
                                onChange={(e) => setData('note', e.target.value)}
                                placeholder="Exemple : 2 colis envoyés dans une autre ville"
                            />
                            <InputError message={errors.note} />
                        </div>
                    </section>
                </div>

                <aside
                    aria-labelledby="recap-title"
                    className="glass-hero sticky bottom-[92px] z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-4 shadow-[var(--shadow-raised)] md:bottom-4 lg:top-6 lg:bottom-auto lg:flex lg:flex-col lg:items-stretch lg:p-6"
                >
                    <h2 id="recap-title" className="hidden font-[family-name:var(--font-sans)] text-lg font-bold lg:block">
                        Ce qu'il vous reste
                    </h2>
                    <dl className="hidden flex-col gap-1.5 border-b border-white/15 pb-3 text-sm lg:flex">
                        <SummaryLine label="Argent encaissé" value={formatFcfa(salesTotal)} />
                        <SummaryLine label="Prix d'achat des produits" value={`− ${formatFcfa(purchaseCost)}`} />
                        <SummaryLine label="Frais de l'agence" value={`− ${formatFcfa(fees)}`} />
                        <SummaryLine label="Pub du jour" value={`− ${formatFcfa(adTotal)}`} />
                    </dl>
                    <div className="min-w-0 lg:flex lg:items-baseline lg:justify-between lg:gap-3">
                        <p className="text-hero-muted lg:text-hero-foreground text-sm font-semibold">Bénéfice net du jour</p>
                        <p
                            className={cn(
                                'mt-1 font-[family-name:var(--font-display)] text-[26px] leading-none font-bold tabular-nums lg:mt-0 lg:text-[32px]',
                                netProfit < 0 && 'text-on-hero-loss',
                            )}
                            aria-live="polite"
                        >
                            {formatFcfa(netProfit)}
                        </p>
                    </div>
                    {sharedNotes.map(({ productId, shared }) => (
                        <p key={productId} className="text-hero-muted hidden text-xs lg:block">
                            {productById(productId)?.name} : la pub {shared.noted_by ? `d'${shared.noted_by}` : 'déjà notée'} est partagée selon les
                            livraisons. Elle n'est pas retirée une deuxième fois.
                        </p>
                    ))}
                    {announcedMismatch && (
                        <p role="status" className="text-on-hero-gold col-span-2 flex items-start gap-2 text-sm font-semibold">
                            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <span>L'agence a écrit {formatFcfa(toNumber(data.announced_total))} : le rapport sera « à vérifier ».</span>
                        </p>
                    )}
                    <div className="flex gap-2 lg:flex-col">
                        <Button
                            type="submit"
                            size="lg"
                            disabled={processing}
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 flex-1 lg:w-full lg:flex-none"
                        >
                            {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                            <span className="lg:hidden">Enregistrer</span>
                            <span className="hidden lg:inline">{editing ? 'Enregistrer les modifications' : 'Enregistrer le rapport'}</span>
                        </Button>
                        <Button
                            asChild
                            variant="ghost"
                            className="text-hero-foreground hover:text-hero-foreground hidden hover:bg-white/10 lg:inline-flex"
                        >
                            <Link href={route('reports.index')}>Annuler</Link>
                        </Button>
                    </div>
                </aside>
            </form>
        </AppLayout>
    );
}
