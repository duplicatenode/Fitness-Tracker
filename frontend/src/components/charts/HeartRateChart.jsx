import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLORS } from '../../utils/colors';
import { fmtDate, fmtDateTime, fmtTime } from '../../utils/format';
import ChartTooltip from './ChartTooltip';

const tick = { fontSize: 12, fill: COLORS.axis };

export const xTickFormatter = (range) => (value) =>
    range === '1h' || range === '24h' ? fmtTime(value) : fmtDate(value, { month: 'short', day: 'numeric' });

export default function HeartRateChart({ points, range }) {
    const data = points.filter((p) => p.avg_heart_rate != null);
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                <defs>
                    <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.coral} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={COLORS.coral} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 4" vertical={false} />
                <XAxis
                    dataKey="timestamp"
                    tick={tick}
                    tickLine={false}
                    axisLine={{ stroke: COLORS.grid }}
                    tickFormatter={xTickFormatter(range)}
                    minTickGap={48}
                />
                <YAxis
                    tick={tick}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    domain={[(min) => Math.max(40, Math.floor(min / 10) * 10 - 10), (max) => Math.ceil(max / 10) * 10 + 10]}
                />
                <Tooltip
                    cursor={{ stroke: COLORS.grid, strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                        const p = payload?.[0]?.payload;
                        if (!active || !p) return null;
                        return (
                            <ChartTooltip
                                active
                                title={fmtDateTime(p.timestamp)}
                                rows={[
                                    { label: 'Average', value: `${p.avg_heart_rate} bpm`, color: COLORS.coral },
                                    { label: 'Range', value: `${p.min_heart_rate}–${p.max_heart_rate} bpm` },
                                    { label: 'Readings', value: p.readings }
                                ]}
                            />
                        );
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="avg_heart_rate"
                    name="Heart rate"
                    stroke={COLORS.coral}
                    strokeWidth={2}
                    fill="url(#hrFill)"
                    dot={data.length < 4 ? { r: 3, fill: COLORS.coral, strokeWidth: 0 } : false}
                    activeDot={{ r: 4, fill: COLORS.coral, stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
