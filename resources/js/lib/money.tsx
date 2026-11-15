import { formatFcfa, formatNumber } from '@/lib/format';
import { createContext, type ReactNode, useContext } from 'react';

/** The second currency a merchant reads the reports in, with its rate in francs CFA. */
export interface DisplayCurrency {
    code: 'EUR' | 'USD';
    /** Francs CFA for one euro or one dollar. */
    rate: number;
    /** Day of the dollar rate; null for the euro, whose rate is fixed. */
    rate_date: string | null;
    /** True when today's dollar rate could not be fetched and an older one is used. */
    stale: boolean;
}

const MoneyContext = createContext<DisplayCurrency | null>(null);

/** Shows the amounts of the reports in this currency; null keeps francs CFA. */
export function MoneyProvider({ currency, children }: { currency: DisplayCurrency | null; children: ReactNode }) {
    return <MoneyContext.Provider value={currency}>{children}</MoneyContext.Provider>;
}

const foreign = {
    EUR: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    USD: new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }),
};
const plainForeign = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Amounts are stored in francs CFA; the conversion happens at display time, rounded to the cent. */
export function useMoney() {
    const currency = useContext(MoneyContext);

    return {
        currency,
        /** "328 000 F", or "500,03 €" / "563,29 $". */
        format: (fcfa: number | null | undefined): string =>
            currency ? foreign[currency.code].format((fcfa ?? 0) / currency.rate) : formatFcfa(fcfa),
        /** Same number without its unit, for tables whose caption gives the currency. */
        plain: (fcfa: number | null | undefined): string => (currency ? plainForeign.format((fcfa ?? 0) / currency.rate) : formatNumber(fcfa)),
    };
}

export const currencySymbol: Record<DisplayCurrency['code'], string> = { EUR: '€', USD: '$' };

const rateFormat = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const longDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatRate(currency: DisplayCurrency): string {
    return `1 ${currencySymbol[currency.code]} = ${rateFormat.format(currency.rate)} F CFA`;
}

export function formatRateDate(isoDate: string): string {
    return longDate.format(new Date(`${isoDate}T00:00:00Z`));
}
