import { Sika } from '@/components/sika/sika';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Bell, BellOff, LoaderCircle, Send } from 'lucide-react';
import { useState } from 'react';

/**
 * Lets the person receive Sika's news on this phone or computer: new goal, goal reached, goal missed,
 * and reminders when the day's report is missing.
 */
export function SikaNotifications() {
    const { push, auth } = usePage<SharedData>().props;
    const publicKey = push?.publicKey ?? null;
    const { state, busy, error, turnOn, turnOff, sendTest } = usePushNotifications(publicKey);
    const [testSent, setTestSent] = useState(false);

    if (!publicKey) {
        // Only the platform owner can fix this, so only they see why the card is missing.
        return auth.isSuperAdmin ? (
            <p id="notifications" role="status" className="badge-warning scroll-mt-20 rounded-xl px-4 py-3 text-sm font-semibold">
                Notifications désactivées sur ce serveur : lancez <code>php artisan codcompta:vapid</code>, copiez les clés dans le fichier .env, puis
                redémarrez l'application.
            </p>
        ) : null;
    }

    if (state === 'loading') {
        // Keeps the place (and the #notifications anchor of the bell) while the browser answers.
        return <div id="notifications" aria-busy="true" className="glass min-h-[88px] animate-pulse scroll-mt-20 rounded-2xl" />;
    }

    const on = state === 'on';

    return (
        <section
            id="notifications"
            aria-labelledby="sika-notifications-title"
            className="glass flex scroll-mt-20 flex-col gap-4 rounded-2xl p-4 sm:p-5"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-start gap-3">
                    <Sika mood={on ? 'party' : 'nudge'} className="size-11 shrink-0" />
                    <div className="space-y-1">
                        <h2 id="sika-notifications-title" className="text-base font-semibold">
                            {on ? 'Notifications de Sika activées sur cet appareil' : 'Recevez les nouvelles de Sika sur votre téléphone'}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {state === 'needs-install' &&
                                "Sur iPhone et iPad, installez d'abord l'application : bouton Partager, puis « Sur l'écran d'accueil ». Ouvrez-la depuis l'écran d'accueil et revenez ici."}
                            {state === 'unsupported' &&
                                'Ce navigateur ne reçoit pas les notifications. Essayez avec Chrome, Edge, Firefox ou Safari à jour.'}
                            {state === 'denied' &&
                                "Les notifications sont bloquées pour ce site. Autorisez-les dans les réglages du navigateur (le cadenas à gauche de l'adresse), puis rechargez la page."}
                            {state === 'off' && 'Objectif atteint ou manqué, rapport du jour oublié : vous êtes prévenu.'}
                            {on &&
                                'Objectif atteint ou manqué, rapport du jour oublié : vous êtes prévenu. Activez-les aussi sur vos autres appareils.'}
                        </p>
                        <p role="status" aria-live="polite" className="text-sm">
                            {error && <span className="text-danger-fg">{error}</span>}
                            {!error && testSent && <span className="text-primary">Message d'essai envoyé. Il arrive dans quelques secondes.</span>}
                        </p>
                    </div>
                </div>

                {state === 'off' && (
                    <Button onClick={turnOn} disabled={busy} className="self-start sm:self-auto">
                        {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Bell aria-hidden="true" />}
                        Activer les notifications
                    </Button>
                )}

                {on && (
                    <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                        <Button
                            variant="outline"
                            disabled={busy}
                            onClick={async () => {
                                setTestSent(false);
                                setTestSent(await sendTest());
                            }}
                        >
                            {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                            Envoyer un essai
                        </Button>
                        <Button variant="ghost" disabled={busy} onClick={turnOff}>
                            <BellOff aria-hidden="true" />
                            Désactiver
                        </Button>
                    </div>
                )}
            </div>

            {on && <ReportRemindersToggle enabled={push?.reportReminders ?? true} />}
        </section>
    );
}

/** The "no report today" reminders: on by default, the merchant can turn them off. */
function ReportRemindersToggle({ enabled }: { enabled: boolean }) {
    const [saving, setSaving] = useState(false);

    const change = (value: boolean) => {
        setSaving(true);
        router.put(route('push.reminders'), { report_reminders: value }, { preserveScroll: true, onFinish: () => setSaving(false) });
    };

    return (
        <label className="border-border flex cursor-pointer items-start gap-3 border-t pt-4">
            <input
                type="checkbox"
                checked={enabled}
                disabled={saving}
                onChange={(e) => change(e.target.checked)}
                className="accent-primary mt-0.5 size-5 shrink-0"
            />
            <span className="space-y-0.5">
                <span className="block text-[15px] font-semibold">Me rappeler de saisir le rapport du jour</span>
                <span className="text-muted-foreground block text-sm">
                    À 12 h, 17 h et 20 h 30, seulement si aucun rapport n'a été saisi ce jour-là. Après plusieurs jours sans rapport, Sika vous le dit
                    aussi.
                </span>
            </span>
        </label>
    );
}
