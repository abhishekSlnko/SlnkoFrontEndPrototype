import React, { useMemo, useState, useEffect } from "react";
import { Box, Typography, Button, Stack, Select, Option, Card } from "@mui/joy";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ---------- Date helpers ---------- */
const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

function ymd(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatShortDay(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatMonthLabel(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    month: "short",
  });
}

/* ---------- Range helpers ---------- */
function getRangeForPeriod(period) {
  const today = startOfDay(new Date());

  if (period === "1w") {
    const to = today;
    const from = addDays(to, -6);
    return { from, to };
  }

  if (period === "1m") {
    const from = startOfMonth(today);
    const to = endOfMonth(today);
    return { from, to };
  }

  if (period === "3m") {
    const to = endOfMonth(today);
    const firstMonth = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const from = startOfMonth(firstMonth);
    return { from, to };
  }

  if (period === "6m") {
    const to = endOfMonth(today);
    const firstMonth = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const from = startOfMonth(firstMonth);
    return { from, to };
  }

  const to = endOfMonth(today);
  const firstMonth = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const from = startOfMonth(firstMonth);
  return { from, to };
}

function AnalyticalActivityAreaChart({
  data = [],
  loading = false,
  title = "Activity Work Summary",
  subtitle = "Assigned vs Completed vs Remaining",
  categoryOptions = [],
  activityOptions = [],
  onFilterChange,
}) {
  const [category, setCategory] = useState("civil");
  const [activity, setActivity] = useState("all");
  const [period, setPeriod] = useState("1y");

  const filterRange = useMemo(() => getRangeForPeriod(period), [period]);

  useEffect(() => {
    if (!onFilterChange) return;
    const { from, to } = filterRange;

    onFilterChange({
      from: ymd(from),
      to: ymd(to),
      category: category === "all" ? undefined : category,
      activity: activity === "all" ? undefined : activity,
    });
  }, [filterRange, category, activity, onFilterChange]);

  /* ---------- Monthly map (aggregated source) ---------- */
  const monthlyMap = useMemo(() => {
    if (!Array.isArray(data) || !data.length) return new Map();
    const { from, to } = filterRange;
    const map = new Map();

    for (const row of data) {
      if (category !== "all" && row.category !== category) continue;

      const rowActivityName =
        row.activity_name || row.activity || row.name || row.label;
      if (activity !== "all" && rowActivityName !== activity) continue;

      const monthlySummary = row.monthly_summary;
      if (!Array.isArray(monthlySummary)) continue;

      for (const monthData of monthlySummary) {
        const { month, year } = monthData;
        if (month === undefined || year === undefined) continue;

        const dt = startOfMonth(new Date(year, month - 1, 1));
        if (!isValidDate(dt)) continue;
        if (dt < from || dt > to) continue;

        const key = ymd(dt);
        const prev = map.get(key) || {
          date: dt,
          assigned: 0,
          completed: 0,
          remaining: 0,
        };

        const assigned = Number(
          monthData.assigned ??
            monthData.total_assigned ??
            monthData.planned ??
            0
        );
        const completed = Number(
          monthData.completed ??
            monthData.total_completed ??
            monthData.actual ??
            0
        );
        const remaining = Number(
          monthData.remaining ??
            monthData.total_remaining ??
            assigned - completed
        );

        prev.assigned += assigned;
        prev.completed += completed;
        prev.remaining += remaining;

        map.set(key, prev);
      }
    }
    return map;
  }, [data, filterRange, category, activity]);

  const sumRange = (start, end) => {
    let assigned = 0;
    let completed = 0;
    let remaining = 0;

    for (const row of monthlyMap.values()) {
      if (row.date >= start && row.date <= end) {
        assigned += row.assigned;
        completed += row.completed;
        remaining += row.remaining;
      }
    }

    return { assigned, completed, remaining };
  };

  /* ---------- Chart data (with start/end on each point) ---------- */
  const chartData = useMemo(() => {
    const { from, to } = filterRange;

    if (period === "1w") {
      const out = [];
      for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
        const key = ymd(d);
        const row = monthlyMap.get(key);
        out.push({
          name: formatShortDay(d),
          assigned: row?.assigned ?? 0,
          completed: row?.completed ?? 0,
          remaining: row?.remaining ?? 0,
          start: d,
          end: d,
        });
      }
      return out;
    }

    if (period === "1m") {
      const monthStart = startOfMonth(from);
      const monthEnd = endOfMonth(to);

      const buckets = [
        { label: "1-7", start: monthStart, end: addDays(monthStart, 6) },
        { label: "8-15", start: addDays(monthStart, 7), end: addDays(monthStart, 14) },
        { label: "16-22", start: addDays(monthStart, 15), end: addDays(monthStart, 21) },
        {
          label: `23-${monthEnd.getDate()}`,
          start: addDays(monthStart, 22),
          end: monthEnd,
        },
      ];

      return buckets.map((b) => {
        const sums = sumRange(b.start, b.end);
        return {
          name: b.label,
          ...sums,
          start: b.start,
          end: b.end,
        };
      });
    }

    const monthCount = period === "3m" ? 3 : period === "6m" ? 6 : 12;

    const buckets = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const monthDate = new Date(to.getFullYear(), to.getMonth() - i, 1);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      buckets.push({
        label: formatMonthLabel(monthDate),
        start,
        end,
      });
    }

    return buckets.map((b) => {
      const sums = sumRange(b.start, b.end);
      return {
        name: b.label,
        ...sums,
        start: b.start,
        end: b.end,
      };
    });
  }, [filterRange, period, monthlyMap]);

  const handleChartClick = (state) => {
    if (!state || !state.activeLabel) return;

    const clickedData = chartData.find((d) => d.name === state.activeLabel);
    if (!clickedData || !clickedData.start || !clickedData.end) return;

    const fromDate = ymd(clickedData.start);
    const toDate = ymd(clickedData.end);

    let url = `/dpr_management?from=${fromDate}&to=${toDate}`;

    if (activity !== "all") {
      const selectedActivity = activityOptions.find(
        (a) => a.label.toLowerCase() === activity.toLowerCase()
      );
      if (selectedActivity) {
        url += `&activityId=${selectedActivity.value}`;
      }
    } else if (category !== "all") {
      url += `&category=${category}`;
    }

    window.location.assign(url);
  };

  const handleCategoryChange = (_, value) => {
    if (!value) return;
    setCategory(value);
  };

  const handleActivityChange = (_, value) => {
    if (!value) return;
    setActivity(value);
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
  };

  const periodButtons = [
    { id: "1w", label: "1W" },
    { id: "1m", label: "1M" },
    { id: "3m", label: "3M" },
    { id: "6m", label: "6M" },
    { id: "1y", label: "1Y" },
  ];

  const capitalizeFirstLetter = (string) => {
    if (!string) return "";
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        p: { xs: 1, sm: 0.5, md: 1.5 },
        bgcolor: "#fff",
        border: "1px solid",
        borderColor: "rgba(15,23,42,0.08)",
        boxShadow:
          "0 2px 6px rgba(15,23,42,0.06), 0 18px 32px rgba(15,23,42,0.06)",
        transition: "transform .16s ease, box-shadow .16s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow:
            "0 6px 16px rgba(15,23,42,0.10), 0 20px 36px rgba(15,23,42,0.08)",
        },
        display: "flex",           
        flexDirection: "column",    
        height: 520,                
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 1.5,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,             
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography level="title-md">{title}</Typography>
          <Typography level="body-xs" sx={{ color: "text.secondary" }}>
            {subtitle}
          </Typography>
          <Typography level="body-xs" sx={{ color: "text.tertiary", mt: 0.5 }}>
            Range: {ymd(filterRange.from)} → {ymd(filterRange.to)}
          </Typography>
        </Box>

        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ ml: { sm: "auto" } }}
        >
          <Select
            size="sm"
            value={category}
            onChange={handleCategoryChange}
            sx={{ minWidth: 140 }}
          >
            <Option value="all">ALL CATEGORIES</Option>
            {categoryOptions.map((c) => (
              <Option key={c} value={c}>
                {capitalizeFirstLetter(c)}
              </Option>
            ))}
          </Select>

          <Select
            size="sm"
            value={activity}
            onChange={handleActivityChange}
            sx={{ minWidth: 140 }}
          >
            <Option value="all">ALL ACTIVITIES</Option>
            {activityOptions.map((a) => (
              <Option key={a.value} value={a.label}>
                {capitalizeFirstLetter(a.label)}
              </Option>
            ))}
          </Select>

          <Box
            sx={{
              display: "inline-flex",
              borderRadius: 999,
              bgcolor: "#f4f4f5",
              p: 0.3,
              gap: 0.3,
            }}
          >
            {periodButtons.map((p) => {
              const active = period === p.id;
              return (
                <Button
                  key={p.id}
                  size="sm"
                  variant={active ? "solid" : "plain"}
                  color={active ? "primary" : "neutral"}
                  onClick={() => handlePeriodChange(p.id)}
                  sx={{
                    borderRadius: 999,
                    px: 1.3,
                    py: 0.3,
                    minHeight: 26,
                    fontSize: "0.75rem",
                    textTransform: "none",
                  }}
                >
                  {p.label}
                </Button>
              );
            })}
          </Box>
        </Stack>
      </Box>

      {/* Chart */}
      <Box
        sx={{
          mt: 2,
          flex: 1,        
          minHeight: 0,   
          width: "100%",
        }}
      >
        {loading ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.tertiary",
              fontSize: 12,
            }}
          >
            Loading activity summary…
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              onClick={handleChartClick}
              style={{ cursor: "pointer" }}
            >
              <defs>
                <linearGradient id="fillAssigned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillRemaining" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <Tooltip
                cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
              />
              <Legend />

              <Area
                dataKey="assigned"
                name="Assigned"
                type="natural"
                fill="url(#fillAssigned)"
                stroke="#2563eb"
                stackId="a"
              />
              <Area
                dataKey="completed"
                name="Completed"
                type="natural"
                fill="url(#fillCompleted)"
                stroke="#10b981"
                stackId="a"
              />
              <Area
                dataKey="remaining"
                name="Remaining"
                type="natural"
                fill="url(#fillRemaining)"
                stroke="#f97316"
                stackId="a"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}

export default AnalyticalActivityAreaChart;
