export type CourierPayMode = 'per_delivery' | 'monthly' | 'per_day';
export type CloserPayMode = 'per_delivered_order' | 'per_confirmed_order' | 'monthly' | 'per_day';

export interface TeamMember {
    id: number;
    name: string;
    pay_mode: CourierPayMode | CloserPayMode;
    pay_amount: number;
}

export const courierPayLabels: Record<CourierPayMode, string> = {
    per_delivery: 'Par livraison',
    monthly: 'Salaire du mois',
    per_day: 'Par jour de travail',
};

export const closerPayLabels: Record<CloserPayMode, string> = {
    per_delivered_order: 'Par commande livrée',
    per_confirmed_order: 'Par commande confirmée',
    monthly: 'Salaire du mois',
    per_day: 'Par jour de travail',
};

/** Label of the amount field, after the way of paying. */
export const amountLabels: Record<CourierPayMode | CloserPayMode, string> = {
    per_delivery: 'Par livraison (F)',
    per_delivered_order: 'Par commande livrée (F)',
    per_confirmed_order: 'Par commande confirmée (F)',
    monthly: 'Salaire du mois (F)',
    per_day: 'Par jour de travail (F)',
};

/** What a team member costs on a day; a monthly salary is counted once a month, not here. Same rule as the server. */
export function dailyPay(member: Pick<TeamMember, 'pay_mode' | 'pay_amount'>, count: number): number {
    switch (member.pay_mode) {
        case 'per_delivery':
        case 'per_delivered_order':
        case 'per_confirmed_order':
            return count * member.pay_amount;
        case 'per_day':
            return count > 0 ? member.pay_amount : 0;
        default:
            return 0;
    }
}

/** "1 000 F par livraison", "Payé au mois". */
export function payDescription(member: Pick<TeamMember, 'pay_mode' | 'pay_amount'>, formatFcfa: (value: number) => string, feminine = false): string {
    switch (member.pay_mode) {
        case 'per_delivery':
            return `${formatFcfa(member.pay_amount)} par livraison`;
        case 'per_delivered_order':
            return `${formatFcfa(member.pay_amount)} par commande livrée`;
        case 'per_confirmed_order':
            return `${formatFcfa(member.pay_amount)} par commande confirmée`;
        case 'per_day':
            return `${formatFcfa(member.pay_amount)} par jour de travail`;
        default:
            return feminine ? 'Payée au mois' : 'Payé au mois';
    }
}
