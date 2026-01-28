// pages/DashboardProjectView.jsx
import * as React from "react";
import {
  Box,
  Grid,
  Card,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Divider,
  Avatar,
  Table,
  Sheet,
  Tooltip,
  Modal,
  ModalDialog,
  ModalClose,
  List,
  ListItem,
} from "@mui/joy";
import CheckCircle from "@mui/icons-material/CheckCircle";
import WarningAmber from "@mui/icons-material/WarningAmber";
import AccessTime from "@mui/icons-material/AccessTime";
import TrendingUp from "@mui/icons-material/TrendingUp";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import DoneAll from "@mui/icons-material/DoneAll";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import Person from "@mui/icons-material/Person";
import LocationOn from "@mui/icons-material/LocationOn";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ActivityFinishLineChart from "../../src/component/ActivityFinishLineChart";
import ExpandMore from "@mui/icons-material/ExpandMore";
import {
  useGetProjectSummaryByIdQuery,
  useGetActivityLineByProjectIdQuery,
  useGetDprStatusCardsByIdQuery,
} from "../../src/redux/projectsSlice";

/* ------------------- theme helpers ------------------- */
const cardSx = {
  p: 2,
  borderRadius: "lg",
  boxShadow: "sm",
  bgcolor: "background.surface",
};

const bandColor = (pct) => {
  if (pct <= 25) return "danger";
  if (pct <= 50) return "primary";
  if (pct <= 75) return "warning";
  if (pct < 100) return "success";
  return "success";
};

const formatPct = (v) => `${Math.round(Number(v || 0))}%`;

/* ------------------- small helpers ------------------- */
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const ceilDaysBetween = (fromDate, toDateVal = new Date()) => {
  if (!fromDate) return 0;
  const ms = Math.max(0, toDateVal.getTime() - fromDate.getTime());
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

function groupLogsByDate(logs = []) {
  const map = new Map();
  logs.forEach((l) => {
    const d = l?.date ? new Date(l.date) : null;
    if (!d || Number.isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const qty = Number(
      l?.todays_progress ?? l?.today_progress ?? l?.progress ?? 0
    );
    const entry = map.get(key) || { dateISO: key, total: 0, items: [] };
    entry.total += Number.isFinite(qty) ? qty : 0;
    entry.items.push(l);
    map.set(key, entry);
  });
  return Array.from(map.values()).sort((a, b) =>
    a.dateISO.localeCompare(b.dateISO)
  );
}

/** Build a map of activity_id -> { status, date, userName } where status/date is from latest log */
function buildLatestStatusMap(dprActivities = []) {
  const latest = new Map();
  const arr = Array.isArray(dprActivities) ? dprActivities : [];

  for (const a of arr) {
    const actId =
      a.activity_id != null
        ? String(a.activity_id)
        : a.id != null
        ? String(a.id)
        : a._key != null
        ? String(a._key)
        : "";
    const logs = Array.isArray(a?.dpr_log) ? a.dpr_log : [];
    if (!actId || logs.length === 0) continue;

    let best = null;
    for (const l of logs) {
      const d = l?.date ? new Date(l.date) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      if (!best || d > best.date) {
        best = {
          status: String(l?.status || "").toLowerCase(),
          date: d,
          userName:
            l?.user_name ||
            l?.name ||
            l?.user?.name ||
            l?.user?.user_name ||
            l?.user?.email ||
            l?.user_id?.name ||
            l?.user_id?.email ||
            l?.email ||
            null,
        };
      }
    }
    if (best) latest.set(actId, best);
  }

  return latest;
}

function countIdleEngineers(dprActivities = []) {
  const arr = Array.isArray(dprActivities) ? dprActivities : [];
  const latest = buildLatestStatusMap(arr);
  const ids = new Set();

  for (const a of arr) {
    const actId =
      a.activity_id != null
        ? String(a.activity_id)
        : a.id != null
        ? String(a.id)
        : a._key != null
        ? String(a._key)
        : "";
    if (!actId) continue;

    const ls = latest.get(actId);
    if (!ls || ls.status !== "idle") continue;

    const assignedList = Array.isArray(a?.assigned_to) ? a.assigned_to : [];
    const primary = assignedList[0] || {};
    const uid =
      primary?._id ||
      primary?.user_id ||
      primary?.email ||
      primary?.user_name ||
      "unknown";
    ids.add(String(uid));
  }

  return ids.size;
}

/* ------------------- status helpers (VERY IMPORTANT) ------------------- */

const normalizeStatusText = (raw = "") =>
  String(raw)
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ");

/**
 * Effective status based on backend status + work_done_percent.
 * - >=100% => "completed"
 * - >0 and raw is empty / "not started" => "in progress"
 * - else normalized backend status (or "not started" as default)
 */
const effectiveStatus = (activity = {}) => {
  const pct = Number(activity?.work_done_percent || 0);

  const raw =
    activity?.current_status ||
    activity?.status ||
    activity?.current_status?.status ||
    "";

  const base = normalizeStatusText(raw);

  if (pct >= 100) return "completed";
  if (pct > 0 && (!base || base === "not started")) return "in progress";

  return base || "not started";
};

const hasAssignedUser = (activity = {}) =>
  Array.isArray(activity?.assigned_to) && activity.assigned_to.length > 0;

const isStarted = (activity = {}) => {
  const s = effectiveStatus(activity);
  return s === "in progress" || s === "completed";
};

/* ------------------- data normalizers ------------------- */
function normalizeActivitiesFromSummary(raw = []) {
  return raw.map((a, idx) => {
    const plannedFinish = a?.planned_finish ? toDate(a.planned_finish) : null;
    const plannedStart = a?.planned_start ? toDate(a.planned_start) : null;
    const lu = a?.last_update ? toDate(a.last_update) : null;

    const totalWorkAssigned = a?.total_work_assigned || 0; // from API
    const workUnit = a?.work_unit || ""; // from API

    const status = effectiveStatus(a);

    return {
      _key: a.activity_id || `row-${idx}`,
      id: a.activity_id || null,
      activity_name: a.activity_name || `Activity ${idx + 1}`,
      current_status: status, // already effective
      work_done_percent: Number(a?.work_done_percent || 0),
      planned_start: plannedStart,
      planned_finish: plannedFinish,
      last_update: lu,
      assigned_to: Array.isArray(a?.assigned_to) ? a.assigned_to : [],
      dpr_log: Array.isArray(a?.dpr_log) ? a.dpr_log : [],
      total_work_assigned: totalWorkAssigned,
      work_unit: workUnit,
    };
  });
}

/* ------------------- engineers panel ------------------- */
function EngineerRow({ e }) {
  const [open, setOpen] = React.useState(false);

  const statusIcon =
    e.status === "ok" ? (
      <CheckCircle color="success" />
    ) : e.status === "warn" ? (
      <WarningAmber color="warning" />
    ) : (
      <ErrorOutline color="danger" />
    );

  const pct = Math.round(e.progressPct || 0);

  const chipColor = (s) =>
    s === "completed" ? "success" : s === "in progress" ? "primary" : "neutral";

  const activities = Array.isArray(e.assignedActivities)
    ? e.assignedActivities
    : [];

  const toggle = () => setOpen((v) => !v);

  return (
    <Card sx={{ ...cardSx, mb: 1.5 }}>
      {/* Header — click to expand/collapse */}
      <Box
        display="flex"
        alignItems="center"
        gap={1.5}
        sx={{ cursor: "pointer" }}
        onClick={toggle}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            toggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        <Avatar>{e.name?.[0] || "?"}</Avatar>

        <Box flex={1}>
          <Typography level="title-sm">{e.name || "Engineer"}</Typography>
          <Typography level="body-xs" color="neutral">
            {e.assigned} Assigned / {e.completed} Completed
          </Typography>

          <Box mt={1} pr={5} position="relative">
            <LinearProgress
              determinate
              value={pct}
              color={bandColor(pct)}
              sx={{
                "--LinearProgress-thickness": "8px",
                "--LinearProgress-radius": "999px",
                borderRadius: 999,
                height: 8,
              }}
            />
            <Typography
              level="body-xs"
              sx={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                fontWeight: 600,
              }}
            >
              {formatPct(pct)}
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={0.75}>
          <ExpandMore
            sx={{
              transition: "transform .2s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
          {statusIcon}
        </Box>
      </Box>

      {/* Collapsible body — show nothing when closed, all when open */}
      {activities.length > 0 && (
        <Box sx={{ mt: 1, display: open ? "block" : "none" }}>
          <List variant="soft" size="sm" sx={{ "--List-gap": "6px" }}>
            {activities.map((a) => (
              <ListItem
                key={a.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  cursor: "default", // no modal
                }}
              >
                <Typography level="body-sm" sx={{ flex: 1 }}>
                  {a.name}
                </Typography>
                <Chip size="sm" variant="soft" color={chipColor(a.status)}>
                  {String(a.status || "").replaceAll("_", " ")}
                </Chip>
                <Typography
                  level="body-xs"
                  sx={{ width: 36, textAlign: "right" }}
                >
                  {a.pct ?? 0}%
                </Typography>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Toggle hint line */}
      {activities.length > 0 && (
        <Typography
          level="body-xs"
          color="neutral"
          sx={{ mt: 0.75, cursor: "pointer", userSelect: "none" }}
          onClick={toggle}
        >
          {open ? "Hide activities" : `Show ${activities.length} activities`}
        </Typography>
      )}
    </Card>
  );
}

function prepareEngineersFromSummary(activities = []) {
  const map = new Map();

  activities.forEach((act) => {
    const users = Array.isArray(act.assigned_to) ? act.assigned_to : [];

    users.forEach((u) => {
      const key = u._id || u.user_id || u.email || u.name || "unknown";

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: u.user_name || u.name || "Engineer",
          assigned: 0,
          completed: 0,
          totalPlanned: 0,
          totalActual: 0,
          assignedActivities: [],
          // tag from API ("primary" / "secondary"), default primary
          reporting_type: u.reporting_type || "primary",
        });
      }

      const row = map.get(key);

      // if we ever see this user as primary, upgrade the tag
      if (u.reporting_type === "primary" && row.reporting_type !== "primary") {
        row.reporting_type = "primary";
      }

      row.assigned += 1;

      const pct = Number(act.work_done_percent || 0);
      row.totalPlanned += 100;
      row.totalActual += Math.max(0, Math.min(100, pct));
      if (pct >= 100) row.completed += 1;

      const status = effectiveStatus(act);

      row.assignedActivities.push({
        id: act.id || act._key,
        name: act.activity_name,
        status,
        pct: Math.round(Math.max(0, Math.min(100, pct))),
      });
    });
  });

  return Array.from(map.values()).map((e) => {
    const progressPct = e.totalPlanned
      ? (e.totalActual / e.totalPlanned) * 100
      : 0;
    return {
      ...e,
      progressPct,
      status: progressPct >= 90 ? "ok" : progressPct >= 50 ? "warn" : "alert",
    };
  });
}

/* ------------------- main component ------------------- */
export default function DashboardProjectView({ projectId: propProjectId }) {
  const navigate = useNavigate();
  // Resolve projectId from: prop -> route param -> query param
  const { projectId: routeProjectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const qsProjectId = searchParams.get("projectId");
  const projectId = propProjectId || routeProjectId || qsProjectId || "";

  // URL-backed activity filter (?af=...)
  const validFilters = new Set([
    "all",
    "completed",
    "in_progress",
    "past_deadline",
    "not_started",
    "progress_or_completed",
    "idle", // NEW
  ]);

  const projectIds = [projectId];
  const {
    data: LineData,
    isLoading: isLoadingLineData,
    isFetching: isFetchingLineData,
  } = useGetActivityLineByProjectIdQuery(projectIds, {
    skip: projectIds.length === 0,
  });

  const initialFilter = (() => {
    const f = (searchParams.get("af") || "progress_or_completed").toLowerCase();
    return validFilters.has(f) ? f : "progress_or_completed";
  })();
  const [activityFilter, setActivityFilter] = React.useState(initialFilter);

  // DPR log modal state
  const [logOpen, setLogOpen] = React.useState(false);
  const [activeActivity, setActiveActivity] = React.useState(null); // { id, activity_name, dpr_log, ... }

  // Summary API
  const { data, isLoading, isError } = useGetProjectSummaryByIdQuery(
    projectId,
    {
      skip: !projectId,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  const {
    data: dprCards,
    isLoading: isLogsLoading,
    isError: isLogsError,
  } = useGetDprStatusCardsByIdQuery(projectId, {
    skip: !projectId,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  // Normalize activities
  const activities = React.useMemo(
    () => normalizeActivitiesFromSummary(data?.activities || []),
    [data]
  );

  // Engineers from summary
  const ENGINEERS = React.useMemo(
    () => prepareEngineersFromSummary(activities),
    [activities]
  );

  const PRIMARY_ENGINEERS = React.useMemo(
    () => ENGINEERS.filter((e) => e.reporting_type === "primary"),
    [ENGINEERS]
  );

  const SECONDARY_ENGINEERS = React.useMemo(
    () => ENGINEERS.filter((e) => e.reporting_type === "secondary"),
    [ENGINEERS]
  );

  // Latest status & idle engineers computed from activities
  const latestStatusMap = React.useMemo(
    () => buildLatestStatusMap(activities),
    [activities]
  );

  const idleEngineersCount = React.useMemo(
    () => countIdleEngineers(activities),
    [activities]
  );

  // Selected activity's raw logs (from normalized activity)
  const logsRaw = React.useMemo(() => {
    if (!activeActivity) return [];
    return Array.isArray(activeActivity.dpr_log) ? activeActivity.dpr_log : [];
  }, [activeActivity]);

  // Grouped logs for modal
  const groupedLogs = React.useMemo(
    () => groupLogsByDate(Array.isArray(logsRaw) ? logsRaw : []),
    [logsRaw]
  );

  const setFilter = React.useCallback(
    (f) => {
      const next = validFilters.has(f) ? f : "all";
      setActivityFilter(next);
      const sp = new URLSearchParams(searchParams);
      sp.set("af", next);
      setSearchParams(sp, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  React.useEffect(() => {
    const f = (searchParams.get("af") || "progress_or_completed").toLowerCase();
    if (validFilters.has(f) && f !== activityFilter) setActivityFilter(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const ENGINEERS_READY = ENGINEERS || [];

  const handleUserClick = React.useCallback(
    (userId) => {
      if (!userId) return;
      navigate(`/user_profile?user_id=${userId}`);
    },
    [navigate]
  );

  // Filter activities (including the new semantics for the 4 cards)
  const filteredActivities = React.useMemo(() => {
    const today = new Date();

    return activities.filter((a) => {
      const status = effectiveStatus(a);
      const pf = a.planned_finish || null;
      const assigned = hasAssignedUser(a);
      const isDelayed = pf && pf < today;
      const pct = Number(a.work_done_percent || 0);

      // 1) Work Done (Assigned)
      if (activityFilter === "progress_or_completed") {
        // assigned + started/completed
        return assigned && isStarted(a);
      }

      // 2) Activities Past Deadline
      if (activityFilter === "past_deadline") {
        // assigned + delayed + NOT completed
        return assigned && isDelayed && status !== "completed";
      }

      // 3) Remaining Work
      if (activityFilter === "not_started") {
        // activities where work has NOT effectively started
        // (status still 'not started' and progress < 100)
        return status === "not started" && pct < 100;
      }

      // Other filters keep old meaning, but using effectiveStatus
      if (activityFilter === "completed") return status === "completed";

      if (activityFilter === "in_progress") return status === "in progress";

      if (activityFilter === "idle") {
        const ls = latestStatusMap.get(String(a.id || a._key || ""));
        return ls?.status === "idle";
      }

      return true; // "all"
    });
  }, [activityFilter, activities, latestStatusMap]);

  const project_detail = {
    code: data?.project_code || data?.project_id || projectId || "",
    name:
      data?.project_name || `Project ${data?.project_id || projectId || ""}`,
    site_address: "",
    number: "",
    status: "",
    customer: data?.customer_name || "",
  };

  const openDprModal = (act) => {
    // act is normalized activity (has id, activity_name, dpr_log)
    setActiveActivity(act);
    setLogOpen(true);
  };

  const closeDprModal = () => {
    setLogOpen(false);
    setActiveActivity(null);
  };

  if (!projectId) {
    return (
      <Box p={2}>
        <Typography level="body-sm" color="warning">
          Missing projectId. Use route like <code>/projects/:projectId</code> or{" "}
          <code>?projectId=...</code>.
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box p={2}>
        <Typography level="body-sm">Loading dashboard…</Typography>
      </Box>
    );
  }
  if (isError) {
    return (
      <Box p={2}>
        <Typography level="body-sm" color="danger">
          Failed to load dashboard.
        </Typography>
      </Box>
    );
  }

  // Click handler for Idle KPI
  const onClickIdleKPI = () => {
    const sp = new URLSearchParams(searchParams);
    sp.set("status", "idle");
    sp.set("af", "idle");
    setSearchParams(sp, { replace: true });
    setFilter("idle");
  };

  const handleProjectChangeSingle = (pid) => {
    if (!pid) return;
    const sp = new URLSearchParams(searchParams);
    sp.set("projectId", String(pid));
    setSearchParams(sp, { replace: true });
  };

  const norm = (s = "") =>
    String(s).trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

  const pretty = (s = "") =>
    norm(s).replace(/\b[a-z]/g, (c) => c.toUpperCase());

  const titleForFilter = (raw, { pastDeadlineFlag = false } = {}) => {
    const v = norm(raw);

    if (pastDeadlineFlag || ["past deadline", "past deadlines"].includes(v))
      return "Activities Past Deadline";

    if (v === "progress or completed") return "Work Done (Assigned)";

    if (v === "idle") return "Idle Site Engineers";
    if (v === "not started") return "Remaining Work";

    return pretty(raw);
  };

  return (
    <Box
      sx={{
        ml: { xs: 0, lg: "var(--Sidebar-width)" },
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
        bgcolor: "background.body",
      }}
    >
      {/* KPI Row */}
      <Grid container spacing={2} columns={12}>
        <Grid xs={12} md={3}>
          <KPIBox
            color="success"
            icon={DoneAll}
            title="Work Done (Assigned)"
            value={formatPct(Number(data?.work_done_percent || 0))}
            subtitle="Total progress"
            onClick={() => {
              const sp = new URLSearchParams(searchParams);
              sp.delete("af");
              sp.set("status", "in progress,completed");
              setSearchParams(sp, { replace: true });
              setFilter("progress_or_completed");
            }}
          />
        </Grid>
        <Grid xs={12} md={3}>
          <KPIBox
            color="warning"
            icon={AccessTime}
            title="Activities Past Deadline"
            value={`${Number(data?.activities_past_deadline || 0)} (At Risk)`}
            subtitle="Requires attention"
            onClick={() => {
              const sp = new URLSearchParams(searchParams);
              sp.delete("status");
              sp.set("af", "past_deadline");
              setSearchParams(sp, { replace: true });
              setFilter("past_deadline");
            }}
          />
        </Grid>
        <Grid xs={12} md={3}>
          <KPIBox
            color="primary"
            icon={TrendingUp}
            title="Remaining Work"
            value={`${Number(data?.not_started_activities || 0)}`}
            subtitle="Not Started Activities"
            onClick={() => {
              const sp = new URLSearchParams(searchParams);
              sp.delete("status");
              sp.set("af", "not_started");
              setSearchParams(sp, { replace: true });
              setFilter("not_started");
            }}
          />
        </Grid>

        {/* NEW: Idle Site Engineers */}
        <Grid xs={12} md={3}>
          <KPIBox
            color="neutral"
            icon={ErrorOutline}
            title="Idle Site Engineers"
            value={`${idleEngineersCount}`}
            subtitle="Latest status = idle"
            onClick={onClickIdleKPI}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} mt={0.5}>
        {/* Project Details */}
        <Grid xs={12} md={8}>
          <Card sx={{ ...cardSx, minHeight: "500px" }}>
            <Typography level="h4" mt={1}>
              {project_detail.name}
            </Typography>

            <Box display="flex" justifyContent={"space-between"} gap={1}>
              <Typography level="body-sm">
                <strong>Project Code:</strong> {project_detail.code}
              </Typography>
              <Typography level="body-sm">
                <strong>Customer Name:</strong> {project_detail.customer || "-"}
              </Typography>
              {project_detail?.site_address && (
                <Box display="flex" alignItems="center" gap={0.75}>
                  <LocationOn fontSize="sm" />
                  <Typography level="body-sm">
                    {project_detail.site_address || "-"}
                  </Typography>
                </Box>
              )}
            </Box>

            {isLoadingLineData || isFetchingLineData ? (
              <Typography level="body-sm">Loading charts…</Typography>
            ) : Array.isArray(LineData?.rows) && LineData.rows.length ? (
              <Grid container spacing={1}>
                {LineData.rows.map((row) => (
                  <Grid key={row.project_id} xs={12}>
                    <ActivityFinishLineChart
                      apiData={row}
                      projectId={row.project_id}
                      domain={row.domain}
                      title={row.project_name}
                      onProjectChange={handleProjectChangeSingle}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography level="body-sm" color="neutral">
                No activity line data found.
              </Typography>
            )}
          </Card>
        </Grid>

        {/* Assigned Engineers */}
        <Grid xs={12} md={4}>
          <Card
            sx={{
              ...cardSx,
              overflow: "auto",
              maxHeight: "618px",
              minHeight: "618px",
            }}
          >
            <Typography level="title-lg" mb={1}>
              Assigned Engineer
            </Typography>

            {/* ---------- Primary Reporting ---------- */}
            <Typography level="title-sm" mt={0.5} mb={0.5}>
              Primary Reporting
            </Typography>
            {PRIMARY_ENGINEERS.length === 0 ? (
              <Typography level="body-xs" color="neutral" mb={1}>
                No primary engineers.
              </Typography>
            ) : (
              PRIMARY_ENGINEERS.map((e) => <EngineerRow key={e.id} e={e} />)
            )}

            <Divider sx={{ my: 1 }} />

            {/* ---------- Secondary Reporting ---------- */}
            <Typography level="title-sm" mt={0.5} mb={0.5}>
              Secondary Reporting
            </Typography>
            {SECONDARY_ENGINEERS.length === 0 ? (
              <Typography level="body-xs" color="neutral">
                No secondary engineers.
              </Typography>
            ) : (
              SECONDARY_ENGINEERS.map((e) => <EngineerRow key={e.id} e={e} />)
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Activity Tracking */}
      <Card sx={{ ...cardSx, mt: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography level="title-lg">
            Activity Tracking
            {activityFilter !== "all"
              ? ` — ${titleForFilter(activityFilter)}`
              : ""}
          </Typography>
          <Box display="flex" gap={1} alignItems="center">
            <Tooltip title="Show all">
              <IconButton
                variant="plain"
                size="sm"
                onClick={() => setFilter("all")}
              >
                <MoreHoriz />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Divider sx={{ my: 1.5 }} />

        <Sheet variant="soft" sx={{ borderRadius: "md", overflow: "hidden" }}>
          <Table
            variant="plain"
            size="sm"
            borderAxis="bothBetween"
            stickyHeader
            sx={{
              "--TableCell-headBackground":
                "var(--joy-palette-background-level1)",
              "--TableCell-paddingX": "12px",
              "--TableCell-paddingY": "10px",
              "& th": { fontWeight: 600 },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: 320 }}>Activity</th>
                <th>Assigned To</th>
                <th style={{ width: 140 }}>Planned Finish</th>
                <th style={{ width: 120 }}>Delay (days)</th>
                <th style={{ width: 140 }}>Idle (days)</th>
                <th style={{ width: 180 }}>Work Done %</th>
                <th style={{ width: 180 }}>Total Work Assigned</th>
                <th style={{ width: 180 }}>Pending Work</th>
                <th style={{ width: 120, textAlign: "right" }}>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((a) => {
                const totalWorkAssigned = a.total_work_assigned;
                const pct = Number(a.work_done_percent || 0);
                const pendingWork =
                  totalWorkAssigned > 0 ? 100 - Math.min(100, pct) : 0;

                const plannedFinish = a.planned_finish || null;
                const isCompleted = effectiveStatus(a) === "completed";
                const today = new Date();

                const overdue = plannedFinish
                  ? plannedFinish < today && !isCompleted
                  : false;

                let delayDays = 0;
                if (overdue) {
                  const ms = today.getTime() - plannedFinish.getTime();
                  delayDays = Math.ceil(ms / (24 * 60 * 60 * 1000));
                }

                const lastDate = a.last_update || null;

                const plannedFinishLabel = plannedFinish
                  ? plannedFinish.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "-";

                const lastUpdateLabel = lastDate
                  ? lastDate.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "-";

                // Idle days from latestStatusMap (only if latest status is idle)
                const latest = latestStatusMap.get(
                  String(a.id || a._key || "")
                );
                const isIdle = latest?.status === "idle";
                const idleDays = isIdle
                  ? ceilDaysBetween(latest?.date, today)
                  : "-";

                return (
                  <tr key={a._key}>
                    <td>
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                        sx={{ cursor: "pointer" }}
                        onClick={() => openDprModal(a)}
                        title="View DPR log"
                      >
                        <Person fontSize="sm" />
                        <Typography
                          level="body-sm"
                          sx={{ textDecoration: "underline" }}
                        >
                          {a.activity_name}
                        </Typography>
                      </Box>
                    </td>
                    <td>
                      {Array.isArray(a.assigned_to) &&
                      a.assigned_to.length ? (
                        <Typography level="body-sm">
                          {a.assigned_to.map((u, idx) => {
                            const name = u.user_name || u.name || "Engineer";
                            const userId = u._id || u.user_id || null;

                            if (!userId) {
                              return (
                                <React.Fragment key={`${name}-${idx}`}>
                                  {name}
                                  {idx < a.assigned_to.length - 1 ? ", " : ""}
                                </React.Fragment>
                              );
                            }

                            return (
                              <React.Fragment key={userId}>
                                <span
                                  style={{
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                  }}
                                  onClick={() => handleUserClick(userId)}
                                  title={`View profile of ${name}`}
                                >
                                  {name}
                                </span>
                                {idx < a.assigned_to.length - 1 ? ", " : ""}
                              </React.Fragment>
                            );
                          })}
                        </Typography>
                      ) : (
                        <Typography level="body-sm">Unassigned</Typography>
                      )}
                    </td>
                    <td>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={overdue ? "danger" : "primary"}
                      >
                        {plannedFinishLabel}
                      </Chip>
                    </td>
                    <td>
                      <Typography
                        level="body-sm"
                        color={overdue ? "danger" : "neutral"}
                      >
                        {overdue ? `${delayDays}` : "0"}
                      </Typography>
                    </td>
                    <td>
                      <Typography
                        level="body-sm"
                        color={isIdle ? "warning" : "neutral"}
                      >
                        {idleDays}
                      </Typography>
                    </td>
                    <td>
                      <Box position="relative" pr={5}>
                        <LinearProgress
                          determinate
                          value={Math.min(100, pct)}
                          color={bandColor(pct)}
                          sx={{
                            "--LinearProgress-thickness": "8px",
                            "--LinearProgress-radius": "999px",
                            borderRadius: 999,
                            height: 8,
                          }}
                        />
                        <Typography
                          level="body-xs"
                          sx={{
                            position: "absolute",
                            right: 0,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontWeight: 600,
                          }}
                        >
                          {formatPct(Math.min(100, pct))}
                        </Typography>
                      </Box>
                    </td>

                    {/* New Columns */}
                    <td>
                      <Typography level="body-sm">
                        {totalWorkAssigned} {a.work_unit}
                      </Typography>
                    </td>
                    <td>
                      <Typography level="body-sm">{pendingWork}</Typography>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <Typography level="body-sm">{lastUpdateLabel}</Typography>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Sheet>
      </Card>

      {/* ---------------- DPR Log Modal ---------------- */}
      <Modal open={logOpen} onClose={closeDprModal} keepMounted>
        <ModalDialog
          aria-labelledby="dpr-log-title"
          sx={{ width: { xs: "100%", sm: 720 }, maxWidth: "95vw" }}
        >
          <ModalClose />
          <Typography id="dpr-log-title" level="h5" fontWeight="lg" mb={0.5}>
            DPR Log — {activeActivity?.activity_name || "-"}
          </Typography>
          <Typography level="body-sm" color="neutral" mb={1}>
            Project: {project_detail.code} — {project_detail.name}
          </Typography>

          <Divider sx={{ mb: 1.5 }} />

          {groupedLogs.length === 0 ? (
            <Typography level="body-sm" color="neutral">
              No DPR logs found for this activity.
            </Typography>
          ) : (
            <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
              <List sx={{ "--List-gap": "10px" }}>
                {groupedLogs.map((g) => {
                  const dateLabel = new Date(g.dateISO).toLocaleDateString(
                    "en-IN",
                    { day: "2-digit", month: "short", year: "numeric" }
                  );
                  return (
                    <ListItem
                      key={g.dateISO}
                      sx={{
                        display: "block",
                        p: 1,
                        borderRadius: "md",
                        bgcolor: "background.level1",
                      }}
                    >
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        mb={0.5}
                      >
                        <Typography level="title-sm">{dateLabel}</Typography>
                        <Chip size="sm" variant="soft" color="primary">
                          Total: <b style={{ marginLeft: 6 }}>{g.total}</b>
                        </Chip>
                      </Box>

                      <Table
                        size="sm"
                        variant="plain"
                        sx={{
                          "--TableCell-paddingX": "8px",
                          "--TableCell-paddingY": "6px",
                        }}
                      >
                        <thead>
                          <tr>
                            <th style={{ width: 120, textAlign: "left" }}>
                              Qty
                            </th>
                            <th style={{ width: 120, textAlign: "left" }}>
                              Status
                            </th>
                            <th style={{ textAlign: "left" }}>Remarks</th>
                            <th style={{ width: 160, textAlign: "left" }}>
                              By
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((l, idx) => {
                            const qty =
                              l?.todays_progress ??
                              l?.today_progress ??
                              l?.progress ??
                              0;
                            const rawStatus = String(l?.status || "")
                              .toLowerCase()
                              .replace(/_/g, " ");
                            const status = normalizeStatusText(rawStatus);
                            const by =
                              l?.user_name ||
                              l?.name ||
                              l?.user?.name ||
                              l?.user?.user_name ||
                              l?.user?.email ||
                              l?.user_id?.name ||
                              l?.user_id?.email ||
                              l?.email ||
                              "-";

                            const chipColor =
                              status === "completed"
                                ? "success"
                                : status === "in progress"
                                ? "primary"
                                : status === "pending"
                                ? "warning"
                                : status === "idle"
                                ? "neutral"
                                : status === "work stopped" ||
                                  status === "stopped" ||
                                  status === "stop"
                                ? "danger"
                                : "neutral";

                            return (
                              <tr key={idx}>
                                <td>{qty}</td>
                                <td>
                                  <Chip
                                    size="sm"
                                    variant="soft"
                                    color={chipColor}
                                  >
                                    {status || "progress"}
                                  </Chip>
                                </td>
                                <td>{l?.remarks || "-"}</td>
                                <td>{by}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </ModalDialog>
      </Modal>
      {/* -------------- /DPR Log Modal -------------- */}
    </Box>
  );
}

/* ------------------- shared small components ------------------- */
function KPIBox({ color, icon, title, value, subtitle, onClick }) {
  const Icon = icon;
  const clickable = typeof onClick === "function";
  return (
    <Card
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        ...cardSx,
        minHeight: 100,
        bgcolor: `${color}.softBg`,
        padding: 2,
        cursor: clickable ? "pointer" : "default",
        transition: "box-shadow .15s ease, transform .05s ease",
        "&:hover": clickable ? { boxShadow: "md" } : undefined,
        "&:active": clickable ? { transform: "scale(0.995)" } : undefined,
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
        <Box
          sx={{
            p: 1,
            borderRadius: "md",
            bgcolor: `${color}.softColor`,
            color: `${color}.solidBg`,
          }}
        >
          <Icon />
        </Box>
        <Typography
          level="title-sm"
          sx={{ color: `${color}.softColor`, fontWeight: 500 }}
        >
          {title}
        </Typography>
      </Box>
      <Typography level="h2" sx={{ lineHeight: 1, fontSize: "1.5rem" }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography level="body-xs" color="neutral" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Card>
  );
}
