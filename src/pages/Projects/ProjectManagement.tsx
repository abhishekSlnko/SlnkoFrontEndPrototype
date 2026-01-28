import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import Button from "@mui/joy/Button";
import Sidebar from "../../component/Partials/Sidebar";
import SubHeader from "../../component/Partials/SubHeader";
import MainHeader from "../../component/Partials/MainHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import LibraryAddOutlined from "@mui/icons-material/LibraryAddOutlined";
import AddActivityModal from "./ActivityModal";
import { useEffect, useState } from "react";

import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import ArchivedProjectsModal from "../Projects/ArchivedProjectsModal";

import {
  useExportProjectMutation,
  usePushActivityToProjectMutation,
  useUpdateDependencyMutation,
  useArchiveSelectedProjectsMutation,
} from "../../redux/projectsSlice";
import { toast } from "react-toastify";
import AllProjects from "../../component/AllProject";
import Filter from "../../component/Partials/Filter";
import DownloadIcon from "@mui/icons-material/Download";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import { useGetAllUserQuery } from "../../redux/globalTaskSlice";
import {
  DialogActions,
  DialogContent,
  DialogTitle,
  Dropdown,
  ListDivider,
  Menu,
  MenuButton,
  MenuItem,
  Modal,
  ModalDialog,
  IconButton,
  Tooltip,
} from "@mui/joy";

function ProjectManagement() {
  const navigate = useNavigate();
  const [openAdd, setOpenAdd] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [pushActivity, { isLoading: isPushing }] =
    usePushActivityToProjectMutation();
  const [updateDependency, { isLoading: isUpdatingDeps }] =
    useUpdateDependencyMutation();

  const [selectedExport, setSelectedExport] = useState([]);
  const [clearSelectionToken, setClearSelectionToken] = useState(0);

  // ✅ Archived projects modal
  const [archivedModalOpen, setArchivedModalOpen] = useState(false);

  const {
    data: usersResp,
    isFetching: isFetchingUsers,
    isLoading: isLoadingUsers,
  } = useGetAllUserQuery({ department: "CAM" });

  const [archiveSelectedProjects, { isLoading: isArchiving }] =
    useArchiveSelectedProjectsMutation();

  // ✅ Archive confirmation modal (for selected rows)
  const [archiveOpen, setArchiveOpen] = useState(false);

  const [state, setState] = useState(searchParams.get("state") || "");
  const [dcr, setDcr] = useState(searchParams.get("dcr") || "");
  const [spoc, setSpoc] = useState(searchParams.get("spoc") || "");

  const [commissionedFrom, setCommissionedFrom] = useState(
    searchParams.get("commissioned_from") || ""
  );
  const [commissionedTo, setCommissionedTo] = useState(
    searchParams.get("commissioned_to") || ""
  );

  const hasSelection =
    Array.isArray(selectedExport) && selectedExport.length > 0;

  useEffect(() => {
    const sp = new URLSearchParams(searchParams);

    if (state) sp.set("state", state);
    else sp.delete("state");

    if (dcr) sp.set("dcr", dcr);
    else sp.delete("dcr");

    if (spoc) sp.set("spoc", spoc);
    else sp.delete("spoc");

    if (commissionedFrom) sp.set("commissioned_from", commissionedFrom);
    else sp.delete("commissioned_from");

    if (commissionedTo) sp.set("commissioned_to", commissionedTo);
    else sp.delete("commissioned_to");

    sp.set("page", 1);
    setSearchParams(sp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, dcr, spoc, commissionedFrom, commissionedTo]);

  // ✅ helper to clear selection everywhere
  const clearSelectionEverywhere = () => {
    setSelectedExport([]);
    setClearSelectionToken((x) => x + 1);
  };

  // ✅ TWO CONDITIONS ON SAME ICON
  const handleArchiveIconClick = () => {
    if (hasSelection) {
      // 1) selection exists => archive flow (confirm modal)
      setArchiveOpen(true);
      return;
    }
    // 2) no selection => open archived projects modal
    setArchivedModalOpen(true);
  };

  const [user, setUser] = useState(null);
  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) return JSON.parse(userData);
    return null;
  };

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  const canSeeArchive = ["manager", "admin", "superadmin"].includes(
    String(user?.role || "").toLowerCase()
  );

  const cannotSeeDetailsDashboard =
    user?.department === "Projects" &&
    user?.emp_id !== "SE-235" &&
    user?.emp_id !== "SE-353" &&
    user?.emp_id !== "SE-255" &&
    user?.emp_id !== "SE-203" &&
    user?.emp_id !== "SE-398" &&
    user?.emp_id !== "SE-284";

  const cannotSeeDetails =
    user?.department === "Projects" &&
    user?.emp_id !== "SE-235" &&
    user?.emp_id !== "SE-353" &&
    user?.emp_id !== "SE-255" &&
    user?.emp_id !== "SE-284" &&
    user?.emp_id !== "SE-203" &&
    user?.emp_id !== "SE-398" &&
    user?.emp_id !== "SE-011";

  const isLoading = isPushing || isUpdatingDeps;

  // --- Normalize only what comes from the modal that we pass through as-is ---
  const normalizeFromModal = (payload = {}) => {
    const dependencies = Array.isArray(payload.dependencies)
      ? payload.dependencies
      : Array.isArray(payload.dependency)
        ? payload.dependency
        : [];

    const predecessors = Array.isArray(payload.predecessors)
      ? payload.predecessors
      : [];

    const hasCompletionFormula = Object.prototype.hasOwnProperty.call(
      payload,
      "completion_formula"
    );
    const hasWorkCompletionUnit = Object.prototype.hasOwnProperty.call(
      payload,
      "work_completion_unit"
    );
    const hasCategory = Object.prototype.hasOwnProperty.call(payload, "category");

    const hasPoints = Object.prototype.hasOwnProperty.call(payload, "points");
    const points = hasPoints ? Number(payload.points) : undefined;

    const hasMaxTat = Object.prototype.hasOwnProperty.call(payload, "max_tat");
    const max_tat = hasMaxTat ? String(payload.max_tat ?? "") : undefined;

    const completion_formula = hasCompletionFormula
      ? String(payload.completion_formula ?? "")
      : undefined;

    const work_completion_unit = hasWorkCompletionUnit
      ? String(payload.work_completion_unit ?? "")
      : undefined;

    const category = hasCategory ? String(payload.category ?? "") : undefined;

    return {
      dependencies,
      predecessors,
      hasCompletionFormula,
      completion_formula,
      hasWorkCompletionUnit,
      work_completion_unit,
      hasCategory,
      category,
      hasPoints,
      points,
      hasMaxTat,
      max_tat,
    };
  };

  const handleCreate = async (payload) => {
    try {
      const {
        dependencies,
        predecessors,
        hasCompletionFormula,
        completion_formula,
        hasWorkCompletionUnit,
        work_completion_unit,
        hasCategory,
        category,
        hasPoints,
        points,
        hasMaxTat,
        max_tat,
      } = normalizeFromModal(payload || {});
      console.log({ payload });

      // --- UPDATE EXISTING (global or project embedded) ---
      if (payload && payload.__mode === "existing") {
        const id =
          payload.activityId ||
          payload.id ||
          payload.activity_id ||
          payload._id ||
          "";

        if (!id) {
          console.error(
            "Missing master Activity _id for update. Payload:",
            payload
          );
          toast.error("Missing activity id for existing activity.");
          return;
        }

        const isGlobal = payload.__scope === "global";

        if (!isGlobal && !payload.project_id) {
          toast.error("Missing project id for project-scoped update.");
          return;
        }

        const body = {
          ...(payload.type ? { type: String(payload.type).toLowerCase() } : {}),
          ...(Number.isFinite(+payload.order) ? { order: +payload.order } : {}),
          ...(dependencies.length ? { dependencies } : {}),
          ...(predecessors.length ? { predecessors } : {}),
          ...(isGlobal && hasCompletionFormula ? { completion_formula } : {}),
          ...(isGlobal && hasWorkCompletionUnit
            ? { work_completion_unit }
            : {}),
          ...(isGlobal && hasCategory ? { category } : {}),
          ...(isGlobal && hasPoints ? { points: Number(points) } : {}),
          ...(isGlobal && hasMaxTat ? { max_tat } : {}),
        };

        if (
          !("type" in body) &&
          !("order" in body) &&
          !("dependencies" in body) &&
          !("predecessors" in body) &&
          !("completion_formula" in body) &&
          !("work_completion_unit" in body) &&
          !("category" in body) &&
          !("points" in body) &&
          !("max_tat" in body)
        ) {
          toast.error("Nothing to update.");
          return;
        }

        await updateDependency({
          id,
          global: isGlobal,
          projectId: isGlobal ? undefined : payload.project_id,
          body,
        }).unwrap();

        toast.success("Activity updated successfully");
        setOpenAdd(false);
        return;
      }

      // --- CREATE NEW (push to project) ---
      if (!payload?.project_id) {
        toast.error("Pick a project first.");
        return;
      }

      await pushActivity({
        projectId: payload.project_id,
        name: payload.name,
        description: payload.description,
        type: String(payload.type || "frontend").toLowerCase(),
        ...(Number.isFinite(+payload.order) ? { order: +payload.order } : {}),
        dependencies,
        ...(predecessors.length ? { predecessors } : {}),
      }).unwrap();

      toast.success("Activity added to project");
      setOpenAdd(false);
    } catch (err) {
      toast.error(
        err?.data?.message ||
        err?.error ||
        "Something went wrong. Please try again."
      );
    }
  };

  const [userData, setUserData] = useState([]);

  useEffect(() => {
    if (usersResp && Array.isArray(usersResp.data)) {
      setUserData(usersResp.data);
    }
  }, [usersResp]);

  const states = [
    { label: "Andhra Pradesh", value: "Andhra Pradesh" },
    { label: "Arunachal Pradesh", value: "Arunachal Pradesh" },
    { label: "Assam", value: "Assam" },
    { label: "Bihar", value: "Bihar" },
    { label: "Chhattisgarh", value: "Chhattisgarh" },
    { label: "Goa", value: "Goa" },
    { label: "Gujarat", value: "Gujarat" },
    { label: "Haryana", value: "Haryana" },
    { label: "Himachal Pradesh", value: "Himachal Pradesh" },
    { label: "Jharkhand", value: "Jharkhand" },
    { label: "Karnataka", value: "Karnataka" },
    { label: "Kerala", value: "Kerala" },
    { label: "Madhya Pradesh", value: "Madhya Pradesh" },
    { label: "Maharashtra", value: "Maharashtra" },
    { label: "Manipur", value: "Manipur" },
    { label: "Meghalaya", value: "Meghalaya" },
    { label: "Mizoram", value: "Mizoram" },
    { label: "Nagaland", value: "Nagaland" },
    { label: "Odisha", value: "Odisha" },
    { label: "Punjab", value: "Punjab" },
    { label: "Rajasthan", value: "Rajasthan" },
    { label: "Sikkim", value: "Sikkim" },
    { label: "Tamil Nadu", value: "Tamil Nadu" },
    { label: "Telangana", value: "Telangana" },
    { label: "Tripura", value: "Tripura" },
    { label: "Uttar Pradesh", value: "Uttar Pradesh" },
    { label: "Uttarakhand", value: "Uttarakhand" },
    { label: "West Bengal", value: "West Bengal" },
  ];

  const Dcr = [
    { label: "DCR", value: "DCR" },
    { label: "NON DCR", value: "Non DCR" },
  ];

  const fields = [
    {
      key: "tab",
      label: "Filter by Project Status",
      type: "select",
      options: [
        { label: "All", value: "" },
        { label: "To Be Started", value: "to be started" },
        { label: "Ongoing", value: "ongoing" },
        { label: "Completed", value: "completed" },
        { label: "On Hold", value: "on_hold" },
        { label: "Delayed", value: "delayed" },
        { label: "Dead", value: "dead" },
        { label: "Books Closed", value: "books closed" },
        { label: "Commissioned", value: "commissioned" },
      ],
    },

    // ✅ Date Range Filter (same like Tasks)
    { key: "commissioned_date", label: "Commissioned Date", type: "daterange" },

    { key: "state", label: "State", type: "select", options: states },
    { key: "dcr", label: "DCR, NON DCR", type: "select", options: Dcr },

    {
      key: "spoc",
      label: "Spoc",
      type: "select",
      options: [
        { label: "All Spocs", value: "" },
        ...(Array.isArray(userData) && userData.length > 0
          ? userData.map((u) => ({ value: u._id, label: u.name }))
          : []),
      ],
    },
  ];

  const [exportProjects] = useExportProjectMutation();

  const downloadBlob = (blob, filename = "projects_export.csv") => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleArchiveSelected = async () => {
    try {
      if (!selectedExport?.length) {
        toast.error("No projects selected.");
        return;
      }

      const res = await archiveSelectedProjects({
        ids: selectedExport,
      }).unwrap();

      toast.success(`${res?.archivedCount || 0} project(s) archived`);

      if (res?.notBooksClosedIds?.length) {
        toast.info(`${res.notBooksClosedIds.length} skipped (not Books Closed)`);
      }
      if (res?.alreadyArchivedIds?.length) {
        toast.info(
          `${res.alreadyArchivedIds.length} skipped (already archived)`
        );
      }

      clearSelectionEverywhere();
      setArchiveOpen(false);
    } catch (err) {
      console.log("Archive error:", err);
      toast.error(err?.data?.message || "Failed to archive selected projects");
    }
  };

  const handleExportSelected = async () => {
    try {
      if (!selectedExport?.length) {
        toast.error("No rows selected to export.");
        return;
      }

      const payload = { type: "selected", ids: selectedExport };
      const blob = await exportProjects(payload).unwrap();
      downloadBlob(blob, "project_selected_export.csv");
    } catch (err) {
      console.error("Export (selected) failed:", err);
      toast.error("Failed to export selected project.");
    }
  };

  const buildAllExportParams = () => {
    const params = Object.fromEntries(searchParams.entries());
    return {
      type: "all",
      status: params.tab || "",
      state: params.state || "",
      dcr: params.dcr || "",
      Spoc: params.spoc || "",
      search: params.search || "",
    };
  };

  const handleExportAll = async () => {
    try {
      const payload = buildAllExportParams();
      const blob = await exportProjects(payload).unwrap();
      downloadBlob(blob, "project_all_export.csv");
    } catch (err) {
      console.error("Export (all) failed:", err);
      toast.error("Failed to export all projects.");
    }
  };

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box
        sx={{ display: "flex", minHeight: "100dvh", flexDirection: "column" }}
      >
        <Sidebar />

        <MainHeader title="Projects" sticky>
          <Box display="flex" gap={1}>
            {!cannotSeeDetailsDashboard && (
              <Button
                size="sm"
                onClick={() => navigate(`/project_dash`)}
                sx={{
                  color: "white",
                  bgcolor: "transparent",
                  fontWeight: 500,
                  fontSize: "1rem",
                  letterSpacing: 0.5,
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                }}
              >
                Dashboard
              </Button>
            )}

            {!cannotSeeDetails && (
              <>
                <Button
                  size="sm"
                  onClick={() => navigate(`/project_management`)}
                  sx={{
                    color: "white",
                    bgcolor: "transparent",
                    fontWeight: 500,
                    fontSize: "1rem",
                    letterSpacing: 0.5,
                    borderRadius: "6px",
                    px: 1.5,
                    py: 0.5,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  All Projects
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(`/project_template`)}
                  sx={{
                    color: "white",
                    bgcolor: "transparent",
                    fontWeight: 500,
                    fontSize: "1rem",
                    letterSpacing: 0.5,
                    borderRadius: "6px",
                    px: 1.5,
                    py: 0.5,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  Templates
                </Button>
              </>
            )}

            <>
              {(user?.emp_id === "SE-366") && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/project_management`)}
                  sx={{
                    color: "white",
                    bgcolor: "transparent",
                    fontWeight: 500,
                    fontSize: "1rem",
                    letterSpacing: 0.5,
                    borderRadius: "6px",
                    px: 1.5,
                    py: 0.5,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  All Projects
                </Button>
              )}
            </>

            <Button
              size="sm"
              onClick={() => navigate(`/dpr_management`)}
              sx={{
                color: "white",
                bgcolor: "transparent",
                fontWeight: 500,
                fontSize: "1rem",
                letterSpacing: 0.5,
                borderRadius: "6px",
                px: 1.5,
                py: 0.5,
                "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
              }}
            >
              Site DPR
            </Button>
          </Box>
        </MainHeader>

        <SubHeader
          title="All Projects"
          isBackEnabled={false}
          sticky
          rightSlot={
            <>
              {hasSelection && (
                <Dropdown>
                  <MenuButton
                    variant="outlined"
                    size="sm"
                    startDecorator={<DownloadIcon />}
                    sx={{
                      color: "#3366a3",
                      borderColor: "#3366a3",
                      backgroundColor: "transparent",
                      "--Button-hoverBg": "#e0e0e0",
                      "--Button-hoverBorderColor": "#3366a3",
                      "&:hover": { color: "#3366a3" },
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    Export
                  </MenuButton>
                  <Menu placement="bottom-end" sx={{ minWidth: 220 }}>
                    <MenuItem
                      onClick={handleExportSelected}
                      disabled={!hasSelection}
                      sx={{ display: "flex", gap: 1, alignItems: "center" }}
                    >
                      <DoneAllIcon fontSize="small" />
                      Selected ({selectedExport?.length || 0})
                    </MenuItem>
                    <ListDivider />
                    <MenuItem
                      onClick={handleExportAll}
                      sx={{ display: "flex", gap: 1, alignItems: "center" }}
                    >
                      <SelectAllIcon fontSize="small" />
                      All (use current filters)
                    </MenuItem>
                  </Menu>
                </Dropdown>
              )}

              {/* ✅ ONE ICON BUTTON => TWO CONDITIONS */}
              {canSeeArchive && (
                <Tooltip
                  title={
                    hasSelection
                      ? `Archive (${selectedExport.length})`
                      : "Archived Projects"
                  }
                >
                  <IconButton
                    variant="outlined"
                    onClick={handleArchiveIconClick}
                    disabled={isArchiving}
                    sx={{
                      color: "#3366a3",
                      borderColor: "#3366a3",
                      backgroundColor: "transparent",
                      "--IconButton-hoverBg": "#e0e0e0",
                      height: "28px",
                      width: "28px",
                    }}
                  >
                    <ArchiveOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              <Button
                size="sm"
                variant="outlined"
                sx={{
                  color: "#3366a3",
                  borderColor: "#3366a3",
                  backgroundColor: "transparent",
                  "--Button-hoverBg": "#e0e0e0",
                  "--Button-hoverBorderColor": "#3366a3",
                  "&:hover": { color: "#3366a3" },
                  height: "8px",
                }}
                startDecorator={<LibraryAddOutlined />}
                onClick={() => setOpenAdd(true)}
              >
                Add Activity
              </Button>

              <Filter
                open={open}
                onOpenChange={setOpen}
                fields={fields}
                title="Filters"
                onApply={(values) => {
                  // ✅ keep your existing state updates
                  setState(values?.state || "");
                  setDcr(values?.dcr || "");
                  setSpoc(values?.spoc || "");

                  // ✅ NEW: set commissioned date range state (same like Tasks)
                  setCommissionedFrom(values?.commissioned_date?.from || "");
                  setCommissionedTo(values?.commissioned_date?.to || "");

                  setSearchParams((prev) => {
                    const merged = Object.fromEntries(prev.entries());
                    delete merged.tab;

                    // ✅ NEW: clear previous range keys in URL
                    delete merged.commissioned_from;
                    delete merged.commissioned_to;

                    const next = {
                      ...merged,
                      page: "1",
                      ...(values.tab && { tab: String(values.tab) }),

                      // ✅ FIX: put commissioned date range into URL immediately
                      ...(values?.commissioned_date?.from
                        ? { commissioned_from: values.commissioned_date.from }
                        : {}),
                      ...(values?.commissioned_date?.to
                        ? { commissioned_to: values.commissioned_date.to }
                        : {}),
                    };
                    return next;
                  });

                  setOpen(false);
                }}
                onReset={() => {
                  setState("");
                  setDcr("");
                  setSpoc("");

                  // ✅ NEW: reset commissioned date range state
                  setCommissionedFrom("");
                  setCommissionedTo("");

                  setSearchParams((prev) => {
                    const merged = Object.fromEntries(prev.entries());
                    delete merged.tab;
                    delete merged.matchMode;

                    // ✅ NEW: remove commissioned date range from URL
                    delete merged.commissioned_from;
                    delete merged.commissioned_to;

                    return { ...merged, page: "1" };
                  });
                  setOpen(false);
                }}
              />
            </>
          }
        />

        {/* ✅ Archive confirmation modal (only when selection exists) */}
        <Modal open={archiveOpen} onClose={() => setArchiveOpen(false)}>
          <ModalDialog variant="outlined" size="md" sx={{ borderRadius: "lg" }}>
            <DialogTitle>Archive selected projects?</DialogTitle>
            <DialogContent>
              Only <b>Books Closed</b> projects will be archived. Others will be
              skipped.
            </DialogContent>
            <DialogActions>
              <Button
                size="sm"
                variant="outlined"
                color="neutral"
                onClick={() => setArchiveOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                color="danger"
                onClick={handleArchiveSelected}
                disabled={isArchiving}
              >
                {isArchiving ? "Archiving..." : "Archive"}
              </Button>
            </DialogActions>
          </ModalDialog>
        </Modal>

        {canSeeArchive && (
          <ArchivedProjectsModal
            open={archivedModalOpen}
            onClose={() => setArchivedModalOpen(false)}
          />
        )}

        <Box
          component="main"
          className="MainContent"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            mt: "108px",
            p: "16px",
            px: "24px",
          }}
        >
          <AddActivityModal
            open={openAdd}
            onClose={() => setOpenAdd(false)}
            onCreate={handleCreate}
            isSubmitting={isLoading}
          />

          <AllProjects
            setSelectedExport={setSelectedExport}
            clearSelectionToken={clearSelectionToken}
          />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}

export default ProjectManagement;
