import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const handleSystemThemeChange = () => {
    applyTheme(savedAppearance());
};

/**
 * Light is the default. Before this version, opening the settings saved "system" without anyone choosing it,
 * so that old value is reset to light once; a "system" chosen afterwards is kept.
 */
const MIGRATED_KEY = 'appearance-light-default';

function savedAppearance(): Appearance {
    try {
        if (!localStorage.getItem(MIGRATED_KEY)) {
            localStorage.setItem(MIGRATED_KEY, '1');
            if (localStorage.getItem('appearance') === 'system') {
                localStorage.setItem('appearance', 'light');
            }
        }

        return (localStorage.getItem('appearance') as Appearance | null) || 'light';
    } catch {
        return 'light';
    }
}

export function initializeTheme() {
    const initial = savedAppearance();

    applyTheme(initial);

    // Add the event listener for system theme changes...
    mediaQuery.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('light');

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        localStorage.setItem('appearance', mode);
        applyTheme(mode);
    };

    useEffect(() => {
        // Read only: showing the settings page must not save a choice nobody made.
        const saved = savedAppearance();
        setAppearance(saved);
        applyTheme(saved);

        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, []);

    return { appearance, updateAppearance };
}
