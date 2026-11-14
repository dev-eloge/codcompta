import InputError from '@/components/input-error';
import { type ReportFormState, toNumber } from '@/components/report-form/use-report-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatFcfa, formatNumber } from '@/lib/format';
import { payDescription, type TeamMember } from '@/lib/team-pay';
import { Link } from '@inertiajs/react';
import { Minus, Plus } from 'lucide-react';

/**
 * Fees of the day for the own team: deliveries of each courier, orders of each closer (with − and +),
 * the amount to pay worked out on its own, and the fuel typed by hand. Monthly salaries are not here.
 */
export function TeamFees({ form, idPrefix = '' }: { form: ReportFormState; idPrefix?: string }) {
    const { data, setData, errors, selectedAgency, teamCount, courierPay, closerPay } = form;

    if (!selectedAgency) {
        return null;
    }

    const delivered = data.lines.reduce((sum, line) => sum + toNumber(line.quantity), 0);
    const total = (type: 'courier' | 'closer', members: TeamMember[]) =>
        members.reduce((sum, member) => sum + toNumber(teamCount(type, member.id)), 0);
    const deliveries = total('courier', selectedAgency.couriers);
    const orders = total('closer', selectedAgency.closers);
    const noTeam = selectedAgency.couriers.length === 0 && selectedAgency.closers.length === 0;

    return (
        <div className="flex flex-col gap-4">
            {noTeam && (
                <p className="badge-warning rounded-xl px-4 py-3 text-sm">
                    Aucun livreur ni closeuse pour ce pays.{' '}
                    <Link href={route('reference.index')} className="font-bold underline underline-offset-4">
                        Ajoutez votre équipe
                    </Link>{' '}
                    pour calculer leurs paiements.
                </p>
            )}

            {selectedAgency.couriers.length > 0 && (
                <MemberCounts
                    title="Qui a livré aujourd'hui ?"
                    type="courier"
                    members={selectedAgency.couriers}
                    form={form}
                    idPrefix={idPrefix}
                    summary={`${formatNumber(deliveries)} livraison${deliveries > 1 ? 's' : ''} sur ${formatNumber(delivered)}, à payer : ${formatFcfa(courierPay)}`}
                    countLabel="livraisons"
                />
            )}

            {selectedAgency.closers.length > 0 && (
                <MemberCounts
                    title="Qui a confirmé les commandes ?"
                    type="closer"
                    members={selectedAgency.closers}
                    form={form}
                    idPrefix={idPrefix}
                    summary={`${formatNumber(orders)} commande${orders > 1 ? 's' : ''}, à payer : ${formatFcfa(closerPay)}`}
                    countLabel="commandes"
                    feminine
                />
            )}

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}fuel_fees`}>Carburant (F)</Label>
                <Input
                    id={`${idPrefix}fuel_fees`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={data.fuel_fees}
                    placeholder="0"
                    className="tabular-nums"
                    onChange={(e) => setData('fuel_fees', e.target.value)}
                />
                <InputError message={errors.fuel_fees} />
            </div>
            <p className="text-muted-foreground text-sm">Les salaires du mois et la moto sont comptés une fois par mois, pas ici.</p>
            <InputError message={errors.team} />
            <span className="sr-only" aria-live="polite">
                À payer aujourd'hui : {formatFcfa(courierPay + closerPay)}
            </span>
        </div>
    );
}

function MemberCounts({
    title,
    type,
    members,
    form,
    idPrefix,
    summary,
    countLabel,
    feminine = false,
}: {
    title: string;
    type: 'courier' | 'closer';
    members: TeamMember[];
    form: ReportFormState;
    idPrefix: string;
    summary: string;
    countLabel: string;
    feminine?: boolean;
}) {
    const { teamCount, setTeamCount } = form;

    return (
        <fieldset className="bg-card rounded-2xl border px-4 pt-3 pb-4">
            <legend className="sr-only">{title}</legend>
            <p aria-hidden="true" className="pb-1 text-base font-bold">
                {title}
            </p>
            <ul>
                {members.map((member) => {
                    const id = `${idPrefix}${type}-${member.id}`;
                    const count = toNumber(teamCount(type, member.id));

                    return (
                        <li key={member.id} className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0">
                            <div className="min-w-0">
                                <label htmlFor={id} className="block font-bold">
                                    {member.name}
                                </label>
                                <p className="text-muted-foreground text-xs">{payDescription(member, formatFcfa, feminine)}</p>
                            </div>
                            <div className="border-input has-[input:focus-visible]:ring-ring/50 flex h-12 shrink-0 items-center rounded-xl border has-[input:focus-visible]:ring-[3px]">
                                <button
                                    type="button"
                                    onClick={() => setTeamCount(type, member.id, String(Math.max(0, count - 1)))}
                                    disabled={count <= 0}
                                    aria-label={`${member.name} : une de moins`}
                                    className="hover:bg-accent grid h-full w-11 cursor-pointer place-items-center rounded-l-xl disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Minus className="size-4" aria-hidden="true" />
                                </button>
                                <input
                                    id={id}
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={teamCount(type, member.id)}
                                    aria-label={`${member.name} : ${countLabel}`}
                                    onChange={(e) => setTeamCount(type, member.id, e.target.value)}
                                    className="h-full w-10 [appearance:textfield] bg-transparent text-center text-lg font-semibold tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setTeamCount(type, member.id, String(count + 1))}
                                    aria-label={`${member.name} : une de plus`}
                                    className="hover:bg-accent grid h-full w-11 cursor-pointer place-items-center rounded-r-xl"
                                >
                                    <Plus className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
            <p className="pt-2 text-sm font-bold tabular-nums">{summary}</p>
        </fieldset>
    );
}
