'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { STATE_COLORS } from '../../utils/colors';
import { fmtNumber, humanize } from '../../utils/format';
import ChartTooltip from './ChartTooltip';

/** Donut + legend showing how readings split across activity states. */
export default function StateBreakdownChart({ states }) {
    const entries = Object.entries(states).map(([name, count]) => ({ name, count }));
    const total = entries.reduce((s, e) => s + e.count, 0);

    return (
        <div className="flex h-full flex-col items-center gap-4 sm:flex-row">
            <div className="h-full min-h-40 w-full flex-1 sm:max-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={entries} dataKey="count" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                            {entries.map((e) => <Cell key={e.name} fill={STATE_COLORS[e.name] || STATE_COLORS.unknown} />)}
                        </Pie>
                        <Tooltip
                            content={({ active, payload }) => {
                                const p = payload?.[0]?.payload;
                                if (!active || !p) return null;
                                return (
                                    <ChartTooltip
                                        active
                                        title={humanize(p.name)}
                                        rows={[{ label: 'Readings', value: `${fmtNumber(p.count)} (${Math.round((p.count / total) * 100)}%)`, color: STATE_COLORS[p.name] || STATE_COLORS.unknown }]}
                                    />
                                );
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-2.5 text-[13px] sm:flex-1">
                {entries.sort((a, b) => b.count - a.count).map((e) => (
                    <li key={e.name} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-text-soft">
                            <span className="size-2.5 rounded-full" style={{ background: STATE_COLORS[e.name] || STATE_COLORS.unknown }} />
                            {humanize(e.name)}
                        </span>
                        <span className="tabular font-medium text-text">{Math.round((e.count / total) * 100)}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
