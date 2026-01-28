// UserProfilePanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/joy/Box";
import Grid from "@mui/joy/Grid";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import Avatar from "@mui/joy/Avatar";
import Button from "@mui/joy/Button";
import IconButton from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import Textarea from "@mui/joy/Textarea";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Stack from "@mui/joy/Stack";
import Snackbar from "@mui/joy/Snackbar";
import Alert from "@mui/joy/Alert";
import Skeleton from "@mui/joy/Skeleton";
import Tooltip from "@mui/joy/Tooltip";
import Dropdown from "@mui/joy/Dropdown";
import Menu from "@mui/joy/Menu";
import MenuButton from "@mui/joy/MenuButton";
import MenuItem from "@mui/joy/MenuItem";
import Chip from "@mui/joy/Chip";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import dayjs from "dayjs";
import EditRounded from "@mui/icons-material/EditRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import CameraAltOutlined from "@mui/icons-material/CameraAltOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import CloudStatCard from "./All_Tasks/TaskDashboardCards";
import PlayCircleFilledRoundedIcon from "@mui/icons-material/PlayCircleFilledRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import DoNotDisturbOnRoundedIcon from "@mui/icons-material/DoNotDisturbOnRounded";
import InsertEmoticonOutlined from "@mui/icons-material/InsertEmoticonOutlined";
import {
  useGetUserByIdQuery,
  useEditUserMutation,
  useUpdateUserStatusMutation,
} from "../redux/loginSlice";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import { Mail, Phone } from "lucide-react";
import Calendar from "./calender";

/* ---------------- helpers / constants ---------------- */
const ALL_KEYS = ["name", "email", "phone", "department", "location", "about"];
const BASIC_EDIT_KEYS = ["phone", "location", "about"];
const DEPT_OPTIONS = ["SCM", "Engineering", "BD", "Accounts", "Operations"];

const pick = (obj, keys) =>
  keys.reduce((acc, k) => (k in obj ? { ...acc, [k]: obj[k] } : acc), {});

const diffEditable = (base = {}, curr = {}, keys = []) => {
  const out = {};
  keys.forEach((k) => {
    const a = base[k] ?? "";
    const b = curr[k] ?? "";
    if (String(a) !== String(b)) out[k] = b;
  });
  return out;
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

const LS_KEY = "userDetails";
const readUserFromLS = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeUserToLS = (next) =>
  localStorage.setItem(LS_KEY, JSON.stringify(next));

const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const EMOJI_CHOICES = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😘",
  "😎",
  "🤩",
  "🥳",
  "🙂",
  "😉",
  "😌",
  "😴",
  "🤔",
  "😅",
  "😭",
  "😤",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🔥",
  "✨",
  "🎉",
  "✅",
  "❌",
  "⭐",
  "📝",
];

const STATUS_COLOR_MAP = {
  working: "success",
  travelling: "primary",
  "on leave": "warning",
  idle: "neutral",
  work_stopped: "danger",
};

export default function UserProfilePanel() {
  const aboutRef = useRef(null);
  const caretRef = useRef({ start: null, end: null });
  const fileRef = useRef(null);
  const [searchParams] = useSearchParams();

  // status modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");
  const [statusRemarksDraft, setStatusRemarksDraft] = useState("");

  // RTK mutation
  const [updateUserStatus, { isLoading: isStatusUpdating }] =
    useUpdateUserStatusMutation();

  const saveCaret = () => {
    const el = aboutRef.current;
    if (el)
      caretRef.current = {
        start: el.selectionStart,
        end: el.selectionEnd,
      };
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    color: "success",
    msg: "",
  });
  const [apiError, setApiError] = useState("");

  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    site_role: "",
    location: "",
    about: "",
    avatar_url: "",
    statusSummary: {
      idle: 0,
      work_stopped_days: 0,
      leave_days: 0,
      travelling_days: 0,
    },
    current_status: {
      status: "",
      updated_at: "",
      remarks: "",
    },
  });

  const [baselineForm, setBaselineForm] = useState(null);

  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingAvatarRemove, setPendingAvatarRemove] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const ls = readUserFromLS();
  const myId =
    ls?.userID || ls?.userId || ls?._id || ls?.id || ls?.emp_id || "";
  const viewingIdParam = searchParams.get("user_id") || "";
  const isOwnProfile =
    !viewingIdParam || String(viewingIdParam) === String(myId);
  const effectiveUserId = isOwnProfile ? myId : viewingIdParam;

  const {
    data,
    isLoading: isUserLoading,
    isFetching: isUserFetching,
    error: fetchError,
  } = useGetUserByIdQuery(effectiveUserId, { skip: !effectiveUserId });

  const [editUser] = useEditUserMutation();

  // Projects tab vs Personal tab
  const [projectTab, setProjectTab] = useState("personal");

  useEffect(() => {
    setApiError("");
    if (isOwnProfile) {
      const cache = readUserFromLS();
      if (cache) {
        const prefill = {
          name: cache.name || "",
          email: cache.email || "",
          phone: String(cache.phone ?? ""),
          department: cache.department || "",
          site_role: cache.site_role || "",
          location: cache.location || "",
          about: cache.about || "",
          avatar_url: cache.avatar_url || cache.attachment_url || "",
        };
        setForm(prefill);
        setBaselineForm(prefill);
        setUser(cache);
      }
    }
    setLoading(false);
  }, [isOwnProfile]);

  useEffect(() => {
    if (data?.user) {
      const u = data.user;
      const initial = {
        name: u.name || "",
        email: u.email || "",
        phone: String(u.phone ?? ""),
        department: u.department || "",
        site_role: u.site_role || "",
        location: u.location || "",
        about: u.about || "",
        avatar_url: u.attachment_url || "",
        statusSummary: {
          idle: u.statusSummary?.idle || 0,
          work_stopped_days: u.statusSummary?.work_stopped_days || 0,
          leave_days: u.statusSummary?.leave_days || 0,
          travelling_days: u.statusSummary?.travelling_days || 0,
        },
        current_status: {
          status: u.current_status?.status || "",
          updated_at: u.current_status?.updated_at || "",
          remarks: u.current_status?.remarks || "",
        },
      };
      setForm(initial);
      setBaselineForm(initial);
      setUser(u);

      if (isOwnProfile) {
        writeUserToLS({
          name: initial.name,
          email: initial.email,
          phone: initial.phone,
          emp_id: u.emp_id || "",
          site_role: u.site_role || "",
          department: initial.department,
          userID: u._id || myId,
          location: initial.location,
          about: initial.about,
          attachment_url: initial.avatar_url,
          avatar_url: initial.avatar_url,
        });
      }
    } else if (fetchError) {
      setApiError(
        fetchError?.data?.message ||
          (isOwnProfile
            ? "Live profile could not be fetched. Showing cached profile from this device."
            : "This profile could not be fetched right now.")
      );
    }
  }, [data, fetchError, isOwnProfile, myId]);

  const iAmAdmin = !!(
    ls?.permissions?.profile_full_edit ||
    ls?.profile_full_edit ||
    (typeof ls?.role === "string" && ls.role.toLowerCase() === "admin")
  );
  const canEditAll = isOwnProfile && iAmAdmin;
  const editableKeys = useMemo(
    () => (isOwnProfile ? (canEditAll ? ALL_KEYS : BASIC_EDIT_KEYS) : []),
    [isOwnProfile, canEditAll]
  );

  const isFieldEditable = (key) =>
    isOwnProfile ? (canEditAll ? true : BASIC_EDIT_KEYS.includes(key)) : false;

  const hasEditableChanges = useMemo(() => {
    if (!baselineForm) return false;
    if (!isOwnProfile) return false;
    const a = JSON.stringify(pick(form, editableKeys));
    const b = JSON.stringify(pick(baselineForm, editableKeys));
    return a !== b;
  }, [form, baselineForm, editableKeys, isOwnProfile]);

  const hasAvatarChange =
    isOwnProfile && (!!pendingAvatarFile || pendingAvatarRemove);

  const handleField = (key) => (e, val) => {
    const value = e?.target ? e.target.value : val;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleAvatarClick = () => {
    if (!isOwnProfile) return;
    fileRef.current?.click();
  };

  const handleAvatarSelect = async (file) => {
    if (!isOwnProfile) {
      setToast({
        open: true,
        color: "warning",
        msg: "You can only change your own photo.",
      });
      return;
    }
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setToast({
        open: true,
        color: "warning",
        msg: "Please choose an image file.",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({
        open: true,
        color: "warning",
        msg: "Please upload an image ≤ 5MB.",
      });
      return;
    }
    const dataUrl = await fileToDataURL(file);
    setPendingAvatarFile(file);
    setPendingAvatarRemove(false);
    setAvatarPreview(dataUrl);
  };

  const markRemoveAvatar = () => {
    if (!isOwnProfile) return;
    setPendingAvatarFile(null);
    setPendingAvatarRemove(true);
    setAvatarPreview("");
    setForm((f) => ({ ...f, avatar_url: "" }));
  };

  const saveProfile = async () => {
    if (!isOwnProfile) {
      setToast({
        open: true,
        color: "warning",
        msg: "You can only edit your own profile.",
      });
      return;
    }
    if (!hasEditableChanges && !hasAvatarChange) return;
    setSaving(true);
    setApiError("");

    const currentLS = readUserFromLS();
    const userId = currentLS?.userID || user?._id || myId;

    try {
      if (!userId) throw new Error("No user id to update.");

      const changed = diffEditable(baselineForm, form, editableKeys);
      let resp;

      if (pendingAvatarFile) {
        const fd = new FormData();
        fd.append("data", JSON.stringify(changed));
        fd.append("avatar", pendingAvatarFile);
        resp = await editUser({ userId, body: fd }).unwrap();
      } else if (pendingAvatarRemove) {
        const body = { ...changed, attachment_url: "" };
        resp = await editUser({ userId, body }).unwrap();
      } else if (Object.keys(changed).length > 0) {
        resp = await editUser({ userId, body: changed }).unwrap();
      }

      const updatedUser = resp?.user || {};
      const serverAvatar = updatedUser.attachment_url ?? form.avatar_url;

      const nextBaseline = {
        ...baselineForm,
        ...changed,
        avatar_url: pendingAvatarRemove ? "" : serverAvatar,
      };
      setBaselineForm(nextBaseline);
      setForm((f) => ({ ...nextBaseline }));

      if (isOwnProfile) {
        writeUserToLS({
          ...(readUserFromLS() || {}),
          ...nextBaseline,
          userID: userId,
          attachment_url: nextBaseline.avatar_url,
          avatar_url: nextBaseline.avatar_url,
        });
      }

      setPendingAvatarFile(null);
      setPendingAvatarRemove(false);
      setAvatarPreview("");

      setToast({
        open: true,
        color: "success",
        msg: "Profile updated successfully.",
      });
    } catch (err) {
      setApiError(
        err?.data?.message || err?.message || "Failed to save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const openStatusModal = () => {
    if (!isOwnProfile && !iAmAdmin) return;

    setStatusDraft(form.current_status?.status || "working");
    setStatusRemarksDraft(form.current_status?.remarks || "");
    setStatusModalOpen(true);
  };

  const handleStatusSave = async () => {
    if (!effectiveUserId || !statusDraft) return;

    try {
      await updateUserStatus({
        userId: effectiveUserId,
        status: statusDraft,
        remarks: statusRemarksDraft.trim(),
      }).unwrap();

      const updatedStatus = {
        status: statusDraft,
        updated_at: new Date().toISOString(),
        remarks: statusRemarksDraft.trim(),
      };

      setForm((prev) => ({
        ...prev,
        current_status: updatedStatus,
      }));

      if (isOwnProfile) {
        const cached = readUserFromLS() || {};
        writeUserToLS({
          ...cached,
          current_status: updatedStatus,
        });
      }

      setStatusModalOpen(false);
      setToast({
        open: true,
        color: "success",
        msg: "Status updated.",
      });
    } catch (err) {
      setToast({
        open: true,
        color: "danger",
        msg:
          err?.data?.message ||
          err?.error ||
          "Failed to update status. Please try again.",
      });
    }
  };

  const insertEmoji = (emoji) => {
    const el = aboutRef.current;

    if (!el) {
      setForm((f) => ({ ...f, about: (f.about || "") + emoji }));
      return;
    }

    el.focus();

    const currentVal = el.value || "";
    const saved = caretRef.current || {};
    const s = Number.isInteger(saved.start)
      ? saved.start
      : el.selectionStart ?? currentVal.length;
    const e = Number.isInteger(saved.end) ? saved.end : el.selectionEnd ?? s;

    if (typeof el.setSelectionRange === "function") el.setSelectionRange(s, e);

    if (typeof el.setRangeText === "function") {
      el.setRangeText(emoji, s, e, "end");
      setForm((f) => ({ ...f, about: el.value }));
      const newPos = el.selectionStart ?? s + emoji.length;
      caretRef.current = { start: newPos, end: newPos };
    } else {
      const next = currentVal.slice(0, s) + emoji + currentVal.slice(e);
      setForm((f) => ({ ...f, about: next }));
      requestAnimationFrame(() => {
        const newPos = s + emoji.length;
        el.focus();
        el.setSelectionRange(newPos, newPos);
        caretRef.current = { start: newPos, end: newPos };
      });
    }
  };

  const displayedAvatar = avatarPreview || form.avatar_url || "";
  const openPreview = () => displayedAvatar && setPreviewOpen(true);

  const showSkeleton = loading || isUserLoading || isUserFetching;
  if (showSkeleton) {
    return (
      <Grid container spacing={2}>
        <Grid xs={12} md={5}>
          <Sheet variant="soft" sx={{ p: 2, borderRadius: "lg" }}>
            <Stack spacing={2} alignItems="center">
              <Skeleton variant="circular" width={120} height={120} />
              <Skeleton width="60%" />
              <Skeleton width="40%" />
              <Divider />
              <Skeleton width="100%" height={36} />
              <Skeleton width="100%" height={36} />
            </Stack>
          </Sheet>
        </Grid>
        <Grid xs={12} md={7}>
          <Sheet variant="outlined" sx={{ p: 2, borderRadius: "lg" }}>
            <Skeleton width="30%" />
            <Skeleton width="100%" height={48} />
            <Skeleton width="100%" height={48} />
            <Skeleton width="100%" height={96} />
          </Sheet>
        </Grid>
      </Grid>
    );
  }

  const deptInList = form.department && DEPT_OPTIONS.includes(form.department);

  const AbsenceTile = ({ label, used }) => (
    <Sheet
      variant="soft"
      sx={{
        flex: 1,
        px: 1.3,
        py: 0.9,
        borderRadius: "lg",
        overflow: "hidden",
        bgcolor: "#fff",
        border: "1px solid rgba(225, 227, 233, 0.88)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Box
        sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}
      >
        <Typography
          level="body-xs"
          sx={{ color: "text.tertiary", mb: 0.25, letterSpacing: 0.2 }}
        >
          {label}
        </Typography>
        <Typography level="body-sm" sx={{ fontWeight: 600 }}>
          {used}
        </Typography>
      </Box>
    </Sheet>
  );

  return (
    <Box sx={{ ml: { md: "0px", lg: "var(--Sidebar-width)" } }}>
      {!!apiError && (
        <Alert color="danger" variant="soft" sx={{ mb: 2 }}>
          {apiError}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        {/* LEFT: profile card */}
        <Grid xs={12} md={3} sx={{ display: "flex" }}>
          <Sheet
            variant="outlined"
            sx={{
              flex: 1,
              height: "100%",
              minHeight: { md: 520, lg: 600 },
              p: 0,
              borderRadius: "xl",
              overflow: "hidden",
              boxShadow: "sm",
              bgcolor: "background.surface",
            }}
          >
            {/* Header row */}
            <Box
              sx={{
                px: 3,
                pt: 2,
                pb: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              {/* Avatar */}
              <Box sx={{ position: "relative" }}>
                <Avatar
                  variant="soft"
                  src={displayedAvatar || undefined}
                  onClick={openPreview}
                  title={displayedAvatar ? "Click to preview" : ""}
                  sx={{
                    width: 104,
                    height: 104,
                    fontSize: 36,
                    cursor: displayedAvatar ? "zoom-in" : "default",
                    boxShadow: "md",
                    border: "2px solid var(--joy-palette-neutral-200)",
                  }}
                >
                  {form.name?.[0]?.toUpperCase() || "U"}
                </Avatar>

                {!!hasAvatarChange && (
                  <Chip
                    size="sm"
                    variant="soft"
                    color="warning"
                    sx={{
                      position: "absolute",
                      left: 0,
                      bottom: -10,
                      boxShadow: "sm",
                    }}
                  >
                    Unsaved photo
                  </Chip>
                )}

                <Tooltip title={isOwnProfile ? "Change photo" : "Read-only"}>
                  <span>
                    <IconButton
                      size="sm"
                      variant="solid"
                      color="neutral"
                      onClick={handleAvatarClick}
                      disabled={!isOwnProfile}
                      sx={{
                        position: "absolute",
                        right: -6,
                        bottom: -6,
                        borderRadius: "50%",
                        boxShadow: "md",
                      }}
                    >
                      <CameraAltOutlined />
                    </IconButton>
                  </span>
                </Tooltip>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleAvatarSelect(e.target.files?.[0])}
                />
              </Box>

              {/* Name + Email + Chips */}
              <Box
                sx={{
                  minWidth: 0,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 0.5,
                }}
              >
                <Typography level="title-lg" sx={{ lineHeight: 1.15 }} noWrap>
                  {form.name || "Unnamed User"}
                </Typography>
                <Box display={"flex"} alignItems={"center"} gap={1}>
                  <Mail size={14} />
                  <Typography
                    level="body-sm"
                    color="neutral"
                    sx={{
                      lineHeight: 1.1,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      maxWidth: "100%",
                    }}
                    title={form.email}
                  >
                    {form.email}
                  </Typography>
                </Box>

                <Box display={"flex"} alignItems={"center"} gap={1}>
                  <Phone size={14} />
                  <Typography
                    level="body-sm"
                    color="neutral"
                    sx={{
                      lineHeight: 1.1,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      maxWidth: "100%",
                    }}
                    title={form.phone}
                  >
                    {form.phone}
                  </Typography>
                </Box>

                <Stack direction="row" gap={1} sx={{ mt: 1 }}>
                  {!!form.department && (
                    <Chip
                      size="sm"
                      variant="soft"
                      color="primary"
                      sx={{ textTransform: "capitalize" }}
                    >
                      {form.department}
                    </Chip>
                  )}
                  {!!form.location && (
                    <Chip size="sm" variant="soft" color="neutral">
                      {form.location}
                    </Chip>
                  )}
                </Stack>
              </Box>

              {/* edit menu */}
              <Dropdown>
                <MenuButton
                  disabled={!isOwnProfile}
                  slots={{ root: IconButton }}
                  slotProps={{
                    root: {
                      variant: "plain",
                      color: "neutral",
                      size: "sm",
                      sx: { p: 0.25, "& svg": { fontSize: 18 } },
                    },
                  }}
                  aria-label="Edit photo"
                  title="Edit photo"
                >
                  <EditRounded />
                </MenuButton>
                <Menu placement="bottom-end">
                  <MenuItem
                    onClick={handleAvatarClick}
                    disabled={!isOwnProfile}
                  >
                    <UploadFileOutlined
                      fontSize="small"
                      style={{ marginRight: 8 }}
                    />
                    Choose new photo
                  </MenuItem>
                  <MenuItem
                    onClick={markRemoveAvatar}
                    disabled={
                      !isOwnProfile || (!form.avatar_url && !avatarPreview)
                    }
                  >
                    <DeleteOutline
                      fontSize="small"
                      style={{ marginRight: 8 }}
                    />
                    Remove photo
                  </MenuItem>
                </Menu>
              </Dropdown>
            </Box>

            <Divider />

            {/* Basic Information */}
            <Box sx={{ p: 2 }}>
              <Box>
                {/* Header */}
                <Typography
                  level="title-sm"
                  sx={{
                    mb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "text.secondary",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "999px",
                      border: "1px solid var(--joy-palette-neutral-400)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 0 1px rgba(15,23,42,0.06)",
                    }}
                  >
                    <PersonOutlineRoundedIcon sx={{ fontSize: 16 }} />
                  </Box>
                  Status summary
                </Typography>

                {/* Content */}
                {form?.current_status ? (
                  <Stack spacing={1.25}>
                    {/* Status row */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ gap: 1 }}
                    >
                      <Typography level="body-sm" color="neutral">
                        Status
                      </Typography>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={
                          STATUS_COLOR_MAP[form.current_status.status] ||
                          "neutral"
                        }
                        onClick={
                          isOwnProfile || iAmAdmin ? openStatusModal : undefined
                        }
                        sx={{
                          textTransform: "capitalize",
                          fontWeight: 600,
                          cursor:
                            isOwnProfile || iAmAdmin ? "pointer" : "default",
                        }}
                      >
                        {form.current_status.status?.replace("_", " ") || "N/A"}
                      </Chip>
                    </Stack>

                    {/* Last updated */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ gap: 1 }}
                    >
                      <Typography level="body-sm" color="neutral">
                        Last updated
                      </Typography>
                      <Typography level="body-sm" sx={{ fontWeight: 500 }}>
                        {form.current_status.updated_at
                          ? dayjs(form.current_status.updated_at).format(
                              "DD MMM YYYY, HH:mm"
                            )
                          : "N/A"}
                      </Typography>
                    </Stack>

                    {/* Remarks */}
                    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                      <Typography level="body-xs" color="neutral">
                        Remarks
                      </Typography>
                      <Typography
                        level="body-sm"
                        sx={{
                          p: 1,
                          borderRadius: "md",
                          bgcolor: "background.body",
                          border:
                            "1px dashed var(--joy-palette-neutral-outlinedBorder)",
                          minHeight: 32,
                        }}
                      >
                        {form.current_status.remarks || "No remarks added."}
                      </Typography>
                    </Stack>
                  </Stack>
                ) : (
                  <Typography level="body-sm" color="neutral">
                    No status recorded yet.
                  </Typography>
                )}
              </Box>

              <Box sx={{ mt: 1 }}>
                <Typography
                  level="title-sm"
                  sx={{
                    mb: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    color: "text.secondary",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "999px",
                      border: "1px solid var(--joy-palette-neutral-400)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    👤
                  </Box>
                  Absences
                </Typography>

                <Stack gap={1}>
                  <Stack direction="row" gap={1.2}>
                    <AbsenceTile
                      label="idle Days"
                      used={form.statusSummary?.idle_days}
                    />
                    <AbsenceTile
                      label="Work Stopped"
                      used={form.statusSummary?.work_stopped_days}
                    />
                  </Stack>
                  <Stack direction="row" gap={1.2}>
                    <AbsenceTile
                      label="Leave"
                      used={form.statusSummary?.leave_days}
                    />
                    <AbsenceTile
                      label="Travelling"
                      used={form.statusSummary?.travelling_days}
                    />
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Sheet>
        </Grid>

        {/* RIGHT: Tabs + content */}
        <Grid xs={12} md={9} sx={{ display: "flex" }}>
          <Sheet
            variant="outlined"
            sx={{
              borderRadius: "xl",
              p: 2,
              flex: 1,
              boxShadow: "sm",
              bgcolor:
                projectTab === "projects" ? "#ffffff" : "background.surface",
            }}
          >
            {/* Tabs */}
            <Stack direction="row" gap={1} sx={{ mb: 1 }}>
              <Chip
                size="sm"
                variant={projectTab === "personal" ? "solid" : "soft"}
                color="primary"
                onClick={() => setProjectTab("personal")}
                sx={{ cursor: "pointer" }}
              >
                Personal Information
              </Chip>

              <Chip
                size="sm"
                variant={projectTab === "projects" ? "solid" : "soft"}
                color="primary"
                onClick={() => setProjectTab("projects")}
                sx={{ cursor: "pointer" }}
              >
                Projects
              </Chip>
            </Stack>

            {/* PERSONAL TAB */}
            {projectTab === "personal" && (
              <>
                {/* Identity */}
                <Sheet
                  variant="soft"
                  sx={{
                    p: 2,
                    borderRadius: "lg",
                    bgcolor: "background.level1",
                    mb: 1.5,
                  }}
                >
                  <Typography
                    level="title-sm"
                    sx={{ mb: 1, color: "text.tertiary" }}
                  >
                    Identity
                  </Typography>

                  <Grid container spacing={1.25}>
                    <Grid xs={12} md={6}>
                      <FormControl>
                        <FormLabel>Name</FormLabel>
                        <Input
                          value={form.name}
                          onChange={handleField("name")}
                          placeholder="Enter full name"
                          disabled={!isFieldEditable("name")}
                        />
                      </FormControl>
                    </Grid>

                    <Grid xs={12} md={6}>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                          value={form.email}
                          onChange={handleField("email")}
                          type="email"
                          placeholder="name@company.com"
                          disabled={!isFieldEditable("email")}
                        />
                      </FormControl>
                    </Grid>

                    <Grid xs={12} md={6}>
                      <FormControl>
                        <FormLabel>Phone</FormLabel>
                        <Input
                          value={form.phone}
                          onChange={handleField("phone")}
                          placeholder="+91 98765 43210"
                          disabled={!isFieldEditable("phone")}
                        />
                      </FormControl>
                    </Grid>
                    <Grid xs={12} md={6}>
                      <FormControl>
                        <FormLabel>Department</FormLabel>
                        <Select
                          value={form.department || null}
                          onChange={handleField("department")}
                          placeholder="Select department"
                          disabled={!isFieldEditable("department")}
                          slotProps={{
                            button: { sx: { textTransform: "capitalize" } },
                          }}
                        >
                          {!deptInList && form.department && (
                            <Option
                              value={form.department}
                              sx={{ textTransform: "capitalize" }}
                            >
                              {form.department}
                            </Option>
                          )}
                          {DEPT_OPTIONS.map((d) => (
                            <Option
                              key={d}
                              value={d}
                              sx={{ textTransform: "capitalize" }}
                            >
                              {d}
                            </Option>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Sheet>

                {/* Work & Location */}
                <Sheet
                  variant="soft"
                  sx={{
                    p: 2,
                    borderRadius: "lg",
                    bgcolor: "background.level1",
                    mb: 1.5,
                  }}
                >
                  <Typography
                    level="title-sm"
                    sx={{ mb: 1, color: "text.tertiary" }}
                  >
                    Work & Location
                  </Typography>

                  <Grid container spacing={1.25}>
                    <Grid xs={12} md={6}>
                      <FormControl>
                        <FormLabel>Site Role</FormLabel>
                        <Input
                          value={form.site_role}
                          placeholder="Site Role"
                          disabled // ✅ typically role should be read-only
                        />
                      </FormControl>
                    </Grid>

                    <Grid xs={12} md={6}>
                      <FormControl>
                        <FormLabel>Location</FormLabel>
                        <Input
                          value={form.location}
                          onChange={handleField("location")}
                          placeholder="City, State"
                          disabled={!isFieldEditable("location")}
                        />
                      </FormControl>
                    </Grid>
                  </Grid>
                </Sheet>

                {/* About + Emoji picker */}
                <Sheet
                  variant="soft"
                  sx={{
                    p: 2,
                    borderRadius: "lg",
                    bgcolor: "background.level1",
                  }}
                >
                  <Typography
                    level="title-sm"
                    sx={{ mb: 1, color: "text.tertiary" }}
                  >
                    About
                  </Typography>
                  <FormControl>
                    <Textarea
                      minRows={3}
                      value={form.about}
                      onChange={handleField("about")}
                      placeholder="Short bio / responsibilities…"
                      disabled={!isFieldEditable("about")}
                      slotProps={{
                        textarea: {
                          ref: aboutRef,
                          onSelect: saveCaret,
                          onKeyUp: saveCaret,
                          onClick: saveCaret,
                          onBlur: saveCaret,
                        },
                      }}
                      endDecorator={
                        <Box
                          sx={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <Dropdown>
                            <MenuButton
                              slots={{ root: IconButton }}
                              slotProps={{
                                root: {
                                  variant: "plain",
                                  size: "sm",
                                  onMouseDown: (e) => {
                                    e.preventDefault();
                                    saveCaret();
                                  },
                                },
                              }}
                              disabled={!isFieldEditable("about")}
                              title="Insert emoji"
                              aria-label="Insert emoji"
                            >
                              <InsertEmoticonOutlined />
                            </MenuButton>

                            <Menu
                              placement="top-end"
                              sx={{ p: 1, maxWidth: 280 }}
                            >
                              <Box
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(8, 1fr)",
                                  gap: 0.5,
                                  fontSize: 20,
                                  lineHeight: 1,
                                }}
                              >
                                {EMOJI_CHOICES.map((e) => (
                                  <IconButton
                                    key={e}
                                    variant="soft"
                                    size="sm"
                                    onClick={() => insertEmoji(e)}
                                    sx={{ p: 0.25 }}
                                  >
                                    {e}
                                  </IconButton>
                                ))}
                              </Box>
                            </Menu>
                          </Dropdown>
                        </Box>
                      }
                    />
                  </FormControl>
                </Sheet>

                {/* Save button */}
                <Stack direction="row" gap={1} sx={{ mt: 1.5 }}>
                  <Button
                    loading={saving}
                    startDecorator={<SaveRounded />}
                    onClick={saveProfile}
                    disabled={
                      saving ||
                      !isOwnProfile ||
                      (!hasEditableChanges && !hasAvatarChange)
                    }
                    sx={{ minWidth: 140 }}
                  >
                    Save changes
                  </Button>
                </Stack>
              </>
            )}

            {/* PROJECTS TAB */}
            {projectTab === "projects" && (
              <Box sx={{ mt: 1 }}>
                {/* Stat cards */}
                <Grid container spacing={2}>
                  <Grid xs={12} md={4}>
                    <CloudStatCard
                      loading={false}
                      value={0}
                      title="Activities Completed"
                      subtitle="Total projects linked to this user"
                      accent="#4ade80"
                      illustration={
                        <IconBadge
                          icon={<TaskAltRoundedIcon fontSize="small" />}
                          color="#15803d"
                          bg="#dcfce7"
                        />
                      }
                      onAction={() => {}}
                    />
                  </Grid>

                  <Grid xs={12} md={4}>
                    <CloudStatCard
                      loading={false}
                      value={0}
                      title="Activities Ongoing"
                      subtitle="Currently in progress"
                      accent="#60a5fa"
                      illustration={
                        <IconBadge
                          icon={
                            <PlayCircleFilledRoundedIcon fontSize="small" />
                          }
                          color="#1d4ed8"
                          bg="#dbeafe"
                        />
                      }
                      onAction={() => {}}
                    />
                  </Grid>

                  <Grid xs={12} md={4}>
                    <CloudStatCard
                      loading={false}
                      value={0}
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
                      onAction={() => {}}
                    />
                  </Grid>
                </Grid>

                {/* Calendar view (separate component) */}
                <Calendar />
              </Box>
            )}
          </Sheet>
        </Grid>
      </Grid>

      {/* Image Preview Modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <ModalDialog
          aria-labelledby="avatar-preview-title"
          sx={{
            p: 0,
            overflow: "hidden",
            maxWidth: "min(92vw, 900px)",
            bgcolor: "neutral.softBg",
          }}
        >
          <ModalClose />
          {displayedAvatar ? (
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: "100%",
                height: "100%",
                p: 2,
                bgcolor: "background.surface",
              }}
            >
              <img
                src={displayedAvatar}
                alt="Profile photo"
                style={{
                  maxWidth: "88vw",
                  maxHeight: "82vh",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Box>
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography id="avatar-preview-title" level="title-md">
                No image available
              </Typography>
            </Box>
          )}
        </ModalDialog>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        open={statusModalOpen}
        onClose={() => {
          if (!isStatusUpdating) setStatusModalOpen(false);
        }}
      >
        <ModalDialog
          aria-labelledby="status-modal-title"
          sx={{ maxWidth: 420, width: "100%" }}
        >
          <ModalClose disabled={isStatusUpdating} />
          <Typography id="status-modal-title" level="title-lg" sx={{ mb: 1 }}>
            Update status
          </Typography>
          <Typography level="body-sm" color="neutral" sx={{ mb: 1.5 }}>
            Choose a new status and optionally add a note.
          </Typography>

          <Stack spacing={1.75}>
            {/* Status options */}
            <Box>
              <Typography
                level="body-xs"
                sx={{
                  mb: 0.75,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: "text.tertiary",
                }}
              >
                Status
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {Object.keys(STATUS_COLOR_MAP).map((key) => (
                  <Chip
                    key={key}
                    size="sm"
                    variant={statusDraft === key ? "solid" : "soft"}
                    color={STATUS_COLOR_MAP[key] || "neutral"}
                    onClick={() => setStatusDraft(key)}
                    sx={{
                      textTransform: "capitalize",
                      cursor: "pointer",
                    }}
                  >
                    {key.replace("_", " ")}
                  </Chip>
                ))}
              </Stack>
            </Box>

            {/* Remarks input */}
            <FormControl>
              <FormLabel>Remarks</FormLabel>
              <Textarea
                minRows={3}
                value={statusRemarksDraft}
                onChange={(e) => setStatusRemarksDraft(e.target.value)}
                placeholder="Reason / context for this change…"
              />
            </FormControl>

            {/* Actions */}
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
                disabled={isStatusUpdating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="solid"
                onClick={handleStatusSave}
                loading={isStatusUpdating}
                disabled={!statusDraft}
              >
                Update status
              </Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>

      <Snackbar
        open={toast.open}
        color={toast.color}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {toast.msg}
      </Snackbar>
    </Box>
  );
}