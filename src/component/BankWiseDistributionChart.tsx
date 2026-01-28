import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, Box, Typography, Stack, Chip, CircularProgress, Select, Option, Button } from "@mui/joy";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  Cell,
  ReferenceArea,
} from "recharts";
import { useGetLoanStatusByBankQuery } from "../redux/loanSlice";
import DateRangeFilter from "./DateRangeFilter";

// ============================================================================
// INDIAN STATES AND UNION TERRITORIES
// ============================================================================
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// ============================================================================
// HIGHLY DISTINGUISHABLE PROFESSIONAL COLOR PALETTE
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
// REALISTIC DISTRIBUTED SAMPLE DATA
// ============================================================================
const SAMPLE_CHART_DATA = [
  {
    name: "SBI",
    shortName: "State Bank of India",
    sanctioned: 42,
    disbursed: 35,
    "under banking process": 18,
    "documents pending": 12,
    "documents submitted": 5,
    "on hold": 3,
    dead: 2,
  },
  {
    name: "HDFC",
    shortName: "HDFC Bank",
    sanctioned: 28,
    disbursed: 32,
    "under banking process": 14,
    "documents pending": 9,
    "documents submitted": 4,
    "on hold": 2,
    dead: 1,
  },
  {
    name: "ICICI",
    shortName: "ICICI Bank",
    sanctioned: 35,
    disbursed: 28,
    "under banking process": 16,
    "documents pending": 11,
    "documents submitted": 6,
    "on hold": 4,
    dead: 2,
  },
  {
    name: "Axis",
    shortName: "Axis Bank",
    sanctioned: 22,
    disbursed: 26,
    "under banking process": 12,
    "documents pending": 8,
    "documents submitted": 3,
    "on hold": 2,
    dead: 1,
  },
  {
    name: "PNB",
    shortName: "Punjab National Bank",
    sanctioned: 18,
    disbursed: 20,
    "under banking process": 10,
    "documents pending": 7,
    "documents submitted": 3,
    "on hold": 1,
    dead: 0,
  },
  {
    name: "BOB",
    shortName: "Bank of Baroda",
    sanctioned: 16,
    disbursed: 18,
    "under banking process": 9,
    "documents pending": 6,
    "documents submitted": 2,
    "on hold": 1,
    dead: 0,
  },
  {
    name: "Kotak",
    shortName: "Kotak Mahindra Bank",
    sanctioned: 24,
    disbursed: 22,
    "under banking process": 11,
    "documents pending": 8,
    "documents submitted": 4,
    "on hold": 2,
    dead: 1,
  },
  {
    name: "YES",
    shortName: "YES Bank",
    sanctioned: 14,
    disbursed: 16,
    "under banking process": 8,
    "documents pending": 5,
    "documents submitted": 2,
    "on hold": 1,
    dead: 0,
  },
];

// ============================================================================
// PROFESSIONAL CUSTOM TOOLTIP - POSITIONED CORRECTLY
// ============================================================================
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  // Filter out zero values for cleaner display
  const visiblePayload = payload.filter((entry) => entry.value > 0);

  if (visiblePayload.length === 0) return null;

  return (
    <Box
      sx={{
        backgroundColor: "white",
        border: "2px solid #e5e7eb",
        borderRadius: "8px",
        padding: "14px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.12)",
        minWidth: "220px",
      }}
    >
      <Typography
        level="body-sm"
        sx={{
          fontWeight: 700,
          color: "#1f2937",
          mb: 1.5,
          pb: 1,
          borderBottom: "2px solid #f3f4f6",
        }}
      >
        {label}
      </Typography>
      <Stack spacing={0.8}>
        {visiblePayload
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .map((entry, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "2px",
                    backgroundColor: entry.color,
                  }}
                />
                <Typography level="body-xs" sx={{ color: "#6b7280", fontWeight: 600 }}>
                  {entry.name}
                </Typography>
              </Box>
              <Typography
                level="body-sm"
                sx={{
                  fontWeight: 700,
                  color: entry.color,
                }}
              >
                {entry.value}
              </Typography>
            </Box>
          ))}
      </Stack>
    </Box>
  );
};

/**
 * Normalize loan status to standardized format
 */
const normalizeLoanStatus = (status) => {
  if (!status) return "on hold";
  const normalized = String(status).toLowerCase().trim();

  if (normalized === "submitted") return "submitted";
  if (normalized.includes("sanction")) return "sanctioned";
  if (normalized.includes("disburse")) return "disbursed";
  if (normalized.includes("banking")) return "under banking process";
  if (normalized.includes("process")) return "under process";
  if (normalized.includes("document")) {
    return normalized.includes("submit") ? "documents submitted" : "documents pending";
  }
  if (normalized.includes("hold")) return "on hold";
  if (normalized.includes("dead")) return "dead";

  return "under process";
};

// Normalize bank names (case/spacing) and return key + display label
const normalizeBankName = (name) => {
  const raw = typeof name === "string" ? name.trim() : "";
  const base = raw || "Unknown Bank";
  const key = base.toLowerCase();
  const display = base
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ") || base;
  return { key, display };
};

/**
 * Build chart rows from API response
 */
const buildRowsFromApi = (apiData) => {
  if (!Array.isArray(apiData) || apiData.length === 0) {
    return [];
  }

  const bankMap = {};

  apiData.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;

    const rawBankName = entry?.bank || entry?.bank_name || entry?.name || entry?._id;
    const { key, display } = normalizeBankName(rawBankName);
    const statuses = entry?.statuses || entry?.status || {};

    if (!bankMap[key]) {
      bankMap[key] = {
        name: display.substring(0, 15),
        shortName: display,
        sanctioned: 0,
        disbursed: 0,
        "under banking process": 0,
        "under process": 0,
        "documents pending": 0,
        "documents submitted": 0,
        submitted: 0,
        "on hold": 0,
        dead: 0,
      };
    }

    const row = bankMap[key];

    Object.entries(statuses).forEach(([rawStatus, count]) => {
      const normalized = normalizeLoanStatus(rawStatus);
      if (row.hasOwnProperty(normalized)) {
        row[normalized] = (row[normalized] || 0) + (Number(count) || 0);
      }
    });
  });

  const processedRows = Object.values(bankMap)
    .map((row) => {
      const total = Object.keys(row).reduce((sum, key) => {
        if (key === "name" || key === "shortName") return sum;
        return sum + (row[key] || 0);
      }, 0);
      return total > 0 ? row : null;
    })
    .filter(Boolean);

  // Sort by total count (descending)
  const sortedRows = processedRows.sort((a, b) => {
    const totalA = Object.values(a).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
    const totalB = Object.values(b).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
    return totalB - totalA;
  });

  // Take top 10
  const topRows = sortedRows.slice(0, 10);
  
  return topRows;
};

/**
 * Build chart rows from loans prop (fallback)
 */
const buildRowsFromLoans = (loans) => {
  if (!Array.isArray(loans) || loans.length === 0) return [];

  try {
    const bankMap = {};

    loans.forEach((loan) => {
      if (!loan || typeof loan !== "object") return;

      try {
        const { key, display } = normalizeBankName(loan.banker_details?.[0]?.bank_name);
        const status = normalizeLoanStatus(loan.loan_current_status?.status);

        if (!bankMap[key]) {
          bankMap[key] = {
            name: display.substring(0, 15),
            shortName: display,
            sanctioned: 0,
            disbursed: 0,
            "under banking process": 0,
            "under process": 0,
            "documents pending": 0,
            "documents submitted": 0,
            "on hold": 0,
            dead: 0,
          };
        }

        bankMap[key][status] = (bankMap[key][status] || 0) + 1;
      } catch (err) {
        // Error handling
      }
    });

    return Object.values(bankMap)
      .sort((a, b) => {
        const totalA = Object.values(a).reduce((sum, val) => sum + (typeof val === "number" ? val : 0), 0);
        const totalB = Object.values(b).reduce((sum, val) => sum + (typeof val === "number" ? val : 0), 0);
        return totalB - totalA;
      })
      .slice(0, 10);
  } catch (err) {
    return [];
  }
};

/**
 * BankWiseDistributionChart - Professional Grouped Bar Chart
 */
const BankWiseDistributionChart = ({ loans = [], loading = false, onBarClick = null }) => {
  // Local state for filtering
  const [selectedState, setSelectedState] = useState("All");
  
  // Date range filter state - both Sanction Date and Disbursal Date
  const [sanctionDateRange, setSanctionDateRange] = useState(null);
  const [disbursalDateRange, setDisbursalDateRange] = useState(null);

  // Refs for date range filter toggles - allows parent Box to trigger filter open
  const sanctionFilterRef = useRef(null);
  const disbursalFilterRef = useRef(null);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sanctionFrom = params.get("bank_sanction_from");
    const sanctionTo = params.get("bank_sanction_to");
    const disbursalFrom = params.get("bank_disbursal_from");
    const disbursalTo = params.get("bank_disbursal_to");
    const state = params.get("bank_state");

    if (state) setSelectedState(state);
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
  const updateUrlParams = (newSanctionRange, newDisbursalRange, newState) => {
    const params = new URLSearchParams();
    
    if (newState && newState !== "All") {
      params.append("bank_state", newState);
    }
    if (newSanctionRange?.from) params.append("bank_sanction_from", newSanctionRange.from);
    if (newSanctionRange?.to) params.append("bank_sanction_to", newSanctionRange.to);
    if (newDisbursalRange?.from) params.append("bank_disbursal_from", newDisbursalRange.from);
    if (newDisbursalRange?.to) params.append("bank_disbursal_to", newDisbursalRange.to);

    const queryString = params.toString();
    const newUrl = queryString 
      ? `${window.location.pathname}?${queryString}` 
      : window.location.pathname;
    window.history.pushState({}, "", newUrl);
  };

  // Handle Sanction Date change
  const handleSanctionDateChange = (newRange) => {
    setSanctionDateRange(newRange);
    updateUrlParams(newRange, disbursalDateRange, selectedState);
  };

  // Handle Disbursal Date change
  const handleDisbursalDateChange = (newRange) => {
    setDisbursalDateRange(newRange);
    updateUrlParams(sanctionDateRange, newRange, selectedState);
  };

  // Handle State change
  const handleStateChange = (newState) => {
    setSelectedState(newState);
    updateUrlParams(sanctionDateRange, disbursalDateRange, newState);
  };

  const {
    data: bankStatusData,
    isLoading: isBankLoading,
    isFetching: isBankFetching,
    error: bankStatusError,
  } = useGetLoanStatusByBankQuery({
    stateFilter: selectedState === "All" ? "all" : selectedState,
    // Pass date range filters to API with correct parameter names
    ...(sanctionDateRange?.from && { sanction_from: sanctionDateRange.from }),
    ...(sanctionDateRange?.to && { sanction_to: sanctionDateRange.to }),
    ...(disbursalDateRange?.from && { disbursal_from: disbursalDateRange.from }),
    ...(disbursalDateRange?.to && { disbursal_to: disbursalDateRange.to }),
  });

  useEffect(() => {
    // Logging removed for production
  }, [bankStatusData, bankStatusError, isBankLoading, isBankFetching, selectedState]);

  const apiRows = useMemo(() => {
    const rows = buildRowsFromApi(bankStatusData);
    return rows;
  }, [bankStatusData]);
  
  const loanRows = useMemo(() => {
    const rows = buildRowsFromLoans(loans);
    return rows;
  }, [loans]);

  const chartData = useMemo(() => {
    // Prefer API rows. Only fall back to local loans when no state filter is applied.
    if (apiRows.length > 0) return apiRows;
    if (selectedState === "All" && loanRows.length > 0) return loanRows;
    return [];
  }, [apiRows, loanRows, selectedState]);

  // Ensure bars remain legible by giving each bank a minimum pixel width and allowing horizontal scroll
  const chartPixelWidth = useMemo(() => {
    const minPerBank = 130; // pixels per bank group
    const baseWidth = 900;  // minimum canvas width to avoid cramped layout
    return Math.max(baseWidth, (chartData?.length || 0) * minPerBank);
  }, [chartData]);

  // Get active statuses from data
  const activeStatuses = useMemo(() => {
    const statuses = new Set();
    chartData.forEach((bank) => {
      Object.keys(STATUS_COLORS).forEach((status) => {
        if (bank[status] && bank[status] > 0) {
          statuses.add(status);
        }
      });
    });
    // Return in consistent order for legend
    return [
      "sanctioned",
      "disbursed",
      "under banking process",
      "submitted",
      "documents submitted",
      "documents pending",
      "on hold",
      "dead",
    ].filter((s) => statuses.has(s));
  }, [chartData]);

  // Shared Y-axis domain for consistent scale across charts
  const yMax = useMemo(() => {
    if (!chartData?.length || !activeStatuses.length) return 1;
    let maxTotal = 0;
    chartData.forEach((bank) => {
      const total = activeStatuses.reduce((sum, status) => sum + (bank[status] || 0), 0);
      if (total > maxTotal) maxTotal = total;
    });
    return Math.max(1, Math.ceil(maxTotal * 1.1));
  }, [chartData, activeStatuses]);

  const isChartLoading = loading || isBankLoading || isBankFetching;

  const hasData = chartData.length > 0;

  return (
    <Card
      variant="outlined"
      sx={{
        p: 0,
        borderColor: "#e5e7eb",
        bgcolor: "white",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3.5, borderBottom: "1px solid #e5e7eb", bgcolor: "#f9fafb" }}>
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Typography 
            level="h3" 
            sx={{ 
              fontWeight: 800, 
              color: "#1f2937",
              fontSize: "20px",
              letterSpacing: "-0.3px",
            }}
          >
            Bank-wise Loan Status Distribution
          </Typography>
          
          {/* Date Range Filters and State Filter */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
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
                columnId="sanction_date_range"
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
                columnId="disbursal_date_range"
                label="Disbursal Date"
                value={disbursalDateRange}
                onChange={handleDisbursalDateChange}
                isActive={Boolean(disbursalDateRange?.from || disbursalDateRange?.to)}
              />
            </Box>

            {/* State Filter Dropdown */}
            <Select
              value={selectedState}
              onChange={(e, newValue) => handleStateChange(newValue)}
              placeholder="Filter by state"
              size="sm"
              variant="outlined"
              sx={{
                minWidth: 180,
                bgcolor: "white",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                "--Select-focusedThickness": "2px",
                "--Select-focusedHighlight": "#3b82f6",
                "& button": {
                  fontSize: "13px",
                  fontWeight: 500,
                  padding: "6px 12px",
                },
                "&:hover": {
                  borderColor: "#9ca3af",
                  bgcolor: "#fafafa",
                },
              }}
            >
              <Option value="All">All States</Option>
              {INDIAN_STATES.sort().map((state) => (
                <Option key={state} value={state}>
                  {state}
                </Option>
              ))}
            </Select>
          </Box>
        </Box>

        {/* Legend at Top - Professional Layout */}
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
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                transition: "all 0.2s ease",
                cursor: "default",
                "&:hover": {
                  transform: "translateX(2px)",
                },
              }}
            >
              <Box
                sx={{
                  width: 13,
                  height: 13,
                  borderRadius: "3px",
                  backgroundColor: STATUS_COLORS[status],
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${STATUS_COLORS[status]}50`,
                }}
              />
              <Typography
                level="body-sm"
                sx={{
                  fontWeight: 600,
                  color: "#374151",
                  fontSize: "13px",
                  letterSpacing: "0.2px",
                }}
              >
                {STATUS_LABELS[status]}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Chart Container */}
      <Box
        sx={{
          width: "100%",
          height: "420px",
          p: 3,
          bgcolor: "white",
          position: "relative",
          overflowX: "auto",
        }}
      >
        {isChartLoading && (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size="lg" sx={{ "--CircularProgress-size": "40px" }} />
          </Box>
        )}

        {!isChartLoading && !hasData && (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography level="body-sm" sx={{ color: "#6b7280" }}>
              No loan data available for the selected state
            </Typography>
          </Box>
        )}

        {!isChartLoading && hasData && (
          <Box sx={{ minWidth: `${chartPixelWidth}px`, height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                barGap={2}
                barCategoryGap="25%"
              >
                <CartesianGrid
                  strokeDasharray="0"
                  stroke="#e5e7eb"
                  vertical={false}
                  horizontal={true}
                  opacity={0.5}
                />

                <XAxis
                  dataKey="name"
                  angle={0}
                  textAnchor="middle"
                  height={45}
                  tick={{
                    fontSize: 13,
                    fill: "#374151",
                    fontWeight: 600,
                  }}
                  tickMargin={8}
                  axisLine={{ stroke: "#e5e7eb" }}
                />

                <YAxis
                  tick={{ fontSize: 13, fill: "#6b7280", fontWeight: 500 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={{ stroke: "#e5e7eb" }}
                  domain={[0, yMax]}
                  allowDecimals={false}
                />

                <Tooltip
                  cursor={{ 
                    fill: "rgba(59, 130, 246, 0.05)",
                    stroke: "rgba(59, 130, 246, 0.3)",
                    strokeWidth: 1.5,
                    strokeDasharray: "4 4",
                  }}
                  content={<CustomTooltip />}
                  wrapperStyle={{ outline: "none" }}
                  position={{ y: -20 }}
                />

                {/* Visible soft borders around each bank group */}
                {chartData.map((bank, index) => {
                  const groupWidth = 0.45;
                  const xStart = index - groupWidth;
                  const xEnd = index + groupWidth;
                  const maxValue = Math.max(...activeStatuses.map((status) => bank[status] || 0), 0);
                  const yEnd = Math.max(1, maxValue * 1.02);

                  return (
                    <ReferenceArea
                      key={`bank-border-${index}`}
                      x1={xStart}
                      x2={xEnd}
                      y1={0}
                      y2={yEnd}
                      stroke="rgba(99, 102, 241, 0.35)"
                      strokeWidth={2}
                      fill="rgba(224, 231, 255, 0.08)"
                      fillOpacity={1}
                      ifOverflow="extendDomain"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {/* Render bars for each active status */}
                {activeStatuses.map((status) => (
                  <Bar
                    key={status}
                    dataKey={status}
                    fill={STATUS_COLORS[status]}
                    name={STATUS_LABELS[status]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                    onClick={(data) => {
                      if (onBarClick && data) {
                        const bankName = data.shortName || data.name;
                        if (bankName) {
                          onBarClick(bankName, status, selectedState);
                        }
                      }
                    }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default BankWiseDistributionChart;