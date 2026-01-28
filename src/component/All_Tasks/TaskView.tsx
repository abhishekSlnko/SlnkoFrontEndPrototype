// Dash_task.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { debounce } from "lodash";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import Chip from "@mui/joy/Chip";
import FormControl from "@mui/joy/FormControl";
import Input from "@mui/joy/Input";
import IconButton, { iconButtonClasses } from "@mui/joy/IconButton";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Sheet from "@mui/joy/Sheet";
import Tooltip from "@mui/joy/Tooltip";
import Typography from "@mui/joy/Typography";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import DialogTitle from "@mui/joy/DialogTitle";
import DialogContent from "@mui/joy/DialogContent";
import DialogActions from "@mui/joy/DialogActions";
import Textarea from "@mui/joy/Textarea";
import CircularProgress from "@mui/joy/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import NoData from "../../assets/alert-bell.svg";
import {
  useGetAllTasksQuery,
  useUpdateTaskStatusMutation,
} from "../../redux/globalTaskSlice";
import { Avatar } from "@mui/joy";

/* ---------- JWT helpers (✅ take currentUserId from localStorage.token) ---------- */
const base64UrlDecode = (str = "") => {
  try {
    const pad = "=".repeat((4 - (str.length % 4)) % 4);
    const base64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(base64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
};

const decodeJwtPayload = (token = "") => {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const json = base64UrlDecode(parts[1]);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getUserIdFromToken = () => {
  const token = localStorage.getItem("authToken") || "";
  const payload = decodeJwtPayload(token);
  return payload?.userId || payload?._id || payload?.id || payload?.sub || "";
};

/* ---------- small helper to keep bad URLs from crashing ---------- */
const safeUrl = (u = "") => {
  if (!u) return "";
  try {
    return new URL(u, window.location.origin).href;
  } catch {
    return "";
  }
};

/* ---------- helpers: title + time/diff ---------- */
function toMidnight(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
const msPerDay = 1000 * 60 * 60 * 24;
function daysBetween(a, b) {
  const A = toMidnight(a).getTime();
  const B = toMidnight(b).getTime();
  return Math.floor((A - B) / msPerDay);
}

const WRAP_TOOLTIP_SLOTPROPS = {
  tooltip: {
    sx: {
      maxWidth: 420,
      p: 1,
      borderRadius: 10,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      lineHeight: 1.35,
    },
  },
};

function TitleWithTooltip({ title }) {
  const full = title || "-";
  const isLong = full.length > 15;
  const short = isLong ? `${full.slice(0, 15)}…` : full;

  const content = (
    <Typography
      level="body-sm"
      sx={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        lineHeight: 1.35,
      }}
    >
      {full}
    </Typography>
  );

  return isLong ? (
    <Tooltip
      title={content}
      variant="soft"
      placement="top-start"
      slotProps={WRAP_TOOLTIP_SLOTPROPS}
    >
      <Typography fontWeight="lg" sx={{ cursor: "help" }}>
        {short}
      </Typography>
    </Tooltip>
  ) : (
    <Typography fontWeight="lg">{short}</Typography>
  );
}

export default function Dash_task({
  selected,
  setSelected,
  searchParams,
  setSearchParams,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const reduxUserId = useSelector(
    (s) => s?.auth?.user?._id || s?.auth?.user?.userId || s?.auth?.user?.id
  );

  const currentUserId = useMemo(() => {
    const tokenId = getUserIdFromToken();
    return tokenId || "";
  }, [reduxUserId]);

  const tabLabel = searchParams.get("tab") || "";
  const currentPage = Number(searchParams.get("page")) || 1;
  const itemsPerPage = Number(searchParams.get("limit")) || 10;

  const searchQuery = searchParams.get("search") || "";
  const createdFrom = searchParams.get("from") || "";
  const createdTo = searchParams.get("to") || "";
  const deadlineFrom = searchParams.get("deadlineFrom") || "";
  const deadlineTo = searchParams.get("deadlineTo") || "";
  const department =
    searchParams.get("department") || searchParams.get("departments") || "";
  const assignedTo =
    searchParams.get("assigned_to") || searchParams.get("assignedToId") || "";
  const createdBy =
    searchParams.get("createdBy") || searchParams.get("createdById") || "";
  const priorityFilter = searchParams.get("priorityFilter") || "";
  const taskType = searchParams.get("taskType") || "";
  const approverId = searchParams.get("approverId") || "";

  const TAB_TO_STATUS = {
    "Auto Tasks": "system",
    Pending: "pending",
    "In Progress": "in progress",
    Completed: "completed",
    Cancelled: "cancelled",
    "Approval Pending": "approval pending",
    Approved: "approved",
    Reassigned: "reassigned",
    Rejected: "rejected",
    "on hold": "on hold",
    All: "",
  };

  const normStatus = (st) =>
    String(st || "")
      .trim()
      .toLowerCase();

  const chipColor = (st) => {
    const s = normStatus(st);

    if (s === "approval pending") return "warning";
    if (s === "rejected") return "danger";
    if (s === "on hold") return "neutral";
    if (s === "approved") return "success";

    if (s === "draft") return "primary";
    if (s === "pending") return "danger";
    if (s === "in progress") return "warning";
    if (s === "reassigned") return "primary";
    if (s === "completed") return "success";
    if (s === "cancelled") return "neutral";

    return "neutral";
  };

  const chipSx = (st) => {
    const s = normStatus(st);

    if (s === "approval pending") {
      return {
        bgcolor: "#f59e0b",
        color: "#111827",
        "&:hover": { bgcolor: "#d97706" },
      };
    }

    if (s === "rejected") {
      return {
        bgcolor: "#7f1d1d",
        color: "#111827",
        "&:hover": { bgcolor: "#7f1d1d" },
      };
    }

    if (s === "on hold") {
      return {
        bgcolor: "#e5e7eb",
        color: "#111827",
        "&:hover": { bgcolor: "#d1d5db" },
      };
    }

    return {};
  };

  const mapTabToStatus = (tabLabel = "") => {
    const key = Object.keys(TAB_TO_STATUS).find(
      (k) => k.toLowerCase() === String(tabLabel).trim().toLowerCase()
    );
    return key ? TAB_TO_STATUS[key] : String(tabLabel).trim().toLowerCase();
  };

  const buildStatusFromTabParam = (tabParam = "") => {
    const raw = String(tabParam || "").trim();
    if (!raw) return "";

    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.some((p) => mapTabToStatus(p) === "")) return "";

    const statuses = parts.map(mapTabToStatus).filter(Boolean);
    return statuses.join(",");
  };

  const tabParam = searchParams.get("tab") || "";
  const statusFromTab = useMemo(
    () => buildStatusFromTabParam(tabParam),
    [tabParam]
  );

  const [prioritySortOrder, setPrioritySortOrder] = useState(null);
  const [rawSearch, setRawSearch] = useState(searchQuery);
  const [selectedTab, setSelectedTab] = useState(tabLabel);

  useEffect(() => setRawSearch(searchQuery), [searchQuery]);
  useEffect(() => setSelectedTab(tabLabel), [tabLabel]);

  const isMyApprovalPage = useMemo(() => {
    const p = String(location?.pathname || "");
    return p === "/my_approval" || p.includes("my_approval");
  }, [location?.pathname]);

  const isCreatedByMe = useCallback(
    (task) => {
      const creatorId =
        task?.createdBy?._id || task?.createdBy || task?.createdById || "";
      if (!creatorId || !currentUserId) return false;
      return String(creatorId) === String(currentUserId);
    },
    [currentUserId]
  );

  // -------- Data ----------
  const { data, isLoading, isFetching, isError, error } = useGetAllTasksQuery({
    page: currentPage,
    search: searchQuery,
    status: statusFromTab,
    from: createdFrom,
    to: createdTo,
    deadlineFrom: deadlineFrom,
    deadlineTo: deadlineTo,
    department,
    limit: itemsPerPage,
    assignedToId: assignedTo,
    createdById: createdBy,
    priorityFilter,
    taskType,
    approverId,
    isApproval: isMyApprovalPage ? "true" : "false",
  });

  const patchParams = useCallback(
    (patchObj) => {
      if (!setSearchParams) return;
      setSearchParams((prev) => {
        const merged = Object.fromEntries(prev.entries());
        return { ...merged, ...patchObj };
      });
    },
    [setSearchParams]
  );

  const setParamAndResetPage = useCallback(
    (key, value) => {
      if (!setSearchParams) return;
      setSearchParams((prev) => {
        const merged = Object.fromEntries(prev.entries());
        if (value == null || value === "") delete merged[key];
        else merged[key] = String(value);
        merged.page = "1";
        return merged;
      });
    },
    [setSearchParams]
  );

  const debouncedPushSearch = useCallback(
    debounce((value) => setParamAndResetPage("search", value), 300),
    [setParamAndResetPage]
  );

  useEffect(() => {
    return () => {
      debouncedPushSearch.cancel?.();
    };
  }, [debouncedPushSearch]);

  const handleSearch = (value) => {
    setRawSearch(value);
    debouncedPushSearch(value);
  };

  const handlePageChange = (page) => {
    const max = data?.totalPages || 1;
    if (page >= 1 && page <= max) patchParams({ page: String(page) });
  };

  const handlePageSize = (_e, newValue) => {
    const n = Number(newValue) || 10;
    setSearchParams((prev) => {
      const merged = Object.fromEntries(prev.entries());
      merged.limit = String(n);
      merged.page = "1";
      return merged;
    });
  };

  // ✅ NO GROUPING — direct tasks from API
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const totalCount = data?.totalTasks || 0;
  const totalPages = data?.totalPages || 1;
  const tableLoading = isFetching || (isLoading && tasks.length === 0);

  const filteredData = useMemo(() => {
    const arr = [...tasks];
    if (prioritySortOrder) {
      arr.sort((a, b) => {
        const A = Number(a.priority) || 0;
        const B = Number(b.priority) || 0;
        return prioritySortOrder === "asc" ? A - B : B - A;
      });
    }
    return arr;
  }, [tasks, prioritySortOrder]);

  const getVisibleTaskIds = useCallback(() => {
    return filteredData.map((d) => d._id).filter(Boolean);
  }, [filteredData]);

  const handleSelectAll = (e) => {
    const allIds = getVisibleTaskIds();
    setSelected(e.target.checked ? allIds : []);
  };

  const handleRowSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const stripHtml = (html) =>
    typeof html === "string" ? html.replace(/<[^>]*>/g, "") : "";

  const timeAgo = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return "just now";
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h ago`;
    const dys = Math.floor(h / 24);
    return `${dys} d ago`;
  };

  const getInitial = (name) =>
    (name || "").trim().charAt(0).toUpperCase() || "?";

  // ✅ Approvers: supports both formats (embedded object OR flat fields in model)
  const ApproversCell = ({ approvers }) => {
    const pName =
      approvers?.primary_reporting_name ||
      approvers?.primary_reporting?.name ||
      "-";
    const sName =
      approvers?.secondary_reporting_name ||
      approvers?.secondary_reporting?.name ||
      "-";

    const pUrl = safeUrl(
      approvers?.primary_reporting_url ||
        approvers?.primary_reporting?.attachment_url ||
        ""
    );
    const sUrl = safeUrl(
      approvers?.secondary_reporting_url ||
        approvers?.secondary_reporting?.attachment_url ||
        ""
    );

    const hasAny =
      Boolean(approvers?.primary_reporting) ||
      Boolean(approvers?.secondary_reporting) ||
      Boolean(approvers?.primary_reporting_name) ||
      Boolean(approvers?.secondary_reporting_name);

    if (!hasAny) return <Typography level="body-sm">-</Typography>;

    const tooltip = (
      <Box sx={{ display: "grid", gap: 1, minWidth: 240 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar
            size="sm"
            src={pUrl || undefined}
            variant={pUrl ? "soft" : "solid"}
            sx={{ width: 28, height: 28 }}
          >
            {!pUrl && getInitial(pName)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
              Primary Reporting
            </Typography>
            <Typography level="body-sm" fontWeight="md" noWrap>
              {pName}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar
            size="sm"
            src={sUrl || undefined}
            variant={sUrl ? "soft" : "solid"}
            sx={{ width: 28, height: 28 }}
          >
            {!sUrl && getInitial(sName)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
              Secondary Reporting
            </Typography>
            <Typography level="body-sm" fontWeight="md" noWrap>
              {sName}
            </Typography>
          </Box>
        </Box>
      </Box>
    );

    return (
      <Tooltip
        title={tooltip}
        placement="top"
        variant="soft"
        slotProps={WRAP_TOOLTIP_SLOTPROPS}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            cursor: "help",
          }}
        >
          <Avatar
            size="sm"
            src={pUrl || undefined}
            variant={pUrl ? "soft" : "solid"}
            sx={{ width: 26, height: 26 }}
          >
            {!pUrl && getInitial(pName)}
          </Avatar>

          <Avatar
            size="sm"
            src={sUrl || undefined}
            variant={sUrl ? "soft" : "solid"}
            sx={{
              width: 26,
              height: 26,
              ml: -0.5,
              border: "2px solid #fff",
            }}
          >
            {!sUrl && getInitial(sName)}
          </Avatar>
        </Box>
      </Tooltip>
    );
  };

  /* =========================
     Status modal state + API
     ========================= */
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusTaskId, setStatusTaskId] = useState(null);
  const [statusValue, setStatusValue] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [statusError, setStatusError] = useState("");

  const [updateTaskStatus, { isLoading: isUpdating }] =
    useUpdateTaskStatusMutation();

  const APPROVAL_STATUS_OPTIONS = useMemo(
    () => [
      { val: "pending", label: "Approve" },
      { val: "rejected", label: "Reject" },
      { val: "on hold", label: "On Hold" },
    ],
    []
  );

  const NORMAL_STATUS_OPTIONS = useMemo(
    () => [
      { val: "pending", label: "Pending" },
      { val: "in progress", label: "In Progress" },
      { val: "completed", label: "Completed" },
      { val: "cancelled", label: "Cancelled" },
    ],
    []
  );

  const statusOptions = isMyApprovalPage
    ? APPROVAL_STATUS_OPTIONS
    : NORMAL_STATUS_OPTIONS;

  // ✅ IMPORTANT: block modal open if task is created by logged-in user (token)
  const openStatusModal = (task) => {
    if (isCreatedByMe(task)) return;

    setStatusTaskId(task._id);

    const curr = String(task?.current_status?.status || "pending").toLowerCase();

    if (isMyApprovalPage) {
      const allowed = new Set(["pending", "rejected", "on hold"]);
      setStatusValue(allowed.has(curr) ? curr : "pending");
    } else {
      setStatusValue(curr);
    }

    setStatusRemarks("");
    setStatusError("");
    setStatusOpen(true);
  };

  const submitStatus = async () => {
    setStatusError("");
    if (!statusTaskId) return;

    try {
      await updateTaskStatus({
        id: statusTaskId,
        status: statusValue,
        remarks: statusRemarks?.trim() || undefined,
      }).unwrap();
      setStatusOpen(false);
      setStatusTaskId(null);
      setStatusRemarks("");
    } catch (e) {
      setStatusError(
        e?.data?.message ||
          e?.error ||
          "Failed to update status. Please try again."
      );
    }
  };

  // ✅ Project mapper (new API: task.project_id = [{_id, code, name}])
  const extractProjects = (task) => {
    const arr = Array.isArray(task?.project_id) ? task.project_id : [];
    return arr
      .filter(Boolean)
      .map((p) => ({
        id: p?._id || "",
        code: p?.code || "-",
        name: p?.name || "-",
      }))
      .filter((p) => p.id || p.code !== "-" || p.name !== "-");
  };

  return (
    <Box
      sx={{
        ml: { lg: "var(--Sidebar-width)" },
        px: "0px",
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
      }}
    >
      {/* Search */}
      <Box
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
        pb={0.5}
        flexWrap="wrap"
        gap={1}
      >
        <Box
          sx={{
            py: 1,
            display: "flex",
            alignItems: "flex-end",
            gap: 1.5,
            width: { xs: "100%", md: "50%" },
          }}
        >
          <FormControl sx={{ flex: 1 }} size="sm">
            <Input
              size="sm"
              placeholder="Search by Title / TaskCode / Project"
              startDecorator={<SearchIcon />}
              value={rawSearch}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </FormControl>
        </Box>
      </Box>

      {/* Table */}
      <Sheet
        className="OrderTableContainer"
        variant="outlined"
        sx={{
          display: { xs: "none", sm: "block" },
          width: "100%",
          borderRadius: "sm",
          maxHeight: { xs: "66vh", xl: "75vh" },
          overflow: "auto",
        }}
      >
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <thead
            style={{
              position: "sticky",
              top: 0,
              background: "#fff",
              zIndex: 5,
            }}
          >
            <tr>
              <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
                <Checkbox
                  size="sm"
                  checked={
                    selected.length === getVisibleTaskIds().length &&
                    getVisibleTaskIds().length > 0
                  }
                  onChange={handleSelectAll}
                  indeterminate={
                    selected.length > 0 &&
                    selected.length < getVisibleTaskIds().length
                  }
                />
              </th>

              <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography level="body-sm">Task Info</Typography>
                  <Tooltip
                    title="Sort by Priority"
                    variant="soft"
                    slotProps={WRAP_TOOLTIP_SLOTPROPS}
                  >
                    <IconButton
                      size="sm"
                      variant="plain"
                      color="neutral"
                      onClick={() =>
                        setPrioritySortOrder((prev) =>
                          prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
                        )
                      }
                    >
                      {prioritySortOrder === "asc" ? (
                        <ArrowUpwardIcon fontSize="small" />
                      ) : prioritySortOrder === "desc" ? (
                        <ArrowDownwardIcon fontSize="small" />
                      ) : (
                        <ArrowUpwardIcon fontSize="small" sx={{ opacity: 0.3 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </th>

              {["Title", "Project Info", "Description", "Comments", "Approvers", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: 8,
                      textAlign: "left",
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {tableLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                    }}
                  >
                    <CircularProgress size="sm" />
                    <Typography level="body-sm">Loading tasks...</Typography>
                  </Box>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
                  <Typography level="body-sm" sx={{ color: "danger.600" }}>
                    {error?.data?.message || error?.error || "Failed to load tasks"}
                  </Typography>
                </td>
              </tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((task) => {
                const hasAssignees =
                  Array.isArray(task.assigned_to) && task.assigned_to.length > 0;

                const assignedTooltip = hasAssignees && (
                  <Box sx={{ px: 0.5, py: 0.5, maxWidth: 320 }}>
                    <Typography level="body-sm" fontWeight="md" mb={0.5}>
                      Assigned To:
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                      {task.assigned_to.map((a, i) => (
                        <Typography key={`${a?._id || a?.id || i}`} level="body-sm">
                          • {a?.name || "-"}{" "}
                          <Typography component="span" level="body-xs" sx={{ color: "text.tertiary" }}>
                            ({a?.dept || "-"})
                          </Typography>
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                );

                const today = toMidnight(new Date());
                const hasDeadline = !!task?.deadline;
                const dln = hasDeadline ? toMidnight(task.deadline) : null;

                // startDate: createdAt (best)
                const startDate = task?.createdAt || today;

                // completion/cancellation from current_status only (list API doesn't send status_history now)
                const currentStatus = normStatus(task?.current_status?.status);
                const completionDate =
                  currentStatus === "completed" ? task?.current_status?.updatedAt : undefined;
                const cancellationDate =
                  currentStatus === "cancelled" ? task?.current_status?.updatedAt : undefined;

                let timingEl = null;

                if (completionDate) {
                  const elapsedDays = daysBetween(completionDate, startDate);
                  if (hasDeadline) {
                    const onOrBefore = toMidnight(completionDate) <= dln;
                    timingEl = onOrBefore ? (
                      <Typography level="body-sm" sx={{ color: "#15803d" }}>
                        Completed in {elapsedDays} {elapsedDays === 1 ? "day" : "days"} (on time)
                      </Typography>
                    ) : (
                      <Typography level="body-sm" sx={{ color: "#b91c1c" }}>
                        Completed late by {daysBetween(completionDate, dln)}{" "}
                        {daysBetween(completionDate, dln) === 1 ? "day" : "days"} · took{" "}
                        {elapsedDays} {elapsedDays === 1 ? "day" : "days"}
                      </Typography>
                    );
                  } else {
                    timingEl = (
                      <Typography level="body-sm" sx={{ color: "#334155" }}>
                        Completed in {elapsedDays} {elapsedDays === 1 ? "day" : "days"}
                      </Typography>
                    );
                  }
                } else if (cancellationDate) {
                  const elapsedDays = daysBetween(cancellationDate, startDate);
                  timingEl = (
                    <Typography level="body-sm" sx={{ color: "#6b7280" }}>
                      Cancelled after {elapsedDays} {elapsedDays === 1 ? "day" : "days"}
                    </Typography>
                  );
                } else if (hasDeadline) {
                  if (dln < today && currentStatus !== "completed") {
                    const diffInDays = daysBetween(today, dln);
                    timingEl = (
                      <Typography level="body-sm" sx={{ color: "#b91c1c" }}>
                        Delay: {diffInDays} {diffInDays === 1 ? "day" : "days"}
                      </Typography>
                    );
                  } else {
                    timingEl = (
                      <Typography level="body-sm" sx={{ color: "#15803d" }}>
                        On Time
                      </Typography>
                    );
                  }
                } else {
                  timingEl = (
                    <Typography level="body-sm" sx={{ color: "#334155" }}>
                      No Deadline
                    </Typography>
                  );
                }

                const disableStatusClick = isCreatedByMe(task);

                // ✅ comments from list API: last_comment + comments_count
                const last = task?.last_comment || null;
                const lastName =
                  last?.user_id_name ||
                  last?.user?.name ||
                  task?.current_status?.user_id_name ||
                  "Unknown";
                const lastAvatar = safeUrl(
                  last?.user_id_attachment_url || last?.user?.attachment_url || ""
                );
                const lastRemarkPlain = stripHtml(last?.remarks || "");
                const commentsCount = Number(task?.comments_count || 0);

                const projects = extractProjects(task);

                return (
                  <tr key={task._id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
                      <Checkbox
                        size="sm"
                        checked={selected.includes(task._id)}
                        onChange={() => handleRowSelect(task._id)}
                      />
                    </td>

                    {/* Task Info */}
                    <td style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
                      <Typography
                        fontWeight="lg"
                        sx={{ cursor: "pointer", color: "primary.700" }}
                        onClick={() => navigate(`/view_task?task=${task._id}`)}
                      >
                        {task.taskCode}
                      </Typography>

                      <Box display="flex" alignItems="center" gap={0.5}>
                        {(() => {
                          const priorityMap = {
                            1: { label: "High", color: "danger" },
                            2: { label: "Medium", color: "warning" },
                            3: { label: "Low", color: "success" },
                          };
                          const pr = Number(task?.priority || 0);
                          const pm = priorityMap[pr];

                          return pm ? (
                            <Chip
                              size="sm"
                              variant="solid"
                              color={pm.color}
                              title="Priority"
                              sx={{ fontWeight: 600 }}
                            >
                              {pm.label}
                            </Chip>
                          ) : (
                            <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                              None
                            </Typography>
                          );
                        })()}
                      </Box>

                      <Typography level="body-sm">
                        Created By: {task.createdBy?.name || "-"}
                      </Typography>
                      <Typography level="body-sm">
                        Created At:{" "}
                        {task.createdAt
                          ? new Date(task.createdAt).toLocaleString("en-IN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </Typography>
                    </td>

                    {/* Title */}
                    <td style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
                      <TitleWithTooltip title={task.title} />

                      {hasAssignees ? (
                        <Tooltip
                          title={assignedTooltip}
                          variant="soft"
                          placement="top"
                          slotProps={WRAP_TOOLTIP_SLOTPROPS}
                        >
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              cursor: "pointer",
                              backgroundColor: "#f1f3f5",
                              padding: "2px 6px",
                              borderRadius: "12px",
                              maxWidth: "100%",
                              mt: 0.25,
                            }}
                          >
                            <Typography level="body-sm" noWrap>
                              {task.assigned_to[0].name}
                            </Typography>
                            {task.assigned_to.length > 1 && (
                              <Box
                                sx={{
                                  backgroundColor: "#007bff",
                                  color: "#fff",
                                  borderRadius: "8px",
                                  fontSize: "10px",
                                  fontWeight: 500,
                                  px: 0.8,
                                  lineHeight: 1.2,
                                }}
                              >
                                +{task.assigned_to.length - 1}
                              </Box>
                            )}
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography level="body-sm">-</Typography>
                      )}

                      <Typography level="body-sm" sx={{ mt: 0.25 }}>
                        Deadline:{" "}
                        {task.deadline
                          ? new Date(task.deadline).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "-"}
                      </Typography>

                      <Box sx={{ mt: 0.25 }}>{timingEl}</Box>
                    </td>

                    {/* Project Info (✅ from task.project_id array) */}
                    <td style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
                      {projects.length === 0 ? (
                        <Typography fontWeight="lg">N/A</Typography>
                      ) : projects.length === 1 ? (
                        (() => {
                          const p = projects[0];
                          const canGo = !!p.id;
                          return (
                            <Box
                              onClick={() =>
                                canGo &&
                                navigate(`/project_detail?page=1&project_id=${p.id}`)
                              }
                              sx={{
                                cursor: canGo ? "pointer" : "default",
                                "&:hover": canGo
                                  ? { bgcolor: "neutral.softBg" }
                                  : undefined,
                                borderRadius: "sm",
                                p: 0.5,
                              }}
                            >
                              <Typography fontWeight="lg">{p.code}</Typography>
                              <Typography level="body-sm" sx={{ color: "#666" }}>
                                {p.name}
                              </Typography>
                            </Box>
                          );
                        })()
                      ) : (
                        (() => {
                          const main = projects[0];
                          const canGoMain = !!main.id;

                          return (
                            <Tooltip
                              title={
                                <Box sx={{ maxHeight: 200, overflowY: "auto", pr: 1 }}>
                                  {projects.slice(1).map((p, i) => {
                                    const canGo = !!p.id;
                                    return (
                                      <Box
                                        key={`${p.code}-${i}`}
                                        sx={{
                                          mb: 1,
                                          cursor: canGo ? "pointer" : "default",
                                          "&:hover": canGo
                                            ? { bgcolor: "neutral.softBg" }
                                            : undefined,
                                          borderRadius: "sm",
                                          p: 0.5,
                                        }}
                                        onClick={() =>
                                          canGo &&
                                          navigate(
                                            `/project_detail?page=1&project_id=${p.id}`
                                          )
                                        }
                                      >
                                        <Typography level="body-md" fontWeight="lg">
                                          {p.code}
                                        </Typography>
                                        <Typography
                                          level="body-sm"
                                          sx={{
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                            overflowWrap: "anywhere",
                                          }}
                                        >
                                          {p.name}
                                        </Typography>
                                        {i !== projects.length - 2 && (
                                          <Box sx={{ height: 1, bgcolor: "#eee", my: 1 }} />
                                        )}
                                      </Box>
                                    );
                                  })}
                                </Box>
                              }
                              arrow
                              placement="top-start"
                              variant="soft"
                              slotProps={{
                                tooltip: {
                                  sx: {
                                    maxWidth: 420,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                    p: 1,
                                    borderRadius: 10,
                                  },
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.2,
                                  cursor: canGoMain ? "pointer" : "default",
                                  "&:hover .project-count-badge": canGoMain
                                    ? { backgroundColor: "#0056D2" }
                                    : undefined,
                                  "&:hover": canGoMain
                                    ? { bgcolor: "neutral.softBg" }
                                    : undefined,
                                  borderRadius: "sm",
                                  p: 0.5,
                                }}
                                onClick={() =>
                                  canGoMain &&
                                  navigate(
                                    `/project_detail?page=1&project_id=${main.id}`
                                  )
                                }
                              >
                                <Box>
                                  <Typography fontWeight="lg">{main.code}</Typography>
                                  <Typography
                                    level="body-sm"
                                    sx={{
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {main.name}
                                  </Typography>
                                </Box>
                                <Box
                                  className="project-count-badge"
                                  sx={{
                                    backgroundColor: "#007BFF",
                                    color: "#fff",
                                    borderRadius: "12px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    px: 1,
                                    py: 0.2,
                                    minWidth: 26,
                                    textAlign: "center",
                                    transition: "all 0.2s ease-in-out",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                                  }}
                                >
                                  +{projects.length - 1}
                                </Box>
                              </Box>
                            </Tooltip>
                          );
                        })()
                      )}
                    </td>

                    {/* Description */}
                    <td style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
                      <Tooltip
                        title={
                          <Typography sx={{ whiteSpace: "pre-wrap" }}>
                            {task.description || ""}
                          </Typography>
                        }
                        arrow
                        placement="top-start"
                        variant="soft"
                        color="neutral"
                        slotProps={WRAP_TOOLTIP_SLOTPROPS}
                      >
                        <Typography
                          noWrap
                          sx={{
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            cursor: "default",
                          }}
                        >
                          {task.description || "-"}
                        </Typography>
                      </Tooltip>
                    </td>

                    {/* Comments (✅ from last_comment + comments_count) */}
                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid #ddd",
                        minWidth: 260,
                      }}
                    >
                      {commentsCount <= 0 || !last ? (
                        <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                          No comments
                        </Typography>
                      ) : (
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "24px 1fr",
                            alignItems: "start",
                            gap: 0.75,
                            p: 0.5,
                            borderRadius: 12,
                            border: "1px solid rgba(15,23,42,0.06)",
                            bgcolor: "#fff",
                          }}
                        >
                          <Avatar
                            sx={{ width: 24, height: 24 }}
                            size="sm"
                            src={lastAvatar || undefined}
                            variant={lastAvatar ? "soft" : "solid"}
                          >
                            {!lastAvatar && getInitial(lastName)}
                          </Avatar>

                          <Box sx={{ minWidth: 0 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                              }}
                            >
                              <Typography level="body-sm" fontWeight="md" sx={{ color: "#0f172a" }}>
                                {lastName}
                              </Typography>
                              <Typography
                                level="body-xs"
                                sx={{ color: "text.tertiary", fontSize: "0.7rem" }}
                              >
                                {timeAgo(last.updatedAt)}
                              </Typography>

                              <Chip
                                size="sm"
                                variant="soft"
                                sx={{ ml: "auto", fontSize: "0.7rem" }}
                              >
                                {commentsCount}
                              </Chip>
                            </Box>

                            <Tooltip
                              placement="top-start"
                              variant="soft"
                              color="neutral"
                              title={
                                <Box
                                  sx={{
                                    maxWidth: 420,
                                    whiteSpace: "normal",
                                    overflowWrap: "anywhere",
                                    wordBreak: "break-word",
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {lastRemarkPlain || "—"}
                                </Box>
                              }
                              slotProps={{
                                tooltip: {
                                  sx: {
                                    maxWidth: 420,
                                    whiteSpace: "normal",
                                    overflowWrap: "anywhere",
                                    wordBreak: "break-word",
                                    p: 1,
                                    borderRadius: 10,
                                  },
                                },
                              }}
                            >
                              <Typography
                                level="body-sm"
                                sx={{
                                  color: "#334155",
                                  fontSize: "0.8rem",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  whiteSpace: "normal",
                                  overflowWrap: "anywhere",
                                  wordBreak: "break-word",
                                  maxWidth: 360,
                                  cursor: "default",
                                }}
                              >
                                {lastRemarkPlain || "—"}
                              </Typography>
                            </Tooltip>
                          </Box>
                        </Box>
                      )}
                    </td>

                    {/* Approvers */}
                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid #ddd",
                        minWidth: 110,
                      }}
                    >
                      <ApproversCell approvers={task?.approvers} />
                    </td>

                    {/* Status */}
                    <td style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
                      <Chip
                        variant="soft"
                        color={chipColor(task.current_status?.status)}
                        size="sm"
                        onClick={() => openStatusModal(task)}
                        sx={{
                          cursor: disableStatusClick ? "not-allowed" : "pointer",
                          ...chipSx(task.current_status?.status),
                        }}
                      >
                        {task.current_status?.status
                          ? task.current_status.status.charAt(0).toUpperCase() +
                            task.current_status.status.slice(1)
                          : "-"}
                      </Chip>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <img src={NoData} alt="No data" style={{ width: 50, marginBottom: 8 }} />
                    <Typography fontStyle="italic">No Tasks Found</Typography>
                  </Box>
                </td>
              </tr>
            )}
          </tbody>
        </Box>
      </Sheet>

      {/* Pagination */}
      <Box
        className="Pagination-laptopUp"
        sx={{
          pt: 1,
          gap: 1,
          [`& .${iconButtonClasses.root}`]: { borderRadius: "50%" },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
        }}
      >
        <Button
          size="sm"
          variant="outlined"
          color="neutral"
          startDecorator={<KeyboardArrowLeftIcon />}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        <Box>
          Page {currentPage} of {totalPages} | Showing {tasks.length || 0} of{" "}
          {totalCount} results
        </Box>

        <Box sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 1 }}>
          <IconButton size="sm" variant="contained" color="neutral">
            {currentPage}
          </IconButton>
          {currentPage < totalPages && (
            <IconButton
              size="sm"
              variant="outlined"
              color="neutral"
              onClick={() => handlePageChange(currentPage + 1)}
            >
              {currentPage + 1}
            </IconButton>
          )}
        </Box>

        <FormControl size="sm">
          <Select
            value={itemsPerPage}
            onChange={handlePageSize}
            sx={{
              height: "32px",
              borderRadius: "6px",
              padding: "0 8px",
              borderColor: "#ccc",
              backgroundColor: "#fff",
            }}
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <Option key={n} value={n}>
                {n}
              </Option>
            ))}
          </Select>
        </FormControl>

        <Button
          size="sm"
          variant="outlined"
          color="neutral"
          endDecorator={<KeyboardArrowRightIcon />}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </Box>

      {/* =========================
          Update Status Modal
          ========================= */}
      <Modal open={statusOpen} onClose={() => !isUpdating && setStatusOpen(false)}>
        <ModalDialog
          aria-labelledby="update-status-title"
          variant="soft"
          sx={{ minWidth: 420, borderRadius: 16 }}
        >
          <DialogTitle id="update-status-title">Update Status</DialogTitle>
          <DialogContent sx={{ mt: 0.5, color: "text.tertiary" }}>
            Select a new status and add remarks (optional).
          </DialogContent>

          <Box sx={{ mt: 1.5, display: "grid", gap: 1 }}>
            <FormControl size="sm">
              <Select
                value={statusValue}
                onChange={(_, v) => setStatusValue(v)}
                indicator={null}
                sx={{ borderRadius: 10 }}
              >
                {statusOptions.map((o) => (
                  <Option key={o.val} value={o.val}>
                    {o.label}
                  </Option>
                ))}
              </Select>
            </FormControl>

            <Textarea
              minRows={4}
              placeholder="Write remarks..."
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
              sx={{ borderRadius: 12 }}
            />

            {statusError && (
              <Typography level="body-sm" sx={{ color: "danger.600" }}>
                {statusError}
              </Typography>
            )}
          </Box>

          <DialogActions sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              color="neutral"
              onClick={() => setStatusOpen(false)}
              disabled={isUpdating}
              sx={{
                color: "#3366a3",
                borderColor: "#3366a3",
                backgroundColor: "transparent",
                "--Button-hoverBg": "#e0e0e0",
                "--Button-hoverBorderColor": "#3366a3",
                "&:hover": { color: "#3366a3" },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={submitStatus}
              disabled={isUpdating}
              startDecorator={isUpdating ? <CircularProgress size="sm" /> : null}
              sx={{
                backgroundColor: "#3366a3",
                color: "#fff",
                "&:hover": { backgroundColor: "#285680" },
              }}
            >
              {isUpdating ? "Saving..." : "Submit"}
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
