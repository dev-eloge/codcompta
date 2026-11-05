import { formatFcfa, formatPercent, formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CircleAlert, TrendingDown } from 'lucide-react';

interface ProfitCause {
    label: string;
    amount: number;
}

interface AgencyDecline {
    name: string;
    decline: number;
}

export interface ProfitDiagnosisData {
    from: string;
    to: string;
    previous_from: string;
    previous_to: string;
    current_profit: number;
    previous_profit: number;
    decline: number;
    decline_ratio: number | null;
    significant: boolean;
    causes: ProfitCause[];
    offsets: ProfitCause[];
    agencies: AgencyDecline[];
}

const advice: Record<string, string> = {
    "Baisse du chiffre d'affaires": 'Vérifiez le nombre de commandes livrées et les ventes de chaque produit.',
    "Hausse du coût d'achat": 'Vérifiez les prix fournisseurs et les produits qui ont le plus pesé sur les coûts.',
    'Hausse des dépenses publicitaires': 'Comparez les campagnes et leur coût avec les ventes qu’elles ont générées.',
    'Hausse des frais de closing': 'Vérifiez les commissions et les frais de confirmation déclarés.',
    'Hausse des frais de livraison': 'Vérifiez les frais facturés et les livraisons de la période.',
    'Hausse des autres frais': 'Vérifiez les autres frais saisis dans les rapports.',
    "Hausse du chiffre d'affaires": 'Cette hausse des ventes a limité le recul du bénéfice.',
    "Baisse du coût d'achat": 'Cette baisse des coûts d’achat a limité le recul du bénéfice.',
    'Baisse des dépenses publicitaires': 'Cette baisse des dépenses publicitaires a limité le recul du bénéfice.',
    'Baisse des frais de closing': 'Cette baisse des frais de closing a limité le recul du bénéfice.',
    'Baisse des frais de livraison': 'Cette baisse des frais de livraison a limité le recul du bénéfice.',
    'Baisse des autres frais': 'Cette baisse des frais a limité le recul du bénéfice.',
};

export function ProfitDiagnosis({ diagnosis }: { diagnosis: ProfitDiagnosisData | null }) {
    if (!diagnosis) {
        return null;
    }

    const causes = diagnosis.causes;
    const firstCause = causes[0];

    return (
        <section
            aria-labelledby="profit-diagnosis-title"
            className={cn(
                'glass space-y-5 rounded-2xl border p-5 md:p-6',
                diagnosis.significant ? 'border-destructive/35 bg-destructive/5' : 'border-border',
            )}
        >
            <div className="flex items-start gap-3">
                <span className={cn('mt-0.5 rounded-full p-2', diagnosis.significant ? 'bg-destructive/12 text-destructive' : 'bg-primary/10 text-primary')}>
                    {diagnosis.significant ? <CircleAlert aria-hidden="true" className="size-5" /> : <TrendingDown aria-hidden="true" className="size-5" />}
                </span>
                <div className="space-y-1">
                    <h2 id="profit-diagnosis-title" className="text-lg font-semibold">
                        {diagnosis.significant ? 'Baisse inhabituelle du bénéfice détectée' : 'Le bénéfice est en recul'}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {formatFcfa(diagnosis.decline)} de moins que sur la période précédente ({formatPeriod(diagnosis.previous_from, diagnosis.previous_to)})
                        {diagnosis.decline_ratio !== null && ` (${formatPercent(diagnosis.decline_ratio)})`}.
                        {!diagnosis.significant && ' Ce recul reste sous le seuil de baisse inhabituelle.'}
                    </p>
                    {diagnosis.significant && (
                        <p className="text-muted-foreground text-xs">
                            Seuil : baisse d’au moins 10 000 F et 15 % si le bénéfice précédent était positif ; 10 000 F s’il était nul ou négatif. Le passage du bénéfice à la perte déclenche aussi l’alerte.
                        </p>
                    )}
                </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Facteurs qui expliquent le recul</h3>
                    {causes.length > 0 ? (
                        <ul className="space-y-2">
                            {causes.map((cause) => (
                                <li key={cause.label} className="flex items-start justify-between gap-3 text-sm">
                                    <span>
                                        <span className="font-medium">{cause.label}</span>
                                        <span className="text-muted-foreground mt-0.5 block">{advice[cause.label]}</span>
                                    </span>
                                    <span className="shrink-0 font-semibold tabular-nums">−{formatFcfa(cause.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-sm">Aucun facteur détaillé ne ressort des chiffres enregistrés.</p>
                    )}
                    {firstCause && <p className="text-muted-foreground border-t pt-2 text-xs">À vérifier en premier : {firstCause.label.toLowerCase()}.</p>}

                    {diagnosis.offsets.length > 0 && (
                        <div className="border-t pt-3">
                            <h3 className="text-sm font-semibold">Ce qui a limité le recul</h3>
                            <ul className="mt-2 space-y-2">
                                {diagnosis.offsets.map((offset) => (
                                    <li key={offset.label} className="flex items-start justify-between gap-3 text-sm">
                                        <span>
                                            <span className="font-medium">{offset.label}</span>
                                            <span className="text-muted-foreground mt-0.5 block">{advice[offset.label]}</span>
                                        </span>
                                        <span className="shrink-0 font-semibold tabular-nums">+{formatFcfa(offset.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Agences où le bénéfice a le plus reculé</h3>
                    {diagnosis.agencies.length > 0 ? (
                        <ul className="space-y-2">
                            {diagnosis.agencies.map((agency) => (
                                <li key={agency.name} className="flex items-center justify-between gap-3 text-sm">
                                    <span>{agency.name}</span>
                                    <span className="text-destructive font-semibold tabular-nums">−{formatFcfa(agency.decline)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-sm">Le recul est réparti entre les agences ou vient principalement des frais communs.</p>
                    )}
                    <p className="text-muted-foreground border-t pt-2 text-xs">
                        Période analysée : {formatPeriod(diagnosis.from, diagnosis.to)}. Comparaison avec la période précédente de même durée.
                    </p>
                </div>
            </div>
        </section>
    );
}
