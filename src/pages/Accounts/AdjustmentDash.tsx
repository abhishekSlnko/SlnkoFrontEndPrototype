// AdjustmentDashboardPage.jsx
import { useEffect, useMemo, useState } from "react";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Sidebar from "../../component/Partials/Sidebar";
import MainHeader from "../../component/Partials/MainHeader";
import SubHeader from "../../component/Partials/SubHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdjustmentDashboard from "../../component/AdjustDashboard";
import Filter from "../../component/Partials/Filter";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Textarea from "@mui/joy/Textarea";
import { toast } from "react-toastify";
import Select from "react-select";
import { useUpdateAdjustmentStatusMutation } from "../../redux/Accounts";

function AdjustmentDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) return JSON.parse(userData);
    return null;
  };

  const blockedEmpIds = ["SE-398", "SE-203", "SE-212"];
  const canSeePaymentButtons = !blockedEmpIds.includes(
    String(user?.emp_id || "").trim(),
  );

  const [open, setOpen] = useState(false);

  const fields = [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Pending", value: "pending" },
      ],
    },
  ];

  // -------------------- STATUS MODAL STATE --------------------
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState("pending");
  const [statusRemarks, setStatusRemarks] = useState("");

  const status = useMemo(() => {
    const s = (searchParams.get("status") || "").toString();
    return s || "mixed";
  }, [searchParams]);

  const STATUS_OPTIONS = useMemo(
    () => [
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
    [],
  );

  const selectStyles = useMemo(
    () => ({
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    }),
    [],
  );

  const menuPortalTarget =
    typeof document !== "undefined" ? document.body : null;

  const closeStatusModal = () => {
    setStatusModalOpen(false);
    setStatusAction("pending");
    setStatusRemarks("");
  };

  const openStatusModal = () => {
    if (!selectedIds.length) return;
    setStatusModalOpen(true);
  };

  // -------------------- API HOOK --------------------
  const [updateAdjustmentStatus, { isLoading: isUpdatingStatus }] =
    useUpdateAdjustmentStatusMutation();

  const submitStatusUpdate = async () => {
    if (!selectedIds.length) {
      toast.warning("Please select at least one adjustment.");
      return;
    }

    if (!["pending", "approved", "rejected"].includes(statusAction)) {
      toast.error("Please select a valid status.");
      return;
    }

    try {
      const res = await updateAdjustmentStatus({
        status: statusAction,
        remarks: statusRemarks,
        ids: selectedIds,
      }).unwrap();

      toast.success(res?.message || "Status updated");
      setSelectedIds([]); // ✅ clear selection after update
      closeStatusModal();
    } catch (e) {
      toast.error(e?.data?.message || e?.message || "Failed to update status");
    }
  };

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100%" }}>
        <Sidebar />

        <MainHeader title="Accounting" sticky>
          <Box display="flex" gap={1}>
            {(user?.department === "admin" ||
              user?.department === "superadmin" ||
              user?.department === "Accounts" ||
              user?.department === "CAM" ||
              (user?.department === "SCM" && user?.role === "manager") ||
              user?.name === "Prachi Singh" ||
              (user?.department === "SCM" && user?.name === "Shubham Gupta") ||
              user?.role === "visitor" ||
              user?.emp_id === "SE-203" ||
              user?.emp_id === "SE-398") && (
              <Button
                size="sm"
                onClick={() => navigate(`/project-balance?status=ongoing`)}
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
                Project Balances
              </Button>
            )}

            {(user?.department === "Accounts" ||
              user?.department === "admin" ||
              user?.department === "superadmin" ||
              user?.department === "SCM" ||
              user?.department === "CAM" ||
              user?.emp_id === "SE-203" || user?.emp_id === "SE-398" ||
              user?.role === "visitor" ||
              user?.name === "Prachi Singh") && (
              <Button
                size="sm"
                onClick={() => navigate(`/daily-payment-request?tab=instant`)}
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
                Payment Request
              </Button>
            )}

            {(user?.department === "Accounts" ||
              user?.department === "superadmin" ||
              user?.department === "admin" ||
              (user?.department === "SCM" && user?.role === "manager") ||
              user?.name === "Prachi Singh") && (
              <Button
                size="sm"
                onClick={() => navigate(`/adjustment-dashboard`)}
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
                Adjustments
              </Button>
            )}

            {((user?.department === "Accounts" && user?.role === "manager") ||
              user?.role === "visitor" ||
              (user?.department === "SCM" && user?.role === "manager") ||
              user?.department === "superadmin" ||
              user?.department === "admin") && (
              <Button
                size="sm"
                onClick={() => navigate(`/payment-approval`)}
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
                Payment Approval
              </Button>
            )}

            {((user?.department === "Accounts" ||
              user?.department === "superadmin") ||
              user?.department === "admin" ||
              (user?.department === "SCM" && user?.role === "manager") ||
              user?.name === "Prachi Singh") && (
              <Button
                size="sm"
                onClick={() => navigate(`/payment-approved`)}
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
                Approved Payment
              </Button>
            )}
          </Box>
        </MainHeader>

        <SubHeader
          title="Adjustments"
          isBackEnabled={false}
          sticky
          rightSlot={
            <>
              {selectedIds.length > 0 && (
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={openStatusModal}
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
                  Update Status
                </Button>
              )}

              <Button
                sx={{
                  backgroundColor: "#3366a3",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#285680" },
                  height: "8px",
                }}
                size="sm"
                onClick={() => navigate("/adjust_request")}
              >
                Adjustment Form
              </Button>

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
                      ...(values.status && { status: String(values.status) }),
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
                    delete merged.matchMode;
                    return { ...merged, page: "1" };
                  });
                }}
              />

              {/* -------------------- STATUS MODAL -------------------- */}
              <Modal open={statusModalOpen} onClose={closeStatusModal}>
                <ModalDialog size="md" sx={{ borderRadius: "lg" }}>
                  <ModalClose />

                  <Typography level="h4" fontWeight="xl">
                    Update Status
                  </Typography>

                  <Typography
                    level="body-sm"
                    sx={{ color: "text.tertiary", mt: 0.5 }}
                  >
                    Selected: <b>{selectedIds.length}</b> &nbsp;|&nbsp; Current:{" "}
                    <b style={{ textTransform: "capitalize" }}>{status}</b>
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <FormControl>
                    <FormLabel>Status</FormLabel>

                    <Select
                      styles={selectStyles}
                      options={STATUS_OPTIONS}
                      value={
                        STATUS_OPTIONS.find((o) => o.value === statusAction) ||
                        null
                      }
                      onChange={(opt) =>
                        setStatusAction(opt?.value || "pending")
                      }
                      menuPortalTarget={menuPortalTarget}
                    />
                  </FormControl>

                  <FormControl sx={{ mt: 2 }}>
                    <FormLabel>Remarks</FormLabel>
                    <Textarea
                      minRows={3}
                      value={statusRemarks}
                      onChange={(e) => setStatusRemarks(e.target.value)}
                      placeholder="Write remarks (optional)"
                    />
                  </FormControl>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      justifyContent: "flex-end",
                      mt: 2,
                    }}
                  >
                    <Button
                      variant="outlined"
                      color="neutral"
                      onClick={closeStatusModal}
                    >
                      Cancel
                    </Button>

                    <Button
                      variant="solid"
                      color={statusAction === "rejected" ? "danger" : "primary"}
                      loading={isUpdatingStatus}
                      onClick={submitStatusUpdate}
                    >
                      Update
                    </Button>
                  </Box>
                </ModalDialog>
              </Modal>
            </>
          }
        />

        <Box
          component="main"
          className="MainContent"
          sx={{
            pt: {
              xs: "calc(12px + var(--Header-height))",
              sm: "calc(12px + var(--Header-height))",
              md: 3,
            },
            mt: "90px",
            p: "16px",
            px: "12px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "88dvh",
            overflow: "auto",
            gap: 1,
            "@media print": { px: 1, pt: 0, pb: 0, minWidth: "1000px" },
          }}
        >
          <AdjustmentDashboard setSelectedIds={setSelectedIds} />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}

export default AdjustmentDashboardPage;
