// Dash_project.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Grid } from "@mui/joy";
import CloudStatCard from "./All_Tasks/TaskDashboardCards";
import PlayCircleFilledRoundedIcon from "@mui/icons-material/PlayCircleFilledRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import DoNotDisturbOnRoundedIcon from "@mui/icons-material/DoNotDisturbOnRounded";
import { PauseCircleRounded } from "@mui/icons-material";
import ProjectsWorkedCard from "./All_Tasks/Charts/ProjectsDonut";
import ProjectsPieChart from "./All_Tasks/Charts/ProjectsPieChart";
import {
  useGetActivityLineByProjectIdQuery,
  useGetPostsActivityFeedQuery,
  useGetProjectDropdownForDashboardQuery,
  useGetProjectStatesFilterQuery,
  useGetProjectStatusFilterQuery,
  useLazyGetProjectSearchDropdownQuery,
  useGetResourcesQuery,
  useGetDprActivityStatsQuery,
  useGetActivityWorkSummaryQuery,
  useGetDprPeopleStatusCountQuery,
  useGetTopPrimaryReportingHeroesQuery,
  useGetComplaintsTrendQuery,
  useGetDprCommentsFeedQuery,
  useGetProjectDprDashboardQuery,
} from "../redux/projectsSlice";
import {
  useGetProjectActivityForViewQuery,
  useGetProjectDetailQuery,
} from "../redux/projectsSlice";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ActivityFinishLineChart from "./ActivityFinishLineChart";
import WeeklyProjectTimelineCard from "./WeeklyActivityProject";
import ActivityFeedCard from "../component/All_Tasks/ActivityCard";
import SearchPickerModal from "./SearchPickerModal";
import ResourceBarGraph from "./ResourceBarGraph";
import AnalyticalActivityAreaChart from "./AnalyticalActivityAreaChart";
import ProfessionalsHighlightsCard from "./ProfessionalsHighlightsCard";
import ComplaintsLineChart from "./ComplaintsLineChart";
import RecentProjectsTable from "./All_Tasks/RecentProjectsTable";

/* ---------------- Hoisted constants (stable references) ---------------- */
const DONUT_COLORS = [
  "#f59e0b",
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#e11d48",
  "#84cc16",
  "#f97316",
  "#06b6d4",
  "#d946ef",
  "#0ea5e9",
  "#65a30d",
  "#dc2626",
  "#7c3aed",
  "#10b981",
  "#ca8a04",
  "#2563eb",
  "#f43f5e",
  "#0891b2",
  "#a16207",
  "#15803d",
  "#4f46e5",
  "#ea580c",
  "#db2777",
  "#047857",
  "#1d4ed8",
  "#9333ea",
  "#b91c1c",
  "#0d9488",
];

const RESOURCE_TYPES_FALLBACK = [
  "surveyor",
  "civil engineer",
  "civil i&c",
  "electric engineer",
  "electric i&c",
  "soil testing team",
  "tline engineer",
  "tline subcontractor",
];

/* ---------------- Hoisted helpers ---------------- */
const ymd = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const startOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  res.setDate(d.getDate() + diff);
  return res;
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
};
const parseYMD = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
};
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

/* ---------------- Component ---------------- */
function Dash_project({ projectIds }) {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");

  const [siteRole, setSiteRole] = useState("");

  const siteRoles = [
    "Surveyor",
    "Civil Engineer",
    "Electrical Engineer",
    "Transmission Line",
  ];

  const handleTabChange = (newValue) => {
    const next = String(newValue);
    setActiveTab(next);
    const params = new URLSearchParams(sp);
    params.set("tab_dashboard", next);
    setSp(params);
  };

  const {
    data: statusData,
    isLoading,
    isFetching,
  } = useGetProjectStatusFilterQuery();
  const stats = statusData?.data || {
    completed: 0,
    delayed: 0,
    "to be started": 0,
    delayed: 0,
    "on hold": 0,
  };

  /* ---------- Multi selection ---------- */
  const [selectedIds, setSelectedIds] = useState(projectIds || []);
  useEffect(() => {
    setSelectedIds(projectIds || []);
  }, [projectIds]);

  /* ---------- Single active project ---------- */
  const searchProjectId = sp.get("project_id") || "";
  const initialProjectId =
    searchProjectId ||
    (Array.isArray(projectIds) && projectIds.length
      ? String(projectIds[0])
      : "");
  const [projectId, setProjectId] = useState(initialProjectId);

  useEffect(() => {
    if (initialProjectId && initialProjectId !== projectId) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId, projectId]);

  const handleProjectChangeSingle = useCallback(
    (id) => {
      if (!id) return;
      const sId = String(id);
      setProjectId(sId);
      setSelectedIds((prev) => [sId, ...prev.filter((x) => x !== sId)]);
      const params = new URLSearchParams(sp);
      params.set("project_id", sId);
      navigate({ search: params.toString() }, { replace: true });
    },
    [navigate, sp]
  );

  /* ---------- Team leaderboard (project details) ---------- */
  const [userSearch, setUserSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState(userSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const {
    data: projectDetailData,
    isLoading: perfLoading,
    isFetching: perfFetching,
  } = useGetProjectDetailQuery(
    { q: debouncedQ },
    {
      selectFromResult: ({ data, isLoading, isFetching }) => ({
        data: data?.data,
        isLoading,
        isFetching,
      }),
    }
  );

  /* ---------- Donut (states distribution) ---------- */
  const {
    data: stateRes,
    isLoading: pbsLoading,
    isFetching: pbsFetching,
  } = useGetProjectStatesFilterQuery();

  const donutData = useMemo(() => {
    const dist = stateRes?.data || [];
    const total = stateRes?.total || 0;
    if (!total) return [];
    return dist.map((d, i) => ({
      name: d._id,
      value: Number(((d.count / total) * 100).toFixed(2)),
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
  }, [stateRes]);

  const {
    data: dprPeopleStatusData,
    isLoading: dprPeopleStatusLoading,
    isFetching: dprPeopleStatusFetching,
    error: dprPeopleStatusError,
  } = useGetDprPeopleStatusCountQuery({
    site_role: siteRole || "",
  });

  /* ---------- Activity feed ---------- */
  const {
    data: feedRes,
    isLoading: feedLoading,
    isFetching: feedFetching,
  } = useGetPostsActivityFeedQuery();

  const feedItems = useMemo(
    () => (Array.isArray(feedRes?.data) ? feedRes.data : []),
    [feedRes?.data]
  );

  /* ---------- Weekly timeline (baseline/actual) ---------- */
  const defaultStart = useMemo(() => startOfWeek(new Date()), []);
  const defaultEnd = useMemo(() => addDays(startOfWeek(new Date()), 6), []);
  const [range, setRange] = useState({
    startDate: defaultStart,
    endDate: defaultEnd,
  });

  const baselineStart = useMemo(() => ymd(range.startDate), [range.startDate]);
  const baselineEnd = useMemo(() => ymd(range.endDate), [range.endDate]);

  const [paFilter, setPaFilter] = useState("all");
  const apiFilter =
    paFilter === "baseline" ||
    paFilter === "actual_ontime" ||
    paFilter === "actual_late"
      ? paFilter
      : undefined;

  const {
    data: paViewRes,
    isLoading: paLoading,
    isFetching: paFetching,
  } = useGetProjectActivityForViewQuery({
    baselineStart,
    baselineEnd,
    filter: apiFilter,
  });

  const timelineData = useMemo(
    () => (Array.isArray(paViewRes?.data) ? paViewRes.data : []),
    [paViewRes?.data]
  );

  const handleTimelineRangeChange = useCallback((startDate, endDate) => {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(0, 0, 0, 0);
    setRange((prev) =>
      prev.startDate.getTime() === s.getTime() &&
      prev.endDate.getTime() === e.getTime()
        ? prev
        : { startDate: s, endDate: e }
    );
  }, []);

  /* ---------- Multi-project line chart ---------- */
  const {
    data: LineData,
    isLoading: isLoadingLineData,
    isFetching: isFetchingLineData,
  } = useGetActivityLineByProjectIdQuery(selectedIds, {
    skip: selectedIds.length === 0,
  });

  /* ---------- Project dropdown / search (kept stable) ---------- */
  const { data: projectResponse } = useGetProjectDropdownForDashboardQuery({
    page: 1,
    pageSize: 7,
  });
  const projects = Array.isArray(projectResponse)
    ? projectResponse
    : projectResponse?.data ?? [];

  const [triggerProjectSearch] = useLazyGetProjectSearchDropdownQuery();
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [labelCache, setLabelCache] = useState({});

  const labelFromRow = useCallback(
    (row) =>
      row.code
        ? `${row.code}${row.name ? ` - ${row.name}` : ""}`
        : row.name || String(row._id),
    []
  );

  const onPickProject = useCallback(
    (row) => {
      if (!row) return;
      setProjectModalOpen(false);
      const id = String(row._id || "");
      if (!id) return;
      setLabelCache((prev) => ({ ...prev, [id]: labelFromRow(row) }));
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    [labelFromRow]
  );

  const optionRows = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const p of projects || []) {
      if (!p?._id) continue;
      const id = String(p._id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(p);
    }
    for (const id of selectedIds) {
      if (seen.has(id)) continue;
      out.push({ _id: id, code: null, name: labelCache[id] || id });
      seen.add(id);
    }
    return out;
  }, [projects, selectedIds, labelCache]);

  const fetchProjectsPage = useCallback(
    async ({ search = "", page = 1, pageSize = 7 }) => {
      const res = await triggerProjectSearch(
        { search, page, limit: pageSize },
        true
      );
      const d = res?.data;
      return {
        rows: d?.data || [],
        total: d?.pagination?.total || 0,
        page: d?.pagination?.page || page,
        pageSize: d?.pagination?.pageSize || pageSize,
      };
    },
    [triggerProjectSearch]
  );

  /* ---------- Resources (bar chart) ---------- */
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [resRange, setResRange] = useState({
    startDate: today,
    endDate: addDays(today, 6),
  });

  const resArgs = useMemo(
    () => ({
      start: ymd(resRange.startDate),
      end: ymd(resRange.endDate),
      ...(projectId ? { project_id: projectId } : {}),
    }),
    [resRange.startDate, resRange.endDate, projectId]
  );

  const { data: resourcesRes } = useGetResourcesQuery(resArgs, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  const resourceTypesFromApi = useMemo(() => {
    return Array.isArray(resourcesRes?.resource_types) &&
      resourcesRes.resource_types.length
      ? resourcesRes.resource_types
      : RESOURCE_TYPES_FALLBACK;
  }, [resourcesRes?.resource_types]);

  const resourceLogs = useMemo(() => {
    const series = Array.isArray(resourcesRes?.series)
      ? resourcesRes.series
      : [];
    const out = [];
    for (const row of series) {
      const date = row.date; // YYYY-MM-DD
      for (const t of resourceTypesFromApi) {
        out.push({
          date,
          type: t,
          count: Number(row?.[t] || 0),
        });
      }
    }
    return out;
  }, [resourcesRes?.series, resourceTypesFromApi]);

  const safeSetResRange = useCallback((s, e) => {
    setResRange((prev) =>
      prev.startDate.getTime() === s.getTime() &&
      prev.endDate.getTime() === e.getTime()
        ? prev
        : { startDate: s, endDate: e }
    );
  }, []);

  const handleResRangeChange = useCallback(
    (startY, endY) => {
      const s = parseYMD(startY) || resRange.startDate;
      const e = parseYMD(endY) || resRange.endDate;
      safeSetResRange(s, e);
    },
    [resRange.startDate, resRange.endDate, safeSetResRange]
  );

  /* ---------- Stable row link for Leaderboard ---------- */

  const {
    data: dprDashboardRes,
    isLoading: dprDashboardLoading,
    isFetching: dprDashboardFetching,
  } = useGetProjectDprDashboardQuery({
    page: 1,
    limit: 10000,
    search: "",
  });

  const recentProjectsRows = useMemo(
    () => (Array.isArray(dprDashboardRes?.data) ? dprDashboardRes.data : []),
    [dprDashboardRes]
  );

  const {
    data: dprCommentsRes = [],
    isLoading: dprCommentsLoading,
    isFetching: dprCommentsFetching,
  } = useGetDprCommentsFeedQuery(projectId ? { project_id: projectId } : {});

  const dprCommentsItems = useMemo(
    () => (Array.isArray(dprCommentsRes) ? dprCommentsRes : []),
    [dprCommentsRes]
  );

  // ---------- Complaints trend (only from/to) ----------
  const [complaintsFilter, setComplaintsFilter] = useState(null);

  const handleComplaintsFilterChange = useCallback(({ from, to }) => {
    // chart will call this whenever user changes period
    setComplaintsFilter({ from, to });
  }, []);

  const {
    data: complaintsRes,
    isLoading: complaintsLoading,
    isFetching: complaintsFetching,
  } = useGetComplaintsTrendQuery(
    {
      from: complaintsFilter?.from,
      to: complaintsFilter?.to,
      project_id: projectId || undefined,
    },
    {
      // don't hit API until we have both dates
      skip: !complaintsFilter?.from || !complaintsFilter?.to,
    }
  );

  const complaintsPoints = useMemo(
    () => (Array.isArray(complaintsRes?.points) ? complaintsRes.points : []),
    [complaintsRes]
  );

  const {
    data: dprStats,
    isLoading: dprLoading,
    isFetching: dprFetching,
  } = useGetDprActivityStatsQuery(
    {
      project_id: projectId || undefined,
    },
    {
      skip: false,
    }
  );

  const activityStats = useMemo(
    () => ({
      unassigned: dprStats?.unassigned ?? 0,
      late: dprStats?.late ?? 0,
      ongoing: dprStats?.ongoing ?? 0,
      idle: dprStats?.idle ?? 0,
    }),
    [dprStats]
  );

  const activityStatsLoading = dprLoading || dprFetching;

  const [activityWSFilters, setActivityWSFilters] = useState(null);

  const handleActivityWSFilterChange = useCallback((filters) => {
    setActivityWSFilters(filters);
  }, []);

  //  Fetch leaderboard data
  const {
    data: heroesRaw,
    isLoading: heroesLoading,
    isFetching: heroesFetching,
  } = useGetTopPrimaryReportingHeroesQuery({
    project_id: projectId || undefined,
  });

  // ✅ normalize whether RTK unwrapped .data or not
  const heroesData = heroesRaw?.data ?? heroesRaw ?? {};

  const totalProfessionals = heroesData.total_users ?? 0;
  const topHeroes = heroesData.top_heroes ?? [];
  const allHeroes = heroesData.users ?? heroesData.heroes ?? [];
  const idleEngineers = heroesData.idle_site_engineers_total ?? 0;

  /* ---------- NEW: Activity Work Summary API ---------- */
  const {
    data: activityWorkSummary = [],
    isLoading: activityWorkSummaryLoading,
    isFetching: activityWorkSummaryFetching,
  } = useGetActivityWorkSummaryQuery(
    {
      project_id: projectId || undefined,
      from: activityWSFilters?.from,
      to: activityWSFilters?.to,
    },
    {
      skip: false,
    }
  );

  const activityAreaData = useMemo(() => {
    const rows = Array.isArray(activityWorkSummary) ? activityWorkSummary : [];

    return rows.map((row) => ({
      monthly_summary: row.monthly_summary,

      assigned: Number(row.assigned ?? row.total_assigned ?? row.planned ?? 0),
      completed: Number(
        row.completed ?? row.total_completed ?? row.actual ?? 0
      ),
      remaining: Number(
        row.remaining ??
          row.total_remaining ??
          (row.assigned ?? 0) - (row.completed ?? 0)
      ),

      activity_name: row.activity_name,
      category: row.category,
    }));
  }, [activityWorkSummary]);

  const activityAreaLoading =
    activityWorkSummaryLoading || activityWorkSummaryFetching;

  const activityCategoryOptions = useMemo(() => {
    const set = new Set();
    (activityWorkSummary || []).forEach((row) => {
      if (row.category) set.add(row.category);
    });
    return Array.from(set);
  }, [activityWorkSummary]);

  const activityNameandIdOptions = useMemo(() => {
    const set = new Set();
    (activityWorkSummary || []).forEach((row) => {
      if (row.activity_name && row.activity_id) {
        set.add({ label: row.activity_name, value: row.activity_id });
      }
    });
    return Array.from(set);
  }, [activityWorkSummary]);

  return (
    <Box
      sx={{
        ml: { xs: 0, lg: "var(--Sidebar-width)" },
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
        bgcolor: "background.body",
      }}
    >
      {/* ---------- Toggle Tabs ---------- */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mt: 1,
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            p: 0.5,
            borderRadius: 999,
            bgcolor: "#f4f4f5",
          }}
        >
          {[
            { id: "overview", label: "Overview" },
            { id: "analytical", label: "Analytical" },
          ].map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <Box
                key={tab.id}
                component="button"
                type="button"
                onClick={() => handleTabChange(tab.id)}
                sx={{
                  border: "none",
                  outline: "none",
                  px: 1.8,
                  py: 0.7,
                  borderRadius: 999,
                  fontSize: "0.85rem",
                  fontWeight: selected ? 600 : 500,
                  cursor: "pointer",
                  bgcolor: selected ? "#ffffff" : "transparent",
                  color: selected ? "text.primary" : "text.secondary",
                  boxShadow: selected
                    ? "0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(15,23,42,0.18)"
                    : "none",
                  "&:hover": {
                    bgcolor: selected ? "#ffffff" : "#e5e7eb",
                  },
                }}
              >
                {tab.label}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ---------- OVERVIEW TAB CONTENT ---------- */}
      {activeTab === "overview" && (
        <>
          {/* Status Cards */}
          <Grid container spacing={2} columns={12}>
            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={isLoading || isFetching}
                value={stats["ongoing"] ?? 0}
                title="In Progress Projects"
                subtitle="Projects that is still ongoing"
                accent="#60a5fa"
                illustration={
                  <IconBadge
                    icon={<PlayCircleFilledRoundedIcon fontSize="small" />}
                    color="#1d4ed8"
                    bg="#dbeafe"
                  />
                }
                onAction={() => {
                  const params = new URLSearchParams();
                  params.set("page", "1");
                  params.set("tab", "Ongoing");
                  navigate(`/project_management?${params.toString()}`);
                }}
              />
            </Grid>

            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={isLoading || isFetching}
                value={stats.completed ?? 0}
                title="Completed Projects"
                subtitle="Projects finished"
                accent="#86efac"
                illustration={
                  <IconBadge
                    icon={<TaskAltRoundedIcon fontSize="small" />}
                    color="#15803d"
                    bg="#ecfdf5"
                  />
                }
                onAction={() => {
                  const params = new URLSearchParams();
                  params.set("page", "1");
                  params.set("tab", "Completed");
                  navigate(`/project_management?${params.toString()}`);
                }}
              />
            </Grid>

            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={isLoading || isFetching}
                value={stats.delayed ?? 0}
                title="Delayed Projects"
                subtitle="Project Delayed"
                accent="#fca5a5"
                illustration={
                  <IconBadge
                    icon={<DoNotDisturbOnRoundedIcon fontSize="small" />}
                    color="#b91c1c"
                    bg="#fee2e2"
                  />
                }
                onAction={() => {
                  const params = new URLSearchParams();
                  params.set("page", "1");
                  params.set("tab", "Delayed");
                  navigate(`/project_management?${params.toString()}`);
                }}
              />
            </Grid>

            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={isLoading || isFetching}
                value={stats["on hold"] ?? 0}
                title="On Hold Projects"
                subtitle="Tasks cancelled"
                accent="#fca5a5"
                illustration={
                  <IconBadge
                    icon={<PauseCircleRounded fontSize="small" />}
                    color="#b91c1c"
                    bg="#fee2e2"
                  />
                }
                onAction={() => {
                  const params = new URLSearchParams();
                  params.set("page", "1");
                  params.set("tab", "On Hold");
                  navigate(`/project_management?${params.toString()}`);
                }}
              />
            </Grid>
          </Grid>

          {/* Leaderboard & Donut */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12} md={8}>
              <RecentProjectsTable
                rows={recentProjectsRows}
                title="Recent Projects"
              />
            </Grid>

            <Grid xs={12} md={4}>
              <ProjectsWorkedCard
                title="Projects by State"
                data={pbsLoading || pbsFetching ? [] : donutData}
                total={stateRes?.total ?? 0}
                totalLabel="Projects"
              />
            </Grid>
          </Grid>

          {/* Weekly Timeline & Feed */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12} md={8}>
              <WeeklyProjectTimelineCard
                data={timelineData}
                loading={paLoading || paFetching}
                title="Calendar — Selected Range"
                range={range}
                onRangeChange={handleTimelineRangeChange}
                layerFilter={paFilter}
                onLayerFilterChange={setPaFilter}
              />
            </Grid>

            <Grid xs={12} md={4}>
              <ActivityFeedCard
                title="Recent Notes"
                items={feedItems}
                onItemClick={(it) => {
                  if (it.project_id) {
                    navigate(
                      `/project_detail?project_id=${encodeURIComponent(
                        it.project_id
                      )}`
                    );
                  }
                }}
                renderRight={(it) => (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "#64748b",
                    }}
                  >
                    {it.ago}
                  </span>
                )}
                getAvatar={(it) => it.attachment_url}
                getTitleLeft={(it) => it.name}
                getActionVerb={(it) => it.action}
                getTitleRight={(it) => it.project_name}
                getTitleRightSub={(it) => it.project_code}
                getRemarksHtml={(it) => it.comment}
                getRightText={(it) => it.ago}
              />
            </Grid>
          </Grid>

          {/* Resources Bar Graph */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12}>
              <ResourceBarGraph
                title="Resources by Type"
                resourceTypes={resourceTypesFromApi}
                logs={resourceLogs}
                initialRange={resRange}
                onRangeChange={handleResRangeChange}
                onBarClick={() => {}}
              />
            </Grid>
          </Grid>

          {/* Multi Project Finish Line Charts */}
          {isLoadingLineData || isFetchingLineData ? (
            <div style={{ padding: 12 }}>Loading…</div>
          ) : selectedIds.length > 0 &&
            Array.isArray(LineData?.rows) &&
            LineData.rows.length > 0 ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
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
          ) : null}

          <SearchPickerModal
            open={false && projectModalOpen}
            onClose={() => setProjectModalOpen(false)}
            title="Pick Projects"
            rows={optionRows}
            total={optionRows.length}
            getRowKey={(r) => String(r._id)}
            getRowLabel={labelFromRow}
            fetchPage={fetchProjectsPage}
            onPick={onPickProject}
          />
        </>
      )}

      {activeTab === "analytical" && (
        <>
          <Grid container spacing={2} columns={12}>
            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={activityStatsLoading}
                value={activityStats.unassigned}
                title="Activities Unassigned"
                subtitle="Activities with no owner"
                accent="#fdba74"
                illustration={
                  <IconBadge
                    icon={<DoNotDisturbOnRoundedIcon fontSize="small" />}
                    color="#c2410c"
                    bg="#ffedd5"
                  />
                }
                onAction={() => {
                  const params = new URLSearchParams();
                  params.set("page", "1");
                  params.set("resources", "unassigned");
                  navigate(`/dpr_management?${params.toString()}`);
                }}
              />
            </Grid>

            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={activityStatsLoading}
                value={activityStats.late}
                title="Activities Late"
                subtitle="Delayed against plan"
                accent="#fca5a5"
                illustration={
                  <IconBadge
                    icon={<DoNotDisturbOnRoundedIcon fontSize="small" />}
                    color="#b91c1c"
                    bg="#fee2e2"
                  />
                }
                onAction={() => {
                  const params = new URLSearchParams();
                  params.set("page", "1");
                  params.set("activity", "delayed");
                  navigate(`/dpr_management?${params.toString()}`);
                }}
              />
            </Grid>

            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={activityStatsLoading}
                value={activityStats.ongoing}
                title="Activities Ongoing"
                subtitle="Currently in progress"
                accent="#60a5fa"
                illustration={
                  <IconBadge
                    icon={<PlayCircleFilledRoundedIcon fontSize="small" />}
                    color="#1d4ed8"
                    bg="#dbeafe"
                  />
                }
                onAction={() => {
                  const params = new URLSearchParams();
                  params.set("page", "1");
                  params.set("activity", "ongoing");
                  navigate(`/dpr_management?${params.toString()}`);
                }}
              />
            </Grid>

            <Grid xs={12} md={3}>
              <CloudStatCard
                loading={activityStatsLoading}
                value={activityStats.idle}
                title="Activities Idle"
                subtitle="No work logged"
                accent="#a5b4fc"
                illustration={
                  <IconBadge
                    icon={<PauseCircleRounded fontSize="small" />}
                    color="#4338ca"
                    bg="#e0e7ff"
                  />
                }
                onAction={() => {
                  const params = new URLSearchParams();
                  params.set("page", "1");
                  params.set("status", "idle");
                  navigate(`/dpr_management?${params.toString()}`);
                }}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} columns={12} sx={{ mt: 1 }}>
            <Grid xs={12} md={6}>
              <ProjectsPieChart
                title="People by DPR Status"
                data={dprPeopleStatusData?.data?.statusCounts}
                siteRoles={siteRoles}
                selectedRole={siteRole}
                onRoleChange={setSiteRole}
              />
            </Grid>

            <Grid xs={12} md={6}>
              <ProfessionalsHighlightsCard
                totalProfessionals={totalProfessionals}
                topHeroes={topHeroes}
                idleCount={idleEngineers}
                heroes={allHeroes}
                loading={heroesLoading || heroesFetching}
              />
            </Grid>
          </Grid>

          <Grid
            container
            spacing={2}
            columns={12}
            sx={{ mt: 1 }}
            alignItems="stretch"
          >
            <Grid xs={12} md={8}>
              <ComplaintsLineChart
                points={complaintsPoints}
                loading={complaintsLoading || complaintsFetching}
                onFilterChange={handleComplaintsFilterChange}
              />
            </Grid>

            <Grid xs={12} md={4}>
              <ActivityFeedCard
                title="DPR Comments"
                items={dprCommentsItems}
                loading={dprCommentsLoading || dprCommentsFetching}
                onItemClick={(it) => {
                  if (it._id) {
                    navigate(`/view_dpr?id=${encodeURIComponent(it._id)}`);
                  }
                }}
                renderRight={(it) => (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "#64748b",
                    }}
                  >
                    {it.ago}
                  </span>
                )}
                getAvatar={(it) => it.attachment_url}
                getTitleLeft={(it) => it.name}
                getActionVerb={(it) => it.action}
                getTitleRight={(it) => it.project_name}
                getTitleRightSub={(it) => it.project_code}
                getRemarksHtml={(it) => it.comment}
                getRightText={(it) => it.ago}
              />
            </Grid>
          </Grid>

          {/* Activity Work Summary - Full Width at Bottom */}
          <Grid container spacing={2} columns={12} sx={{ mt: 1 }}>
            <Grid xs={12}>
              <AnalyticalActivityAreaChart
                title="Activity Work Summary"
                subtitle="Assigned vs Completed vs Remaining"
                data={activityAreaData}
                loading={activityAreaLoading}
                categoryOptions={activityCategoryOptions}
                activityOptions={activityNameandIdOptions}
                onFilterChange={handleActivityWSFilterChange}
              />
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

export default Dash_project;
