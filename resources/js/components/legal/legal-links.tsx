import { Link } from '@inertiajs/react';

const links = [
    { name: 'legal.notice', label: 'Mentions légales' },
    { name: 'legal.privacy', label: 'Confidentialité' },
    { name: 'legal.terms', label: "Conditions d'utilisation" },
];

/**
 * Links to the three legal pages, for the footers of public pages.
 */
export function LegalLinks({ className = '' }: { className?: string }) {
    return (
        <nav aria-label="Informations légales" className={className}>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {links.map((link) => (
                    <li key={link.name}>
                        <Link
                            href={route(link.name)}
                            className="hover:text-primary inline-block py-2 underline-offset-4 transition-colors hover:underline"
                        >
                            {link.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
