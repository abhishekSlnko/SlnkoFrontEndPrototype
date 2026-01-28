// src/components/All_Tasks/Charts/ProjectsDonut.jsx
import { Card, Box, Typography, CircularProgress } from "@mui/joy";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const PALETTE = [
  "#f59e0b",
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#e11d48",
  "#84cc16",
  "#f97316",
  "#06b6d4",
  "#d946ef",
  "#0ea5e9",
  "#65a30d",
  "#dc2626",
  "#7c3aed",
  "#10b981",
  "#ca8a04",
  "#2563eb",
  "#f43f5e",
  "#0891b2",
  "#a16207",
  "#15803d",
  "#4f46e5",
  "#ea580c",
  "#db2777",
  "#047857",
  "#1d4ed8",
  "#9333ea",
  "#b91c1c",
  "#0d9488",
];

export default function ProjectsWorkedCard({
  title = "Task State",
  data = [],
  total = 0,
  totalLabel = "Projects",
  loading = false,
  sx = {},
}) {
  if (loading) {
    return (
      <Card
        variant="soft"
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 28,
          p: 2.5,
          bgcolor: "#fff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow:
            "0 2px 6px rgba(15,23,42,0.06), 0 18px 32px rgba(15,23,42,0.06)",
          height: 600,
          maxHeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...sx,
        }}
      >
        <CircularProgress size="lg" />
      </Card>
    );
  }

  // 1) Normalize data: ensure color & numeric value
  const safeData = (Array.isArray(data) ? data : []).map((d, i) => {
    const raw = Number(d.value);
    const value = Number.isFinite(raw) ? raw : 0;
    const color = d.color || PALETTE[i % PALETTE.length];
    return { name: d.name ?? `Item ${i + 1}`, value, color };
  });

  // 2) If all values are 0, show a single grey slice for empty state
  const allZero = safeData.length > 0 && safeData.every((d) => d.value === 0);
  const pieData = allZero
    ? [{ name: "No Data", value: 1, color: "#e2e8f0" }]
    : safeData;

  // 3) Robust total label
  const totalToShow = Number.isFinite(total) ? total : 0;

  return (
    <Card
      variant="soft"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        p: 2.5,
        bgcolor: "#fff",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow:
          "0 2px 6px rgba(15,23,42,0.06), 0 18px 32px rgba(15,23,42,0.06)",
        transition: "transform .16s ease, box-shadow .16s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow:
            "0 6px 16px rgba(15,23,42,0.10), 0 20px 36px rgba(15,23,42,0.08)",
        },
        height: 600,
        maxHeight: 600,
        display: "flex",
        flexDirection: "column",
        ...sx,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography level="title-md" sx={{ color: "#0f172a", fontWeight: 700 }}>
          {title}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Donut + centered text */}
        <Box sx={{ width: "100%", height: 240, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={68}
                outerRadius={88}
                startAngle={90}
                endAngle={-270}
                stroke="#fff"
                strokeWidth={4}
                cornerRadius={8}
                isAnimationActive={true}
                animationDuration={800}
                animationBegin={0}
              >
                {pieData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Typography
              level="h2"
              sx={{
                fontWeight: 800,
                color: "#0f172a",
                fontSize: "2.5rem",
                lineHeight: 1,
              }}
            >
              {totalToShow}
            </Typography>
            <Typography
              level="body-sm"
              sx={{
                color: "rgba(17,24,39,0.6)",
                mt: 0.5,
                fontSize: "0.875rem",
              }}
            >
              {totalLabel}
            </Typography>
          </Box>
        </Box>

        {/* Legend */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            pr: 0.5,
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              bgcolor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "rgba(0,0,0,0.2)",
              borderRadius: "3px",
              "&:hover": {
                bgcolor: "rgba(0,0,0,0.3)",
              },
            },
          }}
        >
          {safeData.length === 0 ? (
            <Typography
              level="body-sm"
              sx={{ textAlign: "center", color: "text.tertiary", py: 2 }}
            >
              No data available
            </Typography>
          ) : (
            safeData.map((d) => (
              <Box
                key={d.name}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "20px 1fr auto",
                  alignItems: "center",
                  gap: 1.5,
                  py: 0.5,
                  px: 1,
                  borderRadius: "8px",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "rgba(0,0,0,0.02)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: d.color,
                    justifySelf: "center",
                    boxShadow: `0 0 8px ${d.color}50`,
                  }}
                />
                <Typography
                  level="body-sm"
                  sx={{
                    color: "#0f172a",
                    fontWeight: 500,
                    fontSize: "0.875rem",
                  }}
                >
                  {d.name}
                </Typography>
                <Typography
                  level="body-sm"
                  sx={{
                    color: "#0f172a",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  {d.value}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Card>
  );
}
