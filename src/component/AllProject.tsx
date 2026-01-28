import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import FormControl from "@mui/joy/FormControl";
import IconButton, { iconButtonClasses } from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import Sheet from "@mui/joy/Sheet";
import Tooltip from "@mui/joy/Tooltip";
import Typography from "@mui/joy/Typography";
import Chip from "@mui/joy/Chip";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import DialogTitle from "@mui/joy/DialogTitle";
import DialogContent from "@mui/joy/DialogContent";
import DialogActions from "@mui/joy/DialogActions";
import Textarea from "@mui/joy/Textarea";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import CircularProgress from "@mui/joy/CircularProgress";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";

import NoData from "../assets/alert-bell.svg";
import { useTheme } from "@emotion/react";
import {
  useGetAllProjectsQuery,
  useUpdateProjectStatusMutation,
} from "../redux/projectsSlice";
import { toast } from "react-toastify";
import { Avatar, Divider, LinearProgress, Stack } from "@mui/joy";
import { PlusIcon } from "lucide-react";


const formatDateGB = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function AllProjects({ setSelectedExport, clearSelectionToken }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const toInputDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

const formatDatePretty = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }); // ✅ 24 Dec 2025
};


  // ======== URL-backed state (persisted) ========
  const pageFromUrl = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10)
  );
  const pageSizeFromUrl = Math.max(
    1,
    parseInt(searchParams.get("pageSize") || "10", 10)
  );
  const tabFromUrl = searchParams.get("tab") || "All";
  const searchFromUrl = searchParams.get("search") || "";

  const commissionedFromUrl = searchParams.get("commissioned_from") || "";
const commissionedToUrl = searchParams.get("commissioned_to") || "";


  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [rowsPerPage, setRowsPerPage] = useState(pageSizeFromUrl);
  const [selectedTab, setSelectedTab] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [state, setState] = useState("");
  const [dcr, setDcr] = useState("");
  const [spoc, setSpoc] = useState("");

  const [commissionedFrom, setCommissionedFrom] = useState(commissionedFromUrl);
const [commissionedTo, setCommissionedTo] = useState(commissionedToUrl);


  // keep local state in sync when user navigates with back/forward
  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const ps = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10));
    const t = searchParams.get("tab") || "All";
    const s = searchParams.get("search") || "";
    const st = searchParams.get("state") || "";
    const d = searchParams.get("dcr") || "";
    const sp = searchParams.get("spoc") || "";
    const cf = searchParams.get("commissioned_from") || "";
const ct = searchParams.get("commissioned_to") || "";
    setCurrentPage(p);
    setRowsPerPage(ps);
    setSelectedTab(t);
    setSearchQuery(s);
    setState(st);
    setDcr(d);
    setSpoc(sp);
    setCommissionedFrom(cf);
setCommissionedTo(ct);
  }, [searchParams]);

  // ======== selection state (local) ========
  const [selected, setSelected] = useState([]);
  // ✅ RESET SELECTION when parent (ProjectManagement) says "clear"
  useEffect(() => {
    setSelected([]);
    setSelectedExport([]);
  }, [clearSelectionToken]);

  const options = [1, 5, 10, 20, 50, 100];

  // map UI tab -> backend status
  const statusFilter = useMemo(() => {
    const t = (selectedTab || "All").toLowerCase();
    if (t === "all") return "";
    if (t === "to be started") return "to be started";
    if (t === "ongoing") return "ongoing";
    if (t === "delayed") return "delayed";
    if (t === "completed") return "completed";
    if (t === "on hold") return "on hold";
    if (t === "dead") return "dead";
    if (t === "books closed") return "books closed";
    if (t === "commissioned") return "commissioned";
    return t;
  }, [selectedTab]);

  const {
    data: getProjects = {},
    isLoading,
    refetch,
  } = useGetAllProjectsQuery({
    page: currentPage,
    status: statusFilter,
    search: searchQuery,
    limit: rowsPerPage,
    state: state,
    dcr: dcr,
    Spoc: spoc,
    commissioned_from: commissionedFrom,
commissioned_to: commissionedTo,

    sort: "-createdAt",
  });

  const [updateProjectStatus, { isLoading: isUpdatingStatus }] =
    useUpdateProjectStatusMutation();

  const Projects = getProjects?.data || [];

  // ✅ keep selection only for rows that are still present in current table data
  useEffect(() => {
    const idSet = new Set(Projects.map((p) => String(p._id)));

    setSelected((prev) => prev.filter((id) => idSet.has(String(id))));
    setSelectedExport((prev) => prev.filter((id) => idSet.has(String(id))));
  }, [Projects]);

  const ProjectOverView = ({ currentPage, project_id, code }) => (
    <Chip
      variant="outlined"
      color="primary"
      sx={{
        cursor: "pointer",
      }}
      onClick={() => {
        navigate(
          `/project_detail?page=${currentPage}&project_id=${project_id}`
        );
      }}
    >
      {code || "-"}
    </Chip>
  );

  // ======== Search: update URL on every keystroke and reset page to 1 ========
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("search", query);
      p.set("page", "1");
      // keep current tab & pageSize in URL
      if (selectedTab) p.set("tab", selectedTab);
      if (rowsPerPage) p.set("pageSize", String(rowsPerPage));
      return p;
    });
    setCurrentPage(1);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(Projects.map((row) => row._id));
      setSelectedExport(Projects.map((row) => row._id));
    } else {
      setSelectedExport([]);
      setSelected([]);
    }
  };

  const handleRowSelect = (_id) => {
    setSelected((prev) =>
      prev.includes(_id) ? prev.filter((item) => item !== _id) : [...prev, _id]
    );
    setSelectedExport((prev) =>
      prev.includes(_id) ? prev.filter((item) => item !== _id) : [...prev, _id]
    );
  };

  const totalPages = Number(getProjects?.pagination?.totalPages || 1);
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("page", String(page));
        if (selectedTab) p.set("tab", selectedTab);
        if (rowsPerPage) p.set("pageSize", String(rowsPerPage));
        p.set("search", searchQuery || "");
        return p;
      });
      setCurrentPage(page);
    }
  };

  const JOY_COLORS = ["primary", "success", "warning", "danger", "info"];

  const capitalizeWords = (str = "") =>
    str
      .toString()
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");

  const colorFromName = (name = "") => {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % JOY_COLORS.length;
    return JOY_COLORS[index];
  };

  const initialsOf = (name = "") =>
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase() || "")
      .slice(0, 2)
      .join("");

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

  const SpocChip = ({ userName, attachment_url }) => {
    if (!userName) {
      return (
        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
          -
        </Typography>
      );
    }

    const temp = {
      name: userName,
      attachment_url: attachment_url,
    };

    return <PeopleAvatars people={[temp]} max={3} size="sm" />;
  };

  const ResourcesCell = ({
    primary_reporting_user_names,
    secondary_reporting_user_names,
  }) => {
    if (
      !primary_reporting_user_names.length &&
      !secondary_reporting_user_names.length
    ) {
      return (
        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
          -
        </Typography>
      );
    }

    return (
      <Stack direction="column" spacing={0.5}>
        {secondary_reporting_user_names.length > 0 && (
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography
              level="body-xs"
              sx={{ minWidth: 64, color: "neutral.500", fontWeight: 600 }}
            >
              Secondary
            </Typography>
            <PeopleAvatars
              people={secondary_reporting_user_names}
              max={3}
              size="sm"
            />
          </Stack>
        )}

        {primary_reporting_user_names.length > 0 && (
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography
              level="body-xs"
              sx={{ minWidth: 64, color: "neutral.500", fontWeight: 600 }}
            >
              Primary
            </Typography>
            <PeopleAvatars
              people={primary_reporting_user_names}
              max={3}
              size="sm"
            />
          </Stack>
        )}
      </Stack>
    );
  };

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

  // ---------- Status chip helpers + modal ----------
  const statusChipColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed") return "success";
    if (s === "to be started") return "warning";
    if (s === "ongoing") return "primary";
    if (s === "dead") return "danger";
    if (s === "books closed") return "success";
    if (s === "commissioned") return "success";
    return "neutral";
  };

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusProjectId, setStatusProjectId] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: "", remarks: "" });

  const [commissionedModalOpen, setCommissionedModalOpen] = useState(false);
  const [commissionedDate, setCommissionedDate] = useState("");

  const openStatusModal = (project) => {
    const currentStatus =
      project?.current_status?.status || project?.status || "";
    const currentRemarks = project?.current_status?.remarks || "";

    setStatusProjectId(project?._id || project?.project_id);

    setStatusForm({
      status: currentStatus || "not started",
      remarks: currentRemarks || "",
    });

    // ✅ preload date if already commissioned
    setCommissionedDate(toInputDate(project?.commissioned_date));

    setStatusModalOpen(true);
  };

  const submitStatusUpdate = async () => {
    if (!statusProjectId) return;

    try {
      if (!statusForm.remarks) {
        toast.error("Remarks is required!!");
        return;
      }

      const st = String(statusForm.status || "")
        .trim()
        .toLowerCase();

      // ✅ if commissioned -> open date modal (only date entry there)
      if (st === "commissioned") {
        setCommissionedModalOpen(true);
        return;
      }

      await updateProjectStatus({
        projectId: statusProjectId,
        status: statusForm.status,
        remarks: statusForm.remarks,
      }).unwrap();

      setStatusModalOpen(false);
      await (refetch().unwrap?.() ?? refetch());
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const submitCommissionedDate = async () => {
    if (!statusProjectId) return;

    try {
      if (!commissionedDate) {
        toast.error("Commissioned Date is required!!");
        return;
      }

      await updateProjectStatus({
        projectId: statusProjectId,
        status: statusForm.status,
        remarks: statusForm.remarks,
        commissioned_date: commissionedDate,
      }).unwrap();

      setCommissionedModalOpen(false);
      setStatusModalOpen(false);

      await (refetch().unwrap?.() ?? refetch());
    } catch (e) {
      console.error("Failed to update commissioned date:", e);
      toast.error(e?.data?.message || "Failed to update commissioned date");
    }
  };

  const renderWorkPercent = (total_work, work_completed) => {
    const avg = total_work === 0 ? 0 : (work_completed / total_work) * 100;

    const pct = Math.max(0, Math.min(100, avg));

    const band = (() => {
      if (pct >= 100) return { color: "success", sx: {} };
      if (pct >= 75) return { color: "primary", sx: {} };
      if (pct >= 40) return { color: "warning", sx: {} };
      return { color: "danger", sx: {} };
    })();

    const Bar = (
      <Box
        sx={{
          position: "relative",
          minWidth: 150,
          pr: 6,
        }}
      >
        <LinearProgress
          determinate
          value={pct}
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
          {pct.toFixed(2)}%
        </Typography>
      </Box>
    );

    return Bar;
  };

  return (
    <Box
      sx={{
        ml: { lg: "var(--Sidebar-width)" },
        px: "0px",
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
      }}
    >
      <Box display={"flex"} justifyContent={"space-between"} pb={0.5}>
        <Box
          display={"flex"}
          justifyContent={"space-between"}
          width={"100%"}
          alignItems={"center"}
        ></Box>

        <Box
          className="SearchAndFilters-tabletUp"
          sx={{
            borderRadius: "sm",
            py: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            width: { lg: "100%" },
          }}
        >
          <FormControl sx={{ flex: 1 }} size="sm">
            <Input
              size="sm"
              placeholder="Search by ProjectId...."
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
          overflow: "auto",
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
            <tr style={{ backgroundColor: "neutral.softBg" }}>
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
                  overflowY: "auto",
                }}
              >
                <Checkbox
                  size="sm"
                  checked={
                    Projects.length > 0 && selected?.length === Projects?.length
                  }
                  onChange={handleSelectAll}
                  indeterminate={
                    selected?.length > 0 && selected?.length < Projects?.length
                  }
                />
              </th>
              {[
                "Project Id",
                "Project Name",
                "Customer",
                "State",
                "Capacity(AC/DC)",
                "DCR/NON-DCR",
                "Status",
                "Spoc",
                "Resources",
                "Work Percent",
                "Action",
              ].map((header) => (
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
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ padding: "8px" }}>
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
            ) : Projects?.length > 0 ? (
              Projects.map((project, index) => {
                const status =
                  project?.current_status?.status || project?.status || "-";
                const remarks = project?.current_status?.remarks || "";
                const projectIdForLinks = project?.project_id || project?._id;

                return (
                  <tr key={project._id || index}>
                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      <Checkbox
                        size="sm"
                        checked={selected.includes(project._id)}
                        onChange={() => handleRowSelect(project._id)}
                      />
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      <Tooltip title="View Project Detail" arrow>
                        <span>
                          <ProjectOverView
                            currentPage={currentPage}
                            project_id={projectIdForLinks}
                            code={project.code}
                          />
                        </span>
                      </Tooltip>
                    </td>
                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      {project.name || "-"}
                    </td>
                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      {project.customer || "-"}
                    </td>
                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      {project.state || "-"}
                    </td>
                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      {project.project_kwp ? `${project.project_kwp}` : "-"}
                    </td>

                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      {project.module_category || "-"}
                    </td>

                    {/* Status chip */}
<td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
  <Tooltip
    placement="top"
    title={remarks ? `Remarks: ${remarks}` : "Click to change status"}
    arrow
  >
    <Box sx={{ display: "flex", alignItems: "center" }}>
      {(() => {
        const isCommissioned =
          String(status || "").trim().toLowerCase() === "commissioned";

        const statusLabel = String(status || "-")
          .split(" ")
          .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
          .join(" ");

        const dateLabel =
          isCommissioned && project?.commissioned_date
            ? formatDateGB(project.commissioned_date)
            : "";

        const finalLabel =
          isCommissioned && dateLabel
            ? `${statusLabel} • ${dateLabel}`
            : statusLabel;

        return (
          <Chip
            variant="soft"
            color={statusChipColor(status)}
            size="sm"
            onClick={() => openStatusModal(project)}
            sx={{
              cursor: "pointer",
              fontWeight: 700,
              width: "fit-content",
              maxWidth: 240,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {finalLabel}
          </Chip>
        );
      })()}
    </Box>
  </Tooltip>
</td>


                    {/* Action menu */}

                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      <SpocChip
                        userName={project.Cam_name}
                        attachment_url={project.Cam_attachment_url}
                      />
                    </td>

                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      <ResourcesCell
                        primary_reporting_user_names={
                          project.primary_reporting_users
                        }
                        secondary_reporting_user_names={
                          project.secondary_reporting_users
                        }
                      />
                    </td>

                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        padding: "8px",
                      }}
                    >
                      <Tooltip title="View DPR" arrow>
                        <Box
                          onClick={() =>
                            navigate(`/dpr?projectId=${projectIdForLinks}`)
                          }
                          sx={{ cursor: "pointer", display: "inline-block" }}
                        >
                          {renderWorkPercent(
                            project?.total_work,
                            project?.work_completed
                          )}
                        </Box>
                      </Tooltip>
                    </td>

                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      <Tooltip title="Add Schedule" arrow>
                        <Button
                          size="sm"
                          sx={{ backgroundColor: "#ddd", minWidth: 0, p: 0.5 }}
                          onClick={() =>
                            navigate(`/view_pm?project_id=${projectIdForLinks}`)
                          }
                        >
                          <PlusIcon />
                        </Button>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: "8px", textAlign: "left" }}>
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
                      No Projects Found
                    </Typography>
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
          pt: 0.5,
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
          disabled={getProjects?.pagination?.hasPrevPage === false}
        >
          Previous
        </Button>

        <Box>Showing {Projects?.length} results</Box>

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
            onChange={(e, newValue) => {
              if (newValue !== null) {
                setRowsPerPage(newValue);
                setSearchParams((prev) => {
                  const params = new URLSearchParams(prev);
                  params.set("pageSize", String(newValue));
                  params.set("page", "1");
                  params.set("tab", selectedTab);
                  params.set("search", searchQuery || "");
                  return params;
                });
                setCurrentPage(1);
              }
            }}
            size="sm"
            variant="outlined"
            sx={{ minWidth: 80, borderRadius: "md", boxShadow: "sm" }}
          >
            {options.map((value) => (
              <Option key={value} value={value}>
                {value}
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
          disabled={getProjects?.pagination?.hasNextPage === false}
        >
          Next
        </Button>
      </Box>

      {/* Status Change Modal */}
      <Modal open={statusModalOpen} onClose={() => setStatusModalOpen(false)}>
        <ModalDialog variant="outlined" size="md" sx={{ borderRadius: "lg" }}>
          <DialogTitle>Update Project Status</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "grid", gap: 1.25 }}>
              <FormControl size="sm">
                <Typography level="body-sm" sx={{ mb: 0.5 }}>
                  Status
                </Typography>
                <Select
                  size="sm"
                  value={statusForm.status}
                  onChange={(_, v) =>
                    setStatusForm((f) => ({ ...f, status: v || f.status }))
                  }
                >
                  <Option value="to be started">To be Started</Option>
                  <Option value="ongoing">Ongoing</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="delayed">Delayed</Option>
                  <Option value="on hold">On hold</Option>
                  <Option value="dead">Dead</Option>
                  <Option value="books closed">Books Closed</Option>
                  <Option value="commissioned">Commissioned</Option>
                </Select>
              </FormControl>

              <FormControl size="sm">
                <Typography level="body-sm" sx={{ mb: 0.5 }}>
                  Remarks
                </Typography>
                <Textarea
                  minRows={3}
                  value={statusForm.remarks}
                  onChange={(e) =>
                    setStatusForm((f) => ({ ...f, remarks: e.target.value }))
                  }
                  placeholder="Add remarks (mandatory)"
                />
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              size="sm"
              variant="outlined"
              color="neutral"
              onClick={() => setStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submitStatusUpdate}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
      {/* Commissioned Date Modal (only date entry) */}
      <Modal
        open={commissionedModalOpen}
        onClose={() => setCommissionedModalOpen(false)}
      >
        <ModalDialog variant="outlined" size="sm" sx={{ borderRadius: "lg" }}>
          <DialogTitle>Commissioned Date</DialogTitle>
          <DialogContent>
            <FormControl size="sm">
              <Typography level="body-sm" sx={{ mb: 0.5 }}>
                Select Commissioned Date
              </Typography>

              <Input
                type="date"
                size="sm"
                value={commissionedDate}
                onChange={(e) => setCommissionedDate(e.target.value)}
              />
            </FormControl>
          </DialogContent>

          <DialogActions>
            <Button
              size="sm"
              variant="outlined"
              color="neutral"
              onClick={() => setCommissionedModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submitCommissionedDate}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
}

export default AllProjects;
