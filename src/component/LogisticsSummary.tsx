// src/components/LogisticsDashboard.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormLabel,
  Link,
  Option,
  Select,
  Tooltip,
  Typography,
} from "@mui/joy";

import {
  useGetLogisticsQuery,
  useUpdateLogisticStatusMutation,
  useLazyGetLogisticsFilterOptionsQuery,
} from "../redux/purchasesSlice";

import DynamicTable from "./Reusable/DynamicTable";

const HEADER_STACK = 108; // MainHeader + SubHeader sticky stack
const FILTERS_APPROX = 120; // ~height of your filters row
const PADDING_FIX = 24;

/* ---------------- helpers ---------------- */
const formatINR = (v) =>
  Number(v ?? 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const safe = (v, fb = "-") => {
  if (v === null || v === undefined) return fb;
  const s = String(v).trim();
  return s ? s : fb;
};

const getPoNumbers = (row) => {
  const list = Array.isArray(row?.po_id) ? row.po_id : [];
  return list.map((po) =>
    typeof po === "string" ? po : po?.po_number || po?._id || "-"
  );
};

function buildPoCategorySummary(itemsRaw) {
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];
  const pairCounts = new Map();
  const grouped = new Map();

  for (const it of items) {
    const po = it?.material_po?.po_number || "-";
    const category = it?.category_name || "-";
    const key = `${po}|${category}`;
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }

  const pairs = [];
  for (const [key, count] of pairCounts.entries()) {
    const [po, category] = key.split("|");
    pairs.push({ po, category, count });
    if (!grouped.has(po)) grouped.set(po, []);
    grouped.get(po).push({ category, count });
  }

  pairs.sort((a, b) =>
    a.po === b.po
      ? a.category.localeCompare(b.category)
      : a.po.localeCompare(b.po)
  );
  for (const [po, arr] of grouped.entries()) {
    arr.sort((a, b) => a.category.localeCompare(b.category));
  }

  const first = pairs[0];
  const firstLabel = first ? `${first.po} — ${first.category}` : "-";
  const extraCount = Math.max(0, pairs.length - 1);

  return { pairs, grouped, firstLabel, extraCount };
}

const pageNumbers = (current, total) => {
  const out = [];
  if (current > 2) out.push(1);
  if (current > 3) out.push("…");
  for (let p = Math.max(1, current - 1); p <= Math.min(total, current + 1); p++)
    out.push(p);
  if (current < total - 2) out.push("…");
  if (current < total - 1) out.push(total);
  return out;
};

// Compact round "+N" pill (used in two table cells)
const MorePill = ({ n }) =>
  n > 0 ? (
    <Chip
      size="sm"
      variant="soft"
      color="neutral"
      sx={{
        px: 0.8,
        py: 0.2,
        minHeight: "20px",
        lineHeight: 1.2,
        borderRadius: "999px",
        fontWeight: 600,
        fontSize: "11px",
        color: "#383838ff", // subtle gray-blue text
        bgcolor: "#f1f5f9", // very light gray background
        border: "1px solid #b3b8beff",
        textAlign: "center",
        transition: "all 0.2s ease",
        "&:hover": {
          bgcolor: "#e2e8f0",
          color: "#272e37ff",
          borderColor: "#cbd5e1",
        },
      }}
    >
      +{n}
    </Chip>
  ) : null;
// small helper to extract error text
const errMsg = (e) =>
  e?.data?.message || e?.error || e?.message || "Failed to update status";

function StatusCard({ row, onUpdated }) {
  const raw =
    row?.current_status?.status ??
    (Array.isArray(row?.status_history) && row.status_history.length
      ? row.status_history[row.status_history.length - 1]?.status
      : undefined);

  const current = raw || "ready_to_dispatch";

  const [updateStatus, { isLoading }] = useUpdateLogisticStatusMutation();
  const [errorText, setErrorText] = useState("");
  const [user, setUser] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("userDetails");
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const isLogistic =
    user?.department === "Logistic" || user?.department === "SCM";
  const isSuperadmin = user?.role === "superadmin";

  const canChangeStatus = isLogistic || isSuperadmin;

  // Determine available status transitions
  const getAvailableStatuses = () => {
    const available = [];
    if (current === "ready_to_dispatch") {
      available.push({ value: "out_for_delivery", label: "Out for Delivery" });
    }
    if (current === "out_for_delivery") {
      available.push({ value: "delivered", label: "Delivered" });
    }
    return available;
  };

  const label =
    current === "delivered"
      ? "Delivered"
      : current === "out_for_delivery"
      ? "Out for Delivery"
      : "Ready to Dispatch";

  const color =
    current === "delivered"
      ? "success"
      : current === "out_for_delivery"
      ? "warning"
      : "neutral";

  const ddmmyyyy = (d) => {
    if (!d) return "dd - mm - yyyy";
    const dt = new Date(d);
    if (isNaN(dt)) return "dd - mm - yyyy";
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    return `${dd} - ${mm} - ${yyyy}`;
  };

  // helper: is any received_qty blank?
  const hasBlankReceivedQty = (r) => {
    const items = Array.isArray(r?.items) ? r.items : [];
    return items.some(
      (it) =>
        it == null ||
        it.received_qty == null ||
        String(it.received_qty).trim() === ""
    );
  };

  const handleStatusClick = () => {
    if (canChangeStatus) {
      setSelectedNewStatus("");
      setErrorText("");
      setStatusModalOpen(true);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedNewStatus) {
      setErrorText("Please select a new status");
      return;
    }

    setErrorText("");

    // Block Delivered if any received_qty is blank
    if (selectedNewStatus === "delivered" && hasBlankReceivedQty(row)) {
      setErrorText(
        "Cannot mark as Delivered. One or more items have blank 'Quantity Received'."
      );
      return;
    }

    try {
      await updateStatus({
        id: row._id,
        status: selectedNewStatus,
        remarks: "",
      }).unwrap();

      toast.success(`Status updated to ${getStatusLabel(selectedNewStatus)}`);
      setStatusModalOpen(false);

      // Trigger parent refetch
      if (onUpdated) {
        await onUpdated();
      }
    } catch (e) {
      const errMessage =
        e?.data?.message || e?.error || e?.message || "Failed to update status";
      setErrorText(errMessage);
      toast.error(errMessage);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "delivered":
        return "Delivered";
      case "out_for_delivery":
        return "Out for Delivery";
      case "ready_to_dispatch":
        return "Ready to Dispatch";
      default:
        return status;
    }
  };

  return (
    <>
      <Box
        sx={{
          border: "1px solid",
          borderColor: "neutral.outlinedBorder",
          borderRadius: "sm",
          p: 1,
          bgcolor: "background.body",
          minWidth: 320,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "neutral.softBg",
            px: 1,
            py: 0.75,
            borderRadius: "sm",
            mb: 1,
          }}
        >
          <Typography level="title-sm">{label}</Typography>
          <Chip
            size="sm"
            variant="soft"
            color={color}
            sx={{
              cursor: canChangeStatus ? "pointer" : "default",
              "&:hover": canChangeStatus ? { boxShadow: "sm" } : {},
            }}
            onClick={handleStatusClick}
          >
            {label}
          </Chip>
        </Box>

        {/* Dates */}
        <Box sx={{ display: "grid", rowGap: 0.5, mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography level="body-sm" sx={{ minWidth: 130 }}>
              Dispatch Date :
            </Typography>
            <Typography level="body-sm">
              {ddmmyyyy(row?.dispatch_date)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography level="body-sm" sx={{ minWidth: 130 }}>
              Delivery Date :
            </Typography>
            <Typography level="body-sm">
              {ddmmyyyy(row?.delivery_date)}
            </Typography>
          </Box>
        </Box>

        {canChangeStatus && (
          <Typography level="body-xs" sx={{ color: "text.secondary", mt: 1 }}>
            Click status to change
          </Typography>
        )}
      </Box>

      {/* Status Change Modal */}
      {statusModalOpen && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
          }}
          onClick={() => setStatusModalOpen(false)}
        >
          <Box
            sx={{
              bgcolor: "background.surface",
              borderRadius: "md",
              p: 2,
              minWidth: 350,
              boxShadow: "lg",
              border: "1px solid",
              borderColor: "neutral.outlinedBorder",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography level="h4" sx={{ mb: 2 }}>
              Update Status
            </Typography>

            {/* Current Status */}
            <Box sx={{ mb: 2 }}>
              <Typography level="body-sm" sx={{ mb: 1, fontWeight: 600 }}>
                Current Status
              </Typography>
              <Chip color={color} variant="soft" size="lg">
                {label}
              </Chip>
            </Box>

            {/* Available Status Options */}
            <Box sx={{ mb: 2 }}>
              <Typography level="body-sm" sx={{ mb: 1, fontWeight: 600 }}>
                New Status
              </Typography>
              <FormControl sx={{ width: "100%" }}>
                <Select
                  value={selectedNewStatus}
                  onChange={(e, newValue) => setSelectedNewStatus(newValue)}
                  placeholder="Select new status..."
                  sx={{ mb: 1 }}
                >
                  <Option value="">-- Select Status --</Option>
                  {getAvailableStatuses().map((st) => (
                    <Option key={st.value} value={st.value}>
                      {st.label}
                    </Option>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Error Message */}
            {errorText && (
              <Typography level="body-xs" color="danger" sx={{ mb: 2 }}>
                {errorText}
              </Typography>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button
                variant="plain"
                color="neutral"
                onClick={() => setStatusModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                color="primary"
                onClick={handleConfirmStatusChange}
                disabled={isLoading || !selectedNewStatus}
                loading={isLoading}
              >
                {isLoading ? "Updating..." : "Confirm"}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
}

/* ---------------- component ---------------- */
export default function LogisticsDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableRef = useRef(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // -------- Tabs --------
  const TAB_LABELS = ["All", "Out for delivery", "Delivered"];
  const [selectedTab, setSelectedTab] = useState(
    () => searchParams.get("tab") || "All"
  );

  // Status update modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedRowForStatus, setSelectedRowForStatus] = useState(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState("");
  const [statusUpdateError, setStatusUpdateError] = useState("");

  // read status from URL so the request query string mirrors it
  const urlStatus = (searchParams.get("status") || "").trim();

  const mapTabToStatus = (tab) => {
    switch (tab) {
      case "Out for delivery":
      case "Out for Delivery":
        return "out_for_delivery";
      case "Delivered":
        return "delivered";
      case "All":
      default:
        return ""; // no status param for All
    }
  };

  // -------- Pagination --------
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    setCurrentPage(Number.isNaN(p) ? 1 : Math.max(1, p));
  }, [searchParams]);

  // -------- Search & Page Size --------
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(
    () => Number(searchParams.get("pageSize")) || 10
  );

  const [selected, setSelected] = useState([]);

  const [filters, setFilters] = useState({});

  const handleTabChange = (newTab) => {
    setSelectedTab(newTab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    params.set("page", "1");
    const statusValue = mapTabToStatus(newTab);
    statusValue ? params.set("status", statusValue) : params.delete("status");
    setSearchParams(params);
    setCurrentPage(1);
  };

  function statusColor(s) {
    switch (String(s || "").toLowerCase()) {
      case "out_for_delivery":
        return "warning";
      case "delivered":
        return "success";
      case "ready_to_dispatch":
        return "neutral";
      default:
        return "neutral";
    }
  }

  const cap = (s) =>
    String(s || "")
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");

  const handleFilterChange = (colId, value) => {
    setFilters((prev) => ({
      ...prev,
      [colId]: value,
    }));
    // Update URL params for filters
    const params = new URLSearchParams(searchParams);
    // Special handling for date range filters
    if (colId === "dispatch_date") {
      // Always remove all related params
      params.delete("filter_dispatch_date_from");
      params.delete("filter_dispatch_date_to");
      params.delete("filter_dispatch_date");
      // If setting a new value, add from/to
      if (value && typeof value === "object") {
        if (value.from) params.set("filter_dispatch_date_from", value.from);
        if (value.to) params.set("filter_dispatch_date_to", value.to);
      }
    } else if (colId === "delivery_date") {
      params.delete("filter_delivery_date_from");
      params.delete("filter_delivery_date_to");
      params.delete("filter_delivery_date");
      if (value && typeof value === "object") {
        if (value.from) params.set("filter_delivery_date_from", value.from);
        if (value.to) params.set("filter_delivery_date_to", value.to);
      }
    } else {
      // Default for all other filters
      if (value) {
        params.set(`filter_${colId}`, value);
      } else {
        params.delete(`filter_${colId}`);
      }
    }
    params.set("page", "1"); // Reset to first page on filter change
    setSearchParams(params);
    setCurrentPage(1);
  };

  const [triggerLogisticsFilterOptions] =
    useLazyGetLogisticsFilterOptionsQuery();

  useEffect(() => {
    const newFilters = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter_dispatch_date_")) {
        // Will be handled below
        continue;
      }
      if (key.startsWith("filter_delivery_date_")) {
        // Will be handled below
        continue;
      }
      if (key.startsWith("filter_")) {
        newFilters[key.replace("filter_", "")] = value;
      }
    }
    // Add date range filters as objects under column id (so filter icon can detect them)
    const dispatchFrom = searchParams.get("filter_dispatch_date_from");
    const dispatchTo = searchParams.get("filter_dispatch_date_to");
    if (dispatchFrom || dispatchTo) {
      newFilters.dispatch_date = { from: dispatchFrom, to: dispatchTo };
    }

    const deliveryFrom = searchParams.get("filter_delivery_date_from");
    const deliveryTo = searchParams.get("filter_delivery_date_to");
    if (deliveryFrom || deliveryTo) {
      newFilters.delivery_date = { from: deliveryFrom, to: deliveryTo };
    }
    setFilters(newFilters);
  }, [searchParams]);

  // Build query args. Only include "status" when it exists in URL.
  const queryArgs = useMemo(() => {
    const base = {
      page: currentPage,
      pageSize: rowsPerPage,
      search: searchQuery,
      po_id: "",
      po_number: searchParams.get("po_number") || "",
    };
    // Add filters from URL params
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter_")) {
        base[key.replace("filter_", "")] = value;
      }
    }
    return urlStatus ? { ...base, status: urlStatus } : base;
  }, [currentPage, rowsPerPage, searchQuery, searchParams, urlStatus]);

  const {
    data: resp = {},
    isLoading,
    refetch,
  } = useGetLogisticsQuery(queryArgs, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true, // ensure fetch on arg (status) change
  });

  const rows = useMemo(() => {
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp?.data)) return resp.data;
    return [];
  }, [resp]);

  // API-aware meta + range with robust fallbacks
  const meta = resp?.meta || {};
  const total = Number(
    meta?.total ?? meta?.totalCount ?? meta?.total_count ?? resp?.total ?? 0
  );
  const count = Number(
    meta?.count ?? meta?.pageCount ?? meta?.per_page_count ?? rows.length
  );
  const apiPage = Number(
    meta?.page ?? meta?.currentPage ?? meta?.current_page ?? currentPage
  );
  const apiPageSize = Number(
    meta?.pageSize ?? meta?.perPage ?? meta?.per_page ?? rowsPerPage
  );

  const totalPages = Math.max(1, Math.ceil((total || 0) / apiPageSize));

  // For "Showing X–Y of Z"
  const startIndex = total ? (apiPage - 1) * apiPageSize + 1 : 0;
  const endIndex = total ? Math.min(startIndex + count - 1, total) : 0;

  const handlePageChange = (p) => {
    if (p < 1 || p > totalPages) return;
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    setSearchParams(params);
    setCurrentPage(p);
    setSelected([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelected(rows.map((r) => r._id));
    else setSelected([]);
  };

  const handleRowSelect = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // ========== DYNAMIC TABLE CONFIGURATION ==========

  // RTK mutation hook for updating status
  const [updateLogisticStatus, { isLoading: isUpdatingStatus }] =
    useUpdateLogisticStatusMutation();

  // Open modal when status chip is clicked
  const handleStatusChipClick = (row) => {
    setSelectedRowForStatus(row);
    setSelectedNewStatus("");
    setStatusUpdateError("");
    setStatusModalOpen(true);
  };

  // Get available status options based on current status
  const getAvailableStatuses = () => [
    { value: "ready_to_dispatch", label: "Ready to Dispatch" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
  ];

  // Helper to check if any received_qty is blank
  const hasBlankReceivedQty = (row) => {
    const items = Array.isArray(row?.items) ? row.items : [];
    return items.some(
      (it) =>
        it == null ||
        it.received_qty == null ||
        String(it.received_qty).trim() === ""
    );
  };

  // Actual status update handler - called when user confirms in modal
  const handleConfirmStatusChange = async () => {
    if (!selectedNewStatus) {
      setStatusUpdateError("Please select a new status");
      return;
    }

    setStatusUpdateError("");

    // Block Delivered if any received_qty is blank
    if (
      selectedNewStatus === "delivered" &&
      hasBlankReceivedQty(selectedRowForStatus)
    ) {
      setStatusUpdateError(
        "Cannot mark as Delivered. One or more items have blank 'Quantity Received'."
      );
      return;
    }

    try {
      await updateLogisticStatus({
        id: selectedRowForStatus._id,
        status: selectedNewStatus,
        remarks: "",
      }).unwrap();

      const statusLabel =
        selectedNewStatus === "delivered"
          ? "Delivered"
          : selectedNewStatus === "out_for_delivery"
          ? "Out for Delivery"
          : "Ready to Dispatch";
      toast.success(`Status updated to ${statusLabel}`);
      setStatusModalOpen(false);
      setSelectedRowForStatus(null);

      // Refetch data to show updated status
      await refetch();
    } catch (error) {
      const errMessage =
        error?.data?.message ||
        error?.error ||
        error?.message ||
        "Failed to update status";
      setStatusUpdateError(errMessage);
      toast.error(errMessage);
    }
  };

  const filterConfig = useMemo(
    () => ({
      triggerLogisticsFilterOptions,
    }),
    [triggerLogisticsFilterOptions]
  );

  const prettyStatus = (s = "") =>
    String(s)
      .trim()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // Column definitions with
  const columns = useMemo(
    () => [
      {
        id: "logistic_code",
        label: "Logistics Code",
        width: 180,
        filterType: "list",
        sticky: true,
        editable: false,
        listConfig: {
          filterTypeParam: "logistic_code", // API parameter name
          getItemLabel: (row) => row?.logistic_code || "", // Extract display label
          pageSize: 7,
        },
        render: (row) => (
          <Tooltip
            title="View Logistics Detail"
            arrow
            sx={{ bgcolor: "#1b8cdcff" }}
          >
            <span>
              <Link
                underline="none"
                sx={{
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "0.1px solid ",
                  borderRadius: "999px",
                  padding: "2px 10px",
                }}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("row", row._id);
                  setSearchParams(params);
                  navigate(`/logistics-form?mode=edit&id=${row._id}`);
                }}
              >
                {safe(row.logistic_code)}
              </Link>
            </span>
          </Tooltip>
        ),
      },
      {
        id: "transportation_po",
        label: "Transportation PO",
        width: 240,
        filterType: "list",
        sticky: true,
        editable: false,
        listConfig: {
          filterTypeParam: "transportation_po",
          getItemLabel: (row) => {
            const poNumbers = getPoNumbers(row);
            return poNumbers[0] || "";
          },
          pageSize: 7,
        },
        render: (row) => {
          const poNumbers = getPoNumbers(row);
          const firstPO = poNumbers[0] || "-";
          const extraPO = Math.max(0, poNumbers.length - 1);

          return (
            <Tooltip
              variant="soft"
              placement="top-start"
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography level="body-xs" sx={{ mb: 0.5, fontWeight: 700 }}>
                    Transportation POs
                  </Typography>
                  {poNumbers.length ? (
                    poNumbers.map((p, idx) => (
                      <Typography key={idx} level="body-xs">
                        • {p}
                      </Typography>
                    ))
                  ) : (
                    <Typography level="body-xs">-</Typography>
                  )}
                </Box>
              }
              sx={{
                bgcolor: "#ffffffff",
                boxShadow: "0 0  15px 2px #a6a6a6ff",
              }}
            >
              <Box
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                <Typography level="body-sm" fontWeight="md">
                  {firstPO}
                </Typography>
                <MorePill n={extraPO} />
              </Box>
            </Tooltip>
          );
        },
      },
      {
        id: "po_number_with_item",
        label: "PO Number with Item",
        width: 250,
        filterType: "list",
        editable: false,
        listConfig: {
          filterTypeParam: "po_number_with_item", // API parameter name
          getItemLabel: (row) => row?.po_number_with_item || "", // Extract display label
          pageSize: 7,
        },
        render: (row) => {
          const { grouped, firstLabel, extraCount } = buildPoCategorySummary(
            row.items
          );

          return (
            <Tooltip
              variant="soft"
              placement="top-start"
              title={
                <Box sx={{ p: 0.5, maxWidth: 360 }}>
                  <Typography level="body-xs" sx={{ mb: 0.5, fontWeight: 700 }}>
                    POs & Categories
                  </Typography>
                  {grouped.size ? (
                    Array.from(grouped.entries()).map(([po, arr]) => (
                      <Box key={po} sx={{ mb: 0.5 }}>
                        <Typography level="body-xs" sx={{ fontWeight: 600 }}>
                          {po}
                        </Typography>
                        {arr.map(({ category, count }, idx) => (
                          <Typography key={idx} level="body-xs" sx={{ pl: 1 }}>
                            • {category} {count > 1 ? `(${count})` : ""}
                          </Typography>
                        ))}
                      </Box>
                    ))
                  ) : (
                    <Typography level="body-xs">-</Typography>
                  )}
                </Box>
              }
              sx={{
                bgcolor: "#ffffffff",
                boxShadow: "0 0  15px 2px #a6a6a6ff",
              }}
            >
              <Box
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                <Typography level="body-sm">{safe(firstLabel)}</Typography>
                <MorePill n={extraCount} />
              </Box>
            </Tooltip>
          );
        },
      },
      {
        id: "vehicle_number",
        label: "Vehicle No.",
        width: 150,
        filterType: "text",
        editable: false,
        inputType: "text",
        render: (row) => (
          <Typography level="body-sm">{safe(row.vehicle_number)}</Typography>
        ),
      },
      {
        id: "total_transport_po_value",
        label: "Transport PO Value",
        width: 180,
        filterType: "text",
        editable: false,
        render: (row) => (
          <Typography level="body-sm">
            {formatINR(row.total_transport_po_value)}
          </Typography>
        ),
      },
      {
        id: "total_ton",
        label: "Total Weight (Ton)",
        width: 180,
        filterType: "text",
        editable: false,
        inputType: "number",
        render: (row) => {
          const totalWeight =
            row?.total_ton ??
            (Array.isArray(row.items)
              ? row.items.reduce((sum, it) => sum + (Number(it.weight) || 0), 0)
              : "-");
          return <Typography level="body-sm">{safe(totalWeight)}</Typography>;
        },
      },
      {
        id: "loading_point",
        label: "Loading Point",
        width: 160,
        filterType: "text",
        editable: false,
        inputType: "text",
        render: (row) => (
          <Typography level="body-sm">{safe(row.loading_point)}</Typography>
        ),
      },
      {
        id: "unloading_point",
        label: "Unloading Point",
        width: 160,
        filterType: "text",
        editable: false,
        inputType: "text",
        render: (row) => (
          <Typography level="body-sm">{safe(row.unloading_point)}</Typography>
        ),
      },
      {
        id: "vehicle_size",
        label: "Vehicle Size",
        width: 160,
        filterType: "text",
        editable: false,
        inputType: "number",
        render: (row) => (
          <Typography level="body-sm">{safe(row.vehicle_size)}</Typography>
        ),
      },
      {
        id: "vehicle_weight_allowed",
        label: "Vehicle Weight Allowed",
        width: 180,
        filterType: "text",
        editable: false,
        inputType: "number",
        render: (row) => (
          <Typography level="body-sm">
            {safe(row.vehicle_weight_allowed)}
          </Typography>
        ),
      },
      {
        id: "distance_in_km",
        label: "Total Distance (Km)",
        width: 180,
        filterType: "text",
        editable: false,
        inputType: "number",
        render: (row) => (
          <Typography level="body-sm">{safe(row.distance_in_km)}</Typography>
        ),
      },
      {
        id: "approved_rate",
        label: "Approved Rate",
        width: 160,
        filterType: "text",
        editable: false,
        inputType: "number",
        render: (row) => (
          <Typography level="body-sm">{safe(row.approved_rate)}</Typography>
        ),
      },
      {
        id: "dispatch_date",
        label: "Dispatch Date",
        width: 160,
        filterType: "daterange",
        filterParam: "dispatch_date",
        editable: false,
        inputType: "date",
        render: (row) => {
          const date = row?.dispatch_date;
          if (!date) return "-";
          try {
            const dt = new Date(date);
            if (isNaN(dt.getTime())) return "-";
            return dt.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          } catch {
            return "-";
          }
        },
      },
      {
        id: "delivery_date",
        label: "Delivery Date",
        width: 160,
        filterType: "daterange",
        filterParam: "delivery_date",
        editable: false,
        inputType: "date",
        render: (row) => {
          const date = row?.delivery_date;
          if (!date) return "-";
          try {
            const dt = new Date(date);
            if (isNaN(dt.getTime())) return "-";
            return dt.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          } catch {
            return "-";
          }
        },
      },
      {
        id: "status",
        label: "Status",
        width: 160,
        editable: false,
        render: (row) => (
          <Chip
            size="sm"
            variant="soft"
            color={statusColor(row?.current_status?.status)}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              cursor: "pointer",
              "&:hover": { boxShadow: "sm" },
            }}
            onClick={() => handleStatusChipClick(row)}
          >
            {prettyStatus(row?.current_status?.status)}
          </Chip>
        ),
      },
    ],
    [navigate, searchParams, setSearchParams]
  );

  // Transform data for DynamicTable (already preprocessed from backend)
  const tableData = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      // Add any computed fields needed for display
      _id: row._id,
    }));
  }, [rows]);

  // Pagination configuration for DynamicTable
  const paginationConfig = useMemo(
    () => ({
      currentPage: apiPage,
      rowsPerPage: apiPageSize,
      totalPages: totalPages,
      totalResults: total,
      onPageChange: handlePageChange,
      onPageSizeChange: (newSize) => {
        setRowsPerPage(newSize);
        const params = new URLSearchParams(searchParams);
        params.set("pageSize", String(newSize));
        params.set("page", "1");
        setSearchParams(params);
        setCurrentPage(1);
      },
    }),
    [apiPage, apiPageSize, totalPages, total, searchParams]
  );

  // Search handler for DynamicTable
  const handleSearchChange = (query) => {
    console.log("Search query:", query);
    setSearchQuery(query);

    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    setSearchParams(params);
    setCurrentPage(1);
  };

  // Inline edit save handler
  const handleInlineEditSave = async (rowId, colId, value, row) => {
    try {
      // TODO: Implement API call to update the field
      console.log("Saving:", { rowId, colId, value });
      toast.success(`Updated ${colId} successfully`);
      await refetch();
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to update field");
      throw error;
    }
  };

  return (
    <Box
      sx={{
        ml: { lg: "var(--Sidebar-width)" },
        px: "0px",
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
      }}
    >
      {/* Status Update Modal */}
      {statusModalOpen && selectedRowForStatus && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
          }}
          onClick={() => setStatusModalOpen(false)}
        >
          <Box
            sx={{
              bgcolor: "background.surface",
              borderRadius: "md",
              p: 3,
              minWidth: 400,
              maxWidth: 500,
              boxShadow: "lg",
              border: "1px solid",
              borderColor: "neutral.outlinedBorder",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography level="h4" sx={{ mb: 2 }}>
              Update Logistics Status
            </Typography>

            {/* Current Status */}
            <Box sx={{ mb: 2 }}>
              <Typography level="body-sm" sx={{ mb: 1, fontWeight: 600 }}>
                Current Status
              </Typography>
              <Chip
                color={statusColor(
                  selectedRowForStatus?.current_status?.status
                )}
                variant="soft"
                size="lg"
                sx={{ textTransform: "capitalize" }}
              >
                {prettyStatus(selectedRowForStatus?.current_status?.status)}
              </Chip>
            </Box>

            {/* Logistics Code Info */}
            <Box sx={{ mb: 2 }}>
              <Typography level="body-xs" sx={{ color: "text.secondary" }}>
                Logistics Code: {selectedRowForStatus?.logistic_code || "-"}
              </Typography>
            </Box>

            {/* New Status Selection */}
            <Box sx={{ mb: 2 }}>
              <FormControl sx={{ width: "100%" }}>
                <FormLabel>Select New Status</FormLabel>
                <Select
                  value={selectedNewStatus}
                  onChange={(e, newValue) => {
                    setSelectedNewStatus(newValue);
                    setStatusUpdateError("");
                  }}
                  placeholder="Choose a status..."
                  sx={{ mt: 0.5 }}
                  slotProps={{
                    listbox: {
                      sx: { zIndex: 20000 }, // ensure dropdown is above modal
                    },
                    popup: {
                      sx: { zIndex: 20000 },
                    },
                  }}
                >
                  {getAvailableStatuses(
                    selectedRowForStatus?.current_status?.status
                  ).map((st) => (
                    <Option key={st.value} value={st.value}>
                      {st.label}
                    </Option>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Error Message */}
            {statusUpdateError && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  bgcolor: "danger.softBg",
                  borderRadius: "sm",
                  border: "1px solid",
                  borderColor: "danger.outlinedBorder",
                }}
              >
                <Typography level="body-sm" color="danger">
                  {statusUpdateError}
                </Typography>
              </Box>
            )}

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                justifyContent: "flex-end",
                mt: 3,
              }}
            >
              <Button
                variant="plain"
                color="neutral"
                onClick={() => {
                  setStatusModalOpen(false);
                  setSelectedRowForStatus(null);
                  setStatusUpdateError("");
                }}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                color="primary"
                onClick={handleConfirmStatusChange}
                disabled={isUpdatingStatus || !selectedNewStatus}
                loading={isUpdatingStatus}
              >
                {isUpdatingStatus ? "Updating..." : "Update Status"}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* DynamicTable with all advanced features */}
      <DynamicTable
        ref={tableRef}
        columns={columns}
        data={tableData}
        rowKey="_id"
        // Selection
        selectable={true}
        selectedRows={selected}
        onSelectionChange={setSelected}
        //Tab selection
        tab={selectedTab}
        tabLabels={TAB_LABELS}
        onTabChange={handleTabChange}
        // Search (controlled by parent via URL)
        searchable={true}
        searchPlaceholder="Search by Logistics Code, PO, Vehicle No., Description"
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        // Pagination (controlled by parent via URL)
        pagination={paginationConfig}
        // Inline Editing
        enableInlineEdit={true}
        onSave={handleInlineEditSave}
        nonEditableColumns={[
          "logistic_code",
          "transportation_po",
          "po_number_with_item",
          "total_transport_po_value",
          "status",
        ]}
        // Sticky Columns with Draggable Divider
        enableStickyDivider={true}
        defaultStickyWidth={450}
        minStickyWidth={200}
        maxStickyWidth={1200}
        //Filtering
        enableFiltering={true}
        filters={filters}
        onFilterChange={handleFilterChange}
        filterConfig={filterConfig}
        // Column Customization (drag & drop, visibility)
        enableColumnCustomization={true}
        columnPresets={{
          Essential: ["logistic_code", "vehicle_number", "status"],
          Financial: ["logistic_code", "total_transport_po_value", "total_ton"],
          Complete: columns.map((c) => c.id),
        }}
        // UI States
        loading={isLoading}
        emptyContent={
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography fontStyle="italic" level="body-md">
              No Logistics Found
            </Typography>
            <Typography level="body-sm" sx={{ mt: 1, color: "text.secondary" }}>
              Try adjusting your search or filters
            </Typography>
          </Box>
        }
        // Storage for user preferences
        storageKey="logistics-summary-table"
        enableLocalStorage={true}
        // Styling
        maxHeight="calc(100dvh - 260px)"
        className="logistics-summary-table"
      />
    </Box>
  );
}
