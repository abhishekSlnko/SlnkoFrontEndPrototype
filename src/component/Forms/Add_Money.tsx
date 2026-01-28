// AddMoneyModal.jsx
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Grid,
  Input,
  Modal,
  ModalDialog,
  ModalClose,
  TextField,
  Typography,
} from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import Img6 from "../../assets/add_money.png";
import { toast } from "react-toastify";
import { useCreditMoneyMutation } from "../../redux/Accounts";
import { useGetProjectByPIdQuery } from "../../redux/projectsSlice";

export default function AddMoneyModal({ open, onClose, projectPid, onSuccess }) {
  const [formValues, setFormValues] = useState({
    p_id: "",
    name: "",
    code: "",
    customer: "",
    p_group: "",
    cr_amount: "",
    cr_date: "",
    cr_mode: "",
    cr_utr: "",
    comment: "",
  });

  const [error, setError] = useState("");

  // reset when modal opens/closes
  useEffect(() => {
    if (!open) return;

    setError("");
    setFormValues({
      p_id: "",
      name: "",
      code: "",
      customer: "",
      p_group: "",
      cr_amount: "",
      cr_date: "",
      cr_mode: "",
      cr_utr: "",
      comment: "",
    });
  }, [open]);

  const pid = projectPid || 0;

  const { data, isError } = useGetProjectByPIdQuery(pid, {
    skip: !open || !pid,
  });

  const project =
    data?.project?.data?.[0] || data?.data?.[0] || data?.data || null;

  useEffect(() => {
    if (!open) return;

    if (!pid) {
      setError("No project ID received.");
      return;
    }

    if (isError) {
      setError("Failed to fetch project data. Please try again later.");
      return;
    }

    if (!project) return;

    setError("");
    setFormValues((prev) => ({
      ...prev,
      p_id: project.p_id || "",
      code: project.code || "",
      name: project.name || "",
      customer: project.customer || "",
      p_group: project.p_group || "",
    }));
  }, [open, pid, project, isError]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "cr_amount" && Number(value) < 0) {
      toast.warning("Credit Amount cannot be negative!");
      return;
    }

    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const [creditMoney, { isLoading: isCreditingMoney }] =
    useCreditMoneyMutation();

  const modeOptions = useMemo(
    () => [
      { label: "Cash", value: "cash" },
      { label: "Account Transfer", value: "account_transfer" },
      { label: "Loan", value: "loan" },
    ],
    []
  );

  // ✅ show UTR for Account Transfer OR Loan
  const needsUtr = useMemo(
    () => ["account_transfer", "loan"].includes(formValues.cr_mode),
    [formValues.cr_mode]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { p_id, cr_amount, cr_date, cr_mode, cr_utr, comment } = formValues;

    if (!p_id || !cr_amount || !cr_date || !cr_mode || !comment) {
      toast.error("Please fill all required fields.");
      return;
    }

    // ✅ validate UTR for account_transfer OR loan
    if (needsUtr && !cr_utr) {
      toast.error("Please enter Credit UTR for Account Transfer / Loan.");
      return;
    }

    // ✅ send cr_utr to API when needed
    const payload = {
      p_id,
      cr_amount,
      cr_date,
      cr_mode,
      comment,
      ...(needsUtr ? { cr_utr } : {}),
    };

    try {
      await creditMoney(payload).unwrap();
      toast.success("Money added successfully!");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.data?.msg || "Something went wrong. Please try again.");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout="center"
        sx={{
          width: "min(900px, 94vw)",
          p: { xs: 2, md: 3 },
          borderRadius: "md",
          maxHeight: "92vh",
          overflow: "auto",
        }}
      >
        <ModalClose />

        {/* Header */}
        <Box textAlign="center" mb={2}>
          <img
            src={Img6}
            alt="Add Money"
            style={{ height: 46, marginBottom: 8 }}
          />
          <Typography
            level="h4"
            sx={{
              fontFamily: "Bona Nova SC, serif",
              textTransform: "uppercase",
              color: "warning.500",
              fontWeight: "lg",
            }}
          >
            Credit Form
          </Typography>
          <Box
            component="hr"
            sx={{
              width: "50%",
              margin: "8px auto",
              backgroundColor: "warning.400",
            }}
          />
        </Box>

        {error && (
          <Alert color="danger" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid xs={12} sm={6}>
              <Input fullWidth placeholder="Project Code" name="code" value={formValues.code} disabled />
            </Grid>
            <Grid xs={12} sm={6}>
              <Input fullWidth placeholder="Project Name" name="name" value={formValues.name} disabled />
            </Grid>

            {/* Editable Fields */}
            <Grid xs={12}>
              <Input
                fullWidth
                placeholder="Credit Amount (₹)"
                type="number"
                name="cr_amount"
                value={formValues.cr_amount}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid xs={12}>
              <Input
                fullWidth
                placeholder="Credit Date"
                type="date"
                name="cr_date"
                value={formValues.cr_date}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid xs={12}>
              <Autocomplete
                options={modeOptions}
                getOptionLabel={(o) => o.label}
                value={modeOptions.find((o) => o.value === formValues.cr_mode) || null}
                onChange={(_, opt) =>
                  setFormValues((p) => ({
                    ...p,
                    cr_mode: opt?.value || "",
                    // optional: clear UTR when switching to cash
                    cr_utr: ["account_transfer", "loan"].includes(opt?.value) ? p.cr_utr : "",
                  }))
                }
                renderInput={(params) => (
                  <TextField {...params} size="sm" placeholder="Credit Mode" required />
                )}
              />
            </Grid>

            {/* ✅ UTR input for account_transfer OR loan */}
            {needsUtr && (
              <Grid xs={12}>
                <Input
                  fullWidth
                  placeholder="Credit UTR / Ref No"
                  name="cr_utr"
                  value={formValues.cr_utr}
                  onChange={handleChange}
                  required
                />
              </Grid>
            )}

            <Grid xs={12}>
              <Input
                fullWidth
                placeholder="Comments"
                name="comment"
                value={formValues.comment}
                onChange={handleChange}
                required
              />
            </Grid>

            {/* Buttons */}
            <Grid xs={12}>
              <Box
                textAlign="right"
                mt={1}
                sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
              >
                <Button
                  type="button"
                  variant="outlined"
                  color="neutral"
                  onClick={onClose}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="solid"
                  loading={isCreditingMoney}
                  sx={{
                    backgroundColor: "#3366a3",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#285680" },
                  }}
                >
                  Submit
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </ModalDialog>
    </Modal>
  );
}
