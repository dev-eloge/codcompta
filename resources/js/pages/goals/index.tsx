import FlashMessage from '@/components/flash-message';
import { GoalCard, daysText, formatLongDate, isActive, metricNames } from '@/components/goals/goal-progress';
import InputError from '@/components/input-error';
import { NativeSelect } from '@/components/native-select';
import { DeleteButton, EditButton } from '@/components/row-actions';
import { Sika } from '@/components/sika/sika';
import { SikaNotifications } from '@/components/sika/sika-notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatFcfa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type GoalMetric, type GoalProgress } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Plus } from 'lucide-react';
import { type FormEventHandler, useMemo, useRef, useState } from 'react';

interface Props {
    allGoals: GoalProgress[];
    today: string;
}

type GoalForm = { title: string; metric: GoalMetric; amount: string; starts_on: string; ends_on: string };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Mes objectifs', href: '/objectifs' }];

const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Date helpers on Y-m-d strings, in UTC so a day never shifts. */
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
    const date = toDate(iso);
    date.setUTCDate(date.getUTCDate() + days);

    return toIso(date);
};
const startOfMonth = (iso: string, shift = 0) => {
    const date = toDate(iso);

    return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + shift, 1)));
};
const endOfMonth = (iso: string, shift = 0) => {
    const date = toDate(iso);

    return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + shift + 1, 0)));
};
const mondayOf = (iso: string) => addDays(iso, -((toDate(iso).getUTCDay() + 6) % 7));
const daysBetween = (from: string, to: string) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000) + 1;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Ready-made date ranges; the merchant can still change both dates. */
function presets(today: string): { key: string; label: string; from: string; to: string; title: string }[] {
    const month = monthName.format(toDate(today));
    const nextMonth = monthName.format(toDate(startOfMonth(today, 1)));
    // "Objectif de novembre 2026", "Objectif d'octobre 2026".
    const goalOf = (name: string) => (/^[aeiouyàâéèêh]/i.test(name) ? `Objectif d'${name}` : `Objectif de ${name}`);
    const monday = mondayOf(today);

    return [
        { key: 'month', label: `Tout ${month}`, from: startOfMonth(today), to: endOfMonth(today), title: goalOf(month) },
        { key: 'rest', label: "D'aujourd'hui à la fin du mois", from: today, to: endOfMonth(today), title: goalOf(month) },
        { key: 'next', label: capitalize(nextMonth), from: startOfMonth(today, 1), to: endOfMonth(today, 1), title: goalOf(nextMonth) },
        { key: 'week', label: 'Cette semaine', from: monday, to: addDays(monday, 6), title: 'Objectif de la semaine' },
        { key: '30', label: '30 prochains jours', from: today, to: addDays(today, 29), title: 'Objectif des 30 prochains jours' },
    ];
}

export default function GoalsIndex({ allGoals, today }: Props) {
    const [editing, setEditing] = useState<GoalProgress | null>(null);
    const [formOpen, setFormOpen] = useState(allGoals.length === 0);
    const formRef = useRef<HTMLDivElement>(null);

    const running = allGoals.filter(isActive);
    const upcoming = allGoals.filter((goal) => goal.status === 'upcoming');
    const finished = allGoals.filter((goal) => !isActive(goal) && goal.status !== 'upcoming');

    const openForm = (goal: GoalProgress | null) => {
        setEditing(goal);
        setFormOpen(true);
        window.setTimeout(() => {
            const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            formRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
            formRef.current?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true });
        }, 50);
    };

    const actions = (goal: GoalProgress) => (
        <>
            <EditButton label={`Modifier « ${goal.title} »`} active={editing?.id === goal.id} onClick={() => openForm(goal)} />
            <DeleteButton
                label={`Supprimer « ${goal.title} »`}
                title={`Supprimer « ${goal.title} » ?`}
                description="L'objectif disparaît. Vos rapports et vos résultats ne changent pas."
                url={route('goals.destroy', goal.id)}
            />
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mes objectifs" />

            <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
                <FlashMessage />

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                        <Sika
                            mood={running.some((goal) => goal.status === 'reached') ? 'party' : 'calm'}
                            className="sika-bob size-12 shrink-0 sm:size-20"
                        />
                        <h1 className="text-[28px] font-bold md:text-[32px]">Mes objectifs</h1>
                    </div>
                    {!formOpen && (
                        <Button onClick={() => openForm(null)} className="self-start sm:self-auto">
                            <Plus aria-hidden="true" />
                            Nouvel objectif
                        </Button>
                    )}
                </div>

                <SikaNotifications />

                {formOpen && (
                    <div ref={formRef} className="scroll-mt-4">
                        <GoalFormCard
                            key={editing?.id ?? 'new'}
                            goal={editing}
                            today={today}
                            onDone={() => {
                                setEditing(null);
                                setFormOpen(false);
                            }}
                            canCancel={allGoals.length > 0}
                        />
                    </div>
                )}

                <GoalSection title="En cours" goals={running} actions={actions} empty="Aucun objectif en cours." />
                {upcoming.length > 0 && <GoalSection title="À venir" goals={upcoming} actions={actions} />}
                {finished.length > 0 && <GoalSection title="Terminés" goals={finished} actions={actions} />}
            </div>
        </AppLayout>
    );
}

function GoalSection({
    title,
    goals,
    actions,
    empty,
}: {
    title: string;
    goals: GoalProgress[];
    actions: (goal: GoalProgress) => React.ReactNode;
    empty?: string;
}) {
    const id = `goals-${title.replace(/\W+/g, '-').toLowerCase()}`;

    return (
        <section aria-labelledby={id} className="space-y-3">
            <h2 id={id} className="text-lg font-semibold">
                {title} <span className="text-muted-foreground text-sm font-normal tabular-nums">({goals.length})</span>
            </h2>
            {goals.length === 0 ? (
                <p className="glass text-muted-foreground rounded-2xl p-5 text-sm">{empty}</p>
            ) : (
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {goals.map((goal) => (
                        <GoalCard key={goal.id} goal={goal} actions={actions(goal)} />
                    ))}
                </ul>
            )}
        </section>
    );
}

/**
 * Create or change a goal: dates (with shortcuts), a name, the amount and what it is measured on.
 */
function GoalFormCard({ goal, today, onDone, canCancel }: { goal: GoalProgress | null; today: string; onDone: () => void; canCancel: boolean }) {
    const choices = useMemo(() => presets(today), [today]);
    const first = choices[0];
    const [titleTouched, setTitleTouched] = useState(goal !== null);

    const { data, setData, post, put, processing, errors } = useForm<GoalForm>(
        goal
            ? { title: goal.title, metric: goal.metric, amount: String(goal.target), starts_on: goal.from, ends_on: goal.to }
            : { title: first.title, metric: 'profit', amount: '', starts_on: first.from, ends_on: first.to },
    );

    const days = data.starts_on && data.ends_on && data.ends_on >= data.starts_on ? daysBetween(data.starts_on, data.ends_on) : 0;
    const amount = Number(data.amount) || 0;
    const activePreset = choices.find((choice) => choice.from === data.starts_on && choice.to === data.ends_on)?.key;

    const applyPreset = (choice: (typeof choices)[number]) =>
        setData((current) => ({ ...current, starts_on: choice.from, ends_on: choice.to, title: titleTouched ? current.title : choice.title }));

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onDone };

        if (goal) {
            put(route('goals.update', goal.id), options);
        } else {
            post(route('goals.store'), options);
        }
    };

    return (
        <form onSubmit={submit} aria-labelledby="goal-form-title" className="glass space-y-6 rounded-2xl p-5 md:p-6">
            <div className="space-y-1">
                <h2 id="goal-form-title" className="text-lg font-semibold">
                    {goal ? `Modifier « ${goal.title} »` : 'Nouvel objectif'}
                </h2>
                <p className="text-muted-foreground text-sm">Choisissez la période, puis le montant à atteindre.</p>
            </div>

            <fieldset className="space-y-3">
                <legend className="text-sm font-medium">1. La période</legend>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Raccourcis de période">
                    {choices.map((choice) => (
                        <button
                            key={choice.key}
                            type="button"
                            aria-pressed={activePreset === choice.key}
                            onClick={() => applyPreset(choice)}
                            className={cn(
                                'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                                activePreset === choice.key
                                    ? 'bg-primary border-primary text-primary-foreground'
                                    : 'bg-muted/50 hover:border-primary/60',
                            )}
                        >
                            {choice.label}
                        </button>
                    ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="goal-from">Premier jour *</Label>
                        <Input
                            id="goal-from"
                            type="date"
                            required
                            value={data.starts_on}
                            aria-invalid={errors.starts_on ? true : undefined}
                            onChange={(event) => setData('starts_on', event.target.value)}
                        />
                        <InputError message={errors.starts_on} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="goal-to">Dernier jour *</Label>
                        <Input
                            id="goal-to"
                            type="date"
                            required
                            min={data.starts_on || undefined}
                            value={data.ends_on}
                            aria-invalid={errors.ends_on ? true : undefined}
                            onChange={(event) => setData('ends_on', event.target.value)}
                        />
                        <InputError message={errors.ends_on} />
                    </div>
                </div>
                <p className="text-muted-foreground text-xs">
                    Vous n'avez pas commencé le 1er du mois ? Choisissez simplement votre vrai premier jour.
                </p>
            </fieldset>

            <fieldset className="space-y-3">
                <legend className="text-sm font-medium">2. Le montant</legend>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
                    <div className="grid gap-1.5">
                        <Label htmlFor="goal-amount">Montant à atteindre (F CFA) *</Label>
                        <Input
                            id="goal-amount"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            required
                            placeholder="1000000"
                            value={data.amount}
                            aria-invalid={errors.amount ? true : undefined}
                            onChange={(event) => setData('amount', event.target.value)}
                        />
                        <InputError message={errors.amount} />
                    </div>
                    <div className="grid content-start gap-1.5">
                        <Label htmlFor="goal-metric">Calculé sur</Label>
                        <NativeSelect id="goal-metric" value={data.metric} onChange={(event) => setData('metric', event.target.value as GoalMetric)}>
                            <option value="profit">Le bénéfice net</option>
                            <option value="revenue">Le chiffre d'affaires</option>
                        </NativeSelect>
                    </div>
                </div>
                <p className="text-muted-foreground text-xs">
                    Bénéfice net : ce qui reste après le prix d'achat, la publicité, le closing et la livraison. Chiffre d'affaires : tout l'argent
                    encaissé à la livraison.
                </p>
            </fieldset>

            <div className="grid gap-1.5">
                <Label htmlFor="goal-title">3. Nom de l'objectif (facultatif)</Label>
                <Input
                    id="goal-title"
                    maxLength={80}
                    placeholder="Objectif de janvier"
                    value={data.title}
                    aria-invalid={errors.title ? true : undefined}
                    onChange={(event) => {
                        setTitleTouched(true);
                        setData('title', event.target.value);
                    }}
                />
                <InputError message={errors.title} />
            </div>

            {days > 0 && (
                <div aria-live="polite" className="border-primary/25 bg-primary/8 space-y-1 rounded-xl border p-4 text-sm">
                    <p className="font-semibold">{data.title || 'Votre objectif'}</p>
                    <p>
                        Du {formatLongDate(data.starts_on)} au {formatLongDate(data.ends_on)}, soit {daysText(days)}.
                    </p>
                    {amount > 0 && (
                        <p>
                            <strong className="tabular-nums">{formatFcfa(amount)}</strong> de {metricNames[data.metric]}, soit environ{' '}
                            <strong className="tabular-nums">{formatFcfa(Math.ceil(amount / days))}</strong> par jour
                            {days >= 14 && (
                                <>
                                    {' '}
                                    et <strong className="tabular-nums">{formatFcfa(Math.ceil((amount / days) * 7))}</strong> par semaine
                                </>
                            )}
                            .
                        </p>
                    )}
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={processing}>
                    {processing && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                    {goal ? 'Enregistrer les modifications' : "Enregistrer l'objectif"}
                </Button>
                {canCancel && (
                    <Button type="button" variant="ghost" onClick={onDone}>
                        Annuler
                    </Button>
                )}
            </div>
        </form>
    );
}
