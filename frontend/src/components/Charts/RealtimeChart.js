import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";

const RealtimeChart = ({ data, color = "#1976d2", height = 240, unit = "" }) => {
  const formatted = Array.isArray(data)
    ? data.map((d) => ({
        ...d,
        label: d.timestamp ? format(new Date(d.timestamp), "HH:mm:ss") : "",
        value: Number(d.value),
      }))
    : [];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={formatted} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" minTickGap={20} />
          <YAxis />
          <Tooltip formatter={(val) => `${val}${unit || ""}`} />
          <Line type="monotone" dataKey="value" stroke={color} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RealtimeChart;
