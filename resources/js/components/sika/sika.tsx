import { cn } from '@/lib/utils';
import { useId } from 'react';

export type SikaMood = 'nudge' | 'party' | 'calm';

/**
 * Sika, the CODCompta mascot: the gold coin of the logo, alive.
 * "Sika" means money (and gold) in Ewe, spoken in Lomé.
 * Pure SVG in the brand colours, so it stays sharp and themable.
 */
export function Sika({ mood = 'calm', className, title }: { mood?: SikaMood; className?: string; title?: string }) {
    const id = useId().replace(/:/g, '');

    return (
        <svg
            viewBox="0 0 120 120"
            className={cn('overflow-visible', className)}
            role={title ? 'img' : undefined}
            aria-hidden={title ? undefined : true}
            aria-label={title}
        >
            <defs>
                <radialGradient id={`${id}-face`} cx="40%" cy="35%" r="70%">
                    <stop offset="0%" stopColor="#FFE7B8" />
                    <stop offset="45%" stopColor="#F4B23E" />
                    <stop offset="100%" stopColor="#D8921F" />
                </radialGradient>
            </defs>

            {mood === 'party' && (
                <g className="sika-confetti">
                    <rect x="8" y="14" width="7" height="7" rx="1.5" fill="#5FD3B0" transform="rotate(20 11 17)" />
                    <rect x="100" y="10" width="7" height="7" rx="1.5" fill="#E4654A" transform="rotate(-15 103 13)" />
                    <circle cx="106" cy="44" r="3.5" fill="#0F8A6C" />
                    <circle cx="12" cy="52" r="3" fill="#F4B23E" />
                    <rect x="92" y="96" width="6" height="6" rx="1.5" fill="#5FD3B0" transform="rotate(35 95 99)" />
                </g>
            )}

            {/* Arms: one waves at the user, or both cheer. */}
            {mood === 'party' ? (
                <>
                    <path d="M26 66 Q12 50 16 34" stroke="#D8921F" strokeWidth="6" strokeLinecap="round" fill="none" />
                    <path d="M94 66 Q108 50 104 34" stroke="#D8921F" strokeWidth="6" strokeLinecap="round" fill="none" />
                </>
            ) : (
                <>
                    <path d="M26 72 Q16 80 18 90" stroke="#D8921F" strokeWidth="6" strokeLinecap="round" fill="none" />
                    <path
                        className={mood === 'nudge' ? 'sika-wave' : undefined}
                        d="M94 66 Q110 58 108 42"
                        stroke="#D8921F"
                        strokeWidth="6"
                        strokeLinecap="round"
                        fill="none"
                    />
                </>
            )}

            {/* The coin. */}
            <circle cx="60" cy="62" r="38" fill={`url(#${id}-face)`} stroke="#B9791A" strokeWidth="3" />
            <circle cx="60" cy="62" r="30" fill="none" stroke="#FFE7B8" strokeOpacity="0.7" strokeWidth="2.5" />

            {/* Face. */}
            {mood === 'party' ? (
                <>
                    <path d="M36 52 h48 l-3 9 q-2 6 -9 6 h-4 q-6 0 -8 -6 h-0 q-2 6 -8 6 h-4 q-7 0 -9 -6 z" fill="#0B2A33" />
                    <path d="M44 55 l6 0" stroke="#5FD3B0" strokeWidth="2" strokeLinecap="round" />
                </>
            ) : (
                <>
                    <ellipse cx="48" cy="56" rx="4.5" ry="5.5" fill="#0B2A33" />
                    {mood === 'nudge' ? (
                        <path d="M67 56 q5 -4 10 0" stroke="#0B2A33" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                    ) : (
                        <ellipse cx="72" cy="56" rx="4.5" ry="5.5" fill="#0B2A33" />
                    )}
                    <circle cx="49.5" cy="54" r="1.5" fill="#FFFFFF" />
                </>
            )}
            <circle cx="40" cy="70" r="5" fill="#E4654A" fillOpacity="0.35" />
            <circle cx="80" cy="70" r="5" fill="#E4654A" fillOpacity="0.35" />
            {mood === 'party' ? (
                <path d="M46 72 q14 16 28 0 z" fill="#0B2A33" />
            ) : (
                <path d="M49 74 q11 9 22 0" stroke="#0B2A33" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            )}

            {/* The F of the franc, engraved on the forehead. */}
            <text x="60" y="44" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="800" fontSize="11" fill="#B9791A">
                F
            </text>
        </svg>
    );
}
