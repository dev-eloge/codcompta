import { useEffect, useState } from 'react';

/**
 * Adds "is-visible" to every ".reveal" element once it scrolls into view, so it fades in once.
 */
export function useReveal() {
    useEffect(() => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));

        if (!('IntersectionObserver' in window)) {
            elements.forEach((element) => element.classList.add('is-visible'));

            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
        );

        elements.forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, []);
}

/**
 * Counts from 0 up to a number when the page opens, for headline figures.
 */
export function useCountUp(target: number, duration = 1400): number {
    const [value, setValue] = useState(target);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setValue(target);

            return;
        }

        let frame = 0;
        const start = performance.now();

        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased));

            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        };

        setValue(0);
        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [target, duration, setValue]);

    return value;
}
