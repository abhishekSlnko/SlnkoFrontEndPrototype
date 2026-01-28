// pages/DPRTable.jsx
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Option,
  Select,
  Sheet,
  Tooltip,
  Typography,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Modal,
  ModalDialog,
  ModalClose,
  Divider,
  Textarea,
  Grid,
  Stack,
  Avatar,
} from "@mui/joy";
import { iconButtonClasses } from "@mui/joy/IconButton";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import NoData from "../assets/alert-bell.svg";

// RTK Query hooks
import {
  useGetAllDprQuery,
  useUpdateDprStatusMutation,
} from "../../src/redux/projectsSlice";

function DPRTable({ primary_reporting, setSelectedIds }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusFromUrl = searchParams.get("status") || "";
  const projectCodeFromUrl = searchParams.get("project_code") || "";
  const activityIdFromUrl = searchParams.get("activityId") || "";
  const hide_status = useMemo(
    () =>
      searchParams.get("hide_status") ||
      localStorage.getItem("hide_status") ||
      "",
    [searchParams.toString()]
  );

  useEffect(() => {
    if (hide_status) {
      localStorage.setItem("hide_status", hide_status);
    } else {
      localStorage.removeItem("hide_status");
    }

    const current = searchParams.get("hide_status") || "";
    if (hide_status !== current) {
      const next = new URLSearchParams(searchParams);
      if (hide_status) next.set("hide_status", hide_status);
      else next.delete("hide_status");
      setSearchParams(next, { replace: true });
    }
  }, [hide_status, searchParams.toString()]);

  const HEADERS = [
    "Project Code",
    "Project Name",
    "State",
    "Category",
    "Activity",
    "Work Detail",
    "Deadline",
    "Delay",
    "Resources",
    "Status",
  ];

  const STATUS_OPTIONS = [
    { label: "In progress", value: "in progress" },
    { label: "Idle", value: "idle" },
    { label: "Work Stopped", value: "work stopped" },
  ];
  const IDLE_REASONS_OPTIONS = [
    { label: "Material issues", value: "material_issues" },
    { label: "Manpower issues", value: "manpower_issues" },
    { label: "Local issues", value: "local_issues" },
    {
      label: "Rain or any other natural activities delay",
      value: "rain_or_natural_activities_delay",
    },
    {
      label: "Hold by client or by CAM team",
      value: "hold_by_client_or_cam_team",
    },
    { label: "Others", value: "others" },
  ];

  const prevQueryRef = useRef(null);

  const pageFromUrl = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10)
  );
  const pageSizeFromUrl = Math.max(
    1,
    parseInt(searchParams.get("pageSize") || "10", 10)
  );
  const searchFromUrl = searchParams.get("search") || "";
  const projectIdFromUrl = searchParams.get("projectId") || undefined;
  const fromFromUrl = searchParams.get("from") || undefined;
  const toFromUrl = searchParams.get("to") || undefined;
  const onlyWithDeadlineFromUrl =
    searchParams.get("onlyWithDeadline") || undefined;
  const categoryFromUrl = searchParams.get("category") || undefined;
  const stateFromUrl = searchParams.get("state") || undefined;

  const dprDateFrom = searchParams.get("dprDate_from") || "";
  const dprDateTo = searchParams.get("dprDate_to") || "";
  const resourcesFromUrl = searchParams.get("resources") || "";
  const activityFromUrl = searchParams.get("activity") || "";
  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [rowsPerPage, setRowsPerPage] = useState(pageSizeFromUrl);
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [expandedCard, setExpandedCard] = useState(null);
  const [actionType, setActionType] = useState("in-progress");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isStatusIdle, setIsStatusIdle] = useState(false);

  const toggleExpand = (id) => setExpandedCard(expandedCard === id ? null : id);

  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const ps = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10));
    const s = searchParams.get("search") || "";
    setCurrentPage(p);
    setRowsPerPage(ps);
    setSearchQuery(s);
  }, [searchParams]);

  /** ===== Selection ===== */
  const [selected, setSelected] = useState([]);
  const options = [1, 5, 10, 20, 50, 100];

  const groupByFromUrl = searchParams.get("groupBy");

  /** ===== API ===== */
  const { data, isFetching, isLoading, isError, error, refetch } =
    useGetAllDprQuery({
      page: currentPage,
      limit: rowsPerPage,
      search: projectCodeFromUrl ? projectCodeFromUrl : searchQuery || "",
      status: projectCodeFromUrl
        ? "project code"
        : statusFromUrl
        ? statusFromUrl.replace(/-/g, " ")
        : undefined,
      projectId: projectIdFromUrl,
      hide_status: hide_status,
      from: fromFromUrl,
      to: toFromUrl,
      onlyWithDeadline: onlyWithDeadlineFromUrl,
      category: categoryFromUrl,
      state: stateFromUrl,
      dprDateFrom,
      dprDateTo,
      primaryUserId: primary_reporting,
      groupBy: groupByFromUrl,
      resources: resourcesFromUrl,
      activity: activityFromUrl,
      activity_id: activityIdFromUrl,
    });

  const isGrouped = !!data?.groupedBy;
  const groups = isGrouped ? data?.data || [] : [];

  // mutation used by "Log Today's Progress" modal
  const [updateDprLog, { isLoading: isUpdating, error: updateErr }] =
    useUpdateDprStatusMutation();

  // separate mutation instance for Status modal
  const [
    updateDprStatusSimple,
    { isLoading: isUpdatingStatus, error: updateStatusErrorRTK },
  ] = useUpdateDprStatusMutation();

  // Status modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusRow, setStatusRow] = useState(null);
  const [statusForm, setStatusForm] = useState({
    todaysProgress: "",
    status: "in progress",
    reasonForIdle: "",
    remarks: "",
  });
  const [statusError, setStatusError] = useState("");

  const getPaginationRange = () => {
    const siblings = 1;
    const pages = [];
    if (totalPages <= 5 + siblings * 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const left = Math.max(currentPage - siblings, 2);
      const right = Math.min(currentPage + siblings, totalPages - 1);
      pages.push(1);
      if (left > 2) pages.push("...");
      for (let i = left; i <= right; i++) pages.push(i);
      if (right < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  /** ===== Normalize status ===== */
  const norm = (s) => {
    const x = (s || "").toString().toLowerCase().trim();
    if (x === "completed" || x === "complete") return "completed";
    if (x === "work stopped" || x === "stopped" || x === "stop") return "stop";
    if (x === "in-progress") return "in-progress";
    if (x === "idle") return "idle";
    return "in-progress";
  };

  /** ===== numeric + helper getters ===== */
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const getTotal = (r) =>
    toNum(r?.work_completion?.value ?? r?.current_work?.value ?? r?.value ?? 0);

  const getCompleted = (r) => {
    const logs =
      (Array.isArray(r?.status_history) && r.status_history.length
        ? r.status_history
        : Array.isArray(r?.status_history)
        ? r.status_history
        : []) || [];
    return logs
      .map((log) => toNum(log?.todays_progress ?? 0))
      .reduce((sum, val) => sum + val, 0);
  };

  const getUnit = (r) =>
    (
      r?.work_completion?.unit ||
      r?.current_work?.unit ||
      r?.unit ||
      ""
    ).toString();

  const getProjectFromRow = (row) => {
    if (!row) return {};
    const pid = row.project_id;
    if (pid && typeof pid === "object") return pid;
    if (row.__groupData && typeof row.__groupData === "object")
      return row.__groupData;
    return {};
  };

  const getProjectCode = (row) =>
    row?.project_code || getProjectFromRow(row).code || "-";

  const getProjectName = (row) =>
    row?.project_name || getProjectFromRow(row).name || "-";

  const getActivityName = (row) => {
    if (!row) return "-";
    if (row.activity_name) return row.activity_name;
    if (row.activity_id && typeof row.activity_id === "object")
      return row.activity_id.name || "-";
    return "-";
  };

  /** ===== page rows (handles grouped & flat) ===== */
  const pageRows = useMemo(() => {
    const raw = data?.data || [];
    if (!isGrouped) return raw;

    // data = [{ _id, items, groupData, count }, ...]
    return raw.flatMap((grp) => {
      const groupData = grp.groupData || {};
      const groupId = grp._id || groupData._id || String(Math.random());
      const items = grp.items || [];
      return items.map((item) => {
        const projectDoc =
          item.project_id && typeof item.project_id === "object"
            ? item.project_id
            : groupData;
        const status = item.current_status?.status;
        return {
          ...item,
          status,
          project_id: projectDoc,
          __groupId: groupId,
          __groupData: groupData,
        };
      });
    });
  }, [data, isGrouped]);

  // prefer server-provided pagination
  const totalPages = Number(
    data?.pagination?.totalPages ?? data?.totalPages ?? 1
  );
  const hasNextPage = data?.pagination?.hasNextPage ?? currentPage < totalPages;
  const hasPrevPage = data?.pagination?.hasPrevPage ?? currentPage > 1;

  /** ===== search filter (client side) ===== */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pageRows;
    return pageRows.filter((r) => {
      const unit = getUnit(r);
      const val = String(r?.work_completion?.value ?? r?.value ?? "");
      const project = getProjectFromRow(r);
      return (
        getActivityName(r).toLowerCase().includes(q) ||
        (project.code || "").toLowerCase().includes(q) ||
        (project.name || "").toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q) ||
        unit.toLowerCase().includes(q) ||
        val.includes(q)
      );
    });
  }, [pageRows, searchQuery]);

  /** ===== view rows (server paginated) ===== */
  const viewRows = filtered;

  /** ===== grouped view for rendering (like Odoo) ===== */
  const groupedView = useMemo(() => {
    if (!isGrouped) return [];
    const map = new Map();
    for (const row of filtered) {
      const pidObj = getProjectFromRow(row);
      const gid = row.__groupId || pidObj._id || row.project_id || "ungrouped";
      const groupData = row.__groupData || pidObj || {};
      if (!map.has(gid)) {
        map.set(gid, {
          groupId: gid,
          groupData,
          items: [],
        });
      }
      map.get(gid).items.push(row);
    }
    return Array.from(map.values());
  }, [isGrouped, filtered]);

  const handlePageChange = (page) => {
    const maxPage = totalPages;
    if (page >= 1 && page <= maxPage) {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("page", String(page));
        p.set("pageSize", String(rowsPerPage));
        p.set("search", searchQuery || "");
        if (projectIdFromUrl) p.set("projectId", projectIdFromUrl);
        if (fromFromUrl) p.set("from", fromFromUrl);
        if (toFromUrl) p.set("to", toFromUrl);
        if (onlyWithDeadlineFromUrl)
          p.set("onlyWithDeadline", onlyWithDeadlineFromUrl);
        return p;
      });
      setCurrentPage(page);
      setSelected([]);
      setSelectedIds([]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(viewRows.map((r) => r._id));
      setSelectedIds(viewRows.map((r) => r._id));
    } else {
      setSelected([]);
      setSelectedIds([]);
    }
  };

  const handleRowSelect = (_id) => {
    setSelected((prev) =>
      prev.includes(_id) ? prev.filter((x) => x !== _id) : [...prev, _id]
    );
    setSelectedIds((prev) =>
      prev.includes(_id) ? prev.filter((x) => x !== _id) : [...prev, _id]
    );
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("search", query);
      p.set("page", "1");
      p.set("pageSize", String(rowsPerPage));
      if (projectIdFromUrl) p.set("projectId", projectIdFromUrl);
      if (fromFromUrl) p.set("from", fromFromUrl);
      if (toFromUrl) p.set("to", toFromUrl);
      if (onlyWithDeadlineFromUrl)
        p.set("onlyWithDeadline", onlyWithDeadlineFromUrl);
      return p;
    });
    setCurrentPage(1);
  };

  /** ===== Status chip (click opens Status modal) ===== */
  const openStatusModal = (row) => {
    if (!row) return;
    const currentStatus =
      row.status || row.current_status?.status || "in progress";

    setStatusRow(row);
    setStatusForm({
      todaysProgress: "",
      status: currentStatus,
      reasonForIdle: row?.current_status?.reason_for_idle || "",
      remarks: "",
    });
    setStatusError("");
    row?.current_status?.status === "idle"
      ? setIsStatusIdle(true)
      : setIsStatusIdle(false);
    setStatusModalOpen(true);
  };

  const renderStatusChipCell = (row) => {
    const s = row?.status || row?.current_status?.status;
    const st = norm(s);
    const label =
      st === "completed"
        ? "Completed"
        : st === "idle"
        ? "Idle"
        : st === "stop"
        ? "Work Stopped"
        : "In progress";

    const color =
      st === "completed"
        ? "success"
        : st === "idle"
        ? "neutral"
        : st === "stop"
        ? "danger"
        : "warning";

    return (
      <Chip
        variant="soft"
        color={color}
        sx={{ fontWeight: 700, cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          openStatusModal(row);
        }}
      >
        {label}
      </Chip>
    );
  };

  const computeDelayDays = (row) => {
    // if backend sends valid delay_days, use it
    const raw = row?.delay_days;

    const parsed =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
        ? parseInt(raw, 10) // handles "4", "4 days"
        : NaN;

    if (Number.isFinite(parsed)) return parsed;

    // otherwise compute from planned_finish/deadline
    const finish = row?.planned_finish || row?.deadline;
    if (!finish) return 0;

    const end = new Date(finish);
    if (isNaN(end.getTime())) return 0;

    // consider full day deadline
    end.setHours(23, 59, 59, 999);

    const now = new Date();
    const diffMs = now.getTime() - end.getTime();

    if (diffMs <= 0) return 0;

    const dayMs = 24 * 60 * 60 * 1000;
    return Math.ceil(diffMs / dayMs); // overdue days
  };

  const renderDelayCell = (delayDays, delayText, status) => {
    const st = norm(status);
    const showNotCounted = st === "idle" || st === "stop";

    let label = "On time";
    let color = "neutral";

    if (showNotCounted) {
      label = "Not counted";
      color = "neutral";
    } else if (Number(delayDays) > 0) {
      label = `Overdue ${Number(delayDays)}d`;
      color = "danger";
    }

    const tooltip =
      delayText && String(delayText).trim()
        ? `Delay reason: ${String(delayText).trim()}`
        : showNotCounted
        ? "Delay not counted for Idle/Stopped status"
        : Number(delayDays) > 0
        ? "Deadline exceeded"
        : "No delay";

    return (
      <Tooltip title={tooltip} arrow variant="soft">
        <Chip variant="soft" color={color} sx={{ fontWeight: 700 }}>
          {label}
        </Chip>
      </Tooltip>
    );
  };

  const renderWorkPercent = (
    row,
    showPercentLabel = true,
    inlineDetails = false
  ) => {
    if (!row || row.percent_complete == null) return "-";

    const pct100 = Number(row.percent_complete ?? 0);
    const total = getTotal(row);
    const unit = getUnit(row);

    const hasValidPct = Number.isFinite(pct100) && pct100 >= 0;
    if (!hasValidPct) return "-";

    const hasTotal = Number.isFinite(total) && total > 0;
    const completed = hasTotal ? (pct100 * total) / 100 : null;

    const summary = hasTotal
      ? `${completed?.toFixed(2)} / ${total} ${unit}`
      : `${pct100}% ${unit}`;

    // Build daysText from delay_days
    let daysText = "";
    if (typeof row.delay_days === "number") {
      if (row.delay_days > 0) {
        daysText = `Delayed by ${row.delay_days} day(s)`;
      } else if (row.delay_days < 0) {
        daysText = `Ahead by ${Math.abs(row.delay_days)} day(s)`;
      } else {
        daysText = "On schedule";
      }
    }

    // Simple band/color logic
    const band = (() => {
      if (pct100 >= 100) return { color: "success", sx: {} };
      if (pct100 >= 75) return { color: "primary", sx: {} };
      if (pct100 >= 40) return { color: "warning", sx: {} };
      return { color: "danger", sx: {} };
    })();

    const Bar = (
      <Box
        sx={{
          position: "relative",
          minWidth: 150,
          pr: showPercentLabel ? 6 : 0,
        }}
      >
        <LinearProgress
          determinate
          value={pct100}
          color={band.color}
          sx={{
            height: 10,
            borderRadius: 999,
            "--LinearProgress-radius": "999px",
            "--LinearProgress-thickness": "10px",
            "--LinearProgress-trackColor": "var(--joy-palette-neutral-200)",
            ...band.sx,
          }}
        />
        {showPercentLabel && (
          <Typography
            level="body-xs"
            sx={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              fontWeight: 700,
              color: "neutral.plainColor",
              minWidth: 36,
              textAlign: "right",
            }}
          >
            {pct100}%
          </Typography>
        )}
      </Box>
    );

    // ---------- Mobile / inline mode ----------
    if (inlineDetails) {
      return (
        <Box>
          {Bar}
          <Typography level="body-xs" sx={{ mt: 0.5 }}>
            <b>Progress:</b> {pct100}%{" "}
            {hasTotal && (
              <>
                &nbsp;•&nbsp;<b>Qty:</b> {summary}
              </>
            )}
          </Typography>
        </Box>
      );
    }

    // ---------- Desktop / tooltip mode ----------
    const tooltip = (
      <Box sx={{ p: 0.5 }}>
        <Typography level="title-sm" sx={{ fontWeight: 700, mb: 0.5 }}>
          Progress: {pct100}%
        </Typography>
        {hasTotal && <Typography level="body-sm">{summary}</Typography>}
        {daysText && <Typography level="body-sm">{daysText}</Typography>}
        {(row.status || row.current_status?.status) && (
          <Typography level="body-sm">
            Status: {row.status || row.current_status?.status}
          </Typography>
        )}
        {row.dpr_remarks && (
          <Typography level="body-sm">Remarks: {row.dpr_remarks}</Typography>
        )}
      </Box>
    );

    return (
      <Tooltip title={tooltip} arrow variant="soft">
        {Bar}
      </Tooltip>
    );
  };

  /** ===== DeadlineChip (dd-mm-yyyy display) ===== */
  function DeadlineChip({ dateStr, tickMs = 30000 }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
      const id = setInterval(() => setNow(Date.now()), tickMs);
      return () => clearInterval(id);
    }, [tickMs]);

    const parsed = useMemo(() => {
      if (!dateStr) return null;

      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    }, [dateStr]);

    if (!parsed) {
      return (
        <Chip size="sm" variant="soft" color="neutral" sx={{ fontWeight: 700 }}>
          -
        </Chip>
      );
    }

    const diff = parsed.getTime() - now;

    const abs = Math.abs(diff);
    const min = 60 * 1000;
    const hr = 60 * min;
    const day = 24 * hr;
    const d = Math.floor(abs / day);
    const h = Math.floor((abs % day) / hr);
    const m = Math.floor((abs % hr) / min);

    let label = "Due now";
    let color = "warning";

    if (diff > 0) {
      // future – due in
      if (d >= 2) {
        label = `Due in ${d}d`;
        color = "primary";
      } else if (d === 1) {
        label = "Due in 1d";
        color = "warning";
      } else if (h >= 2) {
        label = `Due in ${h}h ${m}m`;
        color = "warning";
      } else if (h >= 1) {
        label = `Due in ${h}h ${m}m`;
        color = "danger";
      } else {
        label = `Due in ${m}m`;
        color = "danger";
      }
    } else if (diff < 0) {
      // past – overdue
      if (d >= 1) {
        label = `Overdue by ${d}d`;
        color = "danger";
      } else if (h >= 1) {
        label = `Overdue by ${h}h ${m}m`;
        color = "danger";
      } else {
        label = `Overdue by ${m}m`;
        color = "danger";
      }
    }

    const displayDate = parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return (
      <Tooltip arrow title={label}>
        <Chip
          size="sm"
          variant="soft"
          color={color}
          sx={{ fontWeight: 700, cursor: "default" }}
        >
          {displayDate}
        </Chip>
      </Tooltip>
    );
  }

  const DPRCard = ({ dprId, project_code, project_name }) => (
    <>
      <Chip
        variant="outlined"
        color="primary"
        onClick={() => navigate(`/view_dpr?id=${dprId}`)}
      >
        <span style={{ cursor: "pointer", fontWeight: 500 }}>
          {project_code || "-"}
        </span>
      </Chip>
      <Box display="flex" alignItems="center" mt={1} ml={0.5}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {project_name || "-"}
        </span>
      </Box>
    </>
  );

  const [progressOpen, setProgressOpen] = useState(false);
  const [progressRow, setProgressRow] = useState(null);
  const [progressQty, setProgressQty] = useState("");
  const [progressDate, setProgressDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [progressRemarks, setProgressRemarks] = useState("");

  const goToViewDpr = (row) => {
    const dpr_id = row?._id;
    if (!dpr_id) return;

    navigate(`/view_dpr?id=${dpr_id}`);
  };

  const closeProgress = () => {
    setProgressOpen(false);
    setActionType("in-progress");
    setProgressRow(null);
    setProgressQty("");
    setProgressRemarks("");

    setSearchParams((prev) => {
      if (prevQueryRef.current) {
        const restored = new URLSearchParams(prevQueryRef.current);
        prevQueryRef.current = null;
        return restored;
      }
      const p = new URLSearchParams(prev);
      p.delete("projectId");
      p.delete("activityId");
      return p;
    });
  };

  // Optimistic local update helper (cumulative)
  const applyOptimistic = ({ row, addedQty }) => {
    if (!row) return;
    row.current_work = {
      ...row.current_work,
      value: String(toNum(row.current_work?.value) + toNum(addedQty)),
    };
  };

  // input guards
  const onQtyKeyDown = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const handleQtyChange = (e) => {
    const v = e.target.value;
    if (v === "" || v == null) {
      setProgressQty("");
      return;
    }
    let n = Number(v);
    if (!Number.isFinite(n)) return;
    if (n < 0) n = 0;
    if (n > remainingCap) n = remainingCap;
    setProgressQty(String(n));
  };

  // Main submit (progress modal)
  const submitWith = async (statusOverride) => {
    const row = progressRow;
    if (!row) return;

    const status = statusOverride ?? actionType ?? "in-progress";
    const qtyNum = status === "in-progress" ? toNum(progressQty) : 0;

    const projectId =
      row.projectId ||
      row.project_id?._id ||
      row.project_id ||
      row.__groupData?._id;
    const activityId =
      row.activityId || row.activity_id?._id || row.activity_id;

    // validation
    if (!projectId || !activityId) {
      alert(
        "Missing project or activity id for this row. Please check API data mapping."
      );
      return;
    }
    if (status === "in-progress" && (qtyNum <= 0 || qtyNum > remainingCap)) {
      alert(`Enter a valid progress quantity (0 < qty ≤ ${remainingCap}).`);
      return;
    }

    try {
      const payload = {
        id: row._id,
        todays_progress: qtyNum,
        date: progressDate,
        remarks: (progressRemarks || "").trim(),
        reason_for_idle: statusForm.reasonForIdle || "",
        status,
      };

      const res = await updateDprLog(payload).unwrap();

      // latest status from backend
      const latestBackendStatus =
        res?.updatedActivity?.status_history?.slice(-1)?.[0]?.status ||
        res?.data?.current_status?.status;
      const latest = norm(latestBackendStatus) || "in-progress";

      // update select + modal row + table row
      setActionType(latest);
      setProgressRow((prev) => (prev ? { ...prev, status: latest } : prev));
      row.status = latest;

      if (latest === "in-progress" && qtyNum > 0) {
        applyOptimistic({ row, addedQty: qtyNum });
      }

      // refresh list
      await refetch();

      closeProgress();
    } catch (e) {
      console.error("Update DPR Log failed:", e);
    }
  };

  // Is this activity already fully completed?
  const isFullyDone = useMemo(() => {
    if (!progressRow) return false;
    const total = getTotal(progressRow);
    const done = getCompleted(progressRow);
    return total > 0 && done >= total;
  }, [progressRow]);

  const remainingCap = useMemo(() => {
    if (!progressRow) return 0;
    const total = getTotal(progressRow);
    const done = getCompleted(progressRow);
    return Math.max(0, total - done);
  }, [progressRow]);

  /** ========= Helpers for Resources (primary + secondary) ========= */

  const capitalizeWords = (str = "") =>
    str
      .toString()
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");

  const getResourcesFromRow = (row) => {
    if (!row) return [];

    const result = [];

    const pushPerson = (p, roleLabel) => {
      if (!p) return;

      // If populated: primary_reporting.user_id / secondary_reporting[].user_id
      const userObj =
        p.user_id && typeof p.user_id === "object" ? p.user_id : null;

      const id = userObj?._id || p.user_id || p._id;
      const name = userObj?.name || p.name || "User";
      const avatarUrl =
        userObj?.attachment_url ||
        userObj?.avatarUrl ||
        p.avatarUrl ||
        p.attachment_url;

      result.push({
        _id: id,
        name,
        avatarUrl,
        designation: p.designation || "",
        role: roleLabel, // "primary" or "secondary"
      });
    };

    // primary_reporting is an object
    if (row.primary_reporting) {
      pushPerson(row.primary_reporting, "primary");
    }

    // secondary_reporting is an array
    if (Array.isArray(row.secondary_reporting)) {
      row.secondary_reporting.forEach((s) => pushPerson(s, "secondary"));
    }

    return result;
  };

  const JOY_COLORS = ["primary", "success", "warning", "danger", "info"];

  const initialsOf = (name = "") =>
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase() || "")
      .slice(0, 2)
      .join("");

  const colorFromName = (name = "") => {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % JOY_COLORS.length;
    return JOY_COLORS[index];
  };

  const PeopleAvatars = ({
    people = [],
    max = 3,
    size = "sm",
    onPersonClick,
  }) => {
    const shown = people.slice(0, max);
    const extra = people.slice(max);
    const ringSx = {
      boxShadow: "0 0 0 1px var(--joy-palette-background-body)",
    };

    const buildLabel = (p) => {
      const name = p.name || "User";
      const designation = p.designation ? capitalizeWords(p.designation) : "";
      return designation ? `${designation} – ${name}` : name;
    };

    return (
      <Stack direction="row" alignItems="center" gap={0.75}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            "& > *": {
              transition: "transform 120ms ease, z-index 120ms ease",
            },
            "& > *:not(:first-of-type)": { ml: "-8px" },
            "& > *:hover": { zIndex: 2, transform: "translateY(-2px)" },
          }}
        >
          {shown.map((p, i) => {
            const name = p.name || "User";
            const src = p.avatarUrl || p.attachment_url || "";
            const initials = initialsOf(name);
            const color = colorFromName(name);
            const label = buildLabel(p);

            return (
              <Tooltip key={p._id || i} arrow placement="top" title={label}>
                <Avatar
                  role={onPersonClick ? "button" : undefined}
                  tabIndex={onPersonClick ? 0 : undefined}
                  onClick={onPersonClick ? () => onPersonClick(p) : undefined}
                  onKeyDown={
                    onPersonClick
                      ? (e) =>
                          (e.key === "Enter" || e.key === " ") &&
                          onPersonClick(p)
                      : undefined
                  }
                  size={size}
                  src={src || undefined}
                  variant={src ? "soft" : "solid"}
                  color={src ? "neutral" : color}
                  sx={{
                    ...ringSx,
                    cursor: onPersonClick ? "pointer" : "default",
                  }}
                >
                  {!src && initials}
                </Avatar>
              </Tooltip>
            );
          })}

          {extra.length > 0 && (
            <Tooltip
              arrow
              placement="bottom"
              variant="soft"
              disableInteractive={false}
              slotProps={{ tooltip: { sx: { pointerEvents: "auto" } } }}
              title={
                <Box
                  sx={{
                    maxHeight: 260,
                    overflowY: "auto",
                    px: 1,
                    py: 0.5,
                    maxWidth: 240,
                  }}
                >
                  {extra.map((p, i) => {
                    const label = buildLabel(p);
                    const src = p.avatarUrl || p.attachment_url || "";
                    const color = src ? "neutral" : colorFromName(p.name || "");
                    return (
                      <Box
                        key={p._id || i}
                        sx={{ mb: i !== extra.length - 1 ? 1 : 0 }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          gap={1}
                          role={onPersonClick ? "button" : undefined}
                          tabIndex={onPersonClick ? 0 : undefined}
                          onClick={
                            onPersonClick ? () => onPersonClick(p) : undefined
                          }
                          onKeyDown={
                            onPersonClick
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onPersonClick(p);
                                  }
                                }
                              : undefined
                          }
                          sx={{
                            cursor: onPersonClick ? "pointer" : "default",
                          }}
                        >
                          <Avatar
                            size="sm"
                            src={src || undefined}
                            variant={src ? "soft" : "solid"}
                            color={color}
                            sx={ringSx}
                          >
                            {!src && initialsOf(p.name || "User")}
                          </Avatar>
                          <Typography level="body-sm">{label}</Typography>
                        </Stack>
                        {i !== extra.length - 1 && (
                          <Divider sx={{ my: 0.75 }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              }
            >
              <Avatar
                size={size}
                variant="soft"
                color="neutral"
                sx={{ ...ringSx, ml: "-8px", fontSize: 12, cursor: "default" }}
              >
                +{extra.length}
              </Avatar>
            </Tooltip>
          )}
        </Box>
      </Stack>
    );
  };

  /**
   * ========= ResourcesCell: bifurcate Secondary -> Primary =========
   */
  const ResourcesCell = ({ row }) => {
    const resources = getResourcesFromRow(row);
    const secondary = resources.filter((p) => p.role === "secondary");
    const primary = resources.filter((p) => p.role === "primary");

    if (!resources.length) {
      return (
        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
          -
        </Typography>
      );
    }

    return (
      <Stack direction="column" spacing={0.5}>
        {secondary.length > 0 && (
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography
              level="body-xs"
              sx={{ minWidth: 64, color: "neutral.500", fontWeight: 600 }}
            >
              Secondary
            </Typography>
            <PeopleAvatars people={secondary} max={3} size="sm" />
          </Stack>
        )}

        {primary.length > 0 && (
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography
              level="body-xs"
              sx={{ minWidth: 64, color: "neutral.500", fontWeight: 600 }}
            >
              Primary
            </Typography>
            <PeopleAvatars people={primary} max={3} size="sm" />
          </Stack>
        )}
      </Stack>
    );
  };

  const location = useLocation();
  const isUserProfile = location.pathname === "/user_profile";

  /** ===== Derived values for Status modal ===== */
  const totalWork = statusRow ? getTotal(statusRow) : 0;
  const completedSoFar = statusRow ? getCompleted(statusRow) : 0;
  const pendingWork = Math.max(0, totalWork - completedSoFar);
  const workUnit = statusRow ? getUnit(statusRow) : "-";

  const handleStatusSave = async () => {
    if (!statusRow) return;

    try {
      setStatusError("");

      const status = statusForm.status || "in progress";
      const remarksTrim = (statusForm.remarks || "").trim();
      const requireRemarks =
        statusForm?.status === "idle" && statusForm?.reasonForIdle == "others";
      const reasonForIdle = statusForm?.reasonForIdle || "";

      if (requireRemarks && !remarksTrim) {
        setStatusError(
          "Remarks are required when marking Idle and reason is Others."
        );
        return;
      }

      let todays = 0;
      if (!(status === "work stopped" || status === "idle")) {
        const n = Number(statusForm.todaysProgress || 0);
        if (!Number.isFinite(n) || n < 0) {
          setStatusError("Please enter a valid progress value.");
          return;
        }
        if (n > pendingWork) {
          setStatusError(
            `Today's progress cannot exceed pending work (${pendingWork} ${
              workUnit !== "-" ? workUnit : ""
            }).`
          );
          return;
        }
        todays = n;
      }

      const payload = {
        id: statusRow._id,
        todays_progress: todays,
        date: new Date().toISOString().slice(0, 10),
        remarks: remarksTrim,
        reason_for_idle: statusForm.reasonForIdle,
        status,
      };

      await updateDprStatusSimple(payload).unwrap();
      await refetch();
      setStatusModalOpen(false);
    } catch (err) {
      console.error("Update status failed:", err);
      setStatusError(
        err?.data?.message ||
          updateStatusErrorRTK?.data?.message ||
          "Failed to update status. Please try again."
      );
    }
  };

  return (
    <Box
      sx={{
        ml: isUserProfile ? 0 : { lg: "var(--Sidebar-width)" },
        px: "0px",
        width: isUserProfile
          ? "100%"
          : { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
      }}
    >
      {/* Header row (Search only) */}
      <Box
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
        pt={2}
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
              placeholder="Search by Project, Activity, or Unit"
              startDecorator={<SearchIcon />}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
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
          maxHeight: "66vh",
          overflowY: "auto",
        }}
      >
        <Box
          component="table"
          sx={{
            width: "100%",
            borderCollapse: "collapse",
            maxHeight: "40vh",
            overflowY: "auto",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#e0e0e0",
                  zIndex: 2,
                  borderBottom: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "left",
                  fontWeight: "bold",
                  width: 48,
                }}
              >
                <Checkbox
                  size="sm"
                  checked={
                    viewRows.length > 0 && selected.length === viewRows.length
                  }
                  onChange={handleSelectAll}
                  indeterminate={
                    selected.length > 0 && selected.length < viewRows.length
                  }
                />
              </th>
              {HEADERS.map((header) => (
                <th
                  key={header}
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "#e0e0e0",
                    zIndex: 2,
                    borderBottom: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading || isFetching ? (
              <tr>
                <td colSpan={HEADERS.length + 1} style={{ padding: "8px" }}>
                  <Box
                    sx={{
                      fontStyle: "italic",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CircularProgress size="sm" sx={{ mb: "8px" }} />
                    <Typography fontStyle="italic">Loading...</Typography>
                  </Box>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={HEADERS.length + 1} style={{ padding: "8px" }}>
                  <Typography color="danger">
                    {error?.data?.message || "Failed to load DPR data"}
                  </Typography>
                </td>
              </tr>
            ) : isGrouped ? (
              groups.length > 0 ? (
                groups.map((group) => {
                  const groupId =
                    group._id ||
                    group.groupData?._id ||
                    group.groupData?.code ||
                    "grp";
                  const isOpen = expandedGroups[groupId] ?? false;

                  const proj = group.groupData || {};
                  const projectCode = proj.code || "-";
                  const projectName = proj.name || "-";
                  const count = group.count || group.items?.length || 0;

                  return (
                    <React.Fragment key={groupId}>
                      {/* ── GROUP HEADER ROW ── */}
                      <tr
                        onClick={() =>
                          setExpandedGroups((prev) => ({
                            ...prev,
                            [groupId]: !isOpen,
                          }))
                        }
                        style={{
                          cursor: "pointer",
                          background: "#f7f7f7",
                        }}
                      >
                        {/* toggle icon column */}
                        <td
                          style={{
                            borderBottom: "1px solid #ddd",
                            padding: "2px 4px",
                            width: 36,
                          }}
                        >
                          <IconButton
                            size="sm"
                            variant="plain"
                            sx={{
                              "--IconButton-size": "20px",
                              p: "8px",
                              minWidth: 0,
                            }}
                          >
                            {isOpen ? (
                              <KeyboardArrowRightIcon
                                sx={{
                                  fontSize: 18,
                                  transform: "rotate(90deg)",
                                }}
                              />
                            ) : (
                              <KeyboardArrowRightIcon
                                sx={{
                                  fontSize: 18,
                                }}
                              />
                            )}
                          </IconButton>
                        </td>

                        {/* Project Code column */}
                        <td
                          style={{
                            borderBottom: "1px solid #ddd",
                            padding: "4px 8px",
                          }}
                        >
                          <Chip variant="outlined" color="primary" size="sm">
                            {projectCode}
                          </Chip>
                        </td>

                        {/* Project Name column */}
                        <td
                          style={{
                            borderBottom: "1px solid #ddd",
                            padding: "4px 8px",
                          }}
                        >
                          <Typography level="body-sm" fontWeight="lg">
                            {projectName}{" "}
                            <span style={{ color: "#666" }}>({count})</span>
                          </Typography>
                        </td>

                        {/* State column */}
                        <td
                          style={{
                            borderBottom: "1px solid #ddd",
                            padding: "4px 8px",
                          }}
                        >
                          <Typography level="body-sm">
                            {proj.state || "-"}
                          </Typography>
                        </td>

                        {/* rest of the columns empty, just to align under headers */}
                        {HEADERS.slice(3).map((_, idx) => (
                          <td
                            key={idx}
                            style={{
                              borderBottom: "1px solid #ddd",
                              padding: "4px 8px",
                            }}
                          />
                        ))}
                      </tr>

                      {/* ── CHILD ROWS ── */}
                      {isOpen &&
                        (group.items || []).map((row) => (
                          <tr
                            key={row._id}
                            onClick={() => goToViewDpr(row)}
                            style={{ cursor: "pointer", background: "#fff" }}
                          >
                            <td
                              style={{
                                borderBottom: "1px solid #ddd",
                                padding: "8px",
                                textAlign: "left",
                              }}
                            >
                              <Checkbox
                                size="sm"
                                checked={selected.includes(row._id)}
                                onChange={() => handleRowSelect(row._id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>

                            <td
                              style={{
                                borderBottom: "1px solid #ddd",
                                padding: "8px",
                              }}
                            >
                              <Chip variant="outlined" color="primary">
                                {row.project_id?.code || proj.code || "-"}
                              </Chip>
                            </td>

                            <td
                              style={{
                                borderBottom: "1px solid #ddd",
                                padding: "8px",
                              }}
                            >
                              {row.project_id?.name || proj.name || "-"}
                            </td>

                            <td
                              style={{
                                borderBottom: "1px solid #ddd",
                                padding: "8px",
                              }}
                            >
                              {row.project_id?.state || proj.state || "-"}
                            </td>

                            <td
                              style={{
                                borderBottom: "1px solid #ddd",
                                padding: "8px",
                              }}
                            >
                              {row.category
                                ? row.category.charAt(0).toUpperCase() +
                                  row.category.slice(1)
                                : "-"}
                            </td>

                            <td
                              style={{
                                borderBottom: "1px solid #ddd",
                                padding: "8px",
                              }}
                            >
                              {row.activity_id?.name ||
                                row.activity_name ||
                                "-"}
                            </td>

                            <td
                              style={{
                                borderBottom: "1px solid #ddd",
                                padding: "8px",
                              }}
                            >
                              {renderWorkPercent(row, true, false)}
                            </td>

                            <td
                              style={{
                                padding: "8px",
                                borderBottom: "1px solid #ddd",
                              }}
                            >
                              <DeadlineChip dateStr={row.planned_finish} />
                            </td>

                            <td
                              style={{
                                padding: "8px",
                                borderBottom: "1px solid #ddd",
                              }}
                            >
                              {renderDelayCell(
                                computeDelayDays(row),
                                row.dpr_remarks,
                                row.status
                              )}
                            </td>

                            <td
                              style={{
                                borderBottom: "1px solid #ddd",
                                padding: "8px",
                              }}
                            >
                              <ResourcesCell row={row} />
                            </td>

                            <td
                              style={{
                                borderBottom: "1px solid #ddd",
                                padding: "8px",
                              }}
                            >
                              {renderStatusChipCell(row)}
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={HEADERS.length + 1}
                    style={{ padding: "8px", textAlign: "left" }}
                  >
                    <Box
                      sx={{
                        fontStyle: "italic",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={NoData}
                        alt="No data"
                        style={{
                          width: "50px",
                          height: "50px",
                          marginBottom: "8px",
                        }}
                      />
                      <Typography fontStyle="italic">
                        No DPR entries found
                      </Typography>
                    </Box>
                  </td>
                </tr>
              )
            ) : viewRows.length > 0 ? (
              viewRows.map((row) => (
                <tr
                  key={row._id}
                  onClick={() => goToViewDpr(row)}
                  style={{ cursor: "pointer", background: "#fff" }}
                >
                  <td
                    style={{
                      borderBottom: "1px solid #ddd",
                      padding: "8px",
                      textAlign: "left",
                    }}
                  >
                    <Checkbox
                      size="sm"
                      checked={selected.includes(row._id)}
                      onChange={() => handleRowSelect(row._id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>

                  <td
                    style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                  >
                    <Chip variant="outlined" color="primary">
                      {row.project_id.code || "-"}
                    </Chip>
                  </td>
                  <td
                    style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                  >
                    {row.project_id.name || "-"}
                  </td>
                  <td
                    style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                  >
                    {row.project_id.state || "-"}
                  </td>
                  <td
                    style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                  >
                    {row.category
                      ? row.category.charAt(0).toUpperCase() +
                        row.category.slice(1)
                      : "-"}
                  </td>
                  <td
                    style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                  >
                    {row.activity_id.name || "-"}
                  </td>
                  <td
                    style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                  >
                    {renderWorkPercent(row, true, false)}
                  </td>
                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    <DeadlineChip dateStr={row.planned_finish} />
                  </td>
                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    {renderDelayCell(
                      computeDelayDays(row),
                      row.dpr_remarks,
                      row.status
                    )}
                  </td>

                  <td
                    style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                  >
                    <ResourcesCell row={row} />
                  </td>
                  <td
                    style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                  >
                    {renderStatusChipCell(row)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={HEADERS.length + 1}
                  style={{ padding: "8px", textAlign: "left" }}
                >
                  <Box
                    sx={{
                      fontStyle: "italic",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={NoData}
                      alt="No data"
                      style={{
                        width: "50px",
                        height: "50px",
                        marginBottom: "8px",
                      }}
                    />
                    <Typography fontStyle="italic">
                      No DPR entries found
                    </Typography>
                  </Box>
                </td>
              </tr>
            )}
          </tbody>
        </Box>
      </Sheet>

      {/* Mobile cards */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          flexDirection: "column",
          gap: 2,
          p: 0,
        }}
      >
        {viewRows.length > 0 ? (
          viewRows.map((row) => {
            const proj = getProjectFromRow(row);
            return (
              <Card key={row._id} variant="outlined">
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Typography level="title-md">
                      <Box
                        sx={{
                          display: "flex",
                          textUnderlineOffset: "2px",
                          textDecorationColor: "#999",
                          flexDirection:'column'
                        }}
                      >
                        <DPRCard
                          dprId={row._id}
                          project_code={getProjectCode(row) || proj.code}
                          project_name={getProjectName(row) || proj.name}
                        />
                        <DeadlineChip
                      dateStr={row.deadline || row.planned_finish}
                    />
                      </Box>
                    </Typography>
                    
                  </Box>

                  <Button
                    size="sm"
                    onClick={() => toggleExpand(row._id)}
                    variant="soft"
                    fullWidth
                  >
                    {expandedCard === row._id ? "Hide Details" : "View Details"}
                  </Button>

                  {expandedCard === row._id && (
                    <Box mt={2} pl={1}>
                      <Typography level="body-sm">
                        <strong>Category:</strong> {row.category || "-"}
                      </Typography>
                      <Typography level="body-sm">
                        <strong>Activity:</strong> {getActivityName(row)}
                      </Typography>
                      <Typography level="body-sm" mt={1}>
                        <strong>Work Detail:</strong>
                      </Typography>

                      <Typography level="body-sm" mt={0.5}>
                        {renderWorkPercent(row, true, true)}
                      </Typography>

                      {/* Delay on mobile */}
                      <Box mt={1}>
                        <Typography level="body-sm" sx={{ mb: 0.5 }}>
                          <strong>Delay:</strong>
                        </Typography>
                        {renderDelayCell(
                          computeDelayDays(row),
                          row.dpr_remarks,
                          row.status || row.current_status?.status
                        )}
                      </Box>

                      <Box mt={1}>
                        <Typography level="body-sm" sx={{ mb: 0.5 }}>
                          <strong>Status:</strong>
                        </Typography>
                        {renderStatusChipCell(row)}
                      </Box>

                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Typography textAlign="center" fontStyle="italic">
            No data available
          </Typography>
        )}
      </Box>

      {/* Pagination */}
      <Box
        className="Pagination-laptopUp"
        sx={{
          pt: { xs: 1, sm: 0.5 },
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
          disabled={!hasPrevPage || isFetching}
        >
          Previous
        </Button>

        <Box>Showing {data?.totalItems || data?.totalGroups} results</Box>

        <Box
          sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 1 }}
        >
          {getPaginationRange().map((page, idx) =>
            page === "..." ? (
              <Box key={`ellipsis-${idx}`} sx={{ px: 1 }}>
                ...
              </Box>
            ) : (
              <IconButton
                key={page}
                size="sm"
                variant={page === currentPage ? "contained" : "outlined"}
                color="neutral"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </IconButton>
            )
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={1} sx={{ p: "8px 16px" }}>
          <Select
            value={rowsPerPage}
            onChange={(_, v) => {
              if (v != null) {
                setRowsPerPage(v);
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set("pageSize", String(v));
                  p.set("page", "1");
                  p.set("search", searchQuery || "");
                  if (projectIdFromUrl) p.set("projectId", projectIdFromUrl);
                  if (fromFromUrl) p.set("from", fromFromUrl);
                  if (toFromUrl) p.set("to", toFromUrl);
                  if (onlyWithDeadlineFromUrl)
                    p.set("onlyWithDeadline", onlyWithDeadlineFromUrl);
                  return p;
                });
                setSelected([]);
                setSelectedIds([]);
                setCurrentPage(1);
              }
            }}
            size="sm"
            variant="outlined"
            sx={{ minWidth: 80, borderRadius: "md", boxShadow: "sm" }}
            disabled={isFetching}
          >
            {options.map((v) => (
              <Option key={v} value={v}>
                {v}
              </Option>
            ))}
          </Select>
        </Box>

        <Button
          size="sm"
          variant="outlined"
          color="neutral"
          endDecorator={<KeyboardArrowRightIcon />}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!hasNextPage || isFetching}
        >
          Next
        </Button>
      </Box>

      {/* Modal: Update Status (opens on clicking Status chip) */}
      <Modal
        open={statusModalOpen}
        onClose={() => !isUpdatingStatus && setStatusModalOpen(false)}
      >
        <ModalDialog
          sx={{
            maxWidth: 540,
            width: "100%",
            maxHeight: "100%",
            overflow: "auto",
          }}
        >
          <ModalClose disabled={isUpdatingStatus} />
          <Typography level="title-lg" sx={{ mb: 0.5 }}>
            Update Status
          </Typography>
          <Typography level="body-sm" sx={{ mb: 1.5, color: "text.tertiary" }}>
            Review current progress, then log today&apos;s status.
          </Typography>

          {/* Progress summary */}
          <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ mb: 1 }}>
            <Chip size="sm" variant="soft" color="success">
              Total: <b style={{ marginLeft: 4 }}>{totalWork}</b>{" "}
              {workUnit !== "-" ? workUnit : ""}
            </Chip>
            <Chip size="sm" variant="soft" color="neutral">
              Completed: <b style={{ marginLeft: 4 }}>{completedSoFar}</b>{" "}
              {workUnit !== "-" ? workUnit : ""}
            </Chip>
            <Chip size="sm" variant="soft" color="danger">
              Pending: <b style={{ marginLeft: 4 }}>{pendingWork}</b>{" "}
              {workUnit !== "-" ? workUnit : ""}
            </Chip>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          {/* Form */}
          <Stack spacing={1.25}>
            <FormControl>
              <FormLabel>Today&apos;s progress</FormLabel>
              <Input
                type="number"
                value={statusForm.todaysProgress}
                onChange={(e) =>
                  setStatusForm((f) => ({
                    ...f,
                    todaysProgress: e.target.value,
                  }))
                }
                disabled={
                  statusForm.status === "work stopped" ||
                  statusForm.status === "idle"
                }
                slotProps={{
                  input: { min: 0 },
                }}
                endDecorator={
                  <Typography level="body-xs">
                    {workUnit !== "-" ? workUnit : ""}
                  </Typography>
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                value={statusForm.status}
                onChange={(_, val) => {
                  setIsStatusIdle(val === "idle");
                  setStatusForm((f) => ({
                    ...f,
                    status: val || "in progress",
                  }));
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </FormControl>
            {isStatusIdle && (
              <FormControl>
                <FormLabel>Reason For Idle </FormLabel>
                <Select
                  value={statusForm.reasonForIdle || " Select Reason"}
                  placeholder="Select Reason"
                  onChange={(_, val) =>
                    setStatusForm((f) => ({ ...f, reasonForIdle: val || "" }))
                  }
                >
                  {IDLE_REASONS_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl>
              <FormLabel>
                Remarks
                {statusForm.status === "idle" &&
                  statusForm.reasonForIdle === "others" && (
                    <Typography
                      component="span"
                      level="body-xs"
                      sx={{ ml: 0.5, color: "danger.600" }}
                    >
                      (required)
                    </Typography>
                  )}
              </FormLabel>
              <Textarea
                minRows={3}
                value={statusForm.remarks}
                onChange={(e) =>
                  setStatusForm((f) => ({ ...f, remarks: e.target.value }))
                }
                placeholder="Reason / context for this status…"
              />
            </FormControl>

            {(statusError || updateStatusErrorRTK) && (
              <Typography level="body-sm" color="danger">
                {statusError ||
                  updateStatusErrorRTK?.data?.message ||
                  "Failed to update status."}
              </Typography>
            )}

            <Stack
              direction="row"
              gap={1}
              justifyContent="flex-end"
              sx={{ mt: 1 }}
            >
              <Button
                size="sm"
                variant="outlined"
                onClick={() => setStatusModalOpen(false)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="solid"
                loading={isUpdatingStatus}
                onClick={handleStatusSave}
              >
                Save
              </Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
}

export default DPRTable;
