import { Box, Button, CssBaseline, CssVarsProvider } from "@mui/joy";
import Sidebar from "../../component/Partials/Sidebar";
import MainHeader from "../../component/Partials/MainHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import SubHeader from "../../component/Partials/SubHeader";
import { useState, useEffect, useMemo } from "react";
import Users from "../../component/Users";
import Filter from "../../component/Partials/Filter";
import { useGetAllDeptQuery } from "../../redux/globalTaskSlice";
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  FormControl,
  FormLabel,
  CircularProgress,
} from "@mui/joy";
import { toast } from "react-toastify";
import ReactSelect from "react-select";
import {
  useGetLoginsQuery,
  useUpdateReportingMutation,
} from "../../redux/loginSlice";

function UserDashBoard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState([]);
  const [openReporting, setOpenReporting] = useState(false);
  const [reportingType, setReportingType] = useState(""); 
  const [reportingUser, setReportingUser] = useState("");
  const { data: loginsData, isLoading: isLoginsLoading } = useGetLoginsQuery();
  const [updateReporting, { isLoading: isUpdatingReporting }] =
    useUpdateReportingMutation();

  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) return JSON.parse(userData);
    return null;
  };

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  const role = useMemo(
    () =>
      String(user?.role || "")
        .trim()
        .toLowerCase(),
    [user]
  );
  const dept = useMemo(
    () =>
      String(user?.department || "")
        .trim()
        .toLowerCase(),
    [user]
  );

  const isAdmin = role === "admin" || role === "superadmin";
  const canSeeUserButton = isAdmin || dept === "hr";
  const canSeeSiteEngineersButton =
    isAdmin || (dept === "projects" && role === "manager");

  const { data: deptApiData, isLoading: isDeptLoading } = useGetAllDeptQuery();
  const deptList = (deptApiData?.data || []).filter(Boolean);

  const fields = [
    {
      key: "status",
      label: "Filter By Working Status",
      type: "select",
      options: [
        { label: "Working", value: "working" },
        { label: "Idle", value: "idle" },
        { label: "Work Stopped", value: "work_stopped" },
        { label: "Travelling", value: "travelling" },
        { label: "On Leave", value: "on leave" },
      ],
    },
    {
      key: "department",
      label: "Department",
      type: "select",
      options: isDeptLoading
        ? []
        : deptList.map((d) => ({ label: d, value: d })),
    },
  ];

  const reportingUserOptions = useMemo(() => {
    const list = loginsData?.data || loginsData || [];
    return (list || [])
      .filter(Boolean)
      .map((u) => ({
        value: u?._id,
        label: String(u?.name || "").trim() || "User",
      }))
      .filter((x) => x.value);
  }, [loginsData]);

  const reportingTypeOptions = useMemo(
    () => [
      { value: "primary reporting", label: "Primary Reporting" },
      { value: "secondary reporting", label: "Secondary Reporting" },
    ],
    []
  );

  const selectedReportingUserOption = useMemo(() => {
    if (!reportingUser) return null;
    return (
      reportingUserOptions.find(
        (o) => String(o.value) === String(reportingUser)
      ) || null
    );
  }, [reportingUser, reportingUserOptions]);

  const selectedReportingTypeOption = useMemo(() => {
    if (!reportingType) return null;
    return (
      reportingTypeOptions.find(
        (o) => String(o.value) === String(reportingType)
      ) || null
    );
  }, [reportingType, reportingTypeOptions]);

  const handleOpenReporting = () => {
    if (!selectedIds?.length) return;
    setReportingType("");
    setReportingUser("");
    setOpenReporting(true);
  };

  const handleUpdateReporting = async () => {
    try {
      if (!selectedIds?.length) return toast.error("Select at least 1 user");
      if (!reportingType) return toast.error("Select reporting type");
      if (!reportingUser) return toast.error("Select reporting user");

      await updateReporting({
        ids: selectedIds,
        type: reportingType,
        reporting_user: reportingUser,
      }).unwrap();

      toast.success("Reporting updated successfully");
      setOpenReporting(false);
    } catch (err) {
      toast.error(
        err?.data?.message || err?.message || "Failed to update reporting"
      );
    }
  };

  const reactSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 36,
      borderRadius: 10,
      borderColor: state.isFocused ? "#3366a3" : "rgba(0,0,0,0.2)",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(51,102,163,0.25)" : "none",
      "&:hover": { borderColor: "#3366a3" },
      backgroundColor: "#fff",
    }),
    valueContainer: (base) => ({ ...base, padding: "0 10px" }),
    input: (base) => ({ ...base, margin: 0, padding: 0 }),
    indicatorsContainer: (base) => ({ ...base, height: 36 }),
    menu: (base) => ({ ...base, zIndex: 13000 }),
    menuPortal: (base) => ({ ...base, zIndex: 13000 }),
    option: (base, state) => ({
      ...base,
      fontSize: 14,
      backgroundColor: state.isFocused ? "rgba(51,102,163,0.12)" : "#fff",
      color: "#111827",
      cursor: "pointer",
    }),
  };

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box
        sx={{ display: "flex", minHeight: "100dvh", flexDirection: "column" }}
      >
        <Sidebar />

        <MainHeader title={"Projects"} sticky>
          <Box display="flex" gap={1}>
            <>
              {canSeeUserButton && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/user_dash`)}
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
                  User
                </Button>
              )}

              {canSeeSiteEngineersButton && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/site_users`)}
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
                  Site Engineers
                </Button>
              )}
            </>
          </Box>
        </MainHeader>

        <SubHeader
          title="User"
          isBackEnabled={false}
          sticky
          rightSlot={
            <>
              {selectedIds.length > 0 && (
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={handleOpenReporting}
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
                  Change Reporting
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
                    delete merged.status;
                    delete merged.department;
                    delete merged.matchMode;

                    const next = {
                      ...merged,
                      page: "1",
                      ...(values.status && { status: String(values.status) }),
                      ...(values.department && {
                        department: String(values.department),
                      }),
                    };

                    if (values.matcher) {
                      next.matchMode = values.matcher === "OR" ? "any" : "all";
                    }

                    return next;
                  });
                  setOpen(false);
                }}
                onReset={() => {
                  setSearchParams((prev) => {
                    const merged = Object.fromEntries(prev.entries());
                    delete merged.status;
                    delete merged.department;
                    delete merged.matchMode;
                    return { ...merged, page: "1" };
                  });
                }}
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
          <Users setSelectedIds={setSelectedIds} />
        </Box>


        <Modal open={openReporting} onClose={() => setOpenReporting(false)}>
          <ModalDialog
            variant="outlined"
            sx={{
              width: { xs: "94vw", sm: 520 },
              borderRadius: "lg",
              p: 2,
            }}
          >
            <ModalClose />
            <Typography level="title-md" sx={{ mb: 0.5 }}>
              Change Reporting
            </Typography>

            <Typography
              level="body-sm"
              sx={{ color: "text.tertiary", mb: 1.5 }}
            >
              Selected Users: <b>{selectedIds.length}</b>
            </Typography>

            <Box sx={{ display: "grid", gap: 1.25 }}>

              <FormControl>
                <FormLabel>Reporting Type</FormLabel>
                <ReactSelect
                  options={reportingTypeOptions}
                  value={selectedReportingTypeOption}
                  onChange={(opt) => setReportingType(opt?.value || "")}
                  isClearable
                  isSearchable
                  placeholder="Search type..."
                  menuPortalTarget={document.body}
                  styles={reactSelectStyles}
                  isDisabled={isUpdatingReporting}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Select Reporting User</FormLabel>

                {isLoginsLoading ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      py: 1,
                    }}
                  >
                    <CircularProgress size="sm" />
                    <Typography level="body-sm">Loading users...</Typography>
                  </Box>
                ) : (
                  <ReactSelect
                    options={reportingUserOptions}
                    value={selectedReportingUserOption}
                    onChange={(opt) => setReportingUser(opt?.value || "")}
                    isClearable
                    isSearchable
                    placeholder="Search user..."
                    menuPortalTarget={document.body}
                    styles={reactSelectStyles}
                    isDisabled={isUpdatingReporting}
                  />
                )}
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
                  onClick={() => setOpenReporting(false)}
                  disabled={isUpdatingReporting}
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
                  Cancel
                </Button>

                <Button
                  variant="solid"
                  onClick={handleUpdateReporting}
                  loading={isUpdatingReporting}
                  disabled={
                    !selectedIds.length ||
                    !reportingType ||
                    !reportingUser ||
                    isUpdatingReporting
                  }
                  sx={{
                    backgroundColor: "#3366a3",
                    "&:hover": { backgroundColor: "#285680" },
                  }}
                >
                  Update
                </Button>
              </Box>
            </Box>
          </ModalDialog>
        </Modal>
      </Box>
    </CssVarsProvider>
  );
}

export default UserDashBoard;
