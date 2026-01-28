// pages/DprManagement.jsx
import { useMemo, useState, useEffect } from "react";
import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import Button from "@mui/joy/Button";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Stack from "@mui/joy/Stack";
import CircularProgress from "@mui/joy/CircularProgress";
import Alert from "@mui/joy/Alert";

import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../component/Partials/Sidebar";
import SubHeader from "../../component/Partials/SubHeader";
import MainHeader from "../../component/Partials/MainHeader";
import DPRTable from "../../component/Dpr";
import Filter from "../../component/Partials/Filter";
import {
  useGetProjectDropdownQuery,
  useAssignPrimaryReportingMutation,
  useGetWebSearchActivityQuery,
} from "../../redux/projectsSlice";
import { useGetAllUserQuery } from "../../redux/globalTaskSlice";

const DESIGNATION_OPTIONS = [
  { label: "Surveyor", value: "surveyor" },
  { label: "Civil Engineer", value: "civil engineer" },
  { label: "Civil I&C", value: "civil i&c" },
  { label: "Electric Engineer", value: "electric engineer" },
  { label: "Electric I&C", value: "electric i&c" },
  { label: "Soil Testing Team", value: "soil testing team" },
  { label: "TLine Engineer", value: "tline engineer" },
  { label: "TLine Subcontractor", value: "tline subcontractor" },
];

function DprManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [user, setUser] = useState();

  // DPR selection (from table)
  const [selectedIds, setSelectedIds] = useState([]);

  // Assign primary reporting modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: dropdownRaw, isLoading: isDropdownLoading } =
    useGetProjectDropdownQuery();

  // Users list (Projects dept only) – fetched when modal opens
  const {
    data: usersRaw,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
  } = useGetAllUserQuery(
    { department: "Projects" },
    { skip: !assignModalOpen }
  );

  const { data: getActivityDropdownRaw } = useGetWebSearchActivityQuery({
    type: "frontend",
  });
  // Mutation for assigning primary reporting
  const [
    assignPrimaryReporting,
    {
      refetch,
      isLoading: isAssigning,
      isError: isAssignError,
      error: assignError,
    },
  ] = useAssignPrimaryReportingMutation();

  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  };

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  // Project dropdown options
  const projectOptions = useMemo(() => {
    const list =
      (Array.isArray(dropdownRaw?.data) && dropdownRaw.data) ||
      (Array.isArray(dropdownRaw?.projects) && dropdownRaw.projects) ||
      (Array.isArray(dropdownRaw) && dropdownRaw) ||
      [];

    return list
      .map((it) => {
        const code =
          it.code ||
          it.project_code ||
          it.projectCode ||
          it.code_value ||
          it.value ||
          it.id ||
          "";
        const id =
          it._id || it.projectId || it.id || it.value_id || it.project_id || "";
        if (!id || !code) return null;
        return { label: String(code), value: String(id) };
      })
      .filter(Boolean);
  }, [dropdownRaw]);

  const projectIdFromUrl = searchParams.get("projectId") || "";
  const statusFromUrl = searchParams.get("status") || "";
  const categoryFromUrl = searchParams.get("category") || "";
  const fromFromUrl = searchParams.get("from") || undefined;
  const toFromUrl = searchParams.get("to") || undefined;
  const hidestatusFromUrl = searchParams.get("hide_status") || "";
  const dprDateFromUrl = searchParams.get("dprDate_from") || "";
  const dprDateToUrl = searchParams.get("dprDate_to") || "";

  // If URL projectId is not in dropdown, clean it
  useEffect(() => {
    if (
      projectIdFromUrl &&
      !projectOptions.some((o) => o.value === projectIdFromUrl)
    ) {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.delete("projectId");
        return p;
      });
    }
  }, [projectIdFromUrl, projectOptions, setSearchParams]);

  const FILTER_FIELDS = [
    {
      key: "projectId",
      label: "Project Code",
      type: "select",
      options: projectOptions,
    },
    { key: "deadline", label: "Deadline (Range)", type: "daterange" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "In progress", value: "in progress" },
        { label: "Idle", value: "idle" },
        { label: "Work Stopped", value: "work stopped" },
        { label: "Completed", value: "completed" },
      ],
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [
        { label: "Civil", value: "civil" },
        { label: "Electrical", value: "electrical" },
        { label: "I&C", value: "i&c" },
        { label: "Mechanical", value: "mechanical" },
      ],
    },
    {
      key: "activityId",
      label: "Activity",
      type: "select",
      options: Array.isArray(getActivityDropdownRaw?.data)
        ? getActivityDropdownRaw?.data?.map((activity) => ({
          label: activity.name,
          value: activity._id,
        }))
        : [],
    },
    {
      key: "hide_status",
      label: "Hide Status",
      type: "select",
      options: [
        { label: "In progress", value: "in progress" },
        { label: "Idle", value: "idle" },
        { label: "Work Stopped", value: "work stopped" },
        { label: "Completed", value: "completed" },
      ],
    },
    {
      key: "dprDate",
      label: "Filled DPR By Site Engineer",
      type: "daterange",
    },
    {
      key: "groupBy",
      label: "Group By",
      type: "select",
      options: [{ label: "Project", value: "project_id" }],
    },
    {
      key: "resources",
      label: "Primary Reporting Assigned",
      type: "select",
      options: [
        { label: "Assigned", value: "assigned" },
        { label: "Unassigned", value: "unassigned" },
      ],
    },
    {
      key: "activity",
      label: "Activity Timing",
      type: "select",
      options: [
        { label: "Delayed", value: "delayed" },
        { label: "Ongoing", value: "ongoing" },
      ],
    },
  ];

  const handleApplyFilters = (vals) => {
    const next = new URLSearchParams(searchParams);

    next.delete("project_code");
    next.delete("project_name");

    if (vals.projectId) next.set("projectId", String(vals.projectId));
    else next.delete("projectId");

    const dr = vals.deadline;
    if (dr?.from) next.set("from", dr.from);
    else next.delete("from");
    if (dr?.to) next.set("to", dr.to);
    else next.delete("to");

    if (vals.status) next.set("status", String(vals.status));
    else next.delete("status");

    if (vals.category) next.set("category", String(vals.category));
    else next.delete("category");

    if (vals.hide_status) next.set("hide_status", String(vals.hide_status));
    else next.delete("hide_status");

    const dpr = vals.dprDate;
    if (dpr?.from) next.set("dprDate_from", dpr.from);
    else next.delete("dprDate_from");

    if (dpr?.to) next.set("dprDate_to", dpr?.to);
    else next.delete("dprDate_to");

    next.set("page", "1");
    if (!next.get("pageSize")) next.set("pageSize", "10");

    if (vals.groupBy) {
      next.set("groupBy", vals.groupBy);
    } else {
      next.delete("groupBy");
    }

    if (vals.resources) {
      next.set("resources", vals.resources);
    } else {
      next.delete("resources");
    }

    if (vals.activity) {
      next.set("activity", vals.activity);
    } else {
      next.delete("activity");
    }

    if (vals.activityId) {
      next.set("activityId", vals.activityId);
    } else {
      next.delete("activityId");
    }

    setSearchParams(next);
    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("projectId");
      p.delete("project_code");
      p.delete("project_name");
      p.delete("from");
      p.delete("to");
      p.delete("status");
      p.delete("category");
      p.delete("dprDate_from");
      p.delete("dprDate_to");
      p.delete("dpr_from");
      p.delete("dpr_to");
      p.delete("groupBy");
      p.set("page", "1");

      return p;
    });
  };

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

  /* ---------- Users dropdown options (for modal) ---------- */

  const userOptions = useMemo(() => {
    const list =
      (Array.isArray(usersRaw?.data) && usersRaw.data) ||
      (Array.isArray(usersRaw?.users) && usersRaw.users) ||
      (Array.isArray(usersRaw) && usersRaw) ||
      [];

    return list
      .map((u) => {
        const id = u._id || u.id || u.user_id;
        if (!id) return null;

        const name =
          u.name || u.fullName || u.emp_name || u.employee_name || "User";
        const empId = u.emp_id || u.employeeId || "";
        const designation = (u.designation || "").toLowerCase();

        return {
          id: String(id),
          name: String(name),
          empId,
          designation,
        };
      })
      .filter(Boolean);
  }, [usersRaw]);

  const filteredUserOptions = useMemo(() => {
    if (!selectedDesignation) return userOptions;
    return userOptions;
  }, [userOptions, selectedDesignation]);

  /* ---------- Modal handlers ---------- */

  const handleOpenAssignModal = () => {
    if (selectedIds.length === 0) return;
    setAssignModalOpen(true);
  };

  const handleCloseAssignModal = () => {
    if (isAssigning) return;
    setAssignModalOpen(false);
    setSelectedDesignation("");
    setSelectedUserId("");
  };

  const handleSubmitAssign = async () => {
    if (!selectedDesignation || !selectedUserId || selectedIds.length === 0) {
      return;
    }
    try {
      await assignPrimaryReporting({
        ids: selectedIds,
        user_id: selectedUserId,
      }).unwrap();

      setSelectedIds([]);
      handleCloseAssignModal();
      refetch();
    } catch (err) {
      console.error("Assign primary reporting failed:", err);
    }
  };

  const userProfileInitialDprDate =
    dprDateFromUrl || dprDateToUrl
      ? {
        from: dprDateFromUrl || undefined,
        to: dprDateToUrl || undefined,
      }
      : undefined;

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box
        sx={{ display: "flex", minHeight: "100dvh", flexDirection: "column" }}
      >
        <Sidebar />

        <MainHeader title="Projects" sticky>
          <Box display="flex" gap={1}>
            {!cannotSeeDetailsDashboard && user?.department !== "O&M" && user?.emp_id !== "SE-010" && (
              <>
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
              </>
            )}
            {!cannotSeeDetails && user?.department !== "O&M" && user?.emp_id !== "SE-010" && (
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
          title="Site DPR"
          isBackEnabled={false}
          sticky
          rightSlot={
            <>
              {selectedIds.length > 0 && (
                <Button
                  variant="outlined"
                  size="sm"
                  sx={{
                    color: "#3366a3",
                    borderColor: "#3366a3",
                    backgroundColor: "transparent",
                    "--Button-hoverBg": "#e0e0e0",
                    "--Button-hoverBorderColor": "#3366a3",
                    "&:hover": { color: "#3366a3" },
                    height: "8px",
                  }}
                  onClick={handleOpenAssignModal}
                >
                  Assign Primary Reporting
                </Button>
              )}

              <Filter
                open={filterOpen}
                onOpenChange={setFilterOpen}
                fields={FILTER_FIELDS}
                initialValues={{
                  projectId: projectIdFromUrl || undefined,
                  status: statusFromUrl || undefined,
                  category: categoryFromUrl || undefined,
                  hide_status: hidestatusFromUrl || undefined,
                  deadline:
                    fromFromUrl || toFromUrl
                      ? { from: fromFromUrl, to: toFromUrl }
                      : undefined,
                  dprDate: userProfileInitialDprDate,
                }}
                title="Filter DPR"
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                disabled={isDropdownLoading}
              />
            </>
          }
        />

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
          {/* DPRTable will push selected IDs up via setSelectedIds */}
          <DPRTable setSelectedIds={setSelectedIds} />
        </Box>

        {/* --------- Assign Primary Reporting Modal --------- */}
        <Modal
          open={assignModalOpen}
          onClose={handleCloseAssignModal}
          keepMounted
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 1, sm: 2 },
            zIndex: 1400,
          }}
        >
          <ModalDialog
            sx={{
              width: { xs: "100%", sm: 480 },
              maxWidth: { xs: "100%", sm: "90vw" },
              maxHeight: {
                xs: "calc(100dvh - 16px)",
                sm: "calc(100dvh - 64px)",
              },
              overflowY: "auto",
              boxShadow: { xs: "none", sm: "lg" },
              borderRadius: { xs: 0, sm: "lg" },
              p: { xs: 2, sm: 3 },
              zIndex: 1401,
            }}
          >
            <ModalClose disabled={isAssigning} />
            <Typography level="h5" fontWeight="lg">
              Assign Primary Reporting
            </Typography>

            <Typography level="body-sm" sx={{ mt: 0.75, mb: 1.5 }}>
              You are assigning primary reporting for{" "}
              <b>{selectedIds.length}</b> DPR activity
              {selectedIds.length === 1 ? "" : "ies"}.
            </Typography>

            <Stack spacing={1.5}>
              <FormControl>
                <FormLabel>Designation</FormLabel>
                <Select
                  value={selectedDesignation || null}
                  onChange={(_, value) => {
                    setSelectedDesignation(value || "");
                    setSelectedUserId("");
                  }}
                  placeholder="Select designation"
                  disabled={isAssigning}
                  sx={{ zIndex: 1500 }}
                  slotProps={{
                    listbox: { sx: { zIndex: 1600 } },
                  }}
                >
                  {DESIGNATION_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                disabled={!selectedDesignation || isUsersLoading || isAssigning}
              >
                <FormLabel>Resource (User)</FormLabel>
                <Select
                  value={selectedUserId || null}
                  onChange={(_, value) => setSelectedUserId(value || "")}
                  placeholder={
                    !selectedDesignation
                      ? "Select designation first"
                      : isUsersLoading
                        ? "Loading users..."
                        : filteredUserOptions.length === 0
                          ? "No users available"
                          : "Select user"
                  }
                  slotProps={{
                    listbox: {
                      sx: {
                        zIndex: 1800, // stays above the modal & table
                      },
                    },
                  }}
                >
                  {filteredUserOptions.map((u) => (
                    <Option key={u.id} value={u.id}>
                      {u.name}
                      {u.empId ? ` (${u.empId})` : ""}
                    </Option>
                  ))}
                </Select>
              </FormControl>

              {isUsersLoading && (
                <Stack alignItems="center">
                  <CircularProgress size="sm" />
                </Stack>
              )}

              {isUsersError && (
                <Alert color="danger" variant="soft">
                  {usersError?.data?.message || "Failed to load users."}
                </Alert>
              )}

              {isAssignError && (
                <Alert color="danger" variant="soft">
                  {assignError?.data?.message ||
                    "Failed to assign primary reporting. Please try again."}
                </Alert>
              )}
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="flex-end"
              spacing={1}
              sx={{ mt: 3 }}
            >
              <Button
                variant="outlined"
                onClick={handleCloseAssignModal}
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                loading={isAssigning}
                disabled={
                  isAssigning ||
                  !selectedDesignation ||
                  !selectedUserId ||
                  selectedIds.length === 0
                }
                onClick={handleSubmitAssign}
              >
                Assign
              </Button>
            </Stack>
          </ModalDialog>
        </Modal>
      </Box>
    </CssVarsProvider>
  );
}

export default DprManagement;
