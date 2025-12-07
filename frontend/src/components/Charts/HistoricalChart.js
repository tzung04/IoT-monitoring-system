import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#1976d2", "#9c27b0", "#ff9800", "#2e7d32", "#ef5350"];

const HistoricalChart = ({ data = [], xKey = "label", series = [], height = 260, stacked = true }) => {
  if (!Array.isArray(data) || data.length === 0 || series.length === 0) {
    return <div style={{ padding: "16px", color: "#6b7280" }}>Không có dữ liệu biểu đồ.</div>;
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} minTickGap={16} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {series.map((s, idx) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              stackId={stacked ? "1" : undefined}
              stroke={s.color || COLORS[idx % COLORS.length]}
              fill={s.color || COLORS[idx % COLORS.length]}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoricalChart;
