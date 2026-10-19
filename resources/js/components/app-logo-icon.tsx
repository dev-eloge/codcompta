import { SVGAttributes, useId } from 'react';

/**
 * CODCompta mark: three rising bars (the weekly profit) under a gold coin (the cash collected on delivery).
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    const gradientId = useId();

    return (
        <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CODCompta" {...props}>
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#14B89A" />
                    <stop offset="1" stopColor="#0B6B55" />
                </linearGradient>
            </defs>
            <rect width="40" height="40" rx="11" fill={`url(#${gradientId})`} />
            <rect x="8.5" y="21" width="5.5" height="11" rx="1.6" fill="#FFFFFF" fillOpacity="0.7" />
            <rect x="17.25" y="16" width="5.5" height="16" rx="1.6" fill="#FFFFFF" fillOpacity="0.85" />
            <rect x="26" y="13" width="5.5" height="19" rx="1.6" fill="#FFFFFF" />
            <circle cx="28.75" cy="7.6" r="3.4" fill="#F4B23E" />
            <circle cx="28.75" cy="7.6" r="1.5" fill="#FFF3D6" />
        </svg>
    );
}
