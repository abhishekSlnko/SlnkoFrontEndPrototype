// Loan_Dashboard.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Grid, Typography } from "@mui/joy";
import { useNavigate, useSearchParams } from "react-router-dom";
import CloudStatCard from "./All_Tasks/TaskDashboardCards";
import LoanStatusDonutChart from "./LoanStatusDonutChart";
import BankWiseDistributionChart from "./BankWiseDistributionChart";
import StateWiseDistributionChart from "./StateWiseDistributionChart";
import {
  useGetLoanStatusCountQuery,
  useGetAllLoanQuery,
} from "../redux/loanSlice";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import GavelIcon from "@mui/icons-material/Gavel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BuildIcon from "@mui/icons-material/Build";
import RecentLoansTable from "./All_Tasks/RecentLoansTable";

/* ==================== STABLE CONSTANTS ==================== */
/* Loan status display configuration */
const LOAN_STATUS_LABELS = {
  "documents pending": "Document Pending",
  "documents submitted": "Documents Submitted",
  "form pending": "Form Pending",
  "under banking process": "Under Process",
  "under process": "Under Process",
  sanctioned: "Sanctioned",
  disbursed: "Disbursed",
  dead: "Dead",
  "on hold": "On Hold",
};

/* Donut chart color scheme for loan statuses */
const LOAN_STATUS_COLORS = {
  disbursed: "#10B981", // Emerald Green - Completed
  sanctioned: "#06B6D4", // Cyan - Approved
  "under banking process": "#8B5CF6", // Violet - In Process
  "under process": "#8B5CF6", // Violet - In Process
  "documents pending": "#F59E0B", // Amber - Attention Needed
  "documents submitted": "#EC4899", // Hot Pink - Action Taken
  submitted: "#EC4899", // Hot Pink - Action Taken (same as documents submitted)
  "on hold": "#6B7280", // Gray - Paused
  dead: "#DC2626", // Red - Cancelled
  "form pending": "#6B7280",
};

const relTime = (iso) => {
  if (!iso) return "";
  const now = Date.now();
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(1, Math.floor((now - t) / 1000));
  const mins = Math.floor(diff / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (diff < 60) return `${diff}s ago`;
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

/**
 * Normalize loan status to a consistent key
 * Handles various status strings and normalizes them to standard categories
 */
const normalizeLoanStatus = (status) => {
  if (!status) return null;
  const normalized = String(status || "")
    .toLowerCase()
    .trim();

  // Direct matches
  if (normalized === "sanctioned") return "sanctioned";
  if (normalized === "disbursed") return "disbursed";
  if (normalized === "dead") return "dead";
  if (normalized === "on hold") return "on hold";
  if (normalized === "submitted") return "submitted";
  if (normalized === "form pending") return "form pending";

  // Group "under process" variants
  if (normalized.includes("under") && normalized.includes("process"))
    return "under banking process";
  if (normalized.includes("documents") && normalized.includes("pending"))
    return "documents pending";
  if (normalized.includes("documents") && normalized.includes("submitted"))
    return "documents submitted";

  // Fallback to document pending (most common initial status)
  return "documents pending";
};

const IconBadge = ({ color = "#2563eb", bg = "#eff6ff", icon }) => (
  <div
    style={{
      width: 42,
      height: 26,
      borderRadius: 999,
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color,
      fontWeight: 700,
      boxShadow: "0 1px 0 rgba(0,0,0,0.04) inset, 0 6px 14px rgba(2,6,23,0.06)",
      border: "1px solid rgba(2,6,23,0.06)",
    }}
  >
    {icon}
  </div>
);

/* ==================== RECENT LOANS TABLE WRAPPER ==================== */
const RecentLoansTableWrapper = ({
  rows = [],
  loading = false,
  page = 1,
  total = 0,
  rowsPerPage = 10,
  statusFilter = "all",
  searchQuery = "",
  onPageChange,
  onRowsPerPageChange,
  onStatusFilterChange,
  onSearchChange,
}) => {
  // Transform loan data to match RecentLoansTable format
  const transformedRows = useMemo(() => {
    // Sort by computed updatedTs (if present) descending; fallback to updatedAt/updatedTime
    const sorted = [...rows].sort((a, b) => {
      const aTime = Number(
        a.updatedTs ||
          new Date(a.updatedTime || a.updatedAt || 0).getTime() ||
          0
      );
      const bTime = Number(
        b.updatedTs ||
          new Date(b.updatedTime || b.updatedAt || 0).getTime() ||
          0
      );
      return bTime - aTime;
    });
    return sorted.map((loan) => ({
      id: loan.id || loan.projectId,
      projectId: loan.projectId, // For navigation
      customerName: loan.clientName || "—", // Customer Name
      contact: loan.customerContact || "—", // Contact Number
      bankName: loan.bankName || "—", // Bank Name
      projectStatus: loan.projectStatus || "—", // Project Status
      loanStatus: loan.loanStatus || loan.status || "—", // Loan Status
      updatedAt: loan.updatedAt || loan.updatedTime || "—", // Last Updated (display string)
    }));
  }, [rows]);

  return (
    <RecentLoansTable
      rows={transformedRows}
      loading={loading}
      page={page}
      total={total}
      rowsPerPage={rowsPerPage}
      statusFilter={statusFilter}
      searchQuery={searchQuery}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      onStatusFilterChange={onStatusFilterChange}
      onSearchChange={onSearchChange}
    />
  );
};

/* ==================== MAIN COMPONENT ==================== */
function LoanDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");

  // Initialize recent page and pageSize from URL, with defaults
  const [recentPage, setRecentPage] = useState(() => {
    const page = parseInt(searchParams.get("recent_page")) || 1;
    return Math.max(1, page);
  });
  const [recentPageSize, setRecentPageSize] = useState(() => {
    const pageSize = searchParams.get("recent_limit");
    return pageSize ? parseInt(pageSize, 10) : 10;
  });
  const [recentStatusFilter, setRecentStatusFilter] = useState(
    () => searchParams.get("recent_status") || "all"
  );
  const [recentSearchQuery, setRecentSearchQuery] = useState(
    () => searchParams.get("recent_search") || ""
  );

  const handleRecentPageChange = useCallback(
    (nextPage) => {
      const safe = Math.max(1, Number(nextPage) || 1);
      setRecentPage(safe);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("recent_page", String(safe));
        return params;
      });
    },
    [setSearchParams]
  );

  const handleRecentRowsPerPageChange = useCallback(
    (nextSize) => {
      const safe = Math.max(1, Number(nextSize) || 10);
      setRecentPageSize(safe);
      setRecentPage(1);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("recent_limit", String(safe));
        params.set("recent_page", "1");
        return params;
      });
    },
    [setSearchParams]
  );

  const handleRecentStatusFilterChange = useCallback(
    (status) => {
      setRecentStatusFilter(status || "all");
      setRecentPage(1);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("recent_status", status || "all");
        params.set("recent_page", "1");
        return params;
      });
    },
    [setSearchParams]
  );

  const handleRecentSearchChange = useCallback(
    (search) => {
      setRecentSearchQuery(search);
      setRecentPage(1);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (search) {
          params.set("recent_search", search);
        } else {
          params.delete("recent_search");
        }
        params.set("recent_page", "1");
        return params;
      });
    },
    [setSearchParams]
  );

  // Sync URL state to local state when URL changes externally (e.g., browser back/forward, reload)
  useEffect(() => {
    const page = parseInt(searchParams.get("recent_page")) || 1;
    const limit = parseInt(searchParams.get("recent_limit")) || 10;
    const status = searchParams.get("recent_status") || "all";
    const search = searchParams.get("recent_search") || "";

    setRecentPage(Math.max(1, page));
    setRecentPageSize(Math.max(1, limit));
    setRecentStatusFilter(status);
    setRecentSearchQuery(search);
  }, [searchParams]);

  const handleTabChange = (newValue) => {
    const next = String(newValue);
    setActiveTab(next);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab_dashboard", next);
      return params;
    });
  };

  // Build query params for Recent Loans API
  const recentLoansQueryParams = useMemo(() => {
    const query = {
      page: recentPage,
      limit: recentPageSize,
      sort: "-updatedAt", // Sort by latest first
      search: recentSearchQuery || "",
    };
    // Add status filter if not "all"
    if (recentStatusFilter && recentStatusFilter !== "all") {
      query.loan_status = recentStatusFilter;
    }
    return query;
  }, [recentPage, recentPageSize, recentStatusFilter, recentSearchQuery]);

  // Fetch recent loans from dedicated all-loan endpoint
  const {
    data: recentLoansResponse,
    isLoading: isRecentLoansLoading,
    isFetching: isRecentLoansFetching,
    error: recentLoansError,
  } = useGetAllLoanQuery(recentLoansQueryParams);

  // Fetch loan status count from dedicated endpoint
  const {
    data: loanStatusCountData,
    isLoading: isStatusCountLoading,
    isFetching: isStatusCountFetching,
    error: statusCountError,
  } = useGetLoanStatusCountQuery();



  /**
   * Uses dedicated API endpoint for accurate counts
   */
  const stats = useMemo(() => {
    const result = {
      sanctionedLoans: 0,
      disbursedLoans: 0,
      processingLoans: 0,
      attentionRequiredLoans: 0,
      formpendingLoans: 0,
      totalLoans: 0,
      formpendingLoans: 0,
      statusCounts: {},
    };

    // If we have API data, use it (preferred)
    if (loanStatusCountData && Array.isArray(loanStatusCountData)) {
      loanStatusCountData.forEach((item) => {
        const status = item._id || item.status;
        const count = item.count || 0;

        if (!status) return;

        const normalizedStatus = normalizeLoanStatus(status);

        // Store in statusCounts for donut chart
        if (normalizedStatus) {
          result.statusCounts[normalizedStatus] =
            (result.statusCounts[normalizedStatus] || 0) + count;
          result.totalLoans += count;

          // Categorize for KPI cards
          switch (normalizedStatus) {
            case "sanctioned":
              result.sanctionedLoans += count;
              break;
            case "form pending":
              result.formpendingLoans += count;
              break;
            case "disbursed":
              result.disbursedLoans += count;
              break;
            case "under banking process":
            case "under process":
              result.processingLoans += count;
              break;
            case "documents pending":
              result.attentionRequiredLoans += count;
              break;

            default:
              break;
          }
        }
      });
    }
    return result;
  }, [loanStatusCountData]);

  const donutData = useMemo(() => {
    try {
      const { statusCounts } = stats;
      const totalCount = stats.totalLoans || 1;

      const chartData = Object.entries(statusCounts)
        .map(([status, count]) => {
          const percentage = Number(((count / totalCount) * 100).toFixed(2));
          const displayLabel = LOAN_STATUS_LABELS[status] || status;
          const color = LOAN_STATUS_COLORS[status] || "#9ca3af";

          return {
            name: displayLabel,
            value: count,
            percentage: percentage,
            count: count,
            color: color,
          };
        })
        .filter((d) => d.count > 0)
        .sort((a, b) => b.count - a.count);

      return chartData;
    } catch (error) {
      console.warn("Error generating donut data:", error);
      return [];
    }
  }, [stats]);

  /**
   * =============== PREPARE RECENT LOANS TABLE DATA ===============
   */
  const recentLoans = useMemo(() => {
    try {
      // Use data from all-loan API endpoint
      const loansData = recentLoansResponse?.data || [];

      if (!Array.isArray(loansData) || loansData.length === 0) {
        console.log("⚠️ No recent loans data available");
        return [];
      }

      return loansData.map((loan) => {
        // Extract IDs
        const loanId = loan?._id || "";
        const projectObj = loan?.project_id;
        const projectId = projectObj?._id || "";

        const projectName =
          projectObj?.name || projectObj?.customer || loan?.name || "—";

        // Extract customer name and contact
        const customerName = projectObj?.customer || projectObj?.name || "—";
        const customerContact = projectObj?.number || projectObj?.phone || "—";

        // Extract bank name from banker_details
        let bankName = "—";
        let bankerContact = "—";
        if (
          loan?.banker_details &&
          Array.isArray(loan.banker_details) &&
          loan.banker_details.length > 0
        ) {
          const banker = loan.banker_details[0];
          bankName = banker?.name || banker?.bank_name || "—";
          // Extract contact from contact_detail array
          if (
            banker?.contact_detail &&
            Array.isArray(banker.contact_detail) &&
            banker.contact_detail.length > 0
          ) {
            bankerContact = banker.contact_detail[0];
          }
        }

        // Extract loan amount - try different field names
        const loanAmount =
          loan?.loan_amount || loan?.loanAmount || projectObj?.service || 0;

        // Extract loan status from current_status
        const rawLoanStatus =
          loan?.current_status?.status || "documents pending";

        // Extract project status from project_id.current_status
        const projectStatus = projectObj?.current_status?.status || "unknown";

        // Compute latest update timestamp across ALL available sources
        const candidates = [];
        const pushTs = (t) => {
          if (!t) return;
          const ts = new Date(t).getTime();
          if (!Number.isNaN(ts) && ts > 0) candidates.push(ts);
        };

        // Primary timestamps
        pushTs(loan?.updatedAt);
        pushTs(loan?.updated_at);
        pushTs(projectObj?.updatedAt);
        pushTs(projectObj?.updated_at);

        // Current status timestamp
        if (loan?.current_status) {
          pushTs(
            loan.current_status?.updatedAt || loan.current_status?.updated_at
          );
        }

        // Status history (scan all entries for latest)
        if (
          Array.isArray(loan?.status_history) &&
          loan.status_history.length > 0
        ) {
          for (const sh of loan.status_history) {
            pushTs(sh?.updatedAt || sh?.updated_at || sh?.timestamp);
          }
        }

        // Documents (scan for latest)
        if (Array.isArray(loan?.documents) && loan.documents.length > 0) {
          for (const d of loan.documents) {
            pushTs(d?.updatedAt || d?.updated_at || d?.createdAt);
          }
        }

        // Comments (scan for latest)
        if (Array.isArray(loan?.comments) && loan.comments.length > 0) {
          for (const c of loan.comments) {
            pushTs(c?.updatedAt || c?.updated_at || c?.createdAt);
          }
        }

        // Guaranteed fallback
        pushTs(loan?.createdAt);
        pushTs(loan?.created_at);

        const latestTs = candidates.length ? Math.max(...candidates) : 0;
        const updatedTime =
          latestTs && latestTs > 0
            ? relTime(new Date(latestTs).toISOString())
            : "—";

        return {
          projectId: projectId || loanId,
          id: projectId || loanId,
          projectName: projectName,
          clientName: customerName,
          customerContact: customerContact,
          bankName: bankName,
          bankerContact: bankerContact,
          loanAmount: Number(loanAmount),
          loanStatus: rawLoanStatus,
          projectStatus: projectStatus,
          updatedTs: latestTs,
          updatedAt: updatedTime,
        };
      });
    } catch (error) {
      console.error("❌ Error preparing recent loans data:", error);
      console.error("Response structure:", recentLoansResponse);
      return [];
    }
  }, [recentLoansResponse]);

  // Recent loans pagination meta
  const recentPagination =
    recentLoansResponse?.meta || recentLoansResponse?.pagination || {};
  const recentTotal = Number(
    recentPagination.total ||
      recentPagination.totalDocs ||
      recentLoansResponse?.total ||
      recentLoansResponse?.totalDocs ||
      0
  );
  const recentTotalPages = Math.max(
    1,
    Number(
      recentPagination.pages ||
        Math.ceil((recentTotal || 0) / (recentPageSize || 1)) ||
        1
    )
  );

  useEffect(() => {
    if (recentPage > recentTotalPages) {
      setRecentPage(recentTotalPages);
    }
  }, [recentPage, recentTotalPages]);

  /**
   * =============== NAVIGATION HANDLERS ===============
   */
  const handleNavigateToLoans = useCallback(
    (status) => {
      const params = new URLSearchParams();
      params.set("page", "1");
      if (Array.isArray(status)) {
        // Handle multiple statuses - join with comma and set matchMode to "any" (OR logic)
        params.set("loan_status", status.join(","));
        params.set("matchMode", "any");
      } else if (status) {
        // Handle single status
        params.set("loan_status", status);
      }
      navigate(`/loan?${params.toString()}`);
    },
    [navigate]
  );

  // Handler for donut chart segment click
  const handleDonutSegmentClick = useCallback(
    (segment) => {
      if (!segment || !segment.name) return;

      // Reverse map the display name back to the actual status
      const displayName = segment.name;
      let actualStatus = displayName.toLowerCase();

      // Map display names back to actual status values used in the API
      const reverseStatusMap = {
        "document pending": "documents pending",
        "documents pending": "documents pending",
        "documents submitted": "submitted",
        submitted: "submitted",
        "under process": "under banking process",
        "under banking process": "under banking process",
        sanctioned: "sanctioned",
        disbursed: "disbursed",
        dead: "dead",
        "on hold": "on hold",
      };

      // Get the actual status value
      actualStatus =
        reverseStatusMap[displayName.toLowerCase()] ||
        displayName.toLowerCase();

      // Navigate to AllLoan with the filter
      handleNavigateToLoans(actualStatus);
    },
    [handleNavigateToLoans]
  );

  // Handler for bank bar chart click (bank + status + optional state)
  const handleBankBarClick = useCallback(
    (bankName, loanStatus, state) => {
      if (!bankName) return;

      const params = new URLSearchParams();
      params.set("page", "1");
      // Mirror both keys to keep AllLoan filters in sync
      params.set("bank", bankName);
      params.set("bank_name", bankName);
      if (loanStatus) params.set("loan_status", loanStatus);
      if (state && state !== "All") params.set("state", state);
      navigate(`/loan?${params.toString()}`);
    },
    [navigate]
  );

  // Handler for state bar chart click
  const handleStateBarClick = useCallback(
    (stateName, loanStatus) => {
      if (!stateName) return;

      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("state", stateName);
      if (loanStatus) {
        params.set("loan_status", loanStatus);
      }
      navigate(`/loan?${params.toString()}`);
    },
    [navigate]
  );

  return (
    <Box
      sx={{
        ml: { xs: 0, lg: "var(--Sidebar-width)" },
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
        bgcolor: "background.body",
        minHeight: "100vh",
      }}
    >
      {/* Toggle Tabs */}

      {/* =============== OVERVIEW TAB =============== */}
      {activeTab === "overview" && (
        <>
          {/* Row 1: KPI Cards (Sanctioned, Disbursed, Processing, Attention Required) */}
          <Grid container spacing={2} columns={12} sx={{ mt: 0 }}>
            {/* KPI 1: Sanctioned Loans */}
            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={isStatusCountLoading || isStatusCountFetching}
                value={stats.sanctionedLoans}
                title="Sanctioned Loans"
                subtitle="Loans sanctioned by bank"
                accent="#14b8a6"
                illustration={
                  <IconBadge
                    icon={<GavelIcon fontSize="small" />}
                    color="#0d9488"
                    bg="#ccfbf1"
                  />
                }
                onAction={() => handleNavigateToLoans("sanctioned")}
              />
            </Grid>

            {/* KPI 2: Disbursed Loans */}
            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={isStatusCountLoading || isStatusCountFetching}
                value={stats.disbursedLoans}
                title="Disbursed Loans"
                subtitle="Amount disbursed to projects"
                accent="#86efac"
                illustration={
                  <IconBadge
                    icon={<DoneAllIcon fontSize="small" />}
                    color="#16a34a"
                    bg="#ecfdf5"
                  />
                }
                onAction={() => handleNavigateToLoans("disbursed")}
              />
            </Grid>

            {/* KPI 3: Processing Loans */}
            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={isStatusCountLoading || isStatusCountFetching}
                value={stats.processingLoans}
                title="Processing Loans"
                subtitle="Under banking process"
                accent="#60a5fa"
                illustration={
                  <IconBadge
                    icon={<BuildIcon fontSize="small" />}
                    color="#1d4ed8"
                    bg="#dbeafe"
                  />
                }
                onAction={() => handleNavigateToLoans("under banking process")}
              />
            </Grid>

            {/* KPI 4: Attention Required Loans */}
            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={isStatusCountLoading || isStatusCountFetching}
                value={stats.attentionRequiredLoans}
                title="Attention Required"
                subtitle="Documents pending submission"
                accent="#f59e0b"
                illustration={
                  <IconBadge
                    icon={<WarningAmberIcon fontSize="small" />}
                    color="#b45309"
                    bg="#fffbeb"
                  />
                }
                onAction={() => handleNavigateToLoans(["documents pending"])}
              />
            </Grid>
          </Grid>

          {/* Row 2: Recent Loans Table + Donut Chart */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Recent Loans Table */}
            <Grid xs={12} md={8}>
              <RecentLoansTableWrapper
                rows={recentLoans}
                loading={isRecentLoansLoading || isRecentLoansFetching}
                page={recentPage}
                total={recentTotal}
                rowsPerPage={recentPageSize}
                statusFilter={recentStatusFilter}
                searchQuery={recentSearchQuery}
                onPageChange={handleRecentPageChange}
                onRowsPerPageChange={handleRecentRowsPerPageChange}
                onStatusFilterChange={handleRecentStatusFilterChange}
                onSearchChange={handleRecentSearchChange}
              />
            </Grid>

            {/* Donut Chart: Loan Status Distribution */}
            <Grid xs={12} md={4}>
              <LoanStatusDonutChart
                title="Loan Status Distribution"
                data={donutData}
                total={stats.totalLoans}
                totalLabel="Loans"
                loading={isStatusCountLoading || isStatusCountFetching}
                onSegmentClick={handleDonutSegmentClick}
              />
            </Grid>
          </Grid>

          {/* Row 3: Bank-wise Distribution Chart (Full Width) */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12}>
              <BankWiseDistributionChart
                loading={isStatusCountLoading || isStatusCountFetching}
                onBarClick={handleBankBarClick}
              />
            </Grid>
          </Grid>

          {/* Row 4: State-wise Distribution Chart (Full Width) */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12}>
              <StateWiseDistributionChart
                loading={isStatusCountLoading || isStatusCountFetching}
                onBarClick={handleStateBarClick}
              />
            </Grid>
          </Grid>
        </>
      )}

      {/* =============== ANALYTICAL TAB =============== */}
      {activeTab === "analytical" && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography level="h4" sx={{ mb: 2, color: "text.tertiary" }}>
            Analytical Dashboard
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default LoanDashboard;
