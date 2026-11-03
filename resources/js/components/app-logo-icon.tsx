import { SVGAttributes, useId } from 'react';

/**
 * CODCompta mark: a bold "C" (Compta, cash on delivery) holding a gold coin in its opening.
 *
 * - variant "tile": the app icon, white mark on the emerald tile (sidebar, auth pages, favicon).
 * - variant "mark": the symbol alone in emerald, for light backgrounds next to the name.
 * - variant "white": the symbol in white, for emerald or dark backgrounds.
 */
type Variant = 'tile' | 'mark' | 'white';

const ARC = 'M85.46 34.54 A36 36 0 1 0 85.46 85.46';

export default function AppLogoIcon({ variant = 'tile', ...props }: SVGAttributes<SVGElement> & { variant?: Variant }) {
    const id = useId();
    const gradient = `${id}-g`;

    const mark = (stroke: string) => (
        <>
            <path d={ARC} stroke={stroke} strokeWidth="24" fill="none" />
            <circle cx="92" cy="60" r="15" fill="#F4B23E" />
            <circle cx="92" cy="60" r="8.5" fill="none" stroke="#FFE7B8" strokeWidth="2.4" />
        </>
    );

    return (
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CODCompta" {...props}>
            <defs>
                <linearGradient id={gradient} x1="18" y1="14" x2="100" y2="106" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#14B89A" />
                    <stop offset="1" stopColor="#0B6B55" />
                </linearGradient>
            </defs>
            {variant === 'tile' ? (
                <>
                    <rect width="120" height="120" rx="28" fill={`url(#${gradient})`} />
                    <g transform="translate(18 18) scale(0.7)">{mark('#FFFFFF')}</g>
                </>
            ) : (
                mark(variant === 'white' ? '#FFFFFF' : `url(#${gradient})`)
            )}
        </svg>
    );
}
