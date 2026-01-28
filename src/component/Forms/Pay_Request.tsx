import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  Input,
  LinearProgress,
  Sheet,
  Switch,
  Textarea,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { toast } from "react-toastify";
import Axios from "../../utils/Axios";
import {
  useWebSearchPOQuery,
  useLazyWebSearchPOQuery,
} from "../../redux/purchasesSlice";
import SearchPickerModal from "../SearchPickerModal";
import {
  useGetProjectSearchDropdownQuery,
  useLazyGetProjectSearchDropdownQuery,
} from "../../redux/projectsSlice";
import { useAddPayRequestMutation } from "../../redux/Accounts";

function PaymentRequestForm() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [poInput, setPoInput] = useState("");
  const [poSearch, setPoSearch] = useState("");
  const PO_DROPDOWN_LIMIT = 7;
  const PROJECT_DROPDOWN_LIMIT = 7;
  const SEARCH_MORE_VALUE = "__SEARCH_MORE__";
  const [poPickerOpen, setPoPickerOpen] = useState(false);
  const [poPickerSearch, setPoPickerSearch] = useState("");
  const [poPage] = useState(1);
  const poLimit = PO_DROPDOWN_LIMIT;
  const [projectInput, setProjectInput] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectPickerSearch, setProjectPickerSearch] = useState("");

  // ---- form data ----
  const [formData, setFormData] = useState({
    project_id: "",
    name: "",
    customer: "",
    p_group: "",
    pay_type: "",
    po_number: "",
    dbt_date: "",
    paid_for: "",
    vendor: "",
    comment: "",
    po_value: "",
    amount_paid: "",
    benificiary: "",
    acc_number: "",
    ifsc: "",
    branch: "",
    acc_match: "",
    utr: "",
    total_advance_paid: "",
    submitted_by: "",
    credit: {
      credit_deadline: "",
      credit_status: false,
      credit_remarks: "",
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isAdjustment = formData.pay_type === "Adjustment";
  const hasRealPO = !!(formData.po_number && formData.po_number !== "N/A");
  const isFormLocked = !formData.pay_type;

  useEffect(() => {
    const t = setTimeout(() => setPoSearch(poInput.trim()), 350);
    return () => clearTimeout(t);
  }, [poInput]);

  useEffect(() => {
    const t = setTimeout(() => setProjectSearch(projectInput.trim()), 350);
    return () => clearTimeout(t);
  }, [projectInput]);

  // ---------------- PO API ----------------
  const {
    data: poData,
    isFetching: isPoFetching,
    isLoading: isPoLoading,
    isError: isPoError,
  } = useWebSearchPOQuery(
    { page: poPage, limit: poLimit, search: poSearch },
    { refetchOnMountOrArgChange: true },
  );

  const [fetchPO] = useLazyWebSearchPOQuery();

  const fetchPOPage = async ({ page, search }) => {
    const limit = 10;
    const res = await fetchPO({ page, limit, search }).unwrap();
    return { rows: res?.records || [], total: res?.total || 0 };
  };

  const poRecords = poData?.records || [];

  // ---------------- Project Search API (ONLY for Adjustment) ----------------
  const {
    data: projectData,
    isFetching: isProjectFetching,
    isLoading: isProjectLoading,
    isError: isProjectError,
  } = useGetProjectSearchDropdownQuery(
    { page: 1, limit: PROJECT_DROPDOWN_LIMIT, search: projectSearch },
    { skip: !isAdjustment, refetchOnMountOrArgChange: true },
  );

  const [fetchProject] = useLazyGetProjectSearchDropdownQuery();

  const projectApiRecords = projectData?.data || [];

  const fetchProjectPage = async ({ page, search }) => {
    const limit = 10;
    const res = await fetchProject({ page, limit, search }).unwrap();
    return {
      rows: res?.data || [],
      total: res?.pagination?.total || 0,
    };
  };

  // ---- helpers ----
  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) return JSON.parse(userData);
    return null;
  };

  const safeNumStr = (v) => {
    if (v === null || v === undefined) return "";
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : "";
  };

  const resolveVendorDisplayName = (po) => {
    return po?.vendorName || po?.vendor?.name || "";
  };

  const resolveBeneficiary = (po) =>
    po?.benificiary || po?.beneficiary || po?.vendor?.Beneficiary_Name || "";

  const resolveAccountNo = (po) =>
    po?.acc_number || po?.account_number || po?.vendor?.Account_No || "";

  const resolveIfsc = (po) => po?.ifsc || po?.vendor?.IFSC_Code || "";

  const resolveBankName = (po) =>
    po?.branch || po?.bank_name || po?.vendor?.Bank_Name || "";

  // ---- build PO options (from API) ----
  const poOptions = useMemo(() => {
    const base = (poRecords || [])
      .map((po) => {
        const num = po?.po_number || po?.poNumber || "";
        return num ? { value: num, label: num } : null;
      })
      .filter(Boolean);

    const totalFromApi =
      poData?.total || poData?.totalRecords || poData?.count || null;

    const shouldShowSearchMore =
      (typeof totalFromApi === "number" && totalFromApi > base.length) ||
      base.length >= PO_DROPDOWN_LIMIT;

    return shouldShowSearchMore
      ? [...base, { value: SEARCH_MORE_VALUE, label: "🔎 Search more…" }]
      : base;
  }, [poRecords, poData]);

  const projectOptionsFromPO = useMemo(() => {
    const map = new Map();

    for (const po of poRecords) {
      const pr = po?.project_id;
      if (!pr?._id) continue;

      const key = String(pr._id);
      if (!map.has(key)) {
        map.set(key, {
          value: key,
          label: pr.code || pr.name || key,
          code: pr.code || "",
          name: pr.name || "",
          p_group: pr.p_group || "",
          customer: pr.customer || "",
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      (a.code || a.label).localeCompare(b.code || b.label),
    );
  }, [poRecords]);

  const projectOptionsFromApi = useMemo(() => {
    const base = (projectApiRecords || [])
      .map((p) => {
        const id = p?._id ? String(p._id) : "";

        if (!id) return null;
        return {
          value: id,
          label: p?.code || "",
          code: p?.code || "",
          name: p?.name || "",
          p_group: p?.p_group || "",
          customer: p?.customer || "",
        };
      })
      .filter(Boolean);

    const totalFromApi = projectData?.pagination?.total || null;

    const shouldShowSearchMore =
      (typeof totalFromApi === "number" && totalFromApi > base.length) ||
      base.length >= PROJECT_DROPDOWN_LIMIT;

    return shouldShowSearchMore
      ? [...base, { value: SEARCH_MORE_VALUE, label: "🔎 Search more…" }]
      : base;
  }, [projectApiRecords, projectData]);

  const selectedProjectOption = useMemo(() => {
    const list = isAdjustment ? projectOptionsFromApi : projectOptionsFromPO;
    return list.find((p) => p.value === formData.project_id) || null;
  }, [
    isAdjustment,
    projectOptionsFromApi,
    projectOptionsFromPO,
    formData.project_id,
  ]);

  const selectedProjectCode = selectedProjectOption?.code || formData?.code;

  // ---- apply PO selection (from modal) ----
  const applyPoSelection = (po) => {
    if (!po) return;

    const pr = po?.project_id;
    const poValue = safeNumStr(po?.po_value);
    const advPaid = safeNumStr(po?.total_advance_paid) || "0";

    setFormData((prev) => ({
      ...prev,
      po_number: po?.po_number || po?.poNumber || "",
      paid_for: po?.item || prev.paid_for,
      vendor: resolveVendorDisplayName(po) || prev.vendor,

      po_value: poValue || prev.po_value,
      total_advance_paid: advPaid || prev.total_advance_paid,

      benificiary: resolveBeneficiary(po) || prev.benificiary,
      acc_number: resolveAccountNo(po) || prev.acc_number,
      ifsc: resolveIfsc(po) || prev.ifsc,
      branch: resolveBankName(po) || prev.branch,

      ...(pr?._id
        ? {
            project_id: String(pr._id),
            name: pr.name || prev.name,
            customer: pr.customer || prev.customer,
            p_group: pr.p_group || prev.p_group,
          }
        : {}),
    }));

    setPoPickerOpen(false);
  };

  // ---- apply Project selection (Adjustment) ----
  const applyProjectSelection = (pr) => {
    if (!pr?._id) return;

    setFormData((prev) => ({
      ...prev,
      project_id: pr._id,
      name: pr?.name || "",
      code: pr?.code || "",
      customer: pr?.customer || "",
      p_group: pr?.p_group || "",
    }));

    setProjectPickerOpen(false);
  };

  // ---- on mount ----
  useEffect(() => {
    const u = getUserData();
    setUser(u);
    if (u) setFormData((p) => ({ ...p, submitted_by: u.name || "" }));
  }, []);

  // ---- handle input change ----
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Payment type logic
    if (name === "pay_type") {
      if (value === "Adjustment") {
        // reset PO-related
        setPoInput("");
        setPoSearch("");

        setFormData((prev) => ({
          ...prev,
          project_id: "",
          name: "",
          customer: "",
          p_group: "",

          paid_for: "Balance Transfer",
          po_number: "N/A",
          po_value: "N/A",
          total_advance_paid: "0",
          amount_paid: "",
          benificiary: "",
          acc_number: "",
          ifsc: "",
          branch: "",
        }));
      } else if (value === "Slnko Service Charge") {
        setFormData((prev) => ({
          ...prev,
          paid_for: "Slnko Service Charge",
          benificiary: "Slnko Energy PVT LTD",
          acc_number: "N/A",
          ifsc: "N/A",
          branch: "N/A",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          paid_for: "",
          benificiary: "",
          acc_number: "",
          ifsc: "",
          branch: "",
          ...(prev.po_number === "N/A"
            ? {}
            : {
                po_number: "",
                po_value: "",
                total_advance_paid: "0",
              }),
        }));
      }
    }
  };

  const handleProjectSelectFromPO = (selected) => {
    if (!selected) {
      setFormData((prev) => ({
        ...prev,
        project_id: "",
        name: "",
        customer: "",
        p_group: "",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      project_id: selected.value,
      name: selected.name || "",
      customer: selected.customer || "",
      p_group: selected.p_group || "",
    }));
  };

  const handleProjectSelectAdjustment = (opt) => {
    const v = opt?.value || "";

    if (!v) {
      setFormData((prev) => ({
        ...prev,
        project_id: "",
        name: "",
        customer: "",
        p_group: "",
        code: "",
      }));
      return;
    }

    if (v === SEARCH_MORE_VALUE) {
      setProjectPickerOpen(true);
      setProjectPickerSearch(projectSearch || projectInput || "");
      return;
    }

    // find from current API page
    const found =
      projectApiRecords.find((p) => String(p?._id) === String(v)) || null;

    // if found has full data, use it; else set just id (optional)
    applyProjectSelection(found || { _id: v });
  };

  // ---- when PO selected -> autofill everything ----
  const handlePoChange = async (selectedOption) => {
    const poNum = selectedOption?.value || "";

    if (!poNum) {
      setFormData((prev) => ({
        ...prev,
        po_number: "",
        po_value: "",
        total_advance_paid: "0",
        vendor: "",
        paid_for: "",
        project_id: "",
        name: "",
        customer: "",
        p_group: "",
        benificiary: "",
        acc_number: "",
        ifsc: "",
        branch: "",
      }));
      return;
    }

    try {
      // 1) try from current page data
      let po = poRecords.find((x) => (x?.po_number || x?.poNumber) === poNum);

      // 2) if not found, fetch via lazy query
      if (!po) {
        const res = await fetchPO({
          page: 1,
          limit: 10,
          search: poNum,
        }).unwrap();
        const recs = res?.records || [];
        po =
          recs.find((x) => (x?.po_number || x?.poNumber) === poNum) ||
          recs[0] ||
          null;
      }

      if (!po) {
        toast.error("PO not found");
        return;
      }

      const pr = po?.project_id;
      const vd = po?.vendor;

      const poValue = safeNumStr(po?.po_value);
      const advPaid = safeNumStr(po?.total_advance_paid);

      setFormData((prev) => ({
        ...prev,
        po_number: po?.po_number || poNum,
        paid_for: po?.item || prev.paid_for,
        vendor: resolveVendorDisplayName(po) || prev.vendor,
        po_value: poValue || prev.po_value,
        total_advance_paid: advPaid || prev.total_advance_paid,
        benificiary: resolveBeneficiary(po) || prev.benificiary,
        acc_number: resolveAccountNo(po) || prev.acc_number,
        ifsc: resolveIfsc(po) || prev.ifsc,
        branch: resolveBankName(po) || prev.branch,

        ...(pr?._id
          ? {
              project_id: String(pr._id),
              name: pr.name || prev.name,
              customer: pr.customer || prev.customer,
              p_group: pr.p_group || prev.p_group,
            }
          : {}),
      }));

      if (!vd?._id && !po?.vendorName) {
        toast.info("Vendor details not available on this PO.");
      }
    } catch (err) {
      console.error("handlePoChange error:", err);
      toast.error("Could not load PO details");
    }
  };

  // ---- validation ----
  const validateBeforeSubmit = (data) => {
    const e = {};

    const hasPO = !!(data.po_number && data.po_number !== "N/A");

    // ✅ for adjustment, project is mandatory
    if (!data.project_id) e.project_id = "Please select a project.";

    if (!data.pay_type) e.pay_type = "Please choose a payment type.";
    if (!data.dbt_date) e.dbt_date = "Requested date is required.";
    if (!data.paid_for) e.paid_for = "Please enter what this is requested for.";
    if (!data.vendor) e.vendor = "Vendor / Credited to is required.";
    if (!data.comment) e.comment = "Please add a short description.";

    if (data.pay_type === "Payment Against PO" && !hasPO) {
      e.po_number = "PO number is required for Payment Against PO.";
    }

    const amt = Number(data.amount_paid || 0);
    if (!amt || amt <= 0) e.amount_paid = "Enter a valid Amount Requested.";

    if (!data.benificiary) e.benificiary = "Beneficiary name is required.";
    if (!data.acc_number) e.acc_number = "Account number is required.";
    if (!data.branch) e.branch = "Bank name is required.";

    if (data.credit?.credit_status) {
      if (!data.credit.credit_deadline)
        e.credit_deadline = "Credit deadline is required.";
      if (!data.credit.credit_remarks)
        e.credit_remarks = "Please add credit remarks.";
    }

    if (data.dbt_date && data.credit.credit_deadline) {
      const dbtDateObj = new Date(data.dbt_date);
      const deadlineDateObj = new Date(data.credit.credit_deadline);
      const diffDays = Math.floor(
        (deadlineDateObj - dbtDateObj) / (1000 * 60 * 60 * 24),
      );
      if (diffDays < 2) {
        const minValidDate = new Date(dbtDateObj);
        minValidDate.setDate(minValidDate.getDate() + 2);

        e.credit_deadline = `Credit deadline must be at least 2 days after the debit date. Earliest allowed: ${
          minValidDate.toISOString().split("T")[0]
        }`;
      }
    }

    return e;
  };

  const extractApiErrors = (errRes) => {
    const e = {};
    const data = errRes?.data;
    if (!data) return e;

    if (
      data.errors &&
      typeof data.errors === "object" &&
      !Array.isArray(data.errors)
    ) {
      Object.entries(data.errors).forEach(([k, v]) => (e[k] = String(v)));
    } else if (Array.isArray(data.errors)) {
      data.errors.forEach((it) => {
        if (it?.path) e[it.path] = it.message || "Invalid value";
      });
    }
    return e;
  };

  const focusFirstError = (errs) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    const el = document.querySelector(`[name="${first}"]`);
    if (el && typeof el.focus === "function") el.focus();
  };

  const [addPayRequest, { isLoading: isSubmitting }] =
    useAddPayRequestMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const clientErrors = validateBeforeSubmit(formData);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      toast.error("Please fix the highlighted fields.");
      focusFirstError(clientErrors);
      return;
    }

    setErrors({});

    try {
      const payload = {
        ...formData,
      };

      await addPayRequest(payload).unwrap();

      toast.success("Payment Requested Successfully");
      setFormData({});
    } catch (err) {
      const apiFieldErrors = extractApiErrors(err);
      if (Object.keys(apiFieldErrors).length) {
        setErrors(apiFieldErrors);
        focusFirstError(apiFieldErrors);
      }
      toast.error(err?.data?.message || "Submit failed");
    }
  };

  const formatINR = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  const amountRequested = Number(formData.amount_paid || 0);

  const poValueNum = Number(formData.po_value || 0);
  const totalAdvNum = Number(formData.total_advance_paid || 0);
  const poBalanceNum = poValueNum - totalAdvNum;
  const balancePercent =
    poValueNum > 0
      ? Math.max(
          0,
          Math.min(
            100,
            ((poValueNum - (totalAdvNum + amountRequested)) / poValueNum) * 100,
          ),
        )
      : 0;

  return (
    <Box sx={{ ml: { lg: "var(--Sidebar-width)" }, p: 0 }}>
      <Container maxWidth="lg" sx={{ py: 1 }}>
        <Grid container spacing={2}>
          {/* Left: Form */}
          <Grid xs={12} lg={7}>
            <Sheet
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: "lg",
                boxShadow: "md",
                bgcolor: "background.level1",
              }}
              component="form"
              onSubmit={handleSubmit}
            >
              {/* Payment Type */}
              <Typography level="title-lg" sx={{ mb: 1 }}>
                Start here
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2} sx={{ mb: 1 }}>
                <Grid xs={12} sm={6}>
                  <FormControl error={!!errors.pay_type}>
                    <FormLabel>Payment Type</FormLabel>
                    <Select
                      name="pay_type"
                      value={
                        formData.pay_type
                          ? {
                              label: formData.pay_type,
                              value: formData.pay_type,
                            }
                          : null
                      }
                      onChange={(selectedOption) =>
                        handleChange({
                          target: {
                            name: "pay_type",
                            value: selectedOption?.value || "",
                          },
                        })
                      }
                      options={[
                        {
                          label: "Payment Against PO",
                          value: "Payment Against PO",
                        },
                        { label: "Adjustment", value: "Adjustment" },
                        {
                          label: "Slnko Service Charge",
                          value: "Slnko Service Charge",
                        },
                        { label: "Other", value: "Other" },
                      ]}
                      placeholder="Select payment type"
                      isClearable
                    />
                    {errors.pay_type && (
                      <FormHelperText>{errors.pay_type}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                {isFormLocked && (
                  <Grid xs={12} sm={6} display="flex" alignItems="flex-end">
                    <Chip variant="soft" color="neutral" size="sm">
                      Select a payment type to enable the form
                    </Chip>
                  </Grid>
                )}
              </Grid>

              {/* Project & PO */}
              <Typography level="title-lg" sx={{ mt: 3, mb: 1 }}>
                Project & PO
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                {/* PO Number */}
                <Grid xs={12} sm={6}>
                  <FormControl error={!!errors.po_number}>
                    <FormLabel>PO Number</FormLabel>
                    <Select
                      name="po_number"
                      value={
                        formData.po_number
                          ? {
                              label: formData.po_number,
                              value: formData.po_number,
                            }
                          : null
                      }
                      onChange={(opt) => {
                        if (opt?.value === SEARCH_MORE_VALUE) {
                          setPoPickerOpen(true);
                          setPoPickerSearch(poSearch || poInput || "");
                          return;
                        }
                        handlePoChange(opt);
                      }}
                      options={poOptions}
                      placeholder={
                        isPoLoading || isPoFetching
                          ? "Loading..."
                          : "Type to search PO"
                      }
                      isDisabled={isFormLocked || isAdjustment}
                      isLoading={isPoLoading || isPoFetching}
                      isClearable
                      onInputChange={(val, meta) => {
                        if (meta.action === "input-change") setPoInput(val);
                      }}
                      filterOption={() => true}
                      noOptionsMessage={() =>
                        isPoError
                          ? "Error loading POs"
                          : isPoLoading || isPoFetching
                            ? "Fetching..."
                            : "No matches"
                      }
                    />
                    {errors.po_number && (
                      <FormHelperText>{errors.po_number}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                {/* Project */}
                <Grid xs={12} sm={6}>
                  <FormControl error={!!errors.project_id}>
                    <FormLabel>Project</FormLabel>

                    {/* If non-adjustment and PO selected => read only */}
                    {!isAdjustment && hasRealPO ? (
                      <Input
                        name="project_id"
                        value={selectedProjectCode || ""}
                        placeholder="Project Code"
                        readOnly
                        disabled={isFormLocked}
                      />
                    ) : isAdjustment ? (
                      // ✅ Adjustment => Project from project-search API
                      <Select
                        name="project_id"
                        value={
                          formData.project_id
                            ? {
                                label: selectedProjectCode || "Selected",
                                value: formData.project_id,
                              }
                            : null
                        }
                        onChange={handleProjectSelectAdjustment}
                        options={projectOptionsFromApi}
                        isClearable
                        placeholder={
                          isProjectLoading || isProjectFetching
                            ? "Loading projects..."
                            : "Type to search project"
                        }
                        isDisabled={isFormLocked}
                        isLoading={isProjectLoading || isProjectFetching}
                        onInputChange={(val, meta) => {
                          if (meta.action === "input-change")
                            setProjectInput(val);
                        }}
                        filterOption={() => true}
                        noOptionsMessage={() =>
                          isProjectError
                            ? "Error loading projects"
                            : isProjectLoading || isProjectFetching
                              ? "Fetching..."
                              : "No matches"
                        }
                      />
                    ) : (
                      // ✅ Non-adjustment without PO => projects from PO list
                      <Select
                        name="project_id"
                        value={
                          formData.project_id
                            ? {
                                label: selectedProjectCode || "Selected",
                                value: formData.project_id,
                              }
                            : null
                        }
                        onChange={handleProjectSelectFromPO}
                        options={projectOptionsFromPO}
                        isClearable
                        placeholder={
                          isPoLoading || isPoFetching
                            ? "Loading projects..."
                            : "Select Project (from PO list)"
                        }
                        isDisabled={isFormLocked}
                        isLoading={isPoLoading || isPoFetching}
                      />
                    )}

                    {errors.project_id && (
                      <FormHelperText>{errors.project_id}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl>
                    <FormLabel>Project Name</FormLabel>
                    <Input
                      name="name"
                      value={formData.name || ""}
                      onChange={handleChange}
                      placeholder="Project Name"
                      readOnly
                      disabled={isFormLocked}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={3}>
                  <FormControl>
                    <FormLabel>Client</FormLabel>
                    <Input
                      name="customer"
                      value={formData.customer || ""}
                      onChange={handleChange}
                      placeholder="Client Name"
                      readOnly
                      disabled={isFormLocked}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={3}>
                  <FormControl>
                    <FormLabel>Group</FormLabel>
                    <Input
                      name="p_group"
                      value={formData.p_group || ""}
                      onChange={handleChange}
                      placeholder="Group Name"
                      readOnly
                      disabled={isFormLocked}
                    />
                  </FormControl>
                </Grid>
              </Grid>

              {/* Amounts & Dates */}
              <Typography level="title-lg" sx={{ mt: 3, mb: 1 }}>
                Amounts & Dates
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                  <FormControl error={!!errors.amount_paid}>
                    <FormLabel>Amount Requested</FormLabel>
                    <Input
                      startDecorator={<span>₹</span>}
                      inputMode="numeric"
                      value={formData.amount_paid}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d.]/g, "");

                        // allow typing "" and "." without forcing parseFloat
                        if (raw === "" || raw === ".") {
                          setFormData((prev) => ({
                            ...prev,
                            amount_paid: raw,
                          }));
                          return;
                        }

                        const value = Number(raw);
                        if (!Number.isFinite(value)) return;

                        // ✅ If pay type is Adjustment (or no real PO), DON'T cap by PO balance
                        if (isAdjustment || !hasRealPO) {
                          setFormData((prev) => ({
                            ...prev,
                            amount_paid: raw,
                          }));
                          return;
                        }

                        // ✅ Only for PO payments: cap by PO balance
                        const poValue = Number(formData.po_value) || 0;
                        const advPaid =
                          Number(formData.total_advance_paid) || 0;
                        const maxAllowed = Math.max(0, poValue - advPaid);

                        if (value > maxAllowed) {
                          toast.warning(
                            "Amount Requested can't be greater than PO Balance!",
                          );
                          setFormData((prev) => ({
                            ...prev,
                            amount_paid: String(maxAllowed),
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            amount_paid: raw,
                          }));
                        }
                      }}
                      placeholder="0.00"
                      required
                      disabled={isFormLocked}
                      name="amount_paid"
                    />

                    {errors.amount_paid && (
                      <FormHelperText>{errors.amount_paid}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl error={!!errors.dbt_date}>
                    <FormLabel>Requested Date</FormLabel>
                    <Input
                      type="date"
                      name="dbt_date"
                      value={formData.dbt_date}
                      onChange={handleChange}
                      required
                      disabled={isFormLocked}
                    />
                    {errors.dbt_date && (
                      <FormHelperText>{errors.dbt_date}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl error={!!errors.vendor}>
                    <FormLabel>Vendor</FormLabel>
                    <Input
                      name="vendor"
                      value={formData.vendor || ""}
                      onChange={handleChange}
                      placeholder="Vendor / Credited to"
                      required
                      disabled={isFormLocked}
                    />
                    {errors.vendor && (
                      <FormHelperText>{errors.vendor}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl error={!!errors.paid_for}>
                    <FormLabel>Requested For</FormLabel>
                    <Input
                      name="paid_for"
                      value={formData.paid_for}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paid_for: e.target.value,
                        }))
                      }
                      placeholder="What is this payment for?"
                      required
                      disabled={isFormLocked}
                    />
                    {errors.paid_for && (
                      <FormHelperText>{errors.paid_for}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={4}>
                  <FormControl>
                    <FormLabel>PO Value (with GST)</FormLabel>
                    <Input
                      name="po_value"
                      value={formData.po_value || ""}
                      placeholder="PO Value"
                      readOnly
                      disabled={isFormLocked}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={4}>
                  <FormControl>
                    <FormLabel>Total Advance Paid</FormLabel>
                    <Input
                      name="total_advance_paid"
                      value={formData.total_advance_paid || "0"}
                      placeholder="Total Advance Paid"
                      readOnly
                      disabled={isFormLocked}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={4}>
                  <FormControl>
                    <FormLabel>Current PO Balance</FormLabel>
                    <Input
                      name="po_balance"
                      value={
                        formData.po_value - formData.total_advance_paid || ""
                      }
                      placeholder="Current PO Balance"
                      readOnly
                      disabled={isFormLocked}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={12}>
                  <FormControl error={!!errors.comment}>
                    <FormLabel>Payment Description</FormLabel>
                    <Textarea
                      name="comment"
                      value={formData.comment || ""}
                      onChange={handleChange}
                      placeholder="Add remarks for this Payment"
                      minRows={3}
                      required
                      disabled={isFormLocked}
                    />
                    {errors.comment && (
                      <FormHelperText>{errors.comment}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              </Grid>

              {/* Credit */}
              <Typography level="title-lg" sx={{ mt: 3, mb: 1 }}>
                Credit
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid xs={12} sm={2} display="flex" alignItems="center">
                  <FormControl orientation="horizontal">
                    <FormLabel sx={{ mr: 2 }}>Is Credit?</FormLabel>
                    <Switch
                      checked={formData.credit?.credit_status === true}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          credit: {
                            ...prev.credit,
                            credit_status: e.target.checked,
                          },
                        }))
                      }
                      disabled={isFormLocked}
                    />
                  </FormControl>
                </Grid>

                {formData.credit?.credit_status === true && (
                  <>
                    <Grid xs={12} sm={3}>
                      <FormControl error={!!errors.credit_deadline}>
                        <FormLabel>Credit Deadline</FormLabel>
                        <Input
                          type="date"
                          name="credit_deadline"
                          value={formData.credit.credit_deadline || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              credit: {
                                ...prev.credit,
                                credit_deadline: e.target.value,
                              },
                            }))
                          }
                          required
                          disabled={isFormLocked}
                        />
                        {errors.credit_deadline && (
                          <FormHelperText>
                            {errors.credit_deadline}
                          </FormHelperText>
                        )}
                      </FormControl>
                    </Grid>

                    <Grid xs={12} sm={7}>
                      <FormControl error={!!errors.credit_remarks}>
                        <FormLabel>Credit Remarks</FormLabel>
                        <Textarea
                          name="credit_remarks"
                          value={formData.credit.credit_remarks || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              credit: {
                                ...prev.credit,
                                credit_remarks: e.target.value,
                              },
                            }))
                          }
                          placeholder="Add remarks for this credit"
                          minRows={3}
                          required
                          disabled={isFormLocked}
                        />
                        {errors.credit_remarks && (
                          <FormHelperText>
                            {errors.credit_remarks}
                          </FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                  </>
                )}
              </Grid>

              {/* Beneficiary */}
              <Typography level="title-lg" sx={{ mt: 3, mb: 1 }}>
                Beneficiary Details
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid xs={12}>
                  <Input defaultValue={"Account Transfer"} disabled />
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl error={!!errors.benificiary}>
                    <FormLabel>Beneficiary Name</FormLabel>
                    <Input
                      name="benificiary"
                      value={formData.benificiary || ""}
                      onChange={handleChange}
                      placeholder="Beneficiary Name"
                      required
                      disabled={isFormLocked}
                    />
                    {errors.benificiary && (
                      <FormHelperText>{errors.benificiary}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl error={!!errors.acc_number}>
                    <FormLabel>Account Number</FormLabel>
                    <Input
                      name="acc_number"
                      value={formData.acc_number || ""}
                      onChange={handleChange}
                      placeholder="Beneficiary Account Number"
                      required
                      disabled={isFormLocked}
                    />
                    {errors.acc_number && (
                      <FormHelperText>{errors.acc_number}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl>
                    <FormLabel>IFSC Code</FormLabel>
                    <Input
                      name="ifsc"
                      value={formData.ifsc || ""}
                      onChange={handleChange}
                      placeholder="IFSC Code"
                      disabled={isFormLocked}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl error={!!errors.branch}>
                    <FormLabel>Bank Name</FormLabel>
                    <Input
                      name="branch"
                      value={formData.branch || ""}
                      onChange={handleChange}
                      placeholder="Bank Name"
                      required
                      disabled={isFormLocked}
                    />
                    {errors.branch && (
                      <FormHelperText>{errors.branch}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              </Grid>

              {/* Actions */}
              <Grid
                container
                spacing={2}
                justifyContent="center"
                sx={{ mt: 3 }}
              >
                <Grid>
                  <Button
                    type="submit"
                    variant="solid"
                    color="primary"
                    loading={isLoading}
                    disabled={isLoading || isFormLocked}
                  >
                    Submit
                  </Button>
                </Grid>
                <Grid>
                  <Button
                    variant="outlined"
                    color="neutral"
                    onClick={() => navigate("/daily-payment-request")}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                </Grid>
              </Grid>
            </Sheet>
          </Grid>

          {/* Right: Summary */}
          <Grid xs={12} lg={5}>
            <Sheet
              sx={{
                position: { lg: "sticky" },
                top: { lg: 10 },
                p: 1,
                borderRadius: "lg",
                boxShadow: "md",
              }}
            >
              <Typography level="title-lg" sx={{ mb: 1 }}>
                Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography level="body-sm" color="neutral">
                    Project
                  </Typography>
                  <Chip variant="soft" size="sm">
                    {selectedProjectCode || "—"}
                  </Chip>
                </Box>
                <Box>
                  <Typography level="body-sm" color="neutral">
                    PO Number
                  </Typography>
                  <Chip variant="soft" size="sm">
                    {formData.po_number || "—"}
                  </Chip>
                </Box>
                <Box>
                  <Typography level="body-sm" color="neutral">
                    PO Value
                  </Typography>
                  <Typography>{formatINR(poValueNum)}</Typography>
                </Box>
                <Box>
                  <Typography level="body-sm" color="neutral">
                    Advance Paid
                  </Typography>
                  <Typography>{formatINR(totalAdvNum)}</Typography>
                </Box>
                <Box>
                  <Typography level="body-sm" color="neutral">
                    Current Balance
                  </Typography>
                  <Typography>
                    {poBalanceNum === null ? "N/A" : formatINR(poBalanceNum)}
                  </Typography>
                </Box>
                <Box>
                  <Typography level="body-sm" color="neutral">
                    Requested
                  </Typography>
                  <Typography>{formatINR(amountRequested)}</Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography level="body-sm" color="neutral" sx={{ mb: 0.5 }}>
                  Remaining after request
                </Typography>
                <LinearProgress
                  determinate
                  value={balancePercent}
                  sx={{ height: 8, borderRadius: 999 }}
                />
                <Typography level="body-sm" sx={{ mt: 0.5 }}>
                  {poValueNum > 0
                    ? formatINR(
                        Math.max(
                          0,
                          poValueNum - (totalAdvNum + amountRequested),
                        ),
                      )
                    : "—"}
                </Typography>
              </Box>

              {poBalanceNum !== null && amountRequested > poBalanceNum && (
                <Chip color="danger" variant="soft" sx={{ mt: 2 }}>
                  Requested exceeds PO Balance
                </Chip>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "grid", gap: 1 }}>
                <Tooltip title="Will appear on the payment instruction">
                  <Chip variant="outlined" size="sm">
                    Beneficiary: {formData.benificiary || "—"}
                  </Chip>
                </Tooltip>
                <Chip variant="outlined" size="sm">
                  Account: {formData.acc_number || "—"}
                </Chip>
                <Chip variant="outlined" size="sm">
                  IFSC: {formData.ifsc || "—"}
                </Chip>
                <Chip variant="outlined" size="sm">
                  Bank: {formData.branch || "—"}
                </Chip>
                {formData.credit?.credit_status ? (
                  <Chip color="warning" variant="soft" size="sm">
                    Credit until {formData.credit.credit_deadline || "—"}
                  </Chip>
                ) : (
                  <Chip variant="soft" size="sm">
                    No Credit
                  </Chip>
                )}
              </Box>
            </Sheet>
          </Grid>
        </Grid>
      </Container>

      {/* ---------------- PO Search More Modal ---------------- */}
      {poPickerOpen && (
        <Sheet
          variant="outlined"
          sx={{
            mt: 2,
            p: 2,
            borderRadius: "lg",
            boxShadow: "sm",
            bgcolor: "background.level1",
          }}
        >
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <Typography level="title-md" sx={{ flex: 1 }}>
              Search more POs
            </Typography>
            <Button
              size="sm"
              variant="outlined"
              onClick={() => setPoPickerOpen(false)}
            >
              Close
            </Button>
          </Box>

          <SearchPickerModal
            open={true}
            onClose={() => setPoPickerOpen(false)}
            onPick={applyPoSelection}
            title="Select PO"
            columns={[
              { key: "po_number", label: "PO Number", width: 180 },
              { key: "project_code", label: "Project Code", width: 260 },
              { key: "vendor_name", label: "Vendor", width: 260 },
            ]}
            fetchPage={async ({ page, search }) => {
              const { rows, total } = await fetchPOPage({ page, search });

              const normalized = rows.map((po) => ({
                ...po,
                po_number: po?.po_number || "",
                project_code: po?.project_id?.code || "",
                vendor_name: po?.vendorName || po?.vendor?.name || "",
              }));

              return { rows: normalized, total };
            }}
            searchKey="po_number"
            pageSize={10}
            rowKey="_id"
            defaultSearch={poPickerSearch}
          />
        </Sheet>
      )}

      {/* ---------------- Project Search More Modal (ONLY Adjustment) ---------------- */}
      {isAdjustment && projectPickerOpen && (
        <Sheet
          variant="outlined"
          sx={{
            mt: 2,
            p: 2,
            borderRadius: "lg",
            boxShadow: "sm",
            bgcolor: "background.level1",
          }}
        >
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <Typography level="title-md" sx={{ flex: 1 }}>
              Search Projects
            </Typography>
            <Button
              size="sm"
              variant="outlined"
              onClick={() => setProjectPickerOpen(false)}
            >
              Close
            </Button>
          </Box>

          <SearchPickerModal
            open={true}
            onClose={() => setProjectPickerOpen(false)}
            onPick={applyProjectSelection}
            title="Select Project"
            columns={[
              { key: "code", label: "Project Code", width: 260 },
              { key: "name", label: "Project Name", width: 260 },
              { key: "p_group", label: "Group", width: 140 },
              { key: "customer", label: "Client", width: 200 },
            ]}
            fetchPage={async ({ page, search }) => {
              const { rows, total } = await fetchProjectPage({ page, search });

              const normalized = rows.map((p) => ({
                ...p,
                code: p?.code || "",
                name: p?.name || "",
                p_group: p?.p_group || "",
                customer: p?.customer || "",
              }));

              return { rows: normalized, total };
            }}
            searchKey="code"
            pageSize={10}
            rowKey="_id"
            defaultSearch={projectPickerSearch}
          />
        </Sheet>
      )}
    </Box>
  );
}

export default PaymentRequestForm;
