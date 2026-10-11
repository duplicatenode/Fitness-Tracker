import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLORS } from '../../utils/colors';
import { fmtDate, fmtNumber } from '../../utils/format';
import ChartTooltip from './ChartTooltip';

const tick = { fontSize: 12, fill: COLORS.axis };

/** Daily totals from the Memurai daily hashes. metric: 'steps' | 'calories' */
export default function DailyBarChart({ days, metric = 'steps' }) {
    const isSteps = metric === 'steps';
    const key = isSteps ? 'total_steps' : 'total_calories';
    const color = isSteps ? COLORS.brand : COLORS.amber;
    const unit = isSteps ? 'steps' : 'kcal';
    const compact = days.length > 10;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap={compact ? '18%' : '28%'}>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 4" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={tick}
                    tickLine={false}
                    axisLine={{ stroke: COLORS.grid }}
                    tickFormatter={(d) => fmtDate(`${d}T12:00:00`, compact ? { day: 'numeric' } : { weekday: 'short', day: 'numeric' })}
                    interval={compact ? 'preserveStartEnd' : 0}
                    minTickGap={compact ? 16 : 0}
                />
                <YAxis
                    tick={tick}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    allowDecimals={false}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)}
                />
                <Tooltip
                    cursor={{ fill: 'rgba(16,24,40,0.04)' }}
                    content={({ active, payload }) => {
                        const p = payload?.[0]?.payload;
                        if (!active || !p) return null;
                        return (
                            <ChartTooltip
                                active
                                title={fmtDate(`${p.date}T12:00:00`, { weekday: 'long', month: 'short', day: 'numeric' })}
                                rows={
                                    p.has_data
                                        ? [
                                            { label: isSteps ? 'Steps' : 'Calories', value: `${fmtNumber(p[key])} ${unit}`, color },
                                            { label: 'Readings', value: fmtNumber(p.readings) }
                                        ]
                                        : [{ label: 'Activity', value: 'None recorded' }]
                                }
                            />
                        );
                    }}
                />
                <Bar dataKey={key} name={isSteps ? 'Steps' : 'Calories'} fill={color} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
            </BarChart>
        </ResponsiveContainer>
    );
}
