import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import { useEffect, useRef, useState } from "react";
import Sidebar from "../../component/Partials/Sidebar";
import MainHeader from "../../component/Partials/MainHeader";
import {
  Button,
  ModalClose,
  Modal,
  ModalDialog,
  Typography,
  Dropdown,
  MenuButton,
  Menu,
  MenuItem,
  ListDivider,
} from "@mui/joy";
import { useNavigate, useSearchParams } from "react-router-dom";
import SubHeader from "../../component/Partials/SubHeader";
import { Add } from "@mui/icons-material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import AllLoan from "../../component/AllLoan";
import AddLoan from "../../component/Forms/AddLoan";
import Filter from "../../component/Partials/Filter";
import DownloadIcon from "@mui/icons-material/Download";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import { useExportLoanMutation } from "../../redux/projectsSlice";
import { toast } from "react-toastify";

function Loan() {
  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState([]);
  const [snack] = useState({ open: false, msg: "" });
  const [open, setOpen] = useState(false);
  const loanRef = useRef();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const safeMsg = String(snack?.msg ?? "");
  const [loanModalOpen, setLoanModalOpen] = useState(false);

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

  // Back button: prefer history back, otherwise fall back to dashboard
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/loan_dashboard");
    }
  };

  const [exportLoan] = useExportLoanMutation();
  const downloadBlob = (blob, filename = "loans_export.csv") => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const indianStates = [
    { label: "Andhra Pradesh", value: "andhra pradesh" },
    { label: "Arunachal Pradesh", value: "arunachal pradesh" },
    { label: "Assam", value: "assam" },
    { label: "Bihar", value: "bihar" },
    { label: "Chhattisgarh", value: "chhattisgarh" },
    { label: "Goa", value: "goa" },
    { label: "Gujarat", value: "gujarat" },
    { label: "Haryana", value: "haryana" },
    { label: "Himachal Pradesh", value: "himachal pradesh" },
    { label: "Jharkhand", value: "jharkhand" },
    { label: "Karnataka", value: "karnataka" },
    { label: "Kerala", value: "kerala" },
    { label: "Madhya Pradesh", value: "madhya pradesh" },
    { label: "Maharashtra", value: "maharashtra" },
    { label: "Manipur", value: "manipur" },
    { label: "Meghalaya", value: "meghalaya" },
    { label: "Mizoram", value: "mizoram" },
    { label: "Nagaland", value: "nagaland" },
    { label: "Odisha", value: "odisha" },
    { label: "Punjab", value: "punjab" },
    { label: "Rajasthan", value: "rajasthan" },
    { label: "Sikkim", value: "sikkim" },
    { label: "Tamil Nadu", value: "tamil nadu" },
    { label: "Telangana", value: "telangana" },
    { label: "Tripura", value: "tripura" },
    { label: "Uttar Pradesh", value: "uttar pradesh" },
    { label: "Uttarakhand", value: "uttarakhand" },
    { label: "West Bengal", value: "west bengal" },
    { label: "Andaman and Nicobar Islands", value: "andaman nicobar" },
    { label: "Chandigarh", value: "chandigarh" },
    {
      label: "Dadra and Nagar Haveli and Daman and Diu",
      value: "dadra and nagar haveli and daman and diu",
    },
    { label: "Lakshadweep", value: "lakshadweep" },
    { label: "Delhi", value: "delhi" },
    { label: "Puducherry", value: "puducherry" },
    { label: "Ladakh", value: "ladakh" },
    { label: "Jammu and Kashmir", value: "jammu kashmir" },
    { label: "Nagaland", value: "nagaland" },
  ];

  const fields = [
    {
      key: "project_id",
      label: "Filter by Project Code",
      type: "text",
    },
    {
      key: "customer",
      label: "Filter by Customer",
      type: "text",
    },
    {
      key: "group",
      label: "Filter by Group",
      type: "text",
    },
    {
      key: "project_scheme",
      label: "Filter by Project Scheme",
      type: "text",
    },
    {
      key: "bank",
      label: "Filter by Bank",
      type: "text",
    },
    {
      key: "banker_name",
      label: "Filter by Banker Name",
      type: "text",
    },
    {
      key: "spoc",
      label: "Filter by SPOC",
      type: "text",
    },
    {
      key: "bank_city_name",
      label: "Filter by Bank City",
      type: "text",
    },
    {
      key: "project_status",
      label: "Filter by Project Status",
      type: "select",
      options: [
        { label: "To Be Started", value: "to be started" },
        { label: "Ongoing", value: "ongoing" },
        { label: "Completed", value: "completed" },
        { label: "On Hold", value: "on_hold" },
        { label: "Delayed", value: "delayed" },
        { label: "Dead", value: "dead" },
        { label: "Books Closed", value: "books closed" },
      ],
    },
    {
      key: "state",
      label: "Filter by Bank State",
      type: "select",
      options: indianStates.length
        ? indianStates
        : [{ label: "No states found", value: "" }],
    },
    {
      key: "loan_status",
      label: "Filter by Loan Status",
      type: "select",
      options: [
        { label: "Not Submitted", value: "not submitted" },
        { label: "Submitted", value: "submitted" },
        { label: "Documents Pending", value: "documents pending" },
        { label: "Documents Submitted", value: "documents submitted" },
        { label: "Under Banking Process", value: "under banking process" },
        { label: "Sanctioned", value: "sanctioned" },
        { label: "Disbursed", value: "disbursed" },
        { label: "Dead", value: "dead" },
      ],
    },
    {
      key: "expected_sanction",
      label: "Filter by Expected Sanction Date",
      type: "daterange",
    },
    {
      key: "expected_disbursement",
      label: "Filter by Expected disbursement Date",
      type: "daterange",
    },
    {
      key: "actual_sanction",
      label: "Filter by Actual Sanction Date",
      type: "daterange",
    },
    {
      key: "actual_disbursement",
      label: "Filter by Actual Disbursement Date",
      type: "daterange",
    },
  ];

  // ---- For Selected Projects ----
  const handleExportSelected = async () => {
    try {
      if (!selected?.length) {
        toast.error("No rows selected to export.");
        return;
      }

      const payload = {
        type: "selected",
        project_ids: selected,
      };

      const blob = await exportLoan(payload).unwrap();
      downloadBlob(blob, "loan_selected_export.csv");
    } catch (err) {
      console.error("Export (selected) failed:", err);
      toast.error("Failed to export selected loan projects.");
    }
  };

  const buildAllExportParams = () => {
    const params = Object.fromEntries(searchParams.entries());
    console.log("Building export params from URL searchParams:", params);
    return {
      type: "all",
      loan_status: params.loan_status || "",
      bank_state: params.state || "",
      expected_disbursement_from: params.expected_disbursement_from || "",
      expected_disbursement_to: params.expected_disbursement_to || "",
      expected_sanction_from: params.expected_sanction_from || "",
      expected_sanction_to: params.expected_sanction_to || "",
      actual_disbursement_from: params.actual_disbursement_from || "",
      actual_disbursement_to: params.actual_disbursement_to || "",
      actual_sanction_from: params.actual_sanction_from || "",
      actual_sanction_to: params.actual_sanction_to || "",
    };
  };

  // ---- For All Projects (with filters) ----
  const handleExportAll = async () => {
    try {
      const payload = buildAllExportParams();
      const blob = await exportLoan(payload).unwrap();
      downloadBlob(blob, "loan_all_export.csv");
    } catch (err) {
      console.error("Export (all) failed:", err);
      toast.error("Failed to export all loan projects.");
    }
  };

  const cannotSeeLoanDashboard =
    user?.department === "Loan" && user?.name !== "Prachi Singh";

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100dvh", overflow: "hidden" }}>
        <Sidebar />
        <MainHeader title="Loan" sticky>
          <Box display="flex" gap={1}>
            {!cannotSeeLoanDashboard && (
              <Button
                size="sm"
                onClick={() => navigate(`/loan_dashboard`)}
                sx={{
                  color: "white",
                  bgcolor: "transparent",
                  fontWeight: 500,
                  fontSize: "1rem",
                  letterSpacing: 0.5,
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.15)",
                  },
                }}
              >
                Dashboard
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => navigate(`/loan`)}
              sx={{
                color: "white",
                bgcolor: "transparent",
                fontWeight: 500,
                fontSize: "1rem",
                letterSpacing: 0.5,
                borderRadius: "6px",
                px: 1.5,
                py: 0.5,
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.15)",
                },
              }}
            >
              All Loans
            </Button>
          </Box>
        </MainHeader>
        <SubHeader
          title="Loan"
          isBackEnabled={false}
          onBack={handleBack}
          sticky
          rightSlot={
            <>
              {selected?.length > 0 && (
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
                      disabled={!selected?.length}
                      sx={{ display: "flex", gap: 1, alignItems: "center" }}
                    >
                      <DoneAllIcon fontSize="small" />
                      Selected ({selected?.length || 0})
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
              <Button
                variant="outlined"
                size="sm"
                color="primary"
                onClick={() => loanRef.current?.openColumnModal()}
                startDecorator={<ViewColumnIcon />}
              >
                Columns
              </Button>
              {/* <Button
                variant="solid"
                size="sm"
                startDecorator={<Add />}
                onClick={() => setLoanModalOpen(true)}
                sx={{
                  backgroundColor: "#3366a3",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#285680" },
                  height: "8px",
                }}
              >
                Add Loan
              </Button> */}
              {/* <Filter
                open={open}
                onOpenChange={setOpen}
                fields={fields}
                title="Filters"
                onApply={(filterValues) => {
                  console.log("✅ Filter onApply called with ALL values:", filterValues);
                  console.log("📌 bank_city_name from filter:", filterValues?.bank_city_name);
                  console.log("📌 Is bank_city_name empty?", !filterValues?.bank_city_name);
                  console.log("📌 Type of bank_city_name:", typeof filterValues?.bank_city_name);
                  
                  setSearchParams((prev) => {
                    const merged = Object.fromEntries(prev?.entries());
                    console.log("🔄 Current URL params before filter:", merged);

                    // Clear ALL existing filters to prevent conflicts
                    delete merged.project_id;
                    delete merged.customer;
                    delete merged.group;
                    delete merged.project_scheme;
                    delete merged.bank;
                    delete merged.banker_name;
                    delete merged.spoc;
                    delete merged.bank_city_name;
                    delete merged.actual_disbursement_from;
                    delete merged.actual_disbursement_to;
                    delete merged.actual_sanction_from;
                    delete merged.actual_sanction_to;
                    delete merged.matchMode;
                    delete merged.state;
                    delete merged.cam;
                    delete merged.loan_status;
                    delete merged.expected_disbursement_from;
                    delete merged.expected_disbursement_to;
                    delete merged.project_status;
                    delete merged.expected_sanction_from;
                    delete merged.expected_sanction_to;
                    delete merged.page;

                    // Start fresh with new filters from sidebar
                    const next = {
                      ...merged,
                      page: "1",
                    };

                    // Add NEW filter parameters (7 fields)
                    if (filterValues.project_id) {
                      next.project_id = String(filterValues.project_id).trim();
                    }
                    if (filterValues.customer) {
                      next.customer = String(filterValues.customer).trim();
                    }
                    if (filterValues.group) {
                      next.group = String(filterValues.group).trim();
                    }
                    if (filterValues.project_scheme) {
                      next.project_scheme = String(filterValues.project_scheme).trim();
                    }
                    if (filterValues.bank) {
                      next.bank = String(filterValues.bank).trim();
                    }
                    if (filterValues.banker_name) {
                      next.banker_name = String(filterValues.banker_name).trim();
                    }
                    if (filterValues.spoc) {
                      next.spoc = String(filterValues.spoc).trim();
                    }
                    if (filterValues.bank_city_name) {
                      next.bank_city_name = String(filterValues.bank_city_name).trim();
                    }

                    // Add EXISTING filter parameters
                    if (filterValues.state) {
                      next.state = String(filterValues.state).trim();
                    }
                    if (filterValues.loan_status) {
                      next.loan_status = String(filterValues.loan_status).trim();
                    }
                    if (filterValues.project_status) {
                      next.project_status = String(filterValues.project_status).trim();
                    }

                    // Handle matcher logic
                    if (filterValues.matcher) {
                      next.matchMode = filterValues.matcher === "OR" ? "any" : "all";
                    }

                    // Handle date range filters - ACTUAL dates
                    if (filterValues.actual_disbursement?.from) {
                      next.actual_disbursement_from = String(filterValues.actual_disbursement.from);
                    }
                    if (filterValues.actual_disbursement?.to) {
                      next.actual_disbursement_to = String(filterValues.actual_disbursement.to);
                    }

                    if (filterValues.actual_sanction?.from) {
                      next.actual_sanction_from = String(filterValues.actual_sanction.from);
                    }
                    if (filterValues.actual_sanction?.to) {
                      next.actual_sanction_to = String(filterValues.actual_sanction.to);
                    }

                    // Handle date range filters - EXPECTED dates
                    if (filterValues.expected_disbursement?.from) {
                      next.expected_disbursement_from = String(filterValues.expected_disbursement.from);
                    }
                    if (filterValues.expected_disbursement?.to) {
                      next.expected_disbursement_to = String(filterValues.expected_disbursement.to);
                    }

                    if (filterValues.expected_sanction?.from) {
                      next.expected_sanction_from = String(filterValues.expected_sanction.from);
                    }
                    if (filterValues.expected_sanction?.to) {
                      next.expected_sanction_to = String(filterValues.expected_sanction.to);
                    }

                    console.log("📍 Updated URL params:", next);
                    console.log("🎯 bank_city_name in next:", next.bank_city_name);
                    return next;
                  });
                  setOpen(false);
                }}
                onReset={() => {
                  console.log("🔄 Filter reset triggered");
                  setSearchParams((prev) => {
                    const merged = Object.fromEntries(prev.entries());
                    
                    // Clear ALL filter parameters
                    delete merged.project_id;
                    delete merged.customer;
                    delete merged.group;
                    delete merged.project_scheme;
                    delete merged.bank;
                    delete merged.banker_name;
                    delete merged.spoc;
                    delete merged.bank_city_name;
                    delete merged.project_status;
                    delete merged.actual_disbursement_from;
                    delete merged.actual_disbursement_to;
                    delete merged.actual_sanction_from;
                    delete merged.actual_sanction_to;
                    delete merged.matchMode;
                    delete merged.state;
                    delete merged.cam;
                    delete merged.loan_status;
                    delete merged.expected_disbursement_from;
                    delete merged.expected_disbursement_to;
                    delete merged.expected_sanction_from;
                    delete merged.expected_sanction_to;

                    const result = { ...merged, page: "1" };
                    console.log("📍 After reset, URL params:", result);
                    return result;
                  });
                }}
              /> */}
            </>
          }
        ></SubHeader>
        <Box
          component="main"
          className="MainContent"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            mt: "108px",
            ml: { lg: "var(--Sidebar-width)" },
            p: "16px",
            px: "24px",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <AllLoan
            ref={loanRef}
            selected={selected}
            setSelected={setSelected}
          />
        </Box>
      </Box>
      <Modal
        open={loanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        sx={{ backdropFilter: "blur(2px)" }}
      >
        <ModalDialog
          layout="center"
          size="lg"
          sx={{
            p: 0,
            borderRadius: "md",
            overflow: "hidden",
            bgcolor: "#fff",
            border: "1px solid var(--joy-palette-neutral-200)",
            width: { xs: "95vw", sm: "95vw", md: "60vw" },
            maxHeight: "90vh",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--joy-palette-neutral-200)",
              bgcolor: "background.body",
            }}
          >
            <Typography level="title-lg" fontWeight={700}>
              Create Loan
            </Typography>
            <ModalClose variant="plain" />
          </Box>

          {/* Content: render your AddLoan form */}
          <Box sx={{ p: 2, overflow: "auto" }}>
            <AddLoan onCancel={() => setLoanModalOpen(false)} />
          </Box>
        </ModalDialog>
      </Modal>
    </CssVarsProvider>
  );
}
export default Loan;
