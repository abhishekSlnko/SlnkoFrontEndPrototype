import {
  Box,
  Button,
  Container,
  CssBaseline,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  Input,
  Sheet,
  Typography,
} from "@mui/joy";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { toast } from "react-toastify";
import Img9 from "../../assets/solar.png";
import Axios from "../../utils/Axios";

const PROJECTS_API = "/get-all-projecT-IT";
const PO_DETAILS_API = "/get-po-detail";

function AdjustmentRequestForm() {
  const navigate = useNavigate();

  const [getFormData, setGetFormData] = useState({
    projectIDs: [],
    poNumbers: [],
  });

  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    p_id: "",
    name: "",
    customer: "",
    p_group: "",
    pay_type: "",
    po_number: "",
    adj_type: "",
    adj_amount: "",
    remark: "",
    dbt_date: "",
    adj_date: "",
    paid_for: "",
    vendor: "",
    comment: "",
    po_value: "",
    amount_paid: "",
    po_balance: "",
    total_advance_paid: "",
    submitted_by: "",
  });

  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [isPoListLoading, setIsPoListLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  /** ---------- react-select styles (shadcn-like) ---------- */
  const selectStyles = {
    control: (provided) => ({
      ...provided,
      minHeight: "40px",
      borderRadius: 8,
      borderColor: "#D0D5DD",
      fontSize: 14,
      boxShadow: "none",
      "&:hover": { borderColor: "#B8BCC4" },
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: 8,
      overflow: "hidden",
      zIndex: 9999,
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: 200,
    }),
    option: (provided, state) => ({
      ...provided,
      fontSize: 14,
      backgroundColor: state.isFocused ? "#F2F4F7" : "#FFFFFF",
      color: "#111827",
    }),
    singleValue: (provided) => ({
      ...provided,
      fontSize: 14,
    }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: 14,
      color: "#9CA3AF",
    }),
  };

  /** -------------------- Load User -------------------- **/
  useEffect(() => {
    const userData = localStorage.getItem("userDetails");
    if (userData) {
      const u = JSON.parse(userData);
      setUser(u);
      setFormData((p) => ({ ...p, submitted_by: u.name || "" }));
    }
  }, []);

  /** -------------------- Fetch Boot Data (same flow as Payment) -------------------- **/
  useEffect(() => {
    const fetchBoot = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const config = { headers: { "x-auth-token": token } };

        const [projectsRes, poListRes] = await Promise.all([
          Axios.get(PROJECTS_API, config),
          Axios.get(PO_DETAILS_API, config),
        ]);

        setGetFormData({
          projectIDs: projectsRes?.data?.data || [],
          poNumbers: Array.isArray(poListRes?.data?.po_numbers)
            ? poListRes.data.po_numbers
            : [],
        });
      } catch (err) {
        console.error("Boot fetch failed:", err);
        toast.error("Failed to load projects / POs");
      } finally {
        setIsProjectsLoading(false);
        setIsPoListLoading(false);
      }
    };

    fetchBoot();
  }, []);

  /** -------------------- Handle Change (adjustment-specific) -------------------- **/
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Payment type logic
    if (name === "pay_type") {
      if (value === "Adjustment") {
        setFormData((prev) => ({
          ...prev,
          paid_for: "Balance Transfer",
          po_number: "N/A",
          po_value: "N/A",
          total_advance_paid: "N/A",
          po_balance: "N/A",
          amount_paid: "",
          vendor: "",
        }));
      } else if (value === "Slnko Service Charge") {
        setFormData((prev) => ({
          ...prev,
          paid_for: "Slnko Service Charge",
          vendor: "Slnko Energy PVT LTD",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          paid_for: "",
          vendor: "",
          ...(prev.po_number === "N/A"
            ? {}
            : {
                po_number: "",
                po_value: "",
                total_advance_paid: "",
                po_balance: "",
              }),
        }));
      }
    }

    // When project changes, auto-fill project meta
    if (name === "p_id" && value) {
      const selectedProject = getFormData.projectIDs.find(
        (project) => project.p_id === value
      );
      if (selectedProject) {
        setFormData((prev) => ({
          ...prev,
          name: selectedProject.name || "",
          customer: selectedProject.customer || "",
          p_group: selectedProject.p_group || "",
        }));
      }
    }
  };

  /** -------------------- Handle PO Change (copied flow from PaymentRequestForm) -------------------- **/
  const handlePoChange = async (selectedOption) => {
    const poNum = selectedOption?.value || "";

    if (!poNum) {
      setFormData((prev) => ({
        ...prev,
        po_number: "",
        po_value: "",
        total_advance_paid: "",
        po_balance: "",
        vendor: "",
        paid_for: "",
        p_id: "",
        name: "",
        customer: "",
        p_group: "",
      }));
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const config = { headers: { "x-auth-token": token } };
      const { data } = await Axios.get(
        `${PO_DETAILS_API}?po_number=${encodeURIComponent(poNum)}`,
        config
      );

      const poValueNum = isFinite(Number(data?.po_value))
        ? Number(data.po_value)
        : "";
      const advPaidNum = isFinite(Number(data?.total_advance_paid))
        ? Number(data.total_advance_paid)
        : "";
      const balanceNum = isFinite(Number(data?.po_balance))
        ? Number(data.po_balance)
        : "";

      const poProjectCode = (data?.p_id || data?.project_code || "").toString();
      let resolvedProject = null;
      if (poProjectCode) {
        resolvedProject = getFormData.projectIDs.find(
          (p) => String(p.code) === poProjectCode
        );
      }

      console.log("PO details:", data);

      setFormData((prev) => ({
        ...prev,
        po_number: data?.po_number || poNum,
        paid_for: data?.item || prev.paid_for,
        vendor: data?.vendor || prev.vendor,
        po_value: poValueNum === "" ? "" : String(poValueNum),
        total_advance_paid: advPaidNum === "" ? "" : String(advPaidNum),
        amount_paid: advPaidNum === "" ? "" : String(advPaidNum), // show same in Total Advance Paid field if needed
        po_balance: balanceNum === "" ? "" : String(balanceNum),
        ...(resolvedProject
          ? {
              p_id: resolvedProject.p_id,
              name: resolvedProject.name || prev.name,
              customer: resolvedProject.customer || prev.customer,
              p_group: resolvedProject.p_group || prev.p_group,
            }
          : { p_id: prev.p_id }),
      }));

      if (poProjectCode && !resolvedProject) {
        console.warn(
          "PO project code not found in project list:",
          poProjectCode
        );
        toast.info(
          `Project code from PO ("${poProjectCode}") not found in loaded projects.`
        );
      }
    } catch (err) {
      console.error("Failed to fetch PO details:", err);
      toast.error("Could not load PO details");
    }
  };

  /** -------------------- Submit Form -------------------- **/
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    // Basic client-side sanity (you can extend later)
    if (!formData.pay_type) {
      toast.error("Please select Adjustment Type.");
      return;
    }
    if (!formData.adj_type) {
      toast.error("Please select Adjustment Mode (Add/Subtract).");
      return;
    }
    if (!formData.adj_amount) {
      toast.error("Please enter Adjustment Amount.");
      return;
    }
    if (!formData.adj_date) {
      toast.error("Please select Adjustment Date.");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("authToken");

      const payload = {
        ...formData,
        submitted_by: user?.name || formData.submitted_by || "",
      };

      await Axios.post("/add-adjustment-request", payload, {
        headers: { "x-auth-token": token },
      });

      toast.success("Adjustment submitted successfully");
      navigate("/project-balance");
    } catch (err) {
      console.error("Adjustment submit error:", err?.response || err);
      toast.error("Failed to submit Adjustment");
    } finally {
      setIsLoading(false);
    }
  };

  const labelStyle = { fontWeight: 600, mb: 0.5, color: "#111827" };

  const hasRealPO =
    formData.po_number && formData.po_number !== "" && formData.po_number !== "N/A";

  return (
    <CssBaseline>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Sheet
          variant="soft"
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: "lg",
            boxShadow: "lg",
            bgcolor: "background.surface",
          }}
        >
          {/* Header */}
          <Box textAlign="center" sx={{ mb: 3 }}>
            <img src={Img9} alt="logo" height={55} />
            <Typography level="h3" fontWeight="xl" sx={{ mt: 1 }}>
              Adjustment Request Form
            </Typography>
            <Divider sx={{ width: "40%", mx: "auto", mt: 1 }} />
          </Box>

            <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Adjustment Type</FormLabel>
                  <Select
                    styles={selectStyles}
                    name="pay_type"
                    placeholder="Select Type"
                    value={
                      formData.pay_type
                        ? {
                            label: formData.pay_type,
                            value: formData.pay_type,
                          }
                        : null
                    }
                    options={[
                      { label: "Payment Against PO", value: "Payment Against PO" },
                      { label: "Adjustment", value: "Adjustment" },
                      { label: "Slnko Service Charge", value: "Slnko Service Charge" },
                      { label: "Credit Note (CN)", value: "CN" },
                    ]}
                    onChange={(option) =>
                      handleChange({
                        target: {
                          name: "pay_type",
                          value: option?.value || "",
                        },
                      })
                    }
                    isClearable
                  />
                </FormControl>
              </Grid>

          <Box component="form" onSubmit={handleSubmit}>
            {/* ---------------- Project & PO ---------------- */}
            <Typography level="h4" fontWeight="xl" sx={{ mt: 2 }}>
              Project & PO
            </Typography>
            <Divider sx={{ mt: 1, mb: 3 }} />

            <Grid container spacing={3}>
              {/* PO Number */}
              <Grid xs={12} sm={6}>
                <FormControl>
                  <FormLabel sx={labelStyle}>PO Number</FormLabel>
                  <Select
                    styles={selectStyles}
                    name="po_number"
                    placeholder={
                      isPoListLoading ? "Loading PO numbers..." : "Select PO"
                    }
                    isDisabled={formData.pay_type === "Adjustment"}
                    isLoading={isPoListLoading}
                    value={
                      formData.po_number
                        ? {
                            label: formData.po_number,
                            value: formData.po_number,
                          }
                        : null
                    }
                    options={getFormData.poNumbers.map((po) => ({
                      label: po,
                      value: po,
                    }))}
                    onChange={handlePoChange}
                    isClearable
                  />
                </FormControl>
              </Grid>

              {/* Project Code / Select */}
              <Grid xs={12} sm={6}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Project Code</FormLabel>
                  {hasRealPO ? (
                    <Input
                      name="p_id"
                      readOnly
                      value={
                        getFormData.projectIDs.find(
                          (p) => p.p_id === formData.p_id
                        )?.code || ""
                      }
                      placeholder="Project Code"
                    />
                  ) : (
                    <Select
                      styles={selectStyles}
                      name="p_id"
                      placeholder={
                        isProjectsLoading ? "Loading Projects..." : "Select Project"
                      }
                      isLoading={isProjectsLoading}
                      value={
                        formData.p_id
                          ? {
                              label:
                                getFormData.projectIDs.find(
                                  (project) => project.p_id === formData.p_id
                                )?.code || "",
                              value: formData.p_id,
                            }
                          : null
                      }
                      options={getFormData.projectIDs.map((project) => ({
                        label: project.code,
                        value: project.p_id,
                      }))}
                      onChange={(option) =>
                        handleChange({
                          target: { name: "p_id", value: option?.value || "" },
                        })
                      }
                      isClearable
                    />
                  )}
                </FormControl>
              </Grid>

              {/* Project Name */}
              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Project Name</FormLabel>
                  <Input readOnly value={formData.name} placeholder="Project Name" />
                </FormControl>
              </Grid>

              {/* Client */}
              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Client Name</FormLabel>
                  <Input
                    readOnly
                    value={formData.customer}
                    placeholder="Client Name"
                  />
                </FormControl>
              </Grid>

              {/* Group */}
              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Group</FormLabel>
                  <Input readOnly value={formData.p_group} placeholder="Group" />
                </FormControl>
              </Grid>
            </Grid>

            {/* ---------------- Adjustment Details ---------------- */}
            <Typography level="h4" fontWeight="xl" sx={{ mt: 4 }}>
              Adjustment Details
            </Typography>
            <Divider sx={{ mt: 1, mb: 3 }} />

            <Grid container spacing={3}>
           

              {/* CN Reason */}
              {formData.pay_type === "CN" && (
                <Grid xs={12} sm={4}>
                  <FormControl>
                    <FormLabel sx={labelStyle}>Reason (CN)</FormLabel>
                    <Input
                      name="remark"
                      value={formData.remark}
                      onChange={handleChange}
                      placeholder="Enter Reason"
                    />
                  </FormControl>
                </Grid>
              )}

              {/* Adjustment Mode */}
              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Adjustment Mode</FormLabel>
                  <Select
                    styles={selectStyles}
                    name="adj_type"
                    placeholder="Add / Subtract"
                    value={
                      formData.adj_type
                        ? { label: formData.adj_type, value: formData.adj_type }
                        : null
                    }
                    options={[
                      { label: "Add", value: "Add" },
                      { label: "Subtract", value: "Subtract" },
                    ]}
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        adj_type: option?.value || "",
                      }))
                    }
                    isClearable
                  />
                </FormControl>
              </Grid>

              {/* Adjustment Amount */}
              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Adjustment Amount (₹)</FormLabel>
                  <Input
                    type="number"
                    name="adj_amount"
                    value={formData.adj_amount}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value === "") {
                        setFormData((prev) => ({ ...prev, adj_amount: "" }));
                        return;
                      }
                      let num = parseFloat(value);
                      if (Number.isNaN(num)) return;

                      if (formData.adj_type === "Subtract" && num > 0) {
                        num = -num;
                      }
                      if (formData.adj_type === "Add" && num < 0) {
                        num = Math.abs(num);
                      }

                      setFormData((prev) => ({
                        ...prev,
                        adj_amount: String(num),
                      }));
                    }}
                    placeholder="0.00"
                  />
                </FormControl>
              </Grid>

              {/* Adjustment Date */}
              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Adjustment Date</FormLabel>
                  <Input
                    type="date"
                    name="adj_date"
                    value={formData.adj_date}
                    onChange={handleChange}
                  />
                </FormControl>
              </Grid>

              {/* Adjusted For */}
              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Adjusted For</FormLabel>
                  <Input
                    name="paid_for"
                    value={formData.paid_for}
                    onChange={handleChange}
                    placeholder="Adjusted For"
                  />
                </FormControl>
              </Grid>

              {/* Vendor */}
              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Vendor / Credited To</FormLabel>
                  <Input
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleChange}
                    placeholder="Vendor"
                  />
                </FormControl>
              </Grid>

              {/* Description */}
              <Grid xs={12}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Adjustment Description</FormLabel>
                  <Input
                    name="comment"
                    value={formData.comment}
                    onChange={handleChange}
                    placeholder="Description"
                  />
                </FormControl>
              </Grid>
            </Grid>

            {/* ---------------- PO Financials ---------------- */}
            <Typography level="h4" fontWeight="xl" sx={{ mt: 4 }}>
              PO Financials
            </Typography>
            <Divider sx={{ mt: 1, mb: 3 }} />

            <Grid container spacing={3}>
              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>PO Value (with GST)</FormLabel>
                  <Input
                    name="po_value"
                    value={formData.po_value || ""}
                    readOnly
                    placeholder="PO Value"
                  />
                </FormControl>
              </Grid>

              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Total Advance Paid</FormLabel>
                  <Input
                    name="total_advance_paid"
                    value={formData.total_advance_paid || ""}
                    readOnly
                    placeholder="Total Advance Paid"
                  />
                </FormControl>
              </Grid>

              <Grid xs={12} sm={4}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Current PO Balance</FormLabel>
                  <Input
                    name="po_balance"
                    value={formData.po_balance || ""}
                    readOnly
                    placeholder="Current PO Balance"
                  />
                </FormControl>
              </Grid>
            </Grid>

            {/* ---------------- Actions ---------------- */}
            <Grid
              container
              spacing={3}
              justifyContent="center"
              sx={{ mt: 4 }}
            >
              <Grid>
                <Button
                  type="submit"
                  variant="solid"
                  color="primary"
                  size="lg"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Submit
                </Button>
              </Grid>
              <Grid>
                <Button
                  variant="outlined"
                  color="neutral"
                  size="lg"
                  onClick={() => navigate("/project-balance")}
                  disabled={isLoading}
                >
                  Back
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Sheet>
      </Container>
    </CssBaseline>
  );
}

export default AdjustmentRequestForm;
