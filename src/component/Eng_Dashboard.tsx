import {
    useLazyAssignendUnAssignedCountQuery,
    useLazyEngUserDetailQuery,
    useLazyGetTemplateWisCountQuery,
    useLazyUploadFileCountQuery,
    useLazyUserFileUploadCountQuery,
} from "../redux/engsSlice";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AccessTime, DoneAll, ErrorOutline, TrendingUp } from "@mui/icons-material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
    Avatar,
    Box,
    Card,
    Grid,
    IconButton,
    LinearProgress,
    Typography,
    FormControl,
    FormLabel,
    Select,
    Option,
} from "@mui/joy";
import CloudStatCard from "./All_Tasks/TaskDashboardCards";
import TaskStatusList from "./All_Tasks/TaskListCard";
import { useGetMyTasksQuery, useGetTaskStatsQuery } from "../redux/globalTaskSlice";

// ✅ recharts
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
} from "recharts";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";


const StatusChip = ({ status }) => {
    const map = {
        completed: "success",
        "in progress": "primary",
        "not started": "neutral",
        submitted: "success",
    };

    return (
        <Box
            sx={{
                px: 1,
                py: 0.25,
                borderRadius: "sm",
                bgcolor: `${map[status] || "neutral"}.softBg`,
                color: `${map[status] || "neutral"}.solidBg`,
                fontSize: 12,
                textTransform: "capitalize",
            }}
        >
            {status}
        </Box>
    );
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

const EngineeringDashboard = () => {
    const [searchParams] = useSearchParams();

    const navigate = useNavigate();

    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const [openUserId, setOpenUserId] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState("");

    const barColors = useMemo(
        () => [
            "#2563eb",
            "#16a34a",
            "#f59e0b",
            "#ef4444",
            "#a855f7",
            "#06b6d4",
            "#f97316",
            "#84cc16",
        ],
        []
    );

    const queryArgs = useMemo(
        () => ({
            startDate: from || new Date().toISOString(),
            endDate: to || new Date().toISOString(),
        }),
        [from, to]
    );

    const [triggerUploadFileCount, { data, isLoading, isFetching }] =
        useLazyUploadFileCountQuery();

    const [
        getEngUserDetail,
        { data: userDetailData, isLoading: isLoadingDetail, isFetching: isFetchingDetail },
    ] = useLazyEngUserDetailQuery();

    const [
        getAssignedUnAssignedTask,
        { data: taskCount, isLoading: isLoadingTask, isFetching: isFetchingTask },
    ] = useLazyAssignendUnAssignedCountQuery();

    const [
        getTemplateWisCount,
        { data: templateCount, isLoading: isLoadingTemplate, isFetching: isFetchingTemplate },
    ] = useLazyGetTemplateWisCountQuery();

    const [
        getUploadedCount,
        { data: uploadCount, isLoading: isLoadingFile, isFetching: isFetchingFile },
    ] = useLazyUserFileUploadCountQuery();

    const { data: dataTask, } = useGetTaskStatsQuery(queryArgs);
    const stats = dataTask?.data || {
        active: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
    };

    useEffect(() => {
        triggerUploadFileCount(queryArgs);
        getEngUserDetail(queryArgs);
        getAssignedUnAssignedTask(queryArgs);
        getTemplateWisCount(queryArgs);
    }, [
        queryArgs,
        triggerUploadFileCount,
        getEngUserDetail,
        getAssignedUnAssignedTask,
        getTemplateWisCount,
    ]);

    const users = userDetailData?.data || [];

    // ✅ default select first user
    useEffect(() => {
        if (!selectedUserId && users.length > 0) {
            const firstId = users?.[0]?.user?._id || "";
            if (firstId) setSelectedUserId(String(firstId));
        }
    }, [users, selectedUserId]);

    // ✅ last 7 days fallback for user graph
    const now = useMemo(() => new Date(), []);
    const sevenDaysAgo = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return d;
    }, []);

    // ✅ user uploads day-wise fetch
    useEffect(() => {
        if (!selectedUserId) return;

        getUploadedCount({
            startDate: from || sevenDaysAgo.toISOString(),
            endDate: to || new Date().toISOString(),
            user: selectedUserId,
        });
    }, [from, to, selectedUserId, sevenDaysAgo, getUploadedCount]);

    const {
        data: myTasksRes,
        isLoading: myLoading,
        isFetching: myFetching,
    } = useGetMyTasksQuery();

    const myTaskItems = (myTasksRes?.data || []).map((t) => ({
        id: t.id ?? t._id,
        title: t.title,
        time: t.time,
        status: t?.current_status?.status || "—",
        assigned_to: t?.assigned_to || [],
        createdBy: { name: t.created_by || "" },
        selected: false,
    }));

    const ActivityList = ({ rows }) => {
        return (
            <Box display="flex" flexDirection="column" gap={1}>
                {rows.map((row, idx) => (
                    <Box key={idx} display="flex" alignItems="center" gap={1}>
                        <Box flex={1}>
                            <Typography level="body-sm">{row.templateName}</Typography>
                            <Typography level="body-xs" color="neutral">
                                {row.projectCode}
                            </Typography>
                        </Box>

                        <StatusChip status={row.status} />

                        <Typography level="body-xs">{row.attachment_count}</Typography>

                        <IconButton
                            size="sm"
                            component="a"
                            href={row.attachment_urls?.[0]}
                            target="_blank"
                        >
                            View
                        </IconButton>
                    </Box>
                ))}
            </Box>
        );
    };

    const renderUserCard = (item) => {
        const { user, totalFiles, documentHistory = [] } = item;
        const percent = Math.round((totalFiles / (userDetailData?.AllFileCount || 1)) * 100);
        const isOpen = openUserId === user._id;

        return (
            <Card
                key={user._id}
                variant="outlined"
                sx={{
                    mb: 1.5,
                    borderRadius: "lg",
                    bgcolor: "background.surface",
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar src={user.attachment_url || ""}>{user.name?.[0]}</Avatar>

                    <Box flex={1}>
                        <Typography level="title-sm">{user.name}</Typography>

                        <Typography level="body-xs" color="neutral">
                            {totalFiles} Uploaded Files
                        </Typography>

                        <LinearProgress
                            determinate
                            value={percent}
                            sx={{
                                mt: 0.5,
                                height: 6,
                                borderRadius: 10,
                                bgcolor: "neutral.softBg",
                                color: "primary.solidBg",
                            }}
                        />
                    </Box>

                    <Typography level="body-sm" sx={{ minWidth: 40 }}>
                        {percent}%
                    </Typography>

                    <IconButton size="sm" onClick={() => setOpenUserId(isOpen ? null : user._id)}>
                        {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </Box>

                <Box
                    sx={{
                        mt: 2,
                        px: 1.5,
                        pb: isOpen ? 1.5 : 0,
                        borderRadius: "md",
                        bgcolor: "neutral.softBg",
                        maxHeight: isOpen ? 260 : 0,
                        opacity: isOpen ? 1 : 0,
                        overflow: "hidden",
                        transition: "max-height 0.3s ease, opacity 0.2s ease, padding 0.2s ease",
                    }}
                >
                    <Typography level="body-xs" sx={{ mb: 1, color: "neutral.600" }}>
                        Activities ({documentHistory.length})
                    </Typography>

                    {documentHistory.length === 0 ? (
                        <Typography level="body-xs" textAlign="center">
                            No activities found
                        </Typography>
                    ) : (
                        <ActivityList rows={documentHistory} />
                    )}
                </Box>
            </Card>
        );
    };

    // ✅ user day-wise chart
    const chartRows = useMemo(() => {
        const arr = uploadCount?.data || [];
        return arr.map((r) => ({
            ...r,
            day: String(r.date || "").slice(8, 10) || r.date,
            files: Number(r.files || 0),
        }));
    }, [uploadCount]);

    const totalRangeFiles = useMemo(() => {
        return (chartRows || []).reduce((sum, r) => sum + Number(r.files || 0), 0);
    }, [chartRows]);

    const chartLoading = isLoadingFile || isFetchingFile;

    // ✅ template-wise chart
    const templateChartRows = useMemo(() => {
        const arr = templateCount?.data || [];
        return arr.map((r) => {
            const name = String(r?.templateName || "—");
            return {
                template_id: r?.template_id,
                templateName: name,
                short: name.slice(0, 14) + (name.length > 14 ? "…" : ""),
                count: Number(r?.count || 0),
            };
        });
    }, [templateCount]);

    const templateTotal = useMemo(() => {
        return (templateChartRows || []).reduce((sum, r) => sum + Number(r.count || 0), 0);
    }, [templateChartRows]);

    const templateLoading = isLoadingTemplate || isFetchingTemplate;

    return (
        <Box
            sx={{
                ml: { xs: 0, lg: "var(--Sidebar-width)" },
                width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
                bgcolor: "background.body",
            }}
        >
            {/* TOP STATS */}
            <Grid container spacing={2}>
                <Grid xs={12} md={3}>
                    <CloudStatCard
                        loading={isLoading || isFetching}
                        value={data?.Attachment_count ?? 0}
                        title="Uploaded File"
                        subtitle="Total Uploaded Count"
                        accent="#86efac"
                        illustration={
                            <IconBadge icon={<DoneAll fontSize="small" />} color="#15803d" bg="#ecfdf5" />
                        }
                        onAction={() => {
                            const params = new URLSearchParams(queryArgs);
                            params.set("page", "1");

                            navigate(`/eng_upload?${params.toString()}`);
                        }}
                    />
                </Grid>

                <Grid xs={12} md={3}>
                    <CloudStatCard
                        loading={isLoading || isFetching}
                        value={stats.pending ?? 0}
                        title="Pending Task"
                        subtitle="Tasks waiting to start"
                        accent="#f59e0b"
                        illustration={
                            <IconBadge
                                icon={<PendingActionsRoundedIcon fontSize="small" />}
                                color="#b45309"
                                bg="#fffbeb"
                            />
                        }
                        onAction={() => {
                            const params = new URLSearchParams();
                            params.set("page", "1");
                            params.set("tab", "Pending");
                            navigate(`/all_task?${params.toString()}`);
                        }}
                    />
                </Grid>

                <Grid xs={12} md={3}>
                    <CloudStatCard
                        loading={isLoadingTask || isFetchingTask}
                        value={taskCount?.AssignedCount ?? 0}
                        title="Completed Task"
                        subtitle="Assigned Task Count"
                        accent="#f59e0b"
                        illustration={
                            <IconBadge icon={<TrendingUp fontSize="small" />} color="#b45309" bg="#fffbeb" />
                        }
                    />
                </Grid>

                <Grid xs={12} md={3}>
                    <CloudStatCard
                        loading={isLoadingTask || isFetchingTask}
                        value={taskCount?.UnAssignedCount ?? 0}
                        title="Unassigned Completed Task"
                        subtitle="Unassigned Task count"
                        accent="#f59e0b"
                        illustration={
                            <IconBadge icon={<ErrorOutline fontSize="small" />} color="#b45309" bg="#fffbeb" />
                        }
                    />
                </Grid>
            </Grid>

            {/* USER DAY-WISE BAR GRAPH */}
            <Grid container spacing={2} mt={0.5}>
                <Grid xs={12}>
                    <Card
                        variant="soft"
                        sx={{
                            borderRadius: 28,
                            p: { xs: 1.25, sm: 1.5, md: 2 },
                            bgcolor: "#fff",
                            border: "1px solid",
                            borderColor: "rgba(15,23,42,0.08)",
                            boxShadow:
                                "0 2px 6px rgba(15,23,42,0.06), 0 18px 32px rgba(15,23,42,0.06)",
                            height: 320,
                        }}
                        onClick={() => {
                            const params = new URLSearchParams(queryArgs);
                            params.set("page", "1");
                            params.set("group", "user")

                            navigate(`/eng_upload?${params.toString()}`);
                        }}
                    >
                        <Box display="flex" alignItems="flex-end" justifyContent="space-between" gap={2}>
                            <Box>
                                <Typography level="title-md">User Uploads (Day-wise)</Typography>
                                <Typography level="body-xs" color="neutral">
                                    Total in range: {totalRangeFiles}
                                </Typography>
                            </Box>

                            <FormControl
                                size="sm"
                                sx={{ minWidth: 260 }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <FormLabel>Select User</FormLabel>
                                <Select
                                    value={selectedUserId || null}
                                    onChange={(e, v) => setSelectedUserId(String(v || ""))}
                                    placeholder="Select user"
                                    slotProps={{
                                        button: {
                                            onClick: (e) => e.stopPropagation(),
                                            onMouseDown: (e) => e.stopPropagation(),
                                        },
                                        listbox: {
                                            onClick: (e) => e.stopPropagation(),
                                            onMouseDown: (e) => e.stopPropagation(),
                                        },
                                    }}
                                >
                                    {users.map((r) => (
                                        <Option key={r?.user?._id} value={String(r?.user?._id || "")}>
                                            {r?.user?.name || "—"}
                                        </Option>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <Box sx={{ mt: 2, height: 230 }}>
                            {chartLoading ? (
                                <Box>
                                    <Typography level="body-sm" mb={1}>
                                        Loading graph...
                                    </Typography>
                                    <LinearProgress />
                                </Box>
                            ) : chartRows.length === 0 ? (
                                <Typography level="body-sm" textAlign="center" sx={{ mt: 6 }}>
                                    No uploads found in selected range
                                </Typography>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip
                                            formatter={(value) => [value, "Files"]}
                                            labelFormatter={(label, payload) => {
                                                const row = payload?.[0]?.payload;
                                                return row?.date ? `Date: ${row.date}` : `Day: ${label}`;
                                            }}
                                        />
                                        <Bar dataKey="files" radius={[8, 8, 0, 0]}>
                                            {chartRows.map((_, idx) => (
                                                <Cell key={`cell-${idx}`} fill={barColors[idx % barColors.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Card>
                </Grid>
            </Grid>

            {/* TEMPLATE-WISE BAR GRAPH */}
            <Grid container spacing={2} mt={0.5}>
                <Grid xs={12}>
                    <Card
                        variant="soft"
                        sx={{
                            borderRadius: 28,
                            p: { xs: 1.25, sm: 1.5, md: 2 },
                            bgcolor: "#fff",
                            border: "1px solid",
                            borderColor: "rgba(15,23,42,0.08)",
                            boxShadow:
                                "0 2px 6px rgba(15,23,42,0.06), 0 18px 32px rgba(15,23,42,0.06)",
                            height: 360,
                        }}
                        onClick={() => {
                            const params = new URLSearchParams(queryArgs);
                            params.set("page", "1");
                            params.set("group", "template")

                            navigate(`/eng_upload?${params.toString()}`);
                        }}
                    >
                        <Box display="flex" alignItems="flex-end" justifyContent="space-between" gap={2}>
                            <Box>
                                <Typography level="title-md">Template Uploads (Count)</Typography>
                                <Typography level="body-xs" color="neutral">
                                    Total in range: {templateTotal}
                                </Typography>
                            </Box>

                            <Typography level="body-xs" color="neutral">
                                {from || "last 7 days"} → {to || "today"}
                            </Typography>
                        </Box>

                        <Box sx={{ mt: 2, height: 270 }}>
                            {templateLoading ? (
                                <Box>
                                    <Typography level="body-sm" mb={1}>
                                        Loading template graph...
                                    </Typography>
                                    <LinearProgress />
                                </Box>
                            ) : templateChartRows.length === 0 ? (
                                <Typography level="body-sm" textAlign="center" sx={{ mt: 6 }}>
                                    No template uploads found in selected range
                                </Typography>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={templateChartRows} margin={{ top: 10, right: 16, left: 0, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="short"
                                            interval={0}
                                            angle={-25}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip
                                            formatter={(value) => [value, "Files"]}
                                            labelFormatter={(label, payload) => {
                                                const row = payload?.[0]?.payload;
                                                return row?.templateName ? `Template: ${row.templateName}` : `Template: ${label}`;
                                            }}
                                        />
                                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                            {templateChartRows.map((_, idx) => (
                                                <Cell key={`tpl-${idx}`} fill={barColors[idx % barColors.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Card>
                </Grid>
            </Grid>

            {/* EXISTING SECTION */}
            <Grid container spacing={2} mt={0.5}>
                <Grid xs={12} md={7}>
                    <Card
                        variant="soft"
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
                            height: 630,
                        }}
                    >
                        <Typography level="title-md" mb={1}>
                            Activity Leaderboard
                        </Typography>

                        <Box sx={{ height: "100%", overflowY: "auto", pr: 1 }}>
                            {users.map((item) => renderUserCard(item))}
                        </Box>
                    </Card>
                </Grid>

                <Grid xs={12} md={5}>
                    <TaskStatusList
                        title="Today Task Creation"
                        items={myLoading || myFetching ? [] : myTaskItems}
                        activeTab="mine"
                        maxHeight="629px"
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default EngineeringDashboard;
