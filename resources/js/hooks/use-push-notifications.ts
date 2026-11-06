import { isIos, isStandalone } from '@/hooks/use-install-prompt';
import { useCallback, useEffect, useState } from 'react';

export type PushState = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(base64Url: string): Uint8Array {
    const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);

    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function csrfToken(): string {
    const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='));

    return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : '';
}

async function send(url: string, method: 'POST' | 'DELETE', body?: unknown): Promise<Response> {
    const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': csrfToken() },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(String(response.status));
    }

    return response;
}

async function registration(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration('/');

    if (existing) {
        return existing;
    }

    await navigator.serviceWorker.register('/sw.js');

    return navigator.serviceWorker.ready;
}

/** True when the browser subscription was made with the server's current key (keys can be regenerated). */
function sameKey(subscription: PushSubscription, publicKey: string): boolean {
    const used = subscription.options?.applicationServerKey;

    if (!used) {
        return true;
    }

    const current = keyBytes(publicKey);
    const bytes = new Uint8Array(used);

    return bytes.length === current.length && bytes.every((byte, index) => byte === current[index]);
}

function deviceName(): string {
    const agent = navigator.userAgent;
    const system = /android/i.test(agent)
        ? 'Android'
        : isIos()
          ? 'iPhone ou iPad'
          : /windows/i.test(agent)
            ? 'Windows'
            : /mac/i.test(agent)
              ? 'Mac'
              : 'Ordinateur';

    return isStandalone() ? `${system} (application)` : system;
}

/**
 * Sika's notifications on this device: where they stand, and how to turn them on or off.
 */
export function usePushNotifications(publicKey: string | null) {
    const [state, setState] = useState<PushState>('loading');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!supported()) {
            setState(isIos() && !isStandalone() ? 'needs-install' : 'unsupported');

            return;
        }

        if (Notification.permission === 'denied') {
            setState('denied');

            return;
        }

        // Check the subscription against the server on every visit: a key change or a lost record would otherwise
        // show "activées" while nothing can arrive.
        navigator.serviceWorker
            .getRegistration('/')
            .then(async (found) => {
                const subscription = (await found?.pushManager.getSubscription()) ?? null;

                if (!subscription || Notification.permission !== 'granted' || !publicKey) {
                    setState('off');

                    return;
                }

                if (!sameKey(subscription, publicKey)) {
                    await subscription.unsubscribe();
                    setState('off');

                    return;
                }

                await send(route('push.subscribe'), 'POST', { ...subscription.toJSON(), device: deviceName() });
                setState('on');
            })
            .catch(() => setState('off'));
    }, [publicKey]);

    const turnOn = useCallback(async () => {
        if (!publicKey) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                setState(permission === 'denied' ? 'denied' : 'off');

                return;
            }

            const worker = await registration();
            let subscription = await worker.pushManager.getSubscription();

            if (subscription && !sameKey(subscription, publicKey)) {
                await subscription.unsubscribe();
                subscription = null;
            }

            subscription ??= await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) as BufferSource });

            await send(route('push.subscribe'), 'POST', { ...subscription.toJSON(), device: deviceName() });
            setState('on');
        } catch {
            setError("Impossible d'activer les notifications pour le moment. Vérifiez votre connexion, puis réessayez.");
        } finally {
            setBusy(false);
        }
    }, [publicKey]);

    const turnOff = useCallback(async () => {
        setBusy(true);
        setError(null);

        try {
            const subscription = await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();

            if (subscription) {
                await send(route('push.unsubscribe'), 'DELETE', { endpoint: subscription.endpoint });
                await subscription.unsubscribe();
            }

            setState('off');
        } catch {
            setError('Impossible de désactiver les notifications pour le moment. Réessayez dans un instant.');
        } finally {
            setBusy(false);
        }
    }, []);

    const sendTest = useCallback(async (): Promise<boolean> => {
        setBusy(true);
        setError(null);

        try {
            const response = await send(route('push.test'), 'POST');
            const { sent } = (await response.json()) as { sent: number };

            if (sent === 0) {
                setError("Le message d'essai n'est pas parti. Désactivez puis réactivez les notifications.");
            }

            return sent > 0;
        } catch {
            setError("Le message d'essai n'est pas parti. Réessayez dans un instant.");

            return false;
        } finally {
            setBusy(false);
        }
    }, []);

    return { state, busy, error, turnOn, turnOff, sendTest };
}
