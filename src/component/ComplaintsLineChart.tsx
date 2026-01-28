// ComplaintsLineChart.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemDecorator,
  Typography,
  Checkbox,
  Divider,
  Card,
} from "@mui/joy";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ArrowRightRoundedIcon from "@mui/icons-material/ArrowRightRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ALL_MONTH_INDEXES = Array.from({ length: 12 }, (_, i) => i);

const ymd = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function ComplaintsLineChart({
  points = [],              // 👈 single dataset from API (daily points)
  loading = false,
  title = "Complaints – Raised vs Resolved",
  subtitle = "Trend by selected period",
  onFilterChange,           // 👈 parent will call API with from/to
}) {
  const [mode, setMode] = useState("week"); // "week" | "month" (frontend only)

  const currentMonthIdx = new Date().getMonth();

  // multi-select months (0-11)
  const [selectedMonths, setSelectedMonths] = useState([currentMonthIdx]);

  // menus
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [monthMenuAnchor, setMonthMenuAnchor] = useState(null);

  const buttonRef = useRef(null);
  const mainMenuRef = useRef(null);
  const monthMenuRef = useRef(null);

  const isFullYear = mode === "month" && selectedMonths.length === 12;

  /* ---------------- Helpers to compute ranges (for API) ---------------- */

  const computeWeekRange = () => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { from: ymd(start), to: ymd(end) };
  };

  const computeYearRange = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const start = new Date(yr, 0, 1);
    const end = new Date(yr, 11, 31);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return { from: ymd(start), to: ymd(end) };
  };

  /* ---------------- Initial filter: week last 7 days ---------------- */

  useEffect(() => {
    if (!onFilterChange) return;
    const { from, to } = computeWeekRange();
    onFilterChange({ from, to });   // 👈 NO mode sent to parent
  }, [onFilterChange]);

  /* ---------------- Build chart data from props ---------------- */

  // points from API are always daily: { label: "YYYY-MM-DD", raised, resolved }

  const weekData = useMemo(() => {
    const base = Array.isArray(points) ? points : [];
    const sorted = [...base].sort(
      (a, b) => new Date(a.label) - new Date(b.label)
    );
    return sorted.map((p) => ({
      xLabel: p.label, // YYYY-MM-DD
      raised: Number(p.raised ?? 0),
      resolved: Number(p.resolved ?? 0),
    }));
  }, [points]);

  const yearData = useMemo(() => {
    const base = Array.isArray(points) ? points : [];
    const mapByMonth = new Map();

    base.forEach((p) => {
      if (!p || !p.label) return;
      const d = new Date(p.label);
      if (Number.isNaN(d.getTime())) return;
      const monthIndex = d.getMonth(); // 0–11

      const prev = mapByMonth.get(monthIndex) || { raised: 0, resolved: 0 };
      prev.raised += Number(p.raised ?? 0);
      prev.resolved += Number(p.resolved ?? 0);
      mapByMonth.set(monthIndex, prev);
    });

    const allMonths = MONTH_LABELS.map((m, idx) => {
      const val = mapByMonth.get(idx) || { raised: 0, resolved: 0 };
      return {
        xLabel: m,
        monthIndex: idx,
        raised: val.raised,
        resolved: val.resolved,
      };
    });

    const activeMonths =
      selectedMonths && selectedMonths.length
        ? selectedMonths
        : ALL_MONTH_INDEXES;

    return allMonths.filter((row) => activeMonths.includes(row.monthIndex));
  }, [points, selectedMonths]);

  const chartData = mode === "week" ? weekData : yearData;

  /* ---------------- Axis + tooltip formatters ---------------- */

  const xTickFormatter = (value) => {
    if (mode === "month") {
      // Month label
      return value;
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const tooltipLabelFormatter = (value) => {
    if (mode === "month") {
      return value; // month label directly
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* ---------------- Menu handlers ---------------- */

  const handleToggleMonth = (idx) => {
    setMode("month");
    setSelectedMonths((prev) => {
      const next = prev.includes(idx)
        ? prev.filter((m) => m !== idx)
        : [...prev, idx];

      // For month view, we fetch full-year range once (backend returns daily, frontend aggregates)
      if (onFilterChange) {
        const { from, to } = computeYearRange();
        onFilterChange({ from, to });   // 👈 NO mode here
      }

      return next;
    });
  };

  const handleToggleFullYear = () => {
    setMode("month");
    setSelectedMonths((prev) => {
      const next = prev.length === 12 ? [] : ALL_MONTH_INDEXES;

      if (onFilterChange) {
        const { from, to } = computeYearRange();
        onFilterChange({ from, to });   // 👈 NO mode here
      }

      return next;
    });
  };

  const closeAllMenus = useCallback(() => {
    setMenuAnchor(null);
    setMonthMenuAnchor(null);
  }, []);

  // global click-away to close both menus
  useEffect(() => {
    const handleClickAway = (event) => {
      const target = event.target;

      if (
        buttonRef.current?.contains(target) ||
        mainMenuRef.current?.contains(target) ||
        monthMenuRef.current?.contains(target)
      ) {
        return;
      }
      closeAllMenus();
    };

    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("touchstart", handleClickAway);

    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("touchstart", handleClickAway);
    };
  }, [closeAllMenus]);

  const periodLabel =
    mode === "week"
      ? "Week (last 7 days)"
      : isFullYear
      ? "Year (all months)"
      : `Month: ${
          selectedMonths && selectedMonths.length
            ? [...selectedMonths]
                .sort((a, b) => a - b)
                .map((i) => MONTH_LABELS[i])
                .join(", ")
            : MONTH_LABELS[currentMonthIdx]
        }`;

  /* ---------------- Render ---------------- */

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
        height: "100%",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 1,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography level="title-md">{title}</Typography>
          <Typography level="body-xs" sx={{ color: "text.secondary" }}>
            {subtitle}
          </Typography>
        </Box>

        <Button
          ref={buttonRef}
          size="sm"
          variant="outlined"
          color="neutral"
          startDecorator={<CalendarMonthRoundedIcon fontSize="small" />}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{
            borderRadius: "999px",
            px: 1.8,
            textTransform: "none",
          }}
        >
          {periodLabel}
        </Button>

        {/* Main menu */}
        <Menu
          ref={mainMenuRef}
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={closeAllMenus}
          placement="bottom-end"
          sx={{ minWidth: 220 }}
        >
          {/* Month with submenu */}
          <MenuItem
            onMouseEnter={(e) => setMonthMenuAnchor(e.currentTarget)}
            onClick={(e) => setMonthMenuAnchor(e.currentTarget)}
          >
            <ListItemDecorator sx={{ minWidth: 26 }}>
              {mode === "month" && <DoneRoundedIcon fontSize="small" />}
            </ListItemDecorator>
            <Box sx={{ flex: 1 }}>Month</Box>
            <ArrowRightRoundedIcon fontSize="small" />
          </MenuItem>

          <Divider />

          {/* Week item */}
          <MenuItem
            onClick={() => {
              setMode("week");
              if (onFilterChange) {
                const { from, to } = computeWeekRange();
                onFilterChange({ from, to });   // 👈 NO mode here
              }
              closeAllMenus();
            }}
          >
            <ListItemDecorator sx={{ minWidth: 26 }}>
              {mode === "week" && <DoneRoundedIcon fontSize="small" />}
            </ListItemDecorator>
            Week (last 7 days)
          </MenuItem>
        </Menu>

        {/* Month submenu */}
        <Menu
          ref={monthMenuRef}
          anchorEl={monthMenuAnchor}
          open={Boolean(monthMenuAnchor)}
          onClose={closeAllMenus}
          placement="right-start"
          sx={{ ml: 1, minWidth: 180 }}
        >
          {/* Full year toggle */}
          <MenuItem onClick={handleToggleFullYear}>
            <ListItemDecorator sx={{ minWidth: 26 }}>
              <Checkbox
                size="sm"
                checked={isFullYear}
                onChange={handleToggleFullYear}
              />
            </ListItemDecorator>
            Full year (all months)
          </MenuItem>

          <Divider />

          {MONTH_LABELS.map((m, idx) => {
            const checked = selectedMonths.includes(idx);
            return (
              <MenuItem
                key={m}
                onClick={() => handleToggleMonth(idx)}
                sx={{ minWidth: 160 }}
              >
                <ListItemDecorator sx={{ minWidth: 26 }}>
                  <Checkbox
                    size="sm"
                    checked={checked}
                    onChange={() => handleToggleMonth(idx)}
                  />
                </ListItemDecorator>
                {m}
              </MenuItem>
            );
          })}
        </Menu>
      </Box>

      {/* Line chart */}
      <Box sx={{ mt: 2, flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, left: 0, right: 10, bottom: 0 }}
          >
            <CartesianGrid
              stroke="#e5e7eb"
              vertical={false}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="xLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={xTickFormatter}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
            />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
              labelFormatter={tooltipLabelFormatter}
              formatter={(value, _name, props) => {
                const dataKey = props?.dataKey;
                const label = dataKey === "raised" ? "Raised" : "Resolved";
                return [value, label];
              }}
              contentStyle={{
                borderRadius: 8,
                borderColor: "#e5e7eb",
              }}
            />

            <Legend />

            <Line
              type="monotone"
              dataKey="raised"
              name="Raised"
              stroke="#2563eb"
              strokeWidth={2.4}
              dot={{ r: 3.2 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="resolved"
              name="Resolved"
              stroke="#22c55e"
              strokeWidth={2.4}
              dot={{ r: 3.2 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {loading && (
          <Typography
            level="body-xs"
            sx={{ mt: 0.5, color: "text.tertiary", textAlign: "right" }}
          >
            Loading complaints trend…
          </Typography>
        )}
      </Box>
    </Card>
  );
}

export default ComplaintsLineChart;
