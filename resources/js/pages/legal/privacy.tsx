import LegalLayout, { Contact, type LegalPageProps, Section } from '@/layouts/legal-layout';

const list = 'list-disc space-y-1.5 pl-5 marker:text-primary';

export default function Privacy({ legal }: LegalPageProps) {
    return (
        <LegalLayout
            title="Politique de confidentialité"
            intro="Ce que CODCompta enregistre sur vous et sur votre boutique, pourquoi, avec qui c'est partagé, et vos droits."
            updatedOn={legal.updated_on}
        >
            <Section title="En bref">
                <ul className={list}>
                    <li>
                        Vos chiffres servent uniquement à calculer vos résultats. Nous ne les vendons pas et ne les utilisons pas pour de la
                        publicité.
                    </li>
                    <li>Le site n'utilise aucun cookie publicitaire ni outil de mesure d'audience.</li>
                    <li>Vous pouvez demander à tout moment une copie ou la suppression de vos données.</li>
                </ul>
            </Section>

            <Section title="Qui est responsable de vos données">
                <p>
                    {legal.publisher ?? "L'éditeur de CODCompta"}
                    {legal.address ? `, ${legal.address}` : ''}. Contact : <Contact legal={legal} />.
                </p>
            </Section>

            <Section title="Les données que nous enregistrons">
                <ul className={list}>
                    <li>
                        <strong>Votre compte</strong> : nom, adresse email, mot de passe (enregistré chiffré, personne ne peut le lire) et, si vous
                        utilisez « Continuer avec Google », l'identifiant de votre compte Google.
                    </li>
                    <li>
                        <strong>Votre activité</strong> : pays, agences, produits et prix, rapports des agences, messages WhatsApp que vous collez,
                        dépenses publicitaires et objectifs.
                    </li>
                    <li>
                        <strong>Les notifications</strong> : si vous les activez, l'adresse technique que votre navigateur nous donne pour vous les
                        envoyer.
                    </li>
                    <li>
                        <strong>La sécurité</strong> : les informations de connexion nécessaires pour garder votre session ouverte et protéger votre
                        compte.
                    </li>
                </ul>
            </Section>

            <Section title="Pourquoi nous les utilisons">
                <ul className={list}>
                    <li>Calculer votre bénéfice, vos résultats par agence et l'avancement de vos objectifs.</li>
                    <li>Lire automatiquement les messages WhatsApp que vous collez.</li>
                    <li>
                        Vous envoyer les notifications de Sika, si vous les avez activées, et les emails liés à votre compte (mot de passe oublié).
                    </li>
                    <li>
                        Vous aider en cas de problème : l'équipe de CODCompta peut consulter votre compte pour vous assister. Chaque accès est
                        enregistré dans un journal.
                    </li>
                </ul>
            </Section>

            <Section title="Avec qui elles sont partagées">
                <p>Seulement avec les services indispensables au fonctionnement du site :</p>
                <ul className={list}>
                    <li>
                        <strong>L'hébergeur du site</strong>
                        {legal.host ? ` (${legal.host})` : ''}, qui stocke les données sur son serveur.
                    </li>
                    <li>
                        <strong>Anthropic (Claude)</strong> reçoit le texte des messages WhatsApp que vous collez, pour les lire. Selon ses conditions
                        pour les entreprises, Anthropic n'utilise pas ces textes pour entraîner ses modèles.
                    </li>
                    <li>
                        <strong>Google</strong>, uniquement si vous choisissez « Continuer avec Google » pour vous connecter.
                    </li>
                    <li>
                        <strong>Le service de notifications de votre navigateur</strong> (Google, Apple, Mozilla ou Microsoft), qui transmet les
                        notifications sous forme chiffrée.
                    </li>
                    <li>
                        <strong>Le service d'envoi d'emails</strong>, pour les messages liés à votre compte.
                    </li>
                </ul>
                <p>Certains de ces services sont situés hors de votre pays, notamment aux États-Unis et en Europe.</p>
            </Section>

            <Section title="Cookies et stockage sur votre appareil">
                <ul className={list}>
                    <li>Deux cookies indispensables : l'un garde votre session ouverte, l'autre protège les formulaires contre les fraudes.</li>
                    <li>
                        Votre navigateur garde aussi quelques préférences : thème clair ou sombre, rappels de Sika, proposition d'installer
                        l'application.
                    </li>
                    <li>
                        Si vous regardez la vidéo de démonstration, elle est lue par Vimeo ou YouTube, en mode sans suivi publicitaire quand ce mode
                        existe.
                    </li>
                </ul>
            </Section>

            <Section title="Combien de temps nous les gardons">
                <p>
                    Vos données sont gardées tant que votre compte existe. Vous pouvez supprimer votre compte dans Paramètres. Pour effacer aussi
                    toutes les données de votre boutique (rapports, produits, objectifs), écrivez-nous : nous les supprimons dans les meilleurs
                    délais.
                </p>
            </Section>

            <Section title="Vos droits">
                <p>
                    Vous pouvez demander à consulter, corriger, recevoir une copie ou supprimer vos données, et vous opposer à leur utilisation.
                    Écrivez à <Contact legal={legal} /> : nous répondons dans un délai d'un mois au plus.
                </p>
                <p>
                    Ces droits sont prévus par la loi togolaise n° 2019-014 du 29 octobre 2019 relative à la protection des données à caractère
                    personnel, et par les lois équivalentes de votre pays. Si notre réponse ne vous satisfait pas, vous pouvez saisir l'autorité de
                    protection des données de votre pays (au Togo, l'Instance de protection des données à caractère personnel, IPDCP).
                </p>
            </Section>

            <Section title="Sécurité">
                <p>
                    Le site est chiffré (HTTPS), les mots de passe ne sont jamais stockés en clair, et chaque boutique ne voit que ses propres
                    données.
                </p>
            </Section>
        </LegalLayout>
    );
}
