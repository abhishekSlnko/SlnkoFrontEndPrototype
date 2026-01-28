import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import { useEffect, useState } from "react";
import Button from "@mui/joy/Button";
import Sidebar from "../../component/Partials/Sidebar";
import Dash_task from "../../component/All_Tasks/TaskView";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useExportTasksToCsvMutation,
  useGetAllDeptQuery,
  useGetAllUserQuery,
  useCreateProjectsTitleMutation,
} from "../../redux/globalTaskSlice";
import MainHeader from "../../component/Partials/MainHeader";
import SubHeader from "../../component/Partials/SubHeader";
import { Add } from "@mui/icons-material";
import Filter from "../../component/Partials/Filter";
import {
  IconButton,
  Modal,
  ModalDialog,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Typography,
  CircularProgress,
} from "@mui/joy";
import AddTask from "../../component/All_Tasks/Add_Task";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { toast } from "react-toastify";

function AllTask() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openAddTaskModal, setOpenAddTaskModal] = useState(false);

  const [user, setUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [open, setOpen] = useState(false);

  const [openProjectTitleModal, setOpenProjectTitleModal] = useState(false);
  const [ptTitle, setPtTitle] = useState("");
  const [ptMaxTat, setPtMaxTat] = useState("");
  const [ptDescription, setPtDescription] = useState("");

  const isAdminUser =
    user?.department === "admin" || user?.department === "superadmin";

  const { data: deptApiData, isLoading: isDeptLoading } = useGetAllDeptQuery();
  const deptList = (deptApiData?.data || []).filter(Boolean);

  const { data: usersResp, isFetching: isUsersLoading } = useGetAllUserQuery({
    department: "",
  });

  const userOptions = (
    Array.isArray(usersResp?.data)
      ? usersResp.data
      : Array.isArray(usersResp)
      ? usersResp
      : []
  )
    .filter(Boolean)
    .map((u) => ({ label: u?.name || "User", value: u?._id || "" }))
    .filter((o) => o.value);

  useEffect(() => {
    const userData = localStorage.getItem("userDetails");
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const [exportTasksToCsv] = useExportTasksToCsvMutation();

  const [createProjectsTitle, { isLoading: isCreatingPt }] =
    useCreateProjectsTitleMutation();

  const handleExport = async (selectedIds) => {
    try {
      if (!selectedIds?.length) {
        toast.error("No tasks selected for export.");
        return;
      }
      const response = await exportTasksToCsv(selectedIds).unwrap();
      const blob = new Blob([response], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tasks_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to export tasks to CSV.");
    }
  };

  const fields = [
    {
      key: "tab",
      label: "Status",
      type: "multiselect",
      options: [
        { label: "All", value: " " },
        { label: "Auto Tasks", value: "Auto Tasks" },
        { label: "Approval Pending", value: "Approval Pending" },
        { label: "Approval Done", value: "Approved" },
        { label: "Rejected", value: "Rejected" },
        { label: "On Hold", value: "on hold" },
        { label: "Pending", value: "Pending" },
        { label: "Reassigned", value: "Reassigned" },
        { label: "In Progress", value: "In Progress" },
        { label: "Completed", value: "Completed" },
        { label: "Cancelled", value: "Cancelled" },
      ],
    },
    {
      key: "priorityFilter",
      label: "Filter By Priority",
      type: "select",
      options: [
        { label: "High", value: "1" },
        { label: "Medium", value: "2" },
        { label: "Low", value: "3" },
      ],
    },
    { key: "createdAt", label: "Filter by Date", type: "daterange" },
    { key: "deadline", label: "Filter by Deadline", type: "daterange" },
    {
      key: "department",
      label: "Department",
      type: "select",
      options: isDeptLoading
        ? []
        : deptList.map((d) => ({ label: d, value: d })),
    },
    {
      key: "assigned_to",
      label: "Assigned To",
      type: "select",
      options: isUsersLoading ? [] : userOptions,
    },
    {
      key: "createdBy",
      label: "Created By",
      type: "select",
      options: isUsersLoading ? [] : userOptions,
    },
    {
      key: "approverId",
      label: "Approvers",
      type: "select",
      options: isUsersLoading ? [] : userOptions,
    },
    {
      key: "taskType",
      label: "Type",
      type: "select",
      options: [
        { label: "Tasks Given", value: "given" },
        { label: "Tasks Assigned", value: "assigned" },
      ],
    },
  ];

  const handleProjectTitleSubmit = async () => {
    const t = String(ptTitle || "").trim();
    const d = String(ptDescription || "").trim();
    const rawTat = String(ptMaxTat ?? "").trim();

    if (!t) return toast.error("Task Title is required");
    if (rawTat) {
      const m = rawTat.match(/(\d+(\.\d+)?)/);
      const n = m ? Number(m[1]) : NaN;
      if (Number.isNaN(n) || n <= 0) {
        return toast.error("Maximum TAT must contain a number greater than 0");
      }
    }

    const payload = {
      title: t,
      description: d,
      max_tat: rawTat ? rawTat : null,
    };

    try {
      await createProjectsTitle(payload).unwrap();
      toast.success("Project Task Title created");
      setPtTitle("");
      setPtMaxTat("");
      setPtDescription("");
      setOpenProjectTitleModal(false);
    } catch (e) {
      toast.error(e?.data?.message || "Failed to create Project Task Title");
    }
  };

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />

        <MainHeader title="Tasks" sticky>
          <Box display="flex" gap={1}>
            <Button
              size="sm"
              onClick={() => navigate(`/task_dashboard`)}
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

            <Button
              size="sm"
              onClick={() => navigate(`/all_task`)}
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
              All Tasks
            </Button>

            <Button
              size="sm"
              onClick={() => navigate(`/my_approval_task`)}
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
              My Approvals
            </Button>
          </Box>
        </MainHeader>

        <SubHeader title="All Tasks" isBackEnabled={false} sticky>
          {/* ✅ LEFT SIDE */}
          <Box display="flex" gap={1} alignItems="center">
            <Button
              variant="solid"
              size="sm"
              startDecorator={<Add />}
              onClick={() => setOpenAddTaskModal(true)}
              sx={{
                backgroundColor: "#3366a3",
                color: "#fff",
                "&:hover": { backgroundColor: "#285680" },
                height: "8px",
              }}
            >
              Add Task
            </Button>

            {/* ✅ AFTER Add Task */}
            {isAdminUser && (
              <Button
                variant="outlined"
                size="sm"
                onClick={() => setOpenProjectTitleModal(true)}
                sx={{
                  color: "#3366a3",
                  borderColor: "#3366a3",
                  backgroundColor: "transparent",
                  "--Button-hoverBg": "#e0e0e0",
                  "--Button-hoverBorderColor": "#3366a3",
                  "&:hover": { color: "#3366a3" },
                  height: "8px",
                }}
              >
                Project Task Title
              </Button>
            )}

            {selectedIds?.length > 0 && (
              <Button
                variant="outlined"
                size="sm"
                onClick={() => handleExport(selectedIds)}
                sx={{
                  color: "#3366a3",
                  borderColor: "#3366a3",
                  backgroundColor: "transparent",
                  "--Button-hoverBg": "#e0e0e0",
                  "--Button-hoverBorderColor": "#3366a3",
                  "&:hover": { color: "#3366a3" },
                  height: "8px",
                }}
              >
                Export
              </Button>
            )}

            <Filter
              open={open}
              onOpenChange={setOpen}
              fields={fields}
              title="Filters"
              onApply={(values) => {
                setSearchParams((prev) => {
                  const merged = Object.fromEntries(prev.entries());
                  delete merged.priorityFilter;
                  delete merged.status;
                  delete merged.department;
                  delete merged.assigned_to;
                  delete merged.createdBy;
                  delete merged.from;
                  delete merged.to;
                  delete merged.deadlineFrom;
                  delete merged.deadlineTo;
                  delete merged.taskType;
                  delete merged.tab;
                  delete merged.approverId;
                  delete merged.matchMode;

                  const next = {
                    ...merged,
                    page: "1",
                    ...(values.priorityFilter && {
                      priorityFilter: String(values.priorityFilter),
                    }),
                    ...(values.status && { status: String(values.status) }),
                    ...(values.department && {
                      department: String(values.department),
                    }),
                  };

                  if (values.matcher) {
                    next.matchMode = values.matcher === "OR" ? "any" : "all";
                  }

                  if (values.createdAt?.from)
                    next.from = String(values.createdAt.from);
                  if (values.createdAt?.to)
                    next.to = String(values.createdAt.to);

                  if (values.deadline?.from)
                    next.deadlineFrom = String(values.deadline.from);
                  if (values.deadline?.to)
                    next.deadlineTo = String(values.deadline.to);

                  if (values.assigned_to)
                    next.assigned_to = String(values.assigned_to);
                  if (values.createdBy)
                    next.createdBy = String(values.createdBy);
                  if (values.taskType) next.taskType = String(values.taskType);
                  if (values.approverId)
                    next.approverId = String(values.approverId);
                  if (values.tab) next.tab = String(values.tab);
                  return next;
                });
                setOpen(false);
              }}
              onReset={() => {
                setSearchParams((prev) => {
                  const merged = Object.fromEntries(prev.entries());
                  delete merged.priorityFilter;
                  delete merged.status;
                  delete merged.department;
                  delete merged.groupBy;
                  delete merged.assigned_to;
                  delete merged.createdBy;
                  delete merged.from;
                  delete merged.to;
                  delete merged.deadlineFrom;
                  delete merged.deadlineTo;
                  delete merged.taskType;
                  delete merged.tab;
                  delete merged.approverId;
                  delete merged.matchMode;
                  return { ...merged, page: "1" };
                });
              }}
            />
          </Box>
        </SubHeader>

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
          <Dash_task
            selected={selectedIds}
            setSelected={setSelectedIds}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />
        </Box>

        {/* ✅ Add Task Modal */}
        <Modal
          open={openAddTaskModal}
          onClose={() => setOpenAddTaskModal(false)}
        >
          <ModalDialog
            variant="outlined"
            sx={{
              p: 0,
              borderRadius: "md",
              boxShadow: "lg",
              overflow: "hidden",
              width: "auto",
              height: "auto",
              maxWidth: "unset",
              maxHeight: "unset",
              backgroundColor: "background.surface",
              backdropFilter: "none",
            }}
          >
            <Box
              sx={{
                width: { xs: "95vw", sm: 720 },
                maxHeight: "85vh",
                overflow: "auto",
                position: "relative",
              }}
            >
              <IconButton
                variant="plain"
                color="neutral"
                onClick={() => setOpenAddTaskModal(false)}
                sx={{
                  position: "sticky",
                  top: 8,
                  left: "calc(100% - 40px)",
                  zIndex: 2,
                }}
              >
                <CloseRoundedIcon />
              </IconButton>
              <AddTask />
            </Box>
          </ModalDialog>
        </Modal>

        {/* ✅ Project Task Title Modal */}
        <Modal
          open={openProjectTitleModal}
          onClose={() => !isCreatingPt && setOpenProjectTitleModal(false)}
        >
          <ModalDialog
            variant="outlined"
            sx={{
              p: 0,
              borderRadius: "md",
              boxShadow: "lg",
              overflow: "hidden",
              width: { xs: "95vw", sm: 520 },
              backgroundColor: "background.surface",
            }}
          >
            <Box sx={{ p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography level="title-md" fontWeight="lg">
                  Project Task Title
                </Typography>
                <IconButton
                  variant="plain"
                  color="neutral"
                  onClick={() =>
                    !isCreatingPt && setOpenProjectTitleModal(false)
                  }
                >
                  <CloseRoundedIcon />
                </IconButton>
              </Box>

              <Box sx={{ display: "grid", gap: 1.25 }}>
                <FormControl size="sm">
                  <FormLabel>Task Title</FormLabel>
                  <Input
                    value={ptTitle}
                    onChange={(e) => setPtTitle(e.target.value)}
                    placeholder="Enter Task Title"
                  />
                </FormControl>

                <FormControl size="sm">
                  <FormLabel>Maximum TAT</FormLabel>
                  <Input
                    type="text"
                    value={ptMaxTat}
                    onChange={(e) => setPtMaxTat(e.target.value)}
                    placeholder="e.g. 7 days/hrs"
                  />
                </FormControl>

                <FormControl size="sm">
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    minRows={3}
                    value={ptDescription}
                    onChange={(e) => setPtDescription(e.target.value)}
                    placeholder="Write Description..."
                  />
                </FormControl>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1,
                    mt: 0.5,
                  }}
                >
                  <Button
                    variant="outlined"
                    color="neutral"
                    onClick={() => setOpenProjectTitleModal(false)}
                    disabled={isCreatingPt}
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
                    onClick={handleProjectTitleSubmit}
                    disabled={isCreatingPt}
                    startDecorator={
                      isCreatingPt ? <CircularProgress size="sm" /> : null
                    }
                    sx={{
                      backgroundColor: "#3366a3",
                      color: "#fff",
                      "&:hover": { backgroundColor: "#285680" },
                    }}
                  >
                    {isCreatingPt ? "Saving..." : "Submit"}
                  </Button>
                </Box>
              </Box>
            </Box>
          </ModalDialog>
        </Modal>
      </Box>
    </CssVarsProvider>
  );
}

export default AllTask;
