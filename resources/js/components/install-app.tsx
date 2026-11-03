import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { cn } from '@/lib/utils';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const SNOOZE_KEY = 'codcompta.install.snoozed-until';
const SNOOZE_DAYS = 14;

function snoozed(): boolean {
    try {
        return Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
    } catch {
        return false;
    }
}

function snooze(): void {
    try {
        window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
    } catch {
        // Storage blocked: the offer simply comes back next visit.
    }
}

/**
 * The two steps Safari needs on iPhone and iPad, where no install button exists.
 */
function IosSteps() {
    return (
        <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
                <span
                    aria-hidden="true"
                    className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                >
                    1
                </span>
                <span>
                    En bas de Safari, touchez le bouton <strong>Partager</strong>{' '}
                    <Share className="text-primary inline size-4 align-text-bottom" aria-label="(carré avec une flèche vers le haut)" />.
                </span>
            </li>
            <li className="flex items-start gap-3">
                <span
                    aria-hidden="true"
                    className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                >
                    2
                </span>
                <span>
                    Choisissez <strong>« Sur l'écran d'accueil »</strong>{' '}
                    <SquarePlus className="text-primary inline size-4 align-text-bottom" aria-hidden="true" />, puis <strong>Ajouter</strong>.
                </span>
            </li>
        </ol>
    );
}

/**
 * On the home page: a card that slides up to suggest installing CODCompta as an app.
 * Shown only where installing is possible, never to someone already using the app, and not again for two weeks after "Plus tard".
 */
export function InstallBanner() {
    const { canPrompt, needsIosSteps, install } = useInstallPrompt();
    const [visible, setVisible] = useState(false);
    const [iosOpen, setIosOpen] = useState(false);

    useEffect(() => {
        if (!(canPrompt || needsIosSteps) || snoozed()) {
            setVisible(false);

            return;
        }

        const timer = window.setTimeout(() => setVisible(true), 2500);

        return () => window.clearTimeout(timer);
    }, [canPrompt, needsIosSteps]);

    if (!visible) {
        return null;
    }

    const later = () => {
        snooze();
        setVisible(false);
    };

    return createPortal(
        <aside
            aria-label="Installer l'application"
            onKeyDown={(event) => event.key === 'Escape' && later()}
            className="sika-pop bg-popover text-popover-foreground fixed right-4 bottom-4 left-4 z-40 rounded-2xl border p-4 shadow-2xl sm:left-auto sm:w-96"
        >
            <button
                type="button"
                onClick={later}
                aria-label="Fermer"
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2 flex size-8 items-center justify-center rounded-full transition-colors"
            >
                <X className="size-4" aria-hidden="true" />
            </button>

            <div className="flex gap-3 pr-6">
                <AppLogoIcon className="size-12 shrink-0" aria-hidden="true" />
                <div>
                    <p className="font-[family-name:var(--font-display)] font-bold">Installez l'application CODCompta</p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                        Ouvrez vos résultats en un geste depuis l'écran d'accueil, en plein écran, comme une vraie application. Gratuit, sans passer
                        par un store.
                    </p>
                </div>
            </div>

            {iosOpen && (
                <div className="bg-muted/60 mt-4 rounded-xl p-3">
                    <IosSteps />
                </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
                {canPrompt ? (
                    <Button
                        onClick={async () => {
                            if (await install()) {
                                setVisible(false);
                            }
                        }}
                    >
                        <Download aria-hidden="true" />
                        Installer
                    </Button>
                ) : (
                    !iosOpen && (
                        <Button onClick={() => setIosOpen(true)}>
                            <Download aria-hidden="true" />
                            Comment installer
                        </Button>
                    )
                )}
                <Button variant="ghost" onClick={later}>
                    Plus tard
                </Button>
            </div>
        </aside>,
        document.body,
    );
}

/**
 * In the app's sidebar: a discreet "Installer l'application" entry, for whoever skipped the home-page offer.
 */
export function InstallSidebarButton({ className }: { className?: string }) {
    const { canPrompt, needsIosSteps, install } = useInstallPrompt();
    const [iosOpen, setIosOpen] = useState(false);

    if (!canPrompt && !needsIosSteps) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => (canPrompt ? install() : setIosOpen(true))}
                className={cn(
                    'border-sidebar-border hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-semibold transition-colors group-data-[collapsible=icon]:hidden',
                    className,
                )}
            >
                <Download className="text-primary size-4 shrink-0" aria-hidden="true" />
                Installer l'application
            </button>

            <Dialog open={iosOpen} onOpenChange={setIosOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Installer CODCompta sur votre iPhone</DialogTitle>
                        <DialogDescription>Deux gestes dans Safari, et CODCompta s'ouvre depuis votre écran d'accueil.</DialogDescription>
                    </DialogHeader>
                    <IosSteps />
                </DialogContent>
            </Dialog>
        </>
    );
}
