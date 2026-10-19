const fcfa = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

export function formatFcfa(amount: number | null | undefined): string {
    return `${fcfa.format(amount ?? 0)} F`;
}

export function formatNumber(value: number | null | undefined): string {
    return fcfa.format(value ?? 0);
}

export function formatPercent(ratio: number | null | undefined): string {
    return percent.format(ratio ?? 0);
}

export function formatShortDate(isoDate: string): string {
    return shortDate.format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatPeriod(start: string, end: string): string {
    return start === end ? formatShortDate(start) : `${formatShortDate(start)} au ${formatShortDate(end)}`;
}
