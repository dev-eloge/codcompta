import LegalLayout, { Contact, type LegalPageProps, Section } from '@/layouts/legal-layout';
import { Link } from '@inertiajs/react';

function Line({ label, value }: { label: string; value: string | null }) {
    if (!value) {
        return null;
    }

    return (
        <div className="grid gap-0.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="font-medium">{value}</dd>
        </div>
    );
}

export default function LegalNotice({ legal, appUrl }: LegalPageProps) {
    return (
        <LegalLayout title="Mentions légales" intro="Qui édite CODCompta, qui l'héberge, et comment nous contacter." updatedOn={legal.updated_on}>
            <Section title="Éditeur du site">
                <dl className="space-y-3">
                    <Line label="Nom" value={legal.publisher} />
                    <Line label="Responsable de la publication" value={legal.responsible} />
                    <Line label="Immatriculation" value={legal.registration} />
                    <Line label="Adresse" value={legal.address} />
                    <Line label="Téléphone" value={legal.phone} />
                    <Line label="Email" value={legal.email} />
                    <Line label="Site" value={appUrl} />
                </dl>
            </Section>

            <Section title="Hébergement">
                {legal.host ? (
                    <dl className="space-y-3">
                        <Line label="Hébergeur" value={legal.host} />
                        <Line label="Adresse" value={legal.host_address} />
                    </dl>
                ) : (
                    <p>Le site et ses données sont hébergés sur un serveur privé loué par l'éditeur.</p>
                )}
            </Section>

            <Section title="Propriété intellectuelle">
                <p>
                    Le nom CODCompta, le logo, la mascotte Sika, les textes, les illustrations et le code du site appartiennent à l'éditeur. Vous ne
                    pouvez pas les copier ou les réutiliser sans son accord écrit.
                </p>
                <p>Les chiffres que vous saisissez dans CODCompta restent les vôtres.</p>
            </Section>

            <Section title="Données personnelles">
                <p>
                    La façon dont nous utilisons et protégeons vos données est expliquée dans la{' '}
                    <Link href={route('legal.privacy')} className="text-primary font-semibold underline-offset-4 hover:underline">
                        politique de confidentialité
                    </Link>
                    .
                </p>
            </Section>

            <Section title="Contact">
                <p>
                    Pour toute question sur le site : <Contact legal={legal} />.
                </p>
            </Section>
        </LegalLayout>
    );
}
