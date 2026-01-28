import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, Box, Typography, Stack, Select, Option } from "@mui/joy";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
} from "recharts";
import { useGetLoanStatusByStateQuery } from "../redux/loanSlice";
import DateRangeFilter from "./DateRangeFilter";

// ============================================================================
// SHARED STATUS COLORS
// ============================================================================
const STATUS_COLORS = {
  "sanctioned": "#1d4ed8",            // Blue
  "disbursed": "#16a34a",             // Green
  "under banking process": "#0ea5e9", // Cyan
  "under process": "#0ea5e9",         // Cyan
  "documents pending": "#f59e0b",     // Amber
  "documents submitted": "#14b8a6",   // Teal
  "submitted": "#ec4899",             // Pink
  "on hold": "#94a3b8",               // Slate
  "dead": "#b91c1c",                  // Deep Red
};

const STATUS_LABELS = {
  "sanctioned": "Sanctioned",
  "disbursed": "Disbursed",
  "under banking process": "Under Process",
  "under process": "Under Process",
  "documents pending": "Docs Pending",
  "documents submitted": "Docs Submitted",
  "submitted": "Submitted",
  "on hold": "On Hold",
  "dead": "Dead",
};

// ============================================================================
// SAMPLE DATA (TOP STATES + OTHERS)
// ============================================================================
const SAMPLE_STATE_DATA = [
  { state: "Maharashtra", sanctioned: 48, disbursed: 42, "under banking process": 20, "documents pending": 14, "documents submitted": 6, "on hold": 3, dead: 2 },
  { state: "Karnataka", sanctioned: 32, disbursed: 30, "under banking process": 16, "documents pending": 10, "documents submitted": 5, "on hold": 2, dead: 1 },
  { state: "Tamil Nadu", sanctioned: 34, disbursed: 28, "under banking process": 15, "documents pending": 9, "documents submitted": 4, "on hold": 2, dead: 1 },
  { state: "Gujarat", sanctioned: 26, disbursed: 24, "under banking process": 14, "documents pending": 8, "documents submitted": 3, "on hold": 1, dead: 1 },
  { state: "Uttar Pradesh", sanctioned: 24, disbursed: 20, "under banking process": 13, "documents pending": 9, "documents submitted": 3, "on hold": 1, dead: 1 },
  { state: "Telangana", sanctioned: 22, disbursed: 20, "under banking process": 11, "documents pending": 7, "documents submitted": 3, "on hold": 1, dead: 0 },
  { state: "Rajasthan", sanctioned: 20, disbursed: 18, "under banking process": 10, "documents pending": 7, "documents submitted": 3, "on hold": 1, dead: 0 },
  { state: "Madhya Pradesh", sanctioned: 18, disbursed: 16, "under banking process": 9, "documents pending": 6, "documents submitted": 2, "on hold": 1, dead: 0 },
  { state: "West Bengal", sanctioned: 17, disbursed: 15, "under banking process": 9, "documents pending": 6, "documents submitted": 2, "on hold": 1, dead: 0 },
  { state: "Haryana", sanctioned: 15, disbursed: 14, "under banking process": 8, "documents pending": 5, "documents submitted": 2, "on hold": 1, dead: 0 },
  { state: "Kerala", sanctioned: 14, disbursed: 13, "under banking process": 7, "documents pending": 5, "documents submitted": 2, "on hold": 1, dead: 0 },
  { state: "Delhi", sanctioned: 12, disbursed: 11, "under banking process": 6, "documents pending": 4, "documents submitted": 2, "on hold": 1, dead: 0 },
  { state: "Others", sanctioned: 30, disbursed: 24, "under banking process": 14, "documents pending": 10, "documents submitted": 4, "on hold": 3, dead: 1 },
];

// ============================================================================
// TOOLTIP
// ============================================================================
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const visible = payload.filter((p) => p.value > 0);
  if (visible.length === 0) return null;

  return (
    <Box
      sx={{
        backgroundColor: "white",
        border: "2px solid #e5e7eb",
        borderRadius: "8px",
        padding: "12px 14px",
        boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
        minWidth: "220px",
      }}
    >
      <Typography level="body-sm" sx={{ fontWeight: 800, color: "#111827", mb: 1 }}>
        {label}
      </Typography>
      <Stack spacing={0.6}>
        {visible
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .map((entry, idx) => (
            <Box
              key={idx}
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <Box
                  sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: entry.color }}
                />
                <Typography level="body-xs" sx={{ color: "#4b5563", fontWeight: 600 }}>
                  {entry.name}
                </Typography>
              </Box>
              <Typography level="body-sm" sx={{ fontWeight: 700, color: entry.color }}>
                {entry.value}
              </Typography>
            </Box>
          ))}
      </Stack>
    </Box>
  );
};

// ============================================================================
// HELPERS
// ============================================================================
const normalizeStatus = (status) => {
  if (!status) return "on hold";
  const s = status.toLowerCase().trim();
  if (s === "submitted") return "submitted";
  if (s.includes("sanction")) return "sanctioned";
  if (s.includes("disburse")) return "disbursed";
  if (s.includes("banking")) return "under banking process";
  if (s.includes("process")) return "under process";
  if (s.includes("document")) return s.includes("submit") ? "documents submitted" : "documents pending";
  if (s.includes("hold")) return "on hold";
  if (s.includes("dead")) return "dead";
  return "under process";
};

const getStateName = (loan) => {
  const fallback = "Unknown";
  if (!loan || typeof loan !== "object") return fallback;
  return (
    loan.state ||
    loan.project_state ||
    loan.projectState ||
    loan?.address?.state ||
    loan?.location?.state ||
    fallback
  );
};

// ============================================================================
// COMPONENT
// ============================================================================
const DEFAULT_TOP = 12;
const STATUS_KEYS = [
  "sanctioned",
  "disbursed",
  "under banking process",
  "under process",
  "documents pending",
  "documents submitted",
  "submitted",
  "on hold",
  "dead",
];

const makeEmptyStateRow = (stateName = "Unknown") =>
  STATUS_KEYS.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    { state: stateName }
  );

const computeTotal = (row = {}) =>
  STATUS_KEYS.reduce((sum, key) => sum + (Number(row?.[key]) || 0), 0);

const normalizeStatusKey = (rawKey) => {
  const key = String(rawKey || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/count|total|qty|quantity/gi, "")
    .trim();

  if (!key) return null;
  if (key.includes("sanction")) return "sanctioned";
  if (key.includes("disburse")) return "disbursed";
  if (key.includes("submit")) return key === "submitted" ? "submitted" : "documents submitted";
  if (key === "submitted") return "submitted";
  if (key.includes("pending")) return "documents pending";
  if (key.includes("document")) return "documents pending";
  if (key.includes("bank")) return "under banking process";
  if (key.includes("process")) return "under process";
  if (key.includes("hold")) return "on hold";
  if (key.includes("dead") || key.includes("close")) return "dead";
  return null;
};

const addCount = (row, statusKey, value) => {
  if (!statusKey) return;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;
  row[statusKey] = (row[statusKey] || 0) + numeric;
};

const reduceArrayCounts = (row, arr) => {
  if (!Array.isArray(arr)) return;
  arr.forEach((entry) => {
    const statusKey = normalizeStatusKey(
      entry?.status || entry?.name || entry?.label || entry?.key
    );
    const val =
      entry?.count ??
      entry?.value ??
      entry?.total ??
      entry?.qty ??
      entry?.quantity;
    addCount(row, statusKey, val);
  });
};

const reduceObjectCounts = (row, obj) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
  Object.entries(obj).forEach(([key, val]) => {
    const statusKey = normalizeStatusKey(key);
    if (statusKey) addCount(row, statusKey, val);
  });
};

const buildRowsFromApi = (apiData) => {
  if (!Array.isArray(apiData)) return [];

  return apiData
    .map((entry) => {
      const stateName =
        getStateName(entry) ||
        entry?.state_name ||
        entry?.State ||
        entry?.name ||
        entry?._id ||
        "Unknown";

      const row = makeEmptyStateRow(stateName);

      // Handle direct numeric props
      reduceObjectCounts(row, entry);
      // Handle nested objects (statusCounts, status_counts, statuses, counts)
      reduceObjectCounts(
        row,
        entry?.statusCounts ||
          entry?.status_counts ||
          entry?.statuses ||
          entry?.counts ||
          entry?.status
      );
      // Handle nested arrays of { status, count }
      reduceArrayCounts(
        row,
        entry?.statusCounts ||
          entry?.status_counts ||
          entry?.statuses ||
          entry?.counts ||
          entry?.status
      );

      const total = computeTotal(row);
      if (!Number.isFinite(total) || total <= 0) return null;
      return { ...row, total };
    })
    .filter(Boolean);
};


const sortAndSliceRows = (rows, sortKey, topCount) => {
  if (!rows || rows.length === 0) return [];

  // Validate sortKey
  const validSortKey = STATUS_KEYS.includes(sortKey) ? sortKey : "total";

  const withTotals = rows.map((row) => ({
    ...row,
    total: row.total ?? computeTotal(row),
  }));

  const sorted = withTotals.sort((a, b) => (b[validSortKey] || 0) - (a[validSortKey] || 0));

  if (topCount === "all") return sorted;

  const limit = Math.max(1, Number(topCount) || DEFAULT_TOP);
  if (sorted.length <= limit) return sorted;

  const top = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1);

  if (rest.length > 0) {
    const others = rest.reduce(
      (acc, curr) => {
        STATUS_KEYS.forEach((key) => {
          acc[key] += curr[key] || 0;
        });
        acc.total += curr.total || computeTotal(curr);
        return acc;
      },
      { ...makeEmptyStateRow("Others"), total: 0 }
    );
    top.push(others);
  }

  return top;
};

const StateWiseDistributionChart = ({ loading = false, onBarClick = null }) => {
  // Date range filter state - both Sanction Date and Disbursal Date
  const [sanctionDateRange, setSanctionDateRange] = useState(null);
  const [disbursalDateRange, setDisbursalDateRange] = useState(null);
  
  // Refs for date range filter toggles - allows parent Box to trigger filter open
  const sanctionFilterRef = useRef(null);
  const disbursalFilterRef = useRef(null);
  
  // Initialize filters from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sanctionFrom = params.get("state_sanction_from");
    const sanctionTo = params.get("state_sanction_to");
    const disbursalFrom = params.get("state_disbursal_from");
    const disbursalTo = params.get("state_disbursal_to");

    if (sanctionFrom || sanctionTo) {
      setSanctionDateRange({
        from: sanctionFrom || null,
        to: sanctionTo || null,
      });
    }
    if (disbursalFrom || disbursalTo) {
      setDisbursalDateRange({
        from: disbursalFrom || null,
        to: disbursalTo || null,
      });
    }
  }, []);

  // Update URL params when filters change
  const updateUrlParams = (newSanctionRange, newDisbursalRange) => {
    const params = new URLSearchParams();
    
    if (newSanctionRange?.from) params.append("state_sanction_from", newSanctionRange.from);
    if (newSanctionRange?.to) params.append("state_sanction_to", newSanctionRange.to);
    if (newDisbursalRange?.from) params.append("state_disbursal_from", newDisbursalRange.from);
    if (newDisbursalRange?.to) params.append("state_disbursal_to", newDisbursalRange.to);

    const queryString = params.toString();
    const newUrl = queryString 
      ? `${window.location.pathname}?${queryString}` 
      : window.location.pathname;
    window.history.pushState({}, "", newUrl);
  };

  // Handle Sanction Date change
  const handleSanctionDateChange = (newRange) => {
    setSanctionDateRange(newRange);
    updateUrlParams(newRange, disbursalDateRange);
  };

  // Handle Disbursal Date change
  const handleDisbursalDateChange = (newRange) => {
    setDisbursalDateRange(newRange);
    updateUrlParams(sanctionDateRange, newRange);
  };
  
  const { 
    data: stateStatusData, 
    isLoading: isStateLoading, 
    isFetching: isStateFetching, 
    error: stateStatusError 
  } = useGetLoanStatusByStateQuery({
    // Pass date range filters to API with correct parameter names
    ...(sanctionDateRange?.from && { sanction_from: sanctionDateRange.from }),
    ...(sanctionDateRange?.to && { sanction_to: sanctionDateRange.to }),
    ...(disbursalDateRange?.from && { disbursal_from: disbursalDateRange.from }),
    ...(disbursalDateRange?.to && { disbursal_to: disbursalDateRange.to }),
  });
  
  const [topCount, setTopCount] = useState(DEFAULT_TOP);
  const [sortKey, setSortKey] = useState("total");

  useEffect(() => {
  }, [stateStatusData, stateStatusError]);

  const apiRows = useMemo(() => buildRowsFromApi(stateStatusData), [stateStatusData]);

  const baseRows = useMemo(() => {
    if (apiRows.length > 0) return apiRows;
    return [];
  }, [apiRows]);

  const chartData = useMemo(() => {
    if (!baseRows || baseRows.length === 0) return SAMPLE_STATE_DATA;
    return sortAndSliceRows(baseRows, sortKey, topCount);
  }, [baseRows, sortKey, topCount]);

  // Keep bars readable by enforcing a minimum width per state and allowing horizontal scroll
  const chartPixelWidth = useMemo(() => {
    const minPerState = 120; // pixels per state group
    const baseWidth = 900;   // minimum canvas width to avoid cramped layout
    return Math.max(baseWidth, (chartData?.length || 0) * minPerState);
  }, [chartData]);

  const isDataLoading =
    loading ||
    ((isStateLoading || isStateFetching) && apiRows.length === 0);

  const activeStatuses = useMemo(() => {
    const set = new Set();
    chartData.forEach((row) => {
      Object.keys(STATUS_COLORS).forEach((status) => {
        if (row[status] && row[status] > 0) set.add(status);
      });
    });
    return [
      "sanctioned",
      "disbursed",
      "under banking process",
      "submitted",
      "documents submitted",
      "documents pending",
      "on hold",
      "dead",
    ].filter((s) => set.has(s));
  }, [chartData]);

  if (isDataLoading) {
    return (
      <Card variant="outlined" sx={{ p: 3, textAlign: "center", bgcolor: "#f9fafb", borderColor: "#e5e7eb" }}>
        <Typography level="body-sm" sx={{ color: "#6b7280" }}>Loading state-wise distribution...</Typography>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card variant="outlined" sx={{ p: 3, textAlign: "center", bgcolor: "#f9fafb", borderColor: "#e5e7eb" }}>
        <Typography level="body-sm" sx={{ color: "#6b7280" }}>No loan data available</Typography>
      </Card>
    );
  }

  // Stable height for stacked vertical bars; X-axis handles top N only
  const dynamicHeight = 460;

  return (
    <Card
      variant="outlined"
      sx={{ p: 0, borderColor: "#e5e7eb", bgcolor: "white", overflow: "hidden" }}
    >
      {/* Header with Legend */}
      <Box sx={{ p: 3.5, borderBottom: "1px solid #e5e7eb", bgcolor: "#f9fafb" }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, alignItems: { md: "center" }, justifyContent: "space-between", mb: 2.5 }}>
          <Box>
            <Typography
              level="h3"
              sx={{
                fontWeight: 800,
                color: "#1f2937",
                fontSize: "20px",
                letterSpacing: "-0.3px",
              }}
            >
              State-wise Loan Status Distribution
            </Typography>
            <Typography level="body-sm" sx={{ color: "#6b7280", mt: 0.5 }}>
              Top states prioritized, others rolled up for clarity
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" flexWrap="wrap">
            {/* Sanction Date Filter */}
            <Box 
              onClick={() => sanctionFilterRef.current?.toggleOpen()}
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 0.75,
                bgcolor: "white", 
                borderRadius: "8px", 
                padding: "4px 10px", 
                border: "1px solid #d1d5db",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#9ca3af",
                  bgcolor: "#fafafa",
                },
              }}
            >
              <Typography
                level="body-sm"
                sx={{
                  fontWeight: 600,
                  color: "#374151",
                  fontSize: "13px",
                  letterSpacing: "0.2px",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                Sanction Date
              </Typography>
              <DateRangeFilter
                ref={sanctionFilterRef}
                columnId="state_sanction_date_range"
                label="Sanction Date"
                value={sanctionDateRange}
                onChange={handleSanctionDateChange}
                isActive={Boolean(sanctionDateRange?.from || sanctionDateRange?.to)}
              />
            </Box>

            {/* Disbursal Date Filter */}
            <Box 
              onClick={() => disbursalFilterRef.current?.toggleOpen()}
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 0.75,
                bgcolor: "white", 
                borderRadius: "8px", 
                padding: "4px 10px", 
                border: "1px solid #d1d5db",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#9ca3af",
                  bgcolor: "#fafafa",
                },
              }}
            >
              <Typography
                level="body-sm"
                sx={{
                  fontWeight: 600,
                  color: "#374151",
                  fontSize: "13px",
                  letterSpacing: "0.2px",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                Disbursal Date
              </Typography>
              <DateRangeFilter
                ref={disbursalFilterRef}
                columnId="state_disbursal_date_range"
                label="Disbursal Date"
                value={disbursalDateRange}
                onChange={handleDisbursalDateChange}
                isActive={Boolean(disbursalDateRange?.from || disbursalDateRange?.to)}
              />
            </Box>

            <Select
              size="sm"
              value={sortKey}
              onChange={(e, val) => {
                if (val) {
                  setSortKey(val);
                }
              }}
              sx={{ 
                minWidth: 170,
                "& button": {
                  fontSize: "13px",
                  fontWeight: 500,
                  padding: "6px 12px",
                },
              }}
            >
              <Option value="total">Sort by Total</Option>
              <Option value="sanctioned">Sort by Sanctioned</Option>
              <Option value="disbursed">Sort by Disbursed</Option>
              <Option value="documents pending">Sort by Docs Pending</Option>
            </Select>
          </Stack>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" },
            gap: 2,
            pt: 2.5,
            borderTop: "1.5px solid #e5e7eb",
          }}
        >
          {activeStatuses.map((status) => (
            <Box
              key={status}
              sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "default" }}
            >
              <Box
                sx={{
                  width: 13,
                  height: 13,
                  borderRadius: "3px",
                  backgroundColor: STATUS_COLORS[status],
                  boxShadow: `0 0 8px ${STATUS_COLORS[status]}50`,
                }}
              />
              <Typography
                level="body-sm"
                sx={{ fontWeight: 600, color: "#374151", fontSize: "13px", letterSpacing: "0.2px" }}
              >
                {STATUS_LABELS[status]}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Chart */}
      <Box
        sx={{
          width: "100%",
          height: `${dynamicHeight}px`,
          p: 3,
          bgcolor: "white",
          position: "relative",
          overflowX: "auto",
        }}
      >
        <Box sx={{ minWidth: `${chartPixelWidth}px`, height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 80 }}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical opacity={0.35} />

              <XAxis
                dataKey="state"
                tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }}
                angle={-20}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280", fontWeight: 500 }}
                axisLine={{ strokeWidth: 0 }}
                tickLine={{ strokeWidth: 0 }}
              />

              <Tooltip
                cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                content={<CustomTooltip />}
                wrapperStyle={{ outline: "none" }}
              />

              {activeStatuses.map((status, idx) => {
                const isTop = idx === activeStatuses.length - 1;
                return (
                  <Bar
                    key={status}
                    dataKey={status}
                    stackId="stack"
                    fill={STATUS_COLORS[status]}
                    name={STATUS_LABELS[status]}
                    radius={isTop ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    onClick={(data) => {
                      if (onBarClick && data && data.state) {
                        onBarClick(data.state, status);
                      }
                    }}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Card>
  );
};

export default StateWiseDistributionChart;