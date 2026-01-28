import { Box, Button, CssBaseline, CssVarsProvider } from "@mui/joy";
import Sidebar from "../../component/Partials/Sidebar";
import MainHeader from "../../component/Partials/MainHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import SubHeader from "../../component/Partials/SubHeader";
import { useState, useEffect, useMemo } from "react";
import Filter from "../../component/Partials/Filter";
import SiteEngineers from "../../component/SiteUsers";
import {
  useGetProjectDropdownQuery,
  useUpdateSiteRoleMutation, // ✅ NEW
} from "../../redux/projectsSlice";

// ✅ NEW imports for modal + dropdown
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";

function SiteUsersDashBoard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ NEW: selected user ids from table (SiteEngineers)
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // ✅ NEW: change role modal state
  const [siteRoleModalOpen, setSiteRoleModalOpen] = useState(false);
  const [siteRoleDraft, setSiteRoleDraft] = useState("");

  // ✅ NEW: mutation hook
  const [updateSiteRole, { isLoading: isUpdatingSiteRole }] =
    useUpdateSiteRoleMutation();

  const SITE_ROLE_OPTIONS = useMemo(
    () => [
      { label: "Civil Engineer", value: "Civil Engineer" },
      { label: "Electrical Engineer", value: "Electrical Engineer" },
      { label: "Transmission Line", value: "Transmission Line" },
      { label: "Surveyor", value: "Surveyor" },
    ],
    []
  );

  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) return JSON.parse(userData);
    return null;
  };

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  // ✅ permissions
  const role = useMemo(
    () => String(user?.role || "").trim().toLowerCase(),
    [user]
  );
  const dept = useMemo(
    () => String(user?.department || "").trim().toLowerCase(),
    [user]
  );

  const isAdmin = role === "admin" || role === "superadmin";
  const canSeeUserButton = isAdmin || dept === "hr";
  const canSeeSiteEngineersButton =
    isAdmin || (dept === "projects" && role === "manager");

  // ---------- Project dropdown (same style as DPR) ----------
  const { data: dropdownRaw, isLoading: isDropdownLoading } =
    useGetProjectDropdownQuery();

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
  const reportingFromUrl = searchParams.get("reporting") || "";
  const stateFromUrl = searchParams.get("state") || "";
  const isAssignedFromUrl = searchParams.get("isAssigned") || "";
  const fromFromUrl = searchParams.get("from") || "";
  const toFromUrl = searchParams.get("to") || "";

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

  const STATE_OPTIONS = [
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

  const fields = [
    {
      key: "projectId",
      label: "Project Code",
      type: "select",
      options: projectOptions,
    },
    {
      key: "reporting",
      label: "User Reporting",
      type: "select",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
    },
    { key: "state", label: "State", type: "select", options: STATE_OPTIONS },
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
      key: "isAssigned",
      label: "Assigned/Un-Assigned",
      type: "select",
      options: [
        { label: "Assigned", value: "true" },
        { label: "Un-Assigned", value: "false" },
      ],
    },
    { key: "deadline", label: "Deadline (Range)", type: "daterange" },
  ];

  const initialDeadline =
    fromFromUrl || toFromUrl
      ? { from: fromFromUrl || undefined, to: toFromUrl || undefined }
      : undefined;

  // ✅ modal open handler
  const openSiteRoleModal = () => {
    setSiteRoleDraft("");
    setSiteRoleModalOpen(true);
  };

  // ✅ IMPORTANT: call API here
  const handleSiteRoleSave = async () => {
    try {
      const payload = {
        ids: selectedUserIds, // ✅ backend expects "ids"
        site_role: siteRoleDraft,
      };

      console.log("updateSiteRole payload =>", payload);

      const res = await updateSiteRole(payload).unwrap();
      console.log("updateSiteRole success =>", res);

      setSiteRoleModalOpen(false);
      setSiteRoleDraft("");
      // optional: clear selection
      // setSelectedUserIds([]);
    } catch (err) {
      console.log("updateSiteRole error =>", err);
    }
  };

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100dvh", flexDirection: "column" }}>
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
          title="Site Engineers"
          isBackEnabled={false}
          sticky
          rightSlot={
            <Box display="flex" alignItems="center" gap={1}>
              <Button
                size="sm"
                variant="outlined"
                onClick={openSiteRoleModal}
                disabled={selectedUserIds.length === 0}
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
                Change site role
              </Button>

              <Filter
                open={open}
                onOpenChange={setOpen}
                fields={fields}
                title="Filters"
                disabled={isDropdownLoading}
                initialValues={{
                  projectId: projectIdFromUrl || undefined,
                  status: statusFromUrl || undefined,
                  reporting: reportingFromUrl || undefined,
                  state: stateFromUrl || undefined,
                  isAssigned: isAssignedFromUrl || undefined,
                  deadline: initialDeadline,
                }}
                onApply={(values) => {
                  setSearchParams((prev) => {
                    const merged = Object.fromEntries(prev.entries());
                    delete merged.status;
                    delete merged.department;
                    delete merged.matchMode;
                    delete merged.reporting;
                    delete merged.state;
                    delete merged.isAssigned;
                    delete merged.projectId;
                    delete merged.from;
                    delete merged.to;

                    const next = {
                      ...merged,
                      page: "1",
                      ...(values.status && { status: String(values.status) }),
                      ...(values.reporting && {
                        reporting: String(values.reporting),
                      }),
                      ...(values.state && { state: String(values.state) }),
                      ...(values.isAssigned && {
                        isAssigned: String(values.isAssigned),
                      }),
                      ...(values.projectId && {
                        projectId: String(values.projectId),
                      }),
                    };

                    const dr = values.deadline;
                    if (dr?.from) next.from = dr.from;
                    if (dr?.to) next.to = dr.to;

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
                    delete merged.reporting;
                    delete merged.state;
                    delete merged.isAssigned;
                    delete merged.projectId;
                    delete merged.from;
                    delete merged.to;
                    return { ...merged, page: "1" };
                  });
                }}
              />
            </Box>
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
          <SiteEngineers onSelectionChange={setSelectedUserIds} />
        </Box>
      </Box>

      <Modal
        open={siteRoleModalOpen}
        onClose={() => setSiteRoleModalOpen(false)}
      >
        <ModalDialog sx={{ width: "min(92vw, 420px)" }}>
          <ModalClose />
          <Typography level="title-lg" sx={{ mb: 0.5 }}>
            Change site role
          </Typography>
          <Typography level="body-sm" color="neutral" sx={{ mb: 2 }}>
            Select a site role from the dropdown.
          </Typography>

          <Stack spacing={2}>
            <FormControl>
              <FormLabel>Site Role</FormLabel>
              <Select
                placeholder="Select site role"
                value={siteRoleDraft || null}
                onChange={(e, val) => setSiteRoleDraft(val || "")}
              >
                {SITE_ROLE_OPTIONS.map((o) => (
                  <Option key={o.value} value={o.value}>
                    {o.label}
                  </Option>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" justifyContent="flex-end" gap={1}>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => setSiteRoleModalOpen(false)}
                disabled={isUpdatingSiteRole}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="solid"
                onClick={handleSiteRoleSave}
                disabled={
                  !siteRoleDraft ||
                  selectedUserIds.length === 0 ||
                  isUpdatingSiteRole
                }
              >
                {isUpdatingSiteRole ? "Updating..." : "Update"}
              </Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>
    </CssVarsProvider>
  );
}

export default SiteUsersDashBoard;