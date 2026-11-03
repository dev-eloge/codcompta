import { isActive } from '@/components/goals/goal-progress';
import { Button } from '@/components/ui/button';
import { formatFcfa } from '@/lib/format';
import { type GoalProgress, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sika } from './sika';

const REMINDER_KEY = 'codcompta.sika.reminder-snoozed-until';
const CELEBRATED_KEY = 'codcompta.sika.celebrated';
const SNOOZE_DAYS = 3;

const nudges = [
    "Un commerçant sans objectif, c'est un livreur sans adresse. On en fixe un ?",
    'Combien veux-tu gagner ce mois-ci ? Dis-le moi, je te suivrai chaque jour.',
    "Moi, c'est Sika. Je grossis quand tu as un objectif. Nourris-moi !",
    'Les gros chiffres commencent par un chiffre écrit quelque part. Écris le tien ?',
];

/** Browser storage can be missing or blocked: never let that break the page. */
function read(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key: string, value: string): void {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Nothing to do: the reminder simply comes back next time.
    }
}

type Moment = { kind: 'nudge'; text: string } | { kind: 'party'; goal: GoalProgress; key: string };

/**
 * Sika pops up in a corner: to suggest a goal when there is none,
 * or to celebrate once when a goal is reached. Never blocks the page, never steals focus.
 */
export function GoalBuddy() {
    const { goals, auth } = usePage<SharedData>().props;
    const path = usePage().url.split('?')[0];
    const [moment, setMoment] = useState<Moment | null>(null);
    const [visible, setVisible] = useState(false);
    const nudgeText = useMemo(() => nudges[Math.floor(Math.random() * nudges.length)], []);

    useEffect(() => {
        if (!auth.user || path.startsWith('/admin') || path.startsWith('/objectifs') || path.startsWith('/settings')) {
            setMoment(null);

            return;
        }

        const list = goals ?? [];
        const celebrated: string[] = JSON.parse(read(CELEBRATED_KEY) ?? '[]');
        const reached = list.find((goal) => goal.status === 'reached' && !celebrated.includes(`goal:${goal.id}`));
        const hasPlan = list.some((goal) => isActive(goal) || goal.status === 'upcoming');

        if (reached) {
            setMoment({ kind: 'party', goal: reached, key: `goal:${reached.id}` });
        } else if (!hasPlan && Number(read(REMINDER_KEY) ?? 0) < Date.now()) {
            setMoment({ kind: 'nudge', text: nudgeText });
        } else {
            setMoment(null);
        }
    }, [goals, auth.user, path, nudgeText]);

    // Let the page settle before Sika jumps in.
    useEffect(() => {
        if (!moment) {
            setVisible(false);

            return;
        }

        const timer = window.setTimeout(() => setVisible(true), 1200);

        return () => window.clearTimeout(timer);
    }, [moment]);

    if (!moment || !visible) {
        return null;
    }

    const close = () => {
        if (moment.kind === 'nudge') {
            write(REMINDER_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
        } else {
            const celebrated: string[] = JSON.parse(read(CELEBRATED_KEY) ?? '[]');
            write(CELEBRATED_KEY, JSON.stringify([...celebrated, moment.key].slice(-30)));
        }

        setMoment(null);
    };

    // Rendered on <body>: inside the app shell, "fixed" would stick to the scrolling panel instead of the screen.
    return createPortal(
        <aside
            aria-label={moment.kind === 'nudge' ? 'Suggestion de Sika' : 'Félicitations de Sika'}
            onKeyDown={(event) => event.key === 'Escape' && close()}
            className="sika-pop fixed right-4 bottom-4 left-4 z-40 flex items-end gap-2 sm:left-auto sm:max-w-sm"
        >
            <Sika mood={moment.kind === 'party' ? 'party' : 'nudge'} className="sika-bob size-20 shrink-0 drop-shadow-lg sm:size-24" />

            <div className="bg-popover text-popover-foreground relative mb-4 flex-1 rounded-2xl rounded-bl-sm border p-4 shadow-xl">
                <button
                    type="button"
                    onClick={close}
                    aria-label="Fermer"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full transition-colors"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>

                <div role="status" aria-live="polite" className="pr-6">
                    {moment.kind === 'nudge' ? (
                        <>
                            <p className="font-[family-name:var(--font-display)] font-bold">Hé, pas d'objectif en cours ?</p>
                            <p className="text-muted-foreground mt-1 text-sm">{moment.text}</p>
                        </>
                    ) : (
                        <>
                            <p className="font-[family-name:var(--font-display)] font-bold">{moment.goal.title} : atteint !</p>
                            <p className="text-muted-foreground mt-1 text-sm">
                                <span className="text-foreground font-semibold tabular-nums">{formatFcfa(moment.goal.achieved)}</span> sur{' '}
                                <span className="tabular-nums">{formatFcfa(moment.goal.target)}</span>. Sika danse pour toi. On vise plus haut la
                                prochaine fois ?
                            </p>
                        </>
                    )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    {moment.kind === 'nudge' ? (
                        <>
                            <Button asChild size="sm">
                                <Link href={route('goals.index')} onClick={() => setMoment(null)}>
                                    Fixer mon objectif
                                </Link>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={close}>
                                Plus tard
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button size="sm" onClick={close}>
                                Merci Sika !
                            </Button>
                            <Button asChild size="sm" variant="ghost">
                                <Link href={route('goals.index')} onClick={close}>
                                    Relever mon objectif
                                </Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </aside>,
        document.body,
    );
}
