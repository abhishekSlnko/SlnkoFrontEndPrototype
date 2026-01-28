// ViewDpr.jsx / ViewDprInfo.jsx
import React, { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Grid,
  Sheet,
  Typography,
  Chip,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Modal,
  ModalDialog,
  ModalClose,
  Button,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Select,
  Option,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/joy";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DOMPurify from "dompurify";
import {
  useGetDprByIdQuery,
  useUpdateDprStatusMutation,
  useUpdateDprMutation,
} from "../../src/redux/projectsSlice";
import CommentComposer from "./Comments";
import { toast } from "react-toastify";

/* ---------- Small helper row ---------- */
function InfoRow({ label, children }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "60px minmax(0, 1fr)",
        },
        alignItems: { xs: "flex-start", sm: "center" },
        rowGap: { xs: 0.25, sm: 0 },
        columnGap: { sm: 2 },
        py: 0.5,
      }}
    >
      <Typography
        level="body-sm"
        color="neutral"
        sx={{ mb: { xs: 0.25, sm: 0 } }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: { xs: 0.25, sm: 0 },
          minWidth: 0,
          flexWrap: "wrap",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/* ---------- Helpers reused from ViewTaskPage style ---------- */
const cap = (s = "") =>
  s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");

const statusColor = (s) => {
  const v = (s || "").toLowerCase();
  switch (v) {
    case "draft":
      return "primary";
    case "pending":
      return "danger";
    case "in progress":
      return "warning";
    case "complete":
    case "completed":
      return "success";
    case "cancelled":
      return "warning";
    case "system":
      return "neutral";
    case "work stopped":
    case "work_stopped":
      return "danger";
    case "idle":
      return "neutral";
    default:
      return "neutral";
  }
};

const safeUrl = (u = "") => {
  if (!u) return "";
  try {
    return new URL(u, window.location.origin).href;
  } catch {
    return "";
  }
};

const formatBytes = (n) => {
  if (!n || isNaN(n)) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
};

const fileExt = (name = "") => (name.split(".").pop() || "").toLowerCase();

const isImage = (name = "", type = "") => {
  const ext = fileExt(name);
  return (
    type?.startsWith?.("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)
  );
};

const iconFor = (name = "", type = "") => {
  const ext = fileExt(name);
  if (type?.includes?.("pdf") || ext === "pdf")
    return <PictureAsPdfOutlinedIcon />;
  if (isImage(name, type)) return <ImageOutlinedIcon />;
  if (["xls", "xlsx", "csv"].includes(ext)) return <TableChartOutlinedIcon />;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return <ArchiveOutlinedIcon />;
  if (["doc", "docx", "rtf", "txt", "md"].includes(ext))
    return <InsertDriveFileOutlinedIcon />;
  return <InsertDriveFileOutlinedIcon />;
};

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

const colorFromName = (name = "") => {
  const palette = [
    "primary",
    "success",
    "info",
    "warning",
    "danger",
    "neutral",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum = (sum + name.charCodeAt(i)) % 997;
  return palette[sum % palette.length];
};

const toPerson = (u = {}) => {
  if (typeof u === "string")
    return { id: u, name: u, avatar: "", color: colorFromName(u) };
  const name = u.name || u.fullName || u.displayName || u.email || "User";
  return {
    id:
      u._id ||
      u.id ||
      u.user_id ||
      u.email ||
      name ||
      Math.random().toString(36).slice(2),
    name,
    avatar: u.attachment_url || u.avatar || "",
    color: colorFromName(name),
  };
};

const normalizeAttachment = (a) => {
  if (!a) return null;
  const name =
    a.name ||
    a.fileName ||
    a.originalname ||
    a.filename ||
    (typeof a === "string" ? a.split("/").pop() : "Attachment");
  const url =
    a.url ||
    a.href ||
    a.link ||
    a.blobUrl ||
    a.sasUrl ||
    (typeof a === "string" ? a : "");
  return {
    _id: a._id || a.id || url || name,
    name,
    url,
    type: a.type || a.mimetype || "",
    size: a.size || a.length || a.bytes || 0,
    updatedAt: a.updatedAt || a.createdAt || null,
    user_id: a.user_id || a.uploadedBy || null,
  };
};

const normalizeComment = (c) => {
  const t = c?.updatedAt || c?.createdAt;
  const attRaw = c?.attachments || c?.attachements || c?.files || [];
  const atts = Array.isArray(attRaw)
    ? attRaw.map(normalizeAttachment).filter(Boolean)
    : [];
  return {
    _type: "comment",
    at: t ? new Date(t).getTime() : 0,
    html: c?.remarks || c?.text || "",
    user: c?.user_id,
    attachments: atts,
    raw: c,
  };
};

/* ---------- Small gallery for file activity ---------- */
function AttachmentTile({ a }) {
  const name = a?.name || "Attachment";
  const url = safeUrl(a?.url || a?.href || "");
  const size = a?.size ? formatBytes(a.size) : "";
  const isImg = isImage(name, a?.type || "");
  return (
    <Sheet
      variant="soft"
      sx={{
        width: "100%",
        maxWidth: 260,
        borderRadius: "lg",
        p: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        bgcolor: "background.level1",
        position: "relative",
      }}
    >
      <Box
        sx={{
          height: 150,
          borderRadius: "md",
          overflow: "hidden",
          bgcolor: "background.surface",
          border: "1px solid",
          borderColor: "neutral.outlinedBorder",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isImg && url ? (
          <img
            src={url}
            alt={name}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <Box sx={{ fontSize: 52, opacity: 0.7 }}>
            {iconFor(name, a?.type)}
          </Box>
        )}
      </Box>

      <Box sx={{ px: 0.5 }}>
        <Tooltip title={name} variant="plain">
          <Typography
            level="body-sm"
            sx={{
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </Typography>
        </Tooltip>
        {size && (
          <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
            {size}
          </Typography>
        )}
      </Box>
    </Sheet>
  );
}

function AttachmentGallery({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <Box
      sx={{
        mt: 0.75,
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(auto-fill, minmax(180px, 1fr))",
          sm: "repeat(auto-fill, minmax(220px, 1fr))",
          md: "repeat(auto-fill, minmax(260px, 1fr))",
        },
        gap: 1.5,
      }}
    >
      {items.map((a, i) => (
        <AttachmentTile key={a?._id || `${a?.url || ""}-${i}`} a={a} />
      ))}
    </Box>
  );
}

/* ================== MAIN DPR PAGE ================== */
function ViewDprInfo() {
  const [searchParams] = useSearchParams();

  const dprId = searchParams.get("dpr_id") || searchParams.get("id");

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetDprByIdQuery(dprId, {
      skip: !dprId,
    });

  const [updateDprStatus, { isLoading: isUpdatingStatus }] =
    useUpdateDprStatusMutation();

  const [updateDpr, { isLoading: isUpdatingDpr }] = useUpdateDprMutation();

  const filePickerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDropFiles = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    setAttachments((prev) => [...prev, ...files]);
  };

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachments((prev) => [...prev, ...files]);
  };

  // comment composer state ⭐ NEW
  const [commentText, setCommentText] = useState("");
  const [attachments, setAttachments] = useState([]); // File[]
  const [openAttachModal, setOpenAttachModal] = useState(false);
  const [isStatusIdle, setIsStatusIdle] = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    todaysProgress: "",
    status: "in progress",
    reasonForIdle: "",
    remarks: "",
  });
  const [statusError, setStatusError] = useState("");

  const dpr = data?.data ?? data ?? null;
  const project = dpr?.project_id || {};
  const projectCode = project.code || "-";
  const projectName = project.name || "-";
  const projectState = project.state || "-";
  const projectDistrict = project.site_address?.district_name || "-";
  const projectKwp = project.project_kwp ? `${project.project_kwp} kW` : "-";
  const workUnit = dpr?.work_completion?.unit || "-";
  const workValue =
    dpr?.work_completion?.value != null
      ? String(dpr.work_completion.value)
      : "-";
  const category = dpr?.category || "-";
  const activityName = dpr?.activity_id?.name || "-";
  const plannedStart = dpr?.planned_start;
  const plannedFinish = dpr?.planned_finish;
  const actualStart = dpr?.actual_start;
  const actualFinish = dpr?.actual_finish;
  const createdAt = dpr?.createdAt;
  const updatedAt = dpr?.current_status?.updated_at;
  const createdBy = dpr?.createdBy?.name || "-";
  const createdByAvatar = dpr?.createdBy?.attachment_url || "";
  const secondaryReporting = dpr?.secondary_reporting || [];
  const primaryReportingObj = dpr?.primary_reporting || null;
  const secondaryUsers =
    secondaryReporting.map((rep) => rep.user_id).filter(Boolean) || [];
  const primaryUsers = primaryReportingObj?.user_id
    ? [primaryReportingObj.user_id]
    : [];
  const status = dpr?.current_status?.status || "N/A";


  const totalWork = useMemo(() => {
    const raw = dpr?.work_completion?.value;
    const num = raw != null ? Number(raw) : 0;
    return Number.isNaN(num) ? 0 : num;
  }, [dpr]);

  const displayActivityName = useMemo(() => {
    const name = activityName || "";
    if (name.length <= 15) return name;
    return name.slice(0, 15) + "…";
  }, [activityName]);

  const completedSoFar = useMemo(() => {
    if (!dpr?.status_history || !Array.isArray(dpr.status_history)) return 0;
    return dpr.status_history.reduce((sum, h) => {
      const raw = h?.todays_progress;
      if (raw == null) return sum;
      const num = Number(raw);
      if (Number.isNaN(num)) return sum;
      return sum + num;
    }, 0);
  }, [dpr]);

  const pendingWork = Math.max(totalWork - completedSoFar, 0);

  const fmtDate = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const fmtDateTime = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ---------- Build activity + documents (read-only) ---------- */
  const activity = useMemo(() => {
    if (!dpr) return [];

    const statuses = (dpr.status_history || []).map((h) => ({
      _type: "status",
      at:
        h?.updatedAt || h?.updated_at
          ? new Date(h.updatedAt || h.updated_at).getTime()
          : h?.date
          ? new Date(h.date).getTime()
          : 0,
      status: h?.status,
      remarks: h?.remarks,
      todays_progress: h?.todays_progress,
      user: h?.user_id,
      attachments: [],
      raw: h,
    }));

    const comments = (dpr.comments || []).map(normalizeComment);

    const topRaw = dpr.attachments || dpr.attachements || [];
    const top = Array.isArray(topRaw)
      ? topRaw.map(normalizeAttachment).filter(Boolean)
      : [];
    const filesAsActivity = top.map((a) => ({
      _type: "file",
      at: a?.updatedAt ? new Date(a.updatedAt).getTime() : 0,
      user: a?.user_id,
      attachment: a,
    }));

    return [...statuses, ...comments, ...filesAsActivity].sort(
      (a, b) => b.at - a.at
    );
  }, [dpr]);

  const documents = useMemo(() => {
    if (!dpr) return [];
    const all = [];

    const top = dpr.attachments || dpr.attachements || [];
    if (Array.isArray(top)) {
      top.forEach((a) => {
        const na = normalizeAttachment(a);
        if (na) all.push(na);
      });
    }

    (dpr.comments || []).forEach((c) => {
      const nc = normalizeComment(c);
      nc.attachments.forEach((a) => all.push(a));
    });

    const seen = new Set();
    const uniq = [];
    for (const a of all) {
      const key = a?._id || `${a?.url}|${a?.name}`;
      if (key && !seen.has(key)) {
        seen.add(key);
        uniq.push(a);
      }
    }

    uniq.sort((a, b) => {
      const ta = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
    return uniq;
  }, [dpr]);

  if (!dprId) {
    return (
      <Box
        sx={{
          ml: { md: 0, lg: "var(--Sidebar-width)" },
          p: { xs: 1.5, md: 2 },
        }}
      >
        <Typography color="danger">
          No DPR id provided in URL (expected <code>?id=...</code> or{" "}
          <code>?dpr_id=...</code>).
        </Typography>
      </Box>
    );
  }

  if (isLoading || isFetching) {
    return (
      <Box
        sx={{
          ml: { md: 0, lg: "var(--Sidebar-width)" },
          p: { xs: 1.5, md: 2 },
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <CircularProgress size="sm" />
        <Typography level="body-sm">Loading DPR details…</Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box
        sx={{
          ml: { md: 0, lg: "var(--Sidebar-width)" },
          p: { xs: 1.5, md: 2 },
        }}
      >
        <Typography color="danger">
          {error?.data?.message || "Failed to load DPR details."}
        </Typography>
      </Box>
    );
  }

  if (!dpr) {
    return (
      <Box
        sx={{
          ml: { md: 0, lg: "var(--Sidebar-width)" },
          p: { xs: 1.5, md: 2 },
        }}
      >
        <Typography color="danger">No DPR data found.</Typography>
      </Box>
    );
  }

  const ReportingAvatarGroup = ({ label, users, emptyText }) => {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography level="body-sm" sx={{ mb: 0.5 }}>
          {label}
        </Typography>

        {!users || users.length === 0 ? (
          <Typography level="body-xs" color="neutral">
            {emptyText}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              "& > *:not(:first-of-type)": {
                ml: -0.75, // overlap avatars
              },
            }}
          >
            {users.map((user) => {
              const name = user?.name || "User";

              return (
                <Tooltip key={user?._id || name} title={name}>
                  <Avatar
                    size="sm"
                    src={user?.attachment_url || undefined}
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: 11,
                      bgcolor: colorFromName(name),
                      border: "2px solid var(--joy-palette-background-body)",
                      cursor: "default",
                    }}
                  >
                    {initialsOf(name)}
                  </Avatar>
                </Tooltip>
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  // ⭐ NEW: helpers for status modal
  const STATUS_OPTIONS = [
    { label: "In progress", value: "in progress" },
    { label: "Work stopped", value: "work_stopped" },
    { label: "Idle", value: "idle" },
  ];

  const IDLE_REASONS_OPTIONS = [
    { label: "Material issues", value: "material_issues" },
    { label: "Manpower issues", value: "manpower_issues" },
    { label: "Local issues", value: "local_issues" },
    { label: "Rain or any other natural activities delay", value: "rain_or_natural_activities_delay" },
    { label: "Hold by client or by CAM team", value: "hold_by_client_or_cam_team" },
    {label:"Others",value:"others"}
  ]
  const openStatusModal = () => {
    setStatusError("");
    setStatusForm({
      todaysProgress: "",
      reasonForIdle: dpr?.current_status?.reason_for_idle || "",
      status:
        dpr?.current_status?.status &&
        STATUS_OPTIONS.find(
          (o) =>
            o.value.toLowerCase() === dpr.current_status.status.toLowerCase()
        )
          ? dpr.current_status.status
          : "in progress",
      remarks: "",
    });
    dpr?.current_status?.status === "idle" ? setIsStatusIdle(true) : setIsStatusIdle(false);
    setStatusModalOpen(true);
  };

  const handleStatusSave = async () => {
    let { todaysProgress, status: selectedStatus, remarks, reasonForIdle } = statusForm;
    const trimmedRemarks = (remarks || "").trim();

    if (reasonForIdle === "others" &&  selectedStatus === "idle") {
      todaysProgress = "0";
      if (!trimmedRemarks) {
        setStatusError(
          "Remarks are required when status is Idle and reason is Others."
        );
        return;
      }
    }

    const numericProg = Number(todaysProgress === "" ? "0" : todaysProgress);
    if (Number.isNaN(numericProg) || numericProg < 0) {
      setStatusError("Today's progress must be a non-negative number.");
      return;
    }

    setStatusError("");

    try {
      await updateDprStatus({
        id: dpr._id,
        todays_progress: String(numericProg),
        date: new Date().toISOString(),
        remarks: trimmedRemarks,
        reason_for_idle: reasonForIdle,
        status: selectedStatus,
      }).unwrap();

      setStatusModalOpen(false);
      setStatusForm({
        todaysProgress: "",
        status: "in progress",
        reasonForIdle: "",
        remarks: "",
      });
      refetch();
    } catch (err) {
      setStatusError(
        err?.data?.message ||
          err?.error ||
          "Failed to update status. Please try again."
      );
    }
  };

  const handleSubmitComment = async () => {
    const trimmed = commentText.trim();

    if (!trimmed && attachments.length === 0) {
      return;
    }

    try {
      const formData = new FormData();
      const payload = {
        comment: trimmed,
      };

      formData.append("data", JSON.stringify(payload));

      attachments.forEach((file) => {
        formData.append("files", file);
      });

      await updateDpr({
        id: dpr._id,
        data: formData,
      }).unwrap();

      setCommentText("");
      setAttachments([]);
      setOpenAttachModal(false);
      refetch();
      toast.success("Added Comment Successfully");
    } catch (err) {
      toast.error("Failed to add comment to DPR:", err);
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Box
      sx={{
        ml: { md: 0, lg: "var(--Sidebar-width)" },
        p: 0,
        bgcolor: "background.body",
      }}
    >
      {/* Row 1: project + DPR details */}
      <Grid container spacing={2} alignItems="stretch">
        {/* LEFT: PROJECT DETAILS ONLY */}
        <Grid xs={12} md={6}>
          <Sheet
            variant="outlined"
            sx={{
              height: "100%",
              borderRadius: "xl",
              bgcolor: "background.surface",
              p: { xs: 2, md: 2.5 },
              boxShadow: "sm",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography level="title-sm" sx={{ mb: 1.5 }}>
              Project Details
            </Typography>

            {/* Project header: code + name */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                mb: 1.5,
                gap: 1,
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ flexWrap: "wrap" }}
              >
                <Chip
                  size="sm"
                  variant="soft"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                >
                  {projectCode}
                </Chip>
                <Typography
                  level="body-sm"
                  color="neutral"
                  sx={{ wordBreak: "break-word" }}
                >
                  {projectName}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  alignSelf: { xs: "flex-start", sm: "center" },
                }}
              >
                <Chip
                  size="sm"
                  variant="soft"
                  color={statusColor(status)}
                  onClick={openStatusModal}
                  sx={{
                    fontWeight: 600,
                    textTransform: "capitalize",
                    cursor: "pointer",
                    maxWidth: { xs: "100%", sm: "none" },
                  }}
                >
                  {status?.replace("_", " ")}
                </Chip>
              </Stack>
            </Box>

            <Sheet
              variant="soft"
              sx={{
                borderRadius: "lg",
                bgcolor: "background.level1",
                p: 2,
              }}
            >
              <InfoRow label="Code">
                <Typography level="body-sm">{projectCode}</Typography>
              </InfoRow>

              <InfoRow label="Name">
                <Typography level="body-sm" sx={{ wordBreak: "break-word" }}>
                  {projectName}
                </Typography>
              </InfoRow>

              <InfoRow label="Capacity">
                <Chip size="sm" variant="soft" color="primary">
                  {projectKwp}
                </Chip>
              </InfoRow>
              <InfoRow label="District">
                <Typography level="body-sm">{projectDistrict}</Typography>
              </InfoRow>
              <InfoRow label="State">
                <Typography level="body-sm">{projectState}</Typography>
              </InfoRow>
            </Sheet>
          </Sheet>
        </Grid>

        {/* RIGHT: DPR DETAILS */}
        <Grid xs={12} md={6}>
          <Sheet
            variant="outlined"
            sx={{
              height: "100%",
              borderRadius: "xl",
              bgcolor: "background.surface",
              p: { xs: 2, md: 2.5 },
              boxShadow: "sm",
            }}
          >
            <Typography level="title-sm" sx={{ mb: 1.5 }}>
              DPR Details
            </Typography>

            {/* Top chips row: category + status + % complete */}
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              flexWrap="wrap"
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent={{ xs: "flex-start", md: "space-between" }}
              sx={{ mb: 1.5, gap: 1 }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                gap={1}
                flexWrap="wrap"
                sx={{ width: "100%" }}
              >
                <Chip
                  size="sm"
                  variant="soft"
                  color="primary"
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  Category:{" "}
                  <b style={{ marginLeft: 4, textTransform: "capitalize" }}>
                    {category}
                  </b>
                </Chip>

                <Tooltip title={activityName || ""} variant="plain">
                  <Chip
                    size="sm"
                    variant="soft"
                    color="warning"
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    Activity:{" "}
                    <b style={{ marginLeft: 4, textTransform: "capitalize" }}>
                      {displayActivityName}
                    </b>
                  </Chip>
                </Tooltip>

                <Chip
                  size="sm"
                  variant="soft"
                  color="neutral"
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  Work:{" "}
                  <b style={{ marginLeft: 4 }}>
                    {workValue} {workUnit}
                  </b>
                </Chip>

                <Chip
                  size="sm"
                  variant="soft"
                  color="success"
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  Completed: <b style={{ marginLeft: 4 }}>{completedSoFar}</b>
                </Chip>
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  ml: { md: "auto" },
                  mt: { xs: 1, md: 0 },
                  alignSelf: { xs: "flex-start", md: "center" },
                }}
              >
                <Typography level="body-sm">Created By:</Typography>
                <Tooltip title={createdBy} variant="plain">
                  <Avatar
                    src={createdByAvatar}
                    alt={initialsOf(createdBy)}
                    size="sm"
                  />
                </Tooltip>
              </Stack>
            </Stack>

            <Sheet
              variant="soft"
              sx={{
                borderRadius: "md",
                bgcolor: "background.level1",
                p: 2,
              }}
            >
              <Grid container spacing={2}>
                {/* Left column: basic DPR info */}
                <Grid xs={12} md={6}>
                  <InfoRow label="Unit">
                    <Typography level="body-sm">
                      {workUnit
                        ? workUnit.charAt(0).toUpperCase() + workUnit.slice(1)
                        : ""}
                    </Typography>
                  </InfoRow>

                  <InfoRow label="Value">
                    <Typography level="body-sm">{workValue}</Typography>
                  </InfoRow>

                  <InfoRow label="Planned Start">
                    <Typography level="body-sm">
                      {fmtDate(plannedStart)}
                    </Typography>
                  </InfoRow>

                  <InfoRow label="Actual Start">
                    <Typography level="body-sm">
                      {fmtDate(actualStart)}
                    </Typography>
                  </InfoRow>
                </Grid>

                {/* Right column: audit + people */}
                <Grid xs={12} md={6}>
                  <InfoRow label="Created At">
                    <Typography level="body-sm">
                      {fmtDateTime(createdAt)}
                    </Typography>
                  </InfoRow>
                  <InfoRow label="Last Updated">
                    <Typography level="body-sm">
                      {fmtDateTime(updatedAt)}
                    </Typography>
                  </InfoRow>
                  <InfoRow label="Planned Finish">
                    <Typography level="body-sm">
                      {fmtDate(plannedFinish)}
                    </Typography>
                  </InfoRow>
                  <InfoRow label="Actual Finish">
                    <Typography level="body-sm">
                      {fmtDate(actualFinish)}
                    </Typography>
                  </InfoRow>
                </Grid>
              </Grid>

              <Divider sx={{ my: 1.5 }} />

              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "flex-start" },
                  gap: 2,
                }}
              >
                <ReportingAvatarGroup
                  label="Secondary Reporting"
                  users={secondaryUsers}
                  emptyText="No secondary reporting users added."
                />

                <ReportingAvatarGroup
                  label="Primary Reporting"
                  users={primaryUsers}
                  emptyText="No primary reporting user added."
                />
              </Box>
            </Sheet>
          </Sheet>
        </Grid>
      </Grid>

      {/* Row 2: NOTES / ACTIVITY / DOCUMENTS */}
      <Box sx={{ mt: 2 }}>
        <Sheet
          variant="outlined"
          sx={{
            borderRadius: "xl",
            bgcolor: "background.surface",
            p: { xs: 2, md: 2.5 },
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            sx={{ mb: 1, gap: 1 }}
          >
            <Typography level="title-sm">Notes</Typography>
            <Chip
              size="sm"
              variant="soft"
              startDecorator={<TimelineRoundedIcon />}
              sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
            >
              {activity.length} activities
            </Chip>
          </Stack>

          <Tabs defaultValue="comments" sx={{ mb: 1 }}>
            <TabList
              sx={{
                overflowX: "auto",
                px: 0.5,
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              <Tab value="comments">Notes</Tab>
              <Tab value="docs">Documents</Tab>
            </TabList>

            {/* Comments / Activity Stream */}
            <TabPanel value="comments" sx={{ p: 0, pt: 1 }}>
              <CommentComposer
                value={commentText}
                onChange={setCommentText}
                onSubmit={handleSubmitComment}
                onCancel={() => {
                  setCommentText("");
                  setAttachments([]);
                }}
                onAttachClick={() => setOpenAttachModal(true)}
                attachments={attachments}
                onRemoveAttachment={handleRemoveAttachment}
                submitting={isUpdatingDpr}
              />

              <Typography level="title-sm" sx={{ mt: 1, mb: 1 }}>
                Activity Stream
              </Typography>
              <Box
                sx={{
                  maxHeight: 420,
                  overflow: "auto",
                  pr: 0.5,
                }}
              >
                {activity.length === 0 ? (
                  <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                    No activity yet.
                  </Typography>
                ) : (
                  activity.map((it, idx) => {
                    const user = toPerson(it.user || it.user_id || {});
                    const when = it.at ? new Date(it.at) : null;
                    const whenLabel = when
                      ? when.toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "—";

                    const isStatus = it._type === "status";
                    const statusLabel = cap(
                      (it.status || "-").replace("_", " ")
                    );

                    return (
                      <Box key={`act-${idx}`} sx={{ mb: 1.5 }}>
                        <Stack
                          direction="row"
                          alignItems="flex-start"
                          gap={1.25}
                        >
                          <Avatar
                            src={user.avatar || undefined}
                            variant={user.avatar ? "soft" : "solid"}
                            color={user.avatar ? "neutral" : user.color}
                            sx={{
                              width: 36,
                              height: 36,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {!user.avatar && initialsOf(user.name)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack
                              direction="row"
                              alignItems="baseline"
                              gap={1}
                              sx={{ flexWrap: "wrap" }}
                            >
                              <Typography
                                level="body-sm"
                                fontWeight="lg"
                                sx={{ whiteSpace: "nowrap" }}
                              >
                                {user.name}
                              </Typography>
                              <Typography
                                level="body-xs"
                                sx={{ color: "text.tertiary" }}
                              >
                                {whenLabel}
                              </Typography>
                            </Stack>

                            {it._type === "comment" && it?.html ? (
                              <div
                                style={{
                                  marginTop: 2,
                                  lineHeight: 1.66,
                                  wordBreak: "break-word",
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: DOMPurify.sanitize(it.html),
                                }}
                              />
                            ) : isStatus ? (
                              <Stack
                                direction="row"
                                alignItems="center"
                                gap={1}
                                sx={{ mt: 0.25, flexWrap: "wrap" }}
                              >
                                <Chip
                                  size="sm"
                                  variant="soft"
                                  color={statusColor(it.status)}
                                  sx={{ maxWidth: "100%" }}
                                >
                                  {statusLabel}
                                </Chip>
                                {it.todays_progress && (
                                  <Chip
                                    size="sm"
                                    variant="soft"
                                    color="primary"
                                  >
                                    Today: {it.todays_progress}{" "}
                                    {workUnit !== "-" ? workUnit : ""}
                                  </Chip>
                                )}
                                {it.remarks && (
                                  <Typography level="body-sm">
                                    {String(it.remarks).trim()}
                                  </Typography>
                                )}
                              </Stack>
                            ) : it._type === "file" ? (
                              <Typography level="body-sm" sx={{ mt: 0.25 }}>
                                {`Uploaded file: ${
                                  it?.attachment?.name || "Attachment"
                                }`}
                              </Typography>
                            ) : null}

                            {it._type === "file" && it.attachment ? (
                              <Box sx={{ mt: 0.75 }}>
                                <AttachmentGallery items={[it.attachment]} />
                              </Box>
                            ) : null}
                          </Box>
                        </Stack>
                        <Divider sx={{ mt: 1 }} />
                      </Box>
                    );
                  })
                )}
              </Box>
            </TabPanel>

            {/* Documents tab */}
            <TabPanel value="docs" sx={{ p: 0, pt: 1 }}>
              {documents.length === 0 ? (
                <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                  No documents yet.
                </Typography>
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    overflowX: "auto",
                  }}
                >
                  <Sheet
                    variant="soft"
                    sx={{
                      borderRadius: "md",
                      p: 1,
                      minWidth: { xs: 600, sm: 0 },
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 160px 210px 80px",
                        gap: 12,
                        px: 1,
                        py: 1,
                        borderBottom: "1px solid",
                        borderColor: "neutral.outlinedBorder",
                        fontWeight: 600,
                      }}
                    >
                      <Typography level="body-sm">Name</Typography>
                      <Typography level="body-sm">Type/Size</Typography>
                      <Typography level="body-sm">
                        Uploaded By / When
                      </Typography>
                      <Typography level="body-sm" sx={{ textAlign: "right" }} />
                    </Box>

                    {documents.map((a, i) => {
                      const name = a?.name || "Attachment";
                      const url = safeUrl(a?.url || "");
                      const typeOrExt = a?.type || fileExt(name).toUpperCase();
                      const size = a?.size ? formatBytes(a.size) : "";
                      const who = a?.user_id?.name || "—";
                      const when =
                        a?.updatedAt || a?.createdAt
                          ? new Date(
                              a.updatedAt || a.createdAt
                            ).toLocaleString()
                          : "";

                      return (
                        <Box
                          key={a?._id || `${url}-${i}`}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 160px 210px 80px",
                            gap: 12,
                            alignItems: "center",
                            px: 1,
                            py: 1,
                            borderBottom:
                              i === documents.length - 1 ? "none" : "1px solid",
                            borderColor: "neutral.outlinedBorder",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            gap={1}
                            sx={{ minWidth: 0 }}
                          >
                            <Box sx={{ fontSize: 22, opacity: 0.75 }}>
                              {iconFor(name, a?.type)}
                            </Box>
                            <Tooltip title={name}>
                              <Typography
                                level="body-sm"
                                sx={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: 420,
                                  fontWeight: 600,
                                }}
                              >
                                {name}
                              </Typography>
                            </Tooltip>
                          </Stack>

                          <Typography
                            level="body-sm"
                            sx={{ color: "text.tertiary" }}
                          >
                            {typeOrExt}
                            {size ? ` • ${size}` : ""}
                          </Typography>

                          <Typography
                            level="body-sm"
                            sx={{ color: "text.tertiary" }}
                          >
                            {who}
                            {when ? ` • ${when}` : ""}
                          </Typography>

                          <Box sx={{ textAlign: "right" }}>
                            <Tooltip title="Download">
                              <IconButton
                                className="dl"
                                size="sm"
                                variant="solid"
                                sx={{
                                  "--Icon-color": "#3366a3",
                                  opacity: 1,
                                  backgroundColor: "#eaf1fa",
                                  "&:hover": {
                                    backgroundColor: "#d0e2f7",
                                  },
                                }}
                                component="a"
                                href={url || "#"}
                                download={name}
                                disabled={!url}
                              >
                                <DownloadRoundedIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      );
                    })}
                  </Sheet>
                </Box>
              )}
            </TabPanel>
          </Tabs>
        </Sheet>
      </Box>

      {/* STATUS UPDATE MODAL */}
      <Modal
        open={statusModalOpen}
        onClose={() => !isUpdatingStatus && setStatusModalOpen(false)}
      >
        <ModalDialog sx={{ maxWidth: { xs: "100%", sm: 540 }, width: "100%", maxHeight:'100%', overflow:'auto' }}>
          <ModalClose disabled={isUpdatingStatus} />
          <Typography level="title-lg">Update Status</Typography>
          <Typography level="body-sm" sx={{ mb: 1, color: "text.tertiary" }}>
            Review current progress, then log today&apos;s status.
          </Typography>

          {/* Progress summary */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={1}
            flexWrap="wrap"
          >
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

          <Divider sx={{ my: 1 }} />

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
                  statusForm.status === "work_stopped" ||
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
                  setStatusForm((f) => ({ ...f, status: val || "in progress" }));
                  setIsStatusIdle(val === "idle");
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </FormControl>
            {isStatusIdle &&  <FormControl>
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
            </FormControl>}

            <FormControl>
              <FormLabel>
                Remarks
                {(statusForm.status === "idle" && 
                  statusForm.reasonForIdle === "others"
                  ) && (
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

            {statusError && (
              <Typography level="body-sm" color="danger">
                {statusError}
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

      {/* ATTACH FILES MODAL FOR COMMENTS ⭐ */}
      <Modal open={openAttachModal} onClose={() => setOpenAttachModal(false)}>
        <ModalDialog variant="outlined" sx={{ maxWidth: 560, mx: 1 }}>
          <DialogTitle>Attach file(s)</DialogTitle>
          <DialogContent>
            Give your document a name (optional), then drag files below or
            browse.
          </DialogContent>

          <Stack gap={1.25} sx={{ mt: 1 }}>
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={onDropFiles}
              onClick={() => filePickerRef.current?.click()}
              sx={{
                p: 3,
                borderRadius: "md",
                textAlign: "center",
                border: "2px dashed",
                borderColor: isDragging
                  ? "primary.outlinedBorder"
                  : "neutral.outlinedBorder",
                bgcolor: isDragging ? "primary.softBg" : "background.level1",
                cursor: "pointer",
                minHeight: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Stack
                direction="row"
                gap={1}
                alignItems="center"
                justifyContent="center"
                sx={{ flexWrap: "wrap" }}
              >
                <CloudUploadRoundedIcon />
                <Typography level="body-sm">
                  Drag & drop files here, or <strong>click to browse</strong>
                </Typography>
              </Stack>
            </Box>

            {/* 👇 ADD THIS HIDDEN INPUT */}
            <input
              ref={filePickerRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={handleFilesSelected}
            />

            {attachments.length > 0 && (
              <Stack gap={0.75}>
                <Typography level="body-sm">Pending attachments</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {attachments.map((f, i) => (
                    <Chip
                      key={`${f.name}-${i}`}
                      variant="soft"
                      size="sm"
                      clickable={false}
                      sx={{
                        "& .chip-close": { pointerEvents: "auto" },
                        maxWidth: "100%",
                      }}
                      endDecorator={
                        <IconButton
                          size="sm"
                          variant="plain"
                          className="chip-close"
                          aria-label="Remove"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAttachment(i);
                          }}
                        >
                          <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      {f.name}
                    </Chip>
                  ))}
                </Stack>
              </Stack>
            )}
          </Stack>

          <DialogActions>
            <Button
              size="sm"
              variant="outlined"
              onClick={() => setOpenAttachModal(false)}
              sx={{ color: "#3366a3", borderColor: "#3366a3" }}
            >
              Close
            </Button>
            <Button size="sm" onClick={() => setOpenAttachModal(false)}>
              Done
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
}

export default ViewDprInfo;
