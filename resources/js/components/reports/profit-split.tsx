import { useMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

/** One part of the net profit, as the merchant named and sized it. */
export interface SplitPart {
    name: string;
    percent: number;
    amount: number;
}

const columns: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3',
};

/** The parts of the net profit, on the dark summary card, with a link to change the rule. */
export function SplitTiles({ split }: { split: SplitPart[] }) {
    const { format } = useMoney();

    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-hero-muted text-sm">Votre partage : {split.map((part) => part.percent).join(' / ')}</p>
                <Link
                    href={route('profit-settings.edit')}
                    className="text-on-hero-gold inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4"
                >
                    Modifier<span className="sr-only"> le partage du bénéfice</span>
                </Link>
            </div>
            <dl className={cn('grid gap-2 sm:gap-2.5', columns[split.length] ?? 'grid-cols-2')}>
                {split.map((part) => (
                    <div key={part.name} className="hero-tile min-w-0 rounded-xl p-2.5 sm:p-3">
                        <dt className="text-hero-muted text-[13px] break-words">{part.name}</dt>
                        <dd className="text-on-hero-gold mt-1 font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums sm:text-lg">
                            {format(part.amount)}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

/** "soit 328 000 F CFA" under an amount shown in euros or dollars; nothing in francs CFA. */
export function InFcfa({ amount, className }: { amount: number; className?: string }) {
    const { currency } = useMoney();

    if (!currency) {
        return null;
    }

    return <p className={cn('tabular-nums', className)}>soit {new Intl.NumberFormat('fr-FR').format(amount)} F CFA</p>;
}
