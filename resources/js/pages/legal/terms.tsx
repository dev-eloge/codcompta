import LegalLayout, { Contact, type LegalPageProps, Section } from '@/layouts/legal-layout';
import { Link } from '@inertiajs/react';

const list = 'list-disc space-y-1.5 pl-5 marker:text-primary';

export default function Terms({ legal }: LegalPageProps) {
    return (
        <LegalLayout
            title="Conditions d'utilisation"
            intro="Les règles d'utilisation de CODCompta. En créant un compte, vous les acceptez."
            updatedOn={legal.updated_on}
        >
            <Section title="Le service">
                <p>
                    CODCompta aide les e-commerçants qui vendent en paiement à la livraison à suivre leurs résultats : rapports des agences, dépenses,
                    bénéfice net et objectifs. Il est édité par {legal.publisher ?? "l'éditeur indiqué dans les mentions légales"}.
                </p>
            </Section>

            <Section title="Votre compte">
                <ul className={list}>
                    <li>Les informations que vous donnez à l'inscription doivent être exactes.</li>
                    <li>Gardez votre mot de passe secret : tout ce qui est fait depuis votre compte est sous votre responsabilité.</li>
                    <li>Prévenez-nous rapidement si vous pensez que quelqu'un d'autre utilise votre compte.</li>
                </ul>
            </Section>

            <Section title="Vos chiffres et nos calculs">
                <ul className={list}>
                    <li>Les résultats sont calculés à partir des chiffres que vous enregistrez : ils sont justes si vos chiffres le sont.</li>
                    <li>
                        La lecture automatique des messages WhatsApp peut se tromper. Vérifiez chaque rapport avant de l'enregistrer : rien n'est
                        compté sans votre accord.
                    </li>
                    <li>
                        La répartition proposée de votre bénéfice (épargne, poche, réinvestissement) est une simple suggestion, pas un conseil
                        financier.
                    </li>
                    <li>CODCompta est un outil de suivi. Il ne remplace pas un comptable ni vos obligations fiscales et légales.</li>
                </ul>
            </Section>

            <Section title="Ce qui est interdit">
                <ul className={list}>
                    <li>Utiliser CODCompta pour une activité illégale.</li>
                    <li>Essayer d'accéder aux données d'une autre boutique, ou de perturber le fonctionnement du site.</li>
                    <li>Copier ou revendre le service.</li>
                </ul>
                <p>En cas d'abus, nous pouvons suspendre le compte concerné, en vous indiquant la raison.</p>
            </Section>

            <Section title="Disponibilité">
                <p>
                    Nous faisons notre possible pour que CODCompta soit accessible à tout moment. Des coupures peuvent arriver, notamment pour la
                    maintenance ou à cause d'un service extérieur. Nous ne pouvons pas être tenus responsables des pertes liées à une coupure ou à une
                    erreur de saisie.
                </p>
            </Section>

            <Section title="Prix">
                <p>Si des conditions tarifaires sont mises en place, elles vous seront annoncées clairement avant toute facturation.</p>
            </Section>

            <Section title="Vos données">
                <p>
                    Vos chiffres restent les vôtres. Leur utilisation est expliquée dans la{' '}
                    <Link href={route('legal.privacy')} className="text-primary font-semibold underline-offset-4 hover:underline">
                        politique de confidentialité
                    </Link>
                    . Vous pouvez supprimer votre compte à tout moment depuis Paramètres.
                </p>
            </Section>

            <Section title="Changements de ces conditions">
                <p>
                    Nous pouvons faire évoluer ces conditions. En cas de changement important, nous vous prévenons sur le site avant qu'il s'applique.
                </p>
            </Section>

            <Section title="Droit applicable et contact">
                <p>
                    Ces conditions sont soumises au droit togolais. En cas de désaccord, nous chercherons d'abord une solution à l'amiable ; à défaut,
                    les tribunaux de {legal.jurisdiction ?? 'Lomé (Togo)'} seront compétents.
                </p>
                <p>
                    Une question : <Contact legal={legal} />.
                </p>
            </Section>
        </LegalLayout>
    );
}
