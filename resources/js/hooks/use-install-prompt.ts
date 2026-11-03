import { useEffect, useState } from 'react';

/** Chrome, Edge and Android fire this event when the site can be installed as an app. */
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
    interface Window {
        __codcomptaInstallPrompt?: BeforeInstallPromptEvent | null;
    }
}

const listeners = new Set<() => void>();

/**
 * Called once at start-up (app.tsx): keeps the browser's install offer for later and registers the service worker.
 */
export function setUpInstallableApp(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        window.__codcomptaInstallPrompt = event as BeforeInstallPromptEvent;
        listeners.forEach((listener) => listener());
    });

    window.addEventListener('appinstalled', () => {
        window.__codcomptaInstallPrompt = null;
        listeners.forEach((listener) => listener());
    });

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // Without a service worker the site still works; it just cannot be installed.
            });
        });
    }
}

export const isStandalone = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** iPhone and iPad Safari never offer to install: the person adds the site from the Share menu. */
export const isIos = () =>
    typeof navigator !== 'undefined' &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export function useInstallPrompt() {
    const [, refresh] = useState(0);

    useEffect(() => {
        const listener = () => refresh((value) => value + 1);
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    }, []);

    const installed = isStandalone();
    const prompt = typeof window === 'undefined' ? null : (window.__codcomptaInstallPrompt ?? null);

    return {
        /** Already opened as an installed app. */
        installed,
        /** The browser can show its own install window. */
        canPrompt: !installed && prompt !== null,
        /** iPhone or iPad: show the "Share, then Add to Home Screen" steps instead. */
        needsIosSteps: !installed && prompt === null && isIos(),
        install: async (): Promise<boolean> => {
            if (!prompt) {
                return false;
            }

            await prompt.prompt();
            const choice = await prompt.userChoice;
            window.__codcomptaInstallPrompt = null;
            listeners.forEach((listener) => listener());

            return choice.outcome === 'accepted';
        },
    };
}
