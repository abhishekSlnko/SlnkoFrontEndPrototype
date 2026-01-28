// src/component/LoanStatusDonutChart.js
import { Card, Box, Typography, CircularProgress } from "@mui/joy";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function LoanStatusDonutChart({
  title = "Loan Status Distribution",
  data = [],
  total = 0,
  totalLabel = "Loans",
  loading = false,
  onSegmentClick,
}) {
  if (loading) {
    return (
      <Card
        variant="soft"
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 28,
          p: 2,
          bgcolor: "#fff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow:
            "0 2px 6px rgba(15,23,42,0.06), 0 18px 32px rgba(15,23,42,0.06)",
          height: "100%",
          minHeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size="lg" />
      </Card>
    );
  }

  // 1) Normalize data: ensure color & numeric value
  const safeData = (Array.isArray(data) ? data : []).map((d) => {
    const raw = Number(d.value);
    const value = Number.isFinite(raw) ? raw : 0;
    const percentage = Number.isFinite(d.percentage) ? d.percentage : 0;
    return {
      name: d.name ?? "Unknown",
      value,
      percentage,
      color: d.color || "#e2e8f0",
    };
  });

  // 2) If all values are 0, show a single grey slice for empty state
  const allZero = safeData.length > 0 && safeData.every((d) => d.value === 0);
  const pieData = allZero
    ? [{ name: "No Data", value: 1, percentage: 0, color: "#e2e8f0" }]
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
        height: "100%",
        minHeight: 500,
        display: "flex",
        flexDirection: "column",
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
                onClick={(state) => {
                  if (onSegmentClick) {
                    onSegmentClick(state);
                  }
                }}
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

        {/* Legend with percentages */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {safeData.length === 0 ? (
            <Typography
              level="body-sm"
              sx={{ textAlign: "center", color: "text.tertiary", py: 2 }}
            >
              No loan data available
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