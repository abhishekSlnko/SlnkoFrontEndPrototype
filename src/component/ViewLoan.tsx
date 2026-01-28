// LoanOverview.jsx
import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Divider,
  Select,
  Option,
  Textarea,
  Button,
  CircularProgress,
  Alert,
  Modal,
  ModalDialog,
  ModalClose,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Sheet,
  Tooltip,
  Avatar,
  Stack,
  IconButton,
  Input,
} from "@mui/joy";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import DOMPurify from "dompurify";
import CommentComposer from "./Comments";

import {
  useGetLoanByIdQuery,
  useUpdateLoanStatusMutation,
  useAddCommentMutation,
  useUploadExistingDocumentMutation,
  useAddLoanDocumentMutation,
  useUpdateLoanInlineMutation,
} from "../redux/loanSlice";

import {
  useUpdateDocumentItemFileMutation,
} from "../redux/documentSlice";

import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import DocumentTemplate from "./DocumentTemplate";

// ---- helpers ----
const STATUS_OPTIONS = [
  "documents pending",
  "documents submitted",
  "under banking process",
  "sanctioned",
  "disbursed",
  "dead"
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

const statusColor = (s) => {
  switch (String(s || "").toLowerCase()) {
    case "documents pending":
      return "danger";
    case "under banking process":
      return "warning";
    case "sanctioned":
      return "primary";
    case "disbursed":
      return "success";
    case "dead":
      return "warning";
    default:
      return "neutral";
  }
};

const cap = (s) =>
  String(s || "")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");

// Date-only formatter: 31 Oct 2025
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toPerson = (u = {}) => ({
  name: u?.name || "User",
  avatar: u?.attachment_url || "",
  _id: u?._id || null,
});
const initialsOf = (name = "") =>
  name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const colorFromName = () => "primary";
const safeUrl = (u = "") => (typeof u === "string" ? u : "");
const fileExt = (n = "") => (n.includes(".") ? n.split(".").pop() : "");
const formatBytes = (bytes = 0, dp = 1) => {
  if (!+bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dp))} ${sizes[i]}`;
};
const iconFor = () => "📄";

const goToProfile = (user) => {
  if (!user?._id) return;
  window.open(`/user_profile?id=${user._id}`, "_blank");
};

export default function LoanOverview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const project_id = searchParams.get("project_id");
  
  
  const [uploadExistingDocument, { isLoading: uploading, error: uploadErr }] =
    useUploadExistingDocumentMutation();

  const [updateDocumentItemFile, { isLoading: uploadingDoc, error: updateDocErr }] =
    useUpdateDocumentItemFileMutation();

  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [uploadDoc, setUploadDoc] = React.useState(null);
  const [uploadFile, setUploadFile] = React.useState(null);
  const [uploadFilename, setUploadFilename] = React.useState("");
  const [uploadRemarks, setUploadRemarks] = React.useState("");

  // ----- Add Document (new doc) -----
  const [addDocOpen, setAddDocOpen] = React.useState(false);
  const [addDocFile, setAddDocFile] = React.useState(null);
  const [addDocName, setAddDocName] = React.useState("");

  const [addLoanDocument, { isLoading: addingDoc, error: addDocErr }] =
    useAddLoanDocumentMutation();

  const openAddDoc = () => {
    setAddDocName("");
    setAddDocFile(null);
    setAddDocOpen(true);
  };
  const closeAddDoc = () => {
    setAddDocOpen(false);
    setAddDocName("");
    setAddDocFile(null);
  };

  const onAddDocPick = (e) => {
    const f = e?.target?.files?.[0];
    if (f) {
      setAddDocFile(f);
      if (!addDocName) {
        const base = f.name.replace(/\.[^/.]+$/, "");
        setAddDocName(base);
      }
    }
  };
  const onAddDocDrop = (e) => {
    e.preventDefault();
    const f = e?.dataTransfer?.files?.[0];
    if (f) {
      setAddDocFile(f);
      if (!addDocName) {
        const base = f.name.replace(/\.[^/.]+$/, "");
        setAddDocName(base);
      }
    }
  };
  const onAddDocDragOver = (e) => e.preventDefault();

  const submitAddDoc = async () => {
    if (!project_id) {
      toast.error("Project ID is missing");
      return;
    }
    if (!addDocName.trim()) {
      toast.error("Filename is required");
      return;
    }

    try {

      // Build FormData with same structure as createLoan
      const formData = new FormData();
      
      // Append data JSON with document metadata
      const docData = {
        documents: [
          {
            filename: addDocName.trim(),
            filetype: addDocFile ? (addDocFile.name.split('.').pop() || "") : "",
            fileurl: "",
            documentListId: "",
          }
        ]
      };
      
      try {
        const replacer = (key, value) => {
          if (value instanceof File || value instanceof Blob) {
            return "[File/Blob]";
          }
          if (typeof Buffer !== 'undefined' && value instanceof Buffer) {
            return value.toString('base64');
          }
          if (value && typeof value === 'object') {
            if (value.constructor && value.constructor.name === 'HTMLElement') {
              return "[HTMLElement]";
            }
          }
          return value;
        };
        formData.append("data", JSON.stringify(docData, replacer));
      } catch (err) {
        console.error("Error stringifying data:", err);
        formData.append("data", JSON.stringify({ error: "Failed to serialize data" }));
      }

      // Append file with metadata if present
      if (addDocFile) {
        formData.append("files", addDocFile);
        formData.append("file_filename[0][name]", addDocName.trim());
        formData.append("file_filename[0][fileIndex]", "0");
        formData.append("file_filename[0][filetype]", addDocFile.name.split('.').pop() || "");
        formData.append("file_filename[0][documentListId]", "");
      }

      const response = await addLoanDocument({
        project_id,
        formData,
      }).unwrap();

      toast.success("Document added successfully");
      closeAddDoc();
      refetch();
    } catch (e) {
      console.error("Add document error:", e);
      toast.error(e?.data?.message || e?.error || "Failed to add document");
    }
  };

  const openUploadModal = (doc) => {
    setUploadDoc(doc || null);
    setUploadFile(null);
    setUploadFilename(doc?.name || "");
    setUploadRemarks("");
    setUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    setUploadModalOpen(false);
    setUploadDoc(null);
    setUploadFile(null);
    setUploadFilename("");
    setUploadRemarks("");
  };

  const handleUploadSave = async () => {
    // Validate all required fields with specific error messages
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!uploadFilename.trim()) {
      toast.error("Please enter a filename");
      return;
    }

    // Use documentListId if available, fallback to _id
    const documentId = uploadDoc?.documentListId || uploadDoc?._id;
    if (!documentId) {
      console.error("Upload doc:", uploadDoc);
      toast.error("Document information is missing. Please close and try again.");
      return;
    }

    if (!project_id) {
      toast.error("Project ID is missing");
      return;
    }

    try {
      // Create FormData as expected by documentSlice mutation
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadRemarks.trim()) {
        formData.append("remarks", uploadRemarks.trim());
      }
      formData.append("name", uploadFilename.trim());

    
      await updateDocumentItemFile({
        project_id,
        documentListId: documentId,
        formData,
      }).unwrap();

      closeUploadModal();
      refetch();
      toast.success("Document uploaded successfully");
    } catch (e) {
      console.error("Upload error:", e);
      toast.error(e?.data?.message || e?.error || "Failed to upload document");
    }
  };

  const onFilePicked = (e) => {
    const f = e?.target?.files?.[0];
    if (f) {
      setUploadFile(f);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e?.dataTransfer?.files?.[0];
    if (f) {
      setUploadFile(f);
    }
  };
  const onDragOver = (e) => e.preventDefault();

  // ----- Data fetch (loan by project_id) -----
  const {
    data: loanResp,
    isFetching,
    isLoading,
    isError,
    refetch,
    error,
  } = useGetLoanByIdQuery(project_id, { skip: !project_id });

  // Normalize response shape
  const loanData =
    loanResp?.data && !Array.isArray(loanResp?.data)
      ? loanResp.data
      : Array.isArray(loanResp?.data)
      ? loanResp.data[0]
      : loanResp?.loan || null;

  const loan = loanData || {};
  const {
    current_status = {},
    banking_details = [],
    timelines = {},
    status_history = [],
    comments = [],
    documents: loanDocs = [],
  } = loan;

  // ----- Update Status (modal) -----
  const [updateLoanStatus, { isLoading: updating, error: updateErr }] =
    useUpdateLoanStatusMutation();

  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [nextStatus, setNextStatus] = React.useState(
    current_status?.status || ""
  );
  const [remarks, setRemarks] = React.useState("");

  React.useEffect(() => {
    setNextStatus(current_status?.status || "");
  }, [current_status?.status]);

  const openStatusModal = () => setStatusModalOpen(true);
  const closeStatusModal = () => {
    setStatusModalOpen(false);
    setRemarks("");
    setNextStatus(current_status?.status || "");
  };

  // ----- Inline Edit State -----
  const [updateLoanInline, { isLoading: inlineUpdating }] = useUpdateLoanInlineMutation();
  
  // Banking Details Modal State
  const [bankingModalOpen, setBankingModalOpen] = React.useState(false);
  const [editingBanks, setEditingBanks] = React.useState([]);
  const [savingBanks, setSavingBanks] = React.useState(false);
  
  const [editingTimelines, setEditingTimelines] = React.useState(false);
  const [editExpectedSanction, setEditExpectedSanction] = React.useState("");
  const [editExpectedDisbursement, setEditExpectedDisbursement] = React.useState("");
  const [editActualSanction, setEditActualSanction] = React.useState("");
  const [editActualDisbursement, setEditActualDisbursement] = React.useState("");

  const saveStatus = async () => {
    if (!project_id || !nextStatus) return;
    try {
      await updateLoanStatus({
        project_id,
        status: nextStatus,
        remarks: remarks || "",
      }).unwrap();
      closeStatusModal();
      refetch();
    } catch {}
  };

  // ----- Banking Modal Handlers -----
  const openBankingModal = () => {
    // Initialize with existing data or empty bank
    const banksData = (banking_details || []).map((bank, idx) => {
      const banker = (loan?.banker_details || [])[idx] || {};
      return {
        name: bank?.name || "",
        city: bank?.bank_city_name || "",
        branch: bank?.branch || "",
        state: bank?.state || "",
        bankerName: banker?.name || "",
        bankerPrimaryContact: (banker?.contact_detail || [])[0] || "",
        bankerAlternateContact: (banker?.contact_detail || [])[1] || "",
      };
    });
    
    // If no banks, add one empty bank
    if (banksData.length === 0) {
      banksData.push({
        name: "",
        city: "",
        branch: "",
        state: "",
        bankerName: "",
        bankerPrimaryContact: "",
        bankerAlternateContact: "",
      });
    }
    
    setEditingBanks(banksData);
    setBankingModalOpen(true);
  };

  const closeBankingModal = () => {
    setBankingModalOpen(false);
    setEditingBanks([]);
  };

  const updateBankField = (idx, field, value) => {
    setEditingBanks(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const addBankRow = () => {
    setEditingBanks(prev => [
      ...prev,
      {
        name: "",
        city: "",
        branch: "",
        state: "",
        bankerName: "",
        bankerPrimaryContact: "",
        bankerAlternateContact: "",
      },
    ]);
  };

  const removeBankRow = (idx) => {
    setEditingBanks(prev => prev.filter((_, i) => i !== idx));
  };

  const saveBankingDetails = async () => {
    if (!project_id) return;
    
    // Validate at least one bank has required fields
    const validBanks = editingBanks.filter(b => 
      b.name?.trim() || b.city?.trim() || b.branch?.trim()
    );
    
    if (validBanks.length === 0) {
      toast.error("Please add at least one bank with required details");
      return;
    }
    
    // Validate required fields for each bank (bank + banker)
    for (let i = 0; i < validBanks.length; i++) {
      const bank = validBanks[i];
      if (!bank.name?.trim()) {
        toast.error(`Bank ${i + 1}: Bank Name is required`);
        return;
      }
    }
    
    try {
      setSavingBanks(true);
      
      // Format banking_details
      const banking_details = validBanks.map(b => ({
        name: b.name.trim(),
        bank_city_name: b.city.trim(),
        branch: b.branch.trim(),
        state: b.state.trim(),
      }));
      
      // Format banker_details
      const banker_details = validBanks
        .map(b => {
          const contacts = [
            (b.bankerPrimaryContact || "").trim(),
            (b.bankerAlternateContact || "").trim(),
          ].filter(c => !!c);
          return {
            name: b.bankerName.trim(),
            contact_detail: contacts,
          };
        })
        .filter(Boolean);
      
      await updateLoanInline({
        project_id,
        payload: { banking_details, banker_details },
      }).unwrap();
      
      toast.success("Banking details updated successfully");
      closeBankingModal();
      refetch();
    } catch (err) {
      console.error("Save banking error:", err);
      toast.error(err?.data?.message || "Failed to update banking details");
    } finally {
      setSavingBanks(false);
    }
  };

  const handleEditTimelines = () => {
    setEditingTimelines(true);
    // Format dates to YYYY-MM-DD for input type="date"
    const formatForInput = (dateStr) => {
      if (!dateStr) return "";
      const dt = new Date(dateStr);
      if (Number.isNaN(dt.getTime())) return "";
      return dt.toISOString().split("T")[0];
    };
    
    setEditExpectedSanction(formatForInput(timelines?.expected_sanctioned_date));
    setEditExpectedDisbursement(formatForInput(timelines?.expected_disbursement_date));
    setEditActualSanction(formatForInput(timelines?.actual_sanctioned_date));
    setEditActualDisbursement(formatForInput(timelines?.actual_disbursement_date));
  };

  const handleCancelTimelineEdit = () => {
    setEditingTimelines(false);
    setEditExpectedSanction("");
    setEditExpectedDisbursement("");
    setEditActualSanction("");
    setEditActualDisbursement("");
  };

  const handleSaveTimelineEdit = async () => {
    if (!project_id) return;

    try {
      const updatedTimelines = {
        expected_sanctioned_date: editExpectedSanction || null,
        expected_disbursement_date: editExpectedDisbursement || null,
        actual_sanctioned_date: editActualSanction || null,
        actual_disbursement_date: editActualDisbursement || null,
      };

      await updateLoanInline({
        project_id,
        payload: { timelines: updatedTimelines },
      }).unwrap();

      toast.success("Timeline dates updated");
      handleCancelTimelineEdit();
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update timeline dates");
    }
  };

  // ---------- Notes / Activity / Documents ----------
  const [openActivity, setOpenActivity] = React.useState(true);
  const [tabValue, setTabValue] = React.useState("comments");

  const [commentText, setCommentText] = React.useState("");
  const [attachments, setAttachments] = React.useState([]);

  const [addComment, { isLoading: isSaving, error: addCommentErr }] =
    useAddCommentMutation();

  const documents = React.useMemo(
    () =>
      (loanDocs || []).map((d, index) => ({
        _id: d?.documentList_id || d?._id || d?.filename || `doc_${index}`, // Primary ID from backend
        documentListId: d?.documentList_id || d?._id || d?.filename || `doc_${index}`, // For backend call
        filename: d?.filename || "Attachment",
        name: d?.filename || "Attachment",
        url: d?.fileurl || "",
        type: d?.fileType || fileExt(d?.filename || "").toUpperCase(),
        size: d?.size || undefined,
        user_id: d?.createdBy || d?.user_id || {},
        updatedAt: d?.updatedAt || d?.createdAt || undefined,
        createdAt: d?.createdAt || undefined,
        fileType: d?.fileType || "",
        current_status: d?.current_status || {},
      })),
    [loanDocs]
  );

  const activity = React.useMemo(() => {
    const items = [];

    (status_history || []).forEach((s) => {
      items.push({
        _id: s?._id,
        _type: "status",
        status: s.status,
        remarks: s.remarks || "",
        user: s.user_id || {},
        at: s.updatedAt,
      });
    });

    (comments || []).forEach((c) => {
      items.push({
        _id: c?._id,
        _type: "comment",
        html: c.remarks || c.pendency_remark || "",
        user: c.createdBy || {},
        at: c.updatedAt,
      });
    });

    (documents || []).forEach((f) => {
      const url = f?.url || f?.fileurl || "";
      if (!url || url.trim() === "") return;

      items.push({
        _id: f?._id,
        _type: "file",
        attachment: f,
        user: f.user_id || {},
        at: f.updatedAt || f.createdAt,
      });
    });
    return items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  }, [status_history, comments, documents]);

  const handleSubmitComment = async () => {
    const text = String(commentText || "").trim();
    if (!project_id || !text) return;

    try {
      await addComment({ project_id, remarks: text }).unwrap();
      setCommentText("");
      setAttachments([]);
      refetch();
      toast.success("Notes Added");
    } catch {
      toast.error("Failed to add notes");
    }
  };

  const handleRemoveAttachment = (i) =>
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  const setOpenAttachModal = () => {};

  const projectStatusColor = (s) => {
    switch (String(s || "").toLowerCase()) {
      case "delayed":
        return "danger";
      case "to be started":
        return "warning";
      case "ongoing":
        return "primary";
      case "completed":
        return "success";
      case "on hold":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const capitalizeWords = (s) =>
    String(s || "")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return (
    <Box
      sx={{
        ml: { lg: "var(--Sidebar-width)" },
        px: "0px",
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
      }}
    >
      {/* Loading & Error states */}
      {isLoading || isFetching ? (
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size="sm" />
          <Typography level="body-sm">Loading loan…</Typography>
        </Box>
      ) : null}
      {isError ? (
        <Box sx={{ p: 2 }}>
          <Alert color="danger" variant="soft">
            Failed to load loan. {error?.data?.message || error?.error || ""}
          </Alert>
        </Box>
      ) : null}

      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        {/* LEFT card: Project + Status (chip opens modal) */}
        <Grid xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: "lg", height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <Chip
                  sx={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate(
                      `/project_detail?project_id=${loanResp?.data?.project_id?._id}`
                    )
                  }
                  size="sm"
                  variant="soft"
                  color="primary"
                >
                  {loanResp?.data?.project_id?.code || "—"}
                </Chip>

                <Chip
                  size="sm"
                  variant="soft"
                  color={statusColor(current_status?.status)}
                  sx={{
                    textTransform: "capitalize",
                    fontWeight: 500,
                    cursor: "pointer",
                    "&:hover": { boxShadow: "sm" },
                    "&:active": { transform: "translateY(1px)" },
                  }}
                  onClick={openStatusModal}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openStatusModal();
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="Change loan status"
                  title="Click to change status"
                >
                  {current_status?.status
                    ? cap(current_status.status)
                    : "Not Submitted"}
                </Chip>
              </Box>

              <Typography my={1} level="body-md" sx={{ color: "neutral.800" }}>
                {loanResp?.data?.project_id?.customer || ""}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                  <LabelValue
                    label="State"
                    value={loanResp?.data?.project_id?.state || "—"}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <LabelValue
                    label="Contact"
                    value={loanResp?.data?.project_id?.number || "—"}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <LabelValue
                    label="AC Capacity"
                    value={
                      loanResp?.data?.project_id?.project_kwp !== undefined &&
                      loanResp?.data?.project_id?.project_kwp !== null
                        ? String(loanResp?.data?.project_id?.project_kwp)
                        : "—"
                    }
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <LabelValue
                    label="DC Capacity"
                    value={
                      loanResp?.data?.project_id?.dc_capacity !== undefined &&
                      loanResp?.data?.project_id?.dc_capacity !== null
                        ? String(loanResp?.data?.project_id?.dc_capacity)
                        : "—"
                    }
                  />
                </Grid>

                <Grid xs={12} sm={6}>
                  <LabelValue
                    label="PPA Expiry Date"
                    value={fmtDate(loanResp?.data?.project_id?.ppa_expiry_date)}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <LabelValue
                    label="BD Commitment Date"
                    value={fmtDate(
                      loanResp?.data?.project_id?.bd_commitment_date
                    )}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <LabelValue
                    label="Project Completion Date"
                    value={fmtDate(
                      loanResp?.data?.project_id?.project_completion_date
                    )}
                  />
                </Grid>

                <Grid xs={12} sm={6}>
                  <LabelValue
                    label="Project Status"
                    value={
                      loanResp?.data?.project_id?.current_status?.status ? (
                        <Chip
                          size="sm"
                          variant="soft"
                          color={projectStatusColor(
                            loanResp.data.project_id.current_status.status
                          )}
                          sx={{ textTransform: "capitalize", fontWeight: 500 }}
                        >
                          {capitalizeWords(
                            loanResp.data.project_id.current_status.status
                          )}
                        </Chip>
                      ) : (
                        "—"
                      )
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT card: Bank & Dates (multiple banks) */}
        <Grid xs={12} md={6}>
          <Card
            variant="soft"
            sx={{
              borderRadius: "lg",
              height: "100%",
              minHeight: { xs: 400, md: 480 },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardContent
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
                minHeight: 0,
              }}
            >
              <Typography level="title-lg">Loan Information</Typography>

              {/* -- Dates (timelines) fixed at top -- */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography level="title-md">Dates</Typography>
                  {editingTimelines ? (
                    <Stack direction="row" gap={0.5}>
                      <IconButton
                        size="sm"
                        color="success"
                        onClick={handleSaveTimelineEdit}
                        disabled={inlineUpdating}
                        sx={{border:"1px solid green"}}
                      >
                        ✓
                      </IconButton>
                      <IconButton
                        size="sm"
                        color="danger"
                        onClick={handleCancelTimelineEdit}
                        disabled={inlineUpdating}
                        sx={{border:"1px solid red"}}
                      >
                        ✕
                      </IconButton>
                    </Stack>
                  ) : (
                    <IconButton
                      size="sm"
                      variant="soft"
                      onClick={handleEditTimelines}
                    >
                      ✎
                    </IconButton>
                  )}
                </Stack>
                <Grid container spacing={1.25}>
                  <Grid xs={12} sm={6}>
                    {editingTimelines ? (
                      <Box>
                        <Typography level="body-xs" sx={{ color: "neutral.500", mb: 0.5 }}>
                          Expected Sanction
                        </Typography>
                        <Input
                          type="date"
                          size="sm"
                          value={editExpectedSanction}
                          onChange={(e) => setEditExpectedSanction(e.target.value)}
                        />
                      </Box>
                    ) : (
                      <LabelValue
                        label="Expected Sanction"
                        value={fmtDate(timelines?.expected_sanctioned_date)}
                      />
                    )}
                  </Grid>
                  <Grid xs={12} sm={6}>
                    {editingTimelines ? (
                      <Box>
                        <Typography level="body-xs" sx={{ color: "neutral.500", mb: 0.5 }}>
                          Expected Disbursement
                        </Typography>
                        <Input
                          type="date"
                          size="sm"
                          value={editExpectedDisbursement}
                          onChange={(e) => setEditExpectedDisbursement(e.target.value)}
                        />
                      </Box>
                    ) : (
                      <LabelValue
                        label="Expected Disbursement"
                        value={fmtDate(timelines?.expected_disbursement_date)}
                      />
                    )}
                  </Grid>
                  <Grid xs={12} sm={6}>
                    {editingTimelines ? (
                      <Box>
                        <Typography level="body-xs" sx={{ color: "neutral.500", mb: 0.5 }}>
                          Actual Sanction
                        </Typography>
                        <Input
                          type="date"
                          size="sm"
                          value={editActualSanction}
                          onChange={(e) => setEditActualSanction(e.target.value)}
                        />
                      </Box>
                    ) : (
                      <LabelValue
                        label="Actual Sanction"
                        value={fmtDate(timelines?.actual_sanctioned_date)}
                      />
                    )}
                  </Grid>
                  <Grid xs={12} sm={6}>
                    {editingTimelines ? (
                      <Box>
                        <Typography level="body-xs" sx={{ color: "neutral.500", mb: 0.5 }}>
                          Actual Disbursement
                        </Typography>
                        <Input
                          type="date"
                          size="sm"
                          value={editActualDisbursement}
                          onChange={(e) => setEditActualDisbursement(e.target.value)}
                        />
                      </Box>
                    ) : (
                      <LabelValue
                        label="Actual Disbursement"
                        value={fmtDate(timelines?.actual_disbursement_date)}
                      />
                    )}
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 0.5 }} />

              {/* -- Banks list (scrollable) -- */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography level="title-md">Banks</Typography>
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={openBankingModal}
                    startDecorator={<span>✎</span>}
                  >
                    Edit Banking Details
                  </Button>
                </Stack>
                <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.5 }}>
                  <BankList banks={banking_details} bankers={loan?.banker_details || []} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* --------- NOTES: Activity + Documents --------- */}
      <Box sx={{ mt: 2 }}>
        <Section
          title="Notes"
          open={openActivity}
          onToggle={() => setOpenActivity((v) => !v)}
          right={
            <Chip
              size="sm"
              variant="soft"
              startDecorator={<TimelineRoundedIcon />}
            >
              {activity.length} activities
            </Chip>
          }
        >
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{ mb: 1 }}
          >
            <TabList>
              <Tab value="comments">Notes</Tab>
              <Tab value="docs">Documents</Tab>
            </TabList>

            {/* NOTES / ACTIVITY STREAM */}
            <TabPanel value="comments" sx={{ p: 0, pt: 1 }}>
              <CommentComposer
                value={commentText}
                onChange={setCommentText}
                onSubmit={handleSubmitComment}
                onCancel={() => {
                  setCommentText("");
                  setAttachments([]);
                }}
                onAttachClick={() => setOpenAttachModal(true)}
                attachments={attachments}
                onRemoveAttachment={handleRemoveAttachment}
                isSubmitting={isSaving}
                editorMinHeight={30}
              />

              {addCommentErr ? (
                <Alert color="danger" variant="soft" sx={{ mt: 1 }}>
                  {addCommentErr?.data?.message ||
                    addCommentErr?.error ||
                    "Failed to add comment."}
                </Alert>
              ) : null}

              <Divider sx={{ my: 1.5 }} />

              <Typography level="title-sm" sx={{ mb: 1 }}>
                Activity Stream
              </Typography>

              <Box sx={{ maxHeight: 420, overflow: "auto" }}>
                {activity.length === 0 ? (
                  <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                    No activity yet.
                  </Typography>
                ) : (
                  activity.map((it, idx) => {
                    const user = toPerson(it.user || it.user_id || {});
                    const when = it.at ? new Date(it.at) : null;
                    const whenLabel = when
                      ? when.toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "—";

                    const isStatus = it._type === "status";
                    const statusLabel = cap(it.status || "-");

                    return (
                      <Box key={`act-${idx}`} sx={{ mb: 1.5 }}>
                        <Stack
                          direction="row"
                          alignItems="flex-start"
                          gap={1.25}
                        >
                          <Avatar
                            role="button"
                            tabIndex={0}
                            onClick={() => goToProfile(user)}
                            onKeyDown={(e) =>
                              (e.key === "Enter" || e.key === " ") &&
                              goToProfile(user)
                            }
                            src={user.avatar || undefined}
                            variant={user.avatar ? "soft" : "solid"}
                            color={
                              user.avatar ? "neutral" : colorFromName(user.name)
                            }
                            sx={{
                              width: 36,
                              height: 36,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {!user.avatar && initialsOf(user.name)}
                          </Avatar>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack
                              direction="row"
                              alignItems="baseline"
                              gap={1}
                            >
                              <Typography
                                level="body-sm"
                                fontWeight="lg"
                                sx={{ whiteSpace: "nowrap" }}
                              >
                                {user.name}
                              </Typography>
                              <Typography
                                level="body-xs"
                                sx={{ color: "text.tertiary" }}
                              >
                                {whenLabel}
                              </Typography>
                            </Stack>

                            {it._type === "comment" && it?.html ? (
                              <div
                                style={{
                                  marginTop: 2,
                                  lineHeight: 1.66,
                                  wordBreak: "break-word",
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: DOMPurify.sanitize(it.html),
                                }}
                              />
                            ) : isStatus ? (
                              <Stack
                                direction="row"
                                alignItems="center"
                                gap={1}
                                sx={{ mt: 0.25, flexWrap: "wrap" }}
                              >
                                <Chip
                                  size="sm"
                                  variant="soft"
                                  color={statusColor(it.status)}
                                >
                                  {statusLabel}
                                </Chip>
                                {it.remarks && (
                                  <Typography level="body-sm">
                                    {String(it.remarks).trim()}
                                  </Typography>
                                )}
                              </Stack>
                            ) : it._type === "file" ? (
                              <Typography level="body-sm" sx={{ mt: 0.25 }}>
                                {`Uploaded file: ${
                                  it?.attachment?.name || "Attachment"
                                }`}
                              </Typography>
                            ) : null}

                            {it._type === "file" && it.attachment ? (
                              <Box sx={{ mt: 0.75 }}>
                                <AttachmentGallery items={[it.attachment]} />
                              </Box>
                            ) : null}
                          </Box>
                        </Stack>
                        <Divider sx={{ mt: 1 }} />
                      </Box>
                    );
                  })
                )}
              </Box>
            </TabPanel>

            {/* DOCUMENTS LIST */}
            <TabPanel value="docs" sx={{ p: 0, pt: 1 }}>
              <DocumentTemplate projectId={loanResp?.data?.project_id?._id} onOpenAddDoc={openAddDoc} />
            </TabPanel>
          </Tabs>
        </Section>
      </Box>

      {/* ---------- Upload Document Modal ---------- */}
      <Modal open={uploadModalOpen} onClose={closeUploadModal}>
        <ModalDialog
          aria-labelledby="upload-doc-title"
          variant="outlined"
          sx={{ borderRadius: "lg", minWidth: 520, maxWidth: "92vw" }}
        >
          <ModalClose />
          <DialogTitle id="upload-doc-title">
            Upload Document
          </DialogTitle>
          <DialogContent>
            Edit the filename and upload a file to update the document.
          </DialogContent>

          <Box sx={{ display: "grid", gap: 1.25 }}>
            {/* Filename (editable) */}
            <Box>
              <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 0.5 }}>
                Filename
              </Typography>
              <Input
                value={uploadFilename}
                onChange={(e) => setUploadFilename(e.target.value)}
                placeholder="Enter filename"
                slotProps={{
                  input: {
                    style: { fontFamily: "monospace" },
                  },
                }}
              />
            </Box>

            {/* Remarks (optional) */}
            <Box>
              <Typography level="body-xs" sx={{ color: "text.tertiary", mb: 0.5 }}>
                Remarks (Optional)
              </Typography>
              <Textarea
                minRows={2}
                maxRows={4}
                value={uploadRemarks}
                onChange={(e) => setUploadRemarks(e.target.value)}
                placeholder="Add any remarks or comments"
              />
            </Box>

            {/* Drag & drop box + file input */}
            <Box
              onDrop={onDrop}
              onDragOver={onDragOver}
              sx={{
                mt: 1,
                p: 2,
                border: "2px dashed",
                borderColor: "neutral.outlinedBorder",
                borderRadius: "md",
                textAlign: "center",
                bgcolor: "background.level1",
              }}
            >
              <Typography level="body-sm" sx={{ mb: 1 }}>
                Drag & drop a file here, or choose one:
              </Typography>
              <input type="file" onChange={onFilePicked} />
              {uploadFile ? (
                <Typography
                  level="body-xs"
                  sx={{ mt: 1, color: "text.tertiary" }}
                >
                  Selected: {uploadFile.name} (
                  {Math.round(uploadFile.size / 1024)} KB)
                </Typography>
              ) : null}
            </Box>

            {updateDocErr ? (
              <Alert color="danger" variant="soft">
                {updateDocErr?.data?.message ||
                  updateDocErr?.error ||
                  "Upload failed."}
              </Alert>
            ) : null}
          </Box>

          <DialogActions>
            <Button variant="plain" onClick={closeUploadModal}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadSave}
              loading={uploadingDoc}
              disabled={!uploadFile || !uploadFilename.trim()}
            >
              Save
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* ---------- Status Update Modal ---------- */}
      <Modal open={statusModalOpen} onClose={closeStatusModal}>
        <ModalDialog
          aria-labelledby="loan-status-title"
          variant="outlined"
          sx={{ borderRadius: "lg", minWidth: 420, maxWidth: "90vw" }}
        >
          <ModalClose />
          <DialogTitle id="loan-status-title">Change Loan Status</DialogTitle>
          <DialogContent>
            Select a status and optionally add remarks. This will be recorded in
            the loan status.
          </DialogContent>

          <Box sx={{ display: "grid", gap: 1.5 }}>
            <Select
              value={nextStatus || ""}
              onChange={(_, v) => setNextStatus(v || "")}
              placeholder="Select status"
            >
              {STATUS_OPTIONS.map((s) => (
                <Option key={s} value={s}>
                  {cap(s)}
                </Option>
              ))}
            </Select>

            <Textarea
              minRows={3}
              placeholder="Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />

            {updateErr ? (
              <Alert color="danger" variant="soft">
                {updateErr?.data?.message ||
                  updateErr?.error ||
                  "Failed to update status."}
              </Alert>
            ) : null}
          </Box>

          <DialogActions>
            <Button variant="plain" onClick={closeStatusModal}>
              Cancel
            </Button>
            <Button
              onClick={saveStatus}
              loading={updating}
              disabled={!project_id || !nextStatus}
            >
              Save
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* ---------- Add Document Modal (new entry) ---------- */}
      <Modal open={addDocOpen} onClose={closeAddDoc}>
        <ModalDialog
          variant="outlined"
          sx={{ borderRadius: "lg", minWidth: 520, maxWidth: "92vw" }}
        >
          <ModalClose />
          <DialogTitle>Add Document</DialogTitle>
          <DialogContent>
            Provide a filename and optionally upload a file.
          </DialogContent>

          <Box sx={{ display: "grid", gap: 1.25 }}>
            <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
              Filename (required)
            </Typography>
            <Input
              value={addDocName}
              onChange={(e) => setAddDocName(e.target.value)}
              placeholder="e.g. Sanction_Letter"
            />

            <Box
              onDrop={onAddDocDrop}
              onDragOver={onAddDocDragOver}
              sx={{
                mt: 1,
                p: 2.5,
                border: "2px dashed",
                borderColor: "neutral.outlinedBorder",
                borderRadius: "md",
                textAlign: "center",
                bgcolor: "background.level1",
                cursor: "pointer",
              }}
              onClick={() =>
                document.getElementById("add-doc-file-input")?.click()
              }
            >
              <Typography level="body-sm">
                Drag & drop files here, or <b>click to browse</b>
              </Typography>
              <input
                id="add-doc-file-input"
                type="file"
                style={{ display: "none" }}
                onChange={onAddDocPick}
              />
              {addDocFile ? (
                <Typography
                  level="body-xs"
                  sx={{ mt: 1, color: "text.tertiary" }}
                >
                  Selected: {addDocFile.name} (
                  {Math.round(addDocFile.size / 1024)} KB)
                </Typography>
              ) : null}
            </Box>

            {addDocErr ? (
              <Alert color="danger" variant="soft">
                {addDocErr?.data?.message ||
                  addDocErr?.error ||
                  "Failed to add document."}
              </Alert>
            ) : null}
          </Box>

          <DialogActions>
            <Button variant="plain" onClick={closeAddDoc}>
              Cancel
            </Button>
            <Button
              onClick={submitAddDoc}
              loading={addingDoc}
              disabled={!addDocName.trim() || addingDoc}
              color={addingDoc ? "neutral" : "primary"}
            >
              {addingDoc ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* ---------- Banking Details Modal ---------- */}
      <Modal open={bankingModalOpen} onClose={closeBankingModal}>
        <ModalDialog
          variant="outlined"
          sx={{ 
            borderRadius: "lg", 
            minWidth: { xs: "90vw", sm: 800 }, 
            maxWidth: "95vw",
            maxHeight: "90vh",
            overflow: "auto"
          }}
        >
          <ModalClose />
          <DialogTitle>Edit Banking Details</DialogTitle>
          <DialogContent>
            Manage all bank and banker information for this loan.
          </DialogContent>

          <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
            {editingBanks.map((bank, idx) => (
              <Sheet
                key={`edit-bank-${idx}`}
                variant="outlined"
                sx={{ p: 2, borderRadius: "md" }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1.5 }}
                >
                  <Chip size="sm" variant="soft" color="primary">
                    Bank {idx + 1}
                  </Chip>
                  {editingBanks.length > 1 && (
                    <IconButton
                      size="sm"
                      color="danger"
                      variant="soft"
                      onClick={() => removeBankRow(idx)}
                    >
                      <Delete />
                    </IconButton>
                  )}
                </Stack>

                {/* Bank Details */}
                <Typography level="title-sm" sx={{ mb: 1 }}>
                  Bank Information
                </Typography>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid xs={12}>
                    <Typography level="body-xs" sx={{ mb: 0.5 }}>
                      Bank Name <span style={{ color: "red" }}>*</span>
                    </Typography>
                    <Input
                      size="sm"
                      placeholder="Enter bank name"
                      value={bank.name}
                      onChange={(e) => updateBankField(idx, "name", e.target.value)}
                    />
                  </Grid>

                  <Grid xs={12} md={4}>
                    <Typography level="body-xs" sx={{ mb: 0.5 }}>
                      City 
                    </Typography>
                    <Input
                      size="sm"
                      placeholder="Enter city"
                      value={bank.city}
                      onChange={(e) => updateBankField(idx, "city", e.target.value)}
                    />
                  </Grid>
                  <Grid xs={12} md={4}>
                    <Typography level="body-xs" sx={{ mb: 0.5 }}>
                      Branch 
                    </Typography>
                    <Input
                      size="sm"
                      placeholder="Enter branch"
                      value={bank.branch}
                      onChange={(e) => updateBankField(idx, "branch", e.target.value)}
                    />
                  </Grid>
                  <Grid xs={12} md={4}>
                    <Typography level="body-xs" sx={{ mb: 0.5 }}>
                      State 
                    </Typography>
                    <Select
                      size="sm"
                      placeholder="Select state"
                      value={bank.state}
                      onChange={(e, newValue) => updateBankField(idx, "state", newValue || "")}
                    >
                      {INDIAN_STATES.map((state) => (
                        <Option key={state} value={state}>
                          {state}
                        </Option>
                      ))}
                    </Select>
                  </Grid>
                </Grid>

                {/* Banker Details */}
                <Divider sx={{ my: 1.5 }} />
                <Typography level="title-sm" sx={{ mb: 1 }}>
                  Banker Information
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid xs={12}>
                    <Typography level="body-xs" sx={{ mb: 0.5 }}>
                      Banker Name 
                    </Typography>
                    <Input
                      size="sm"
                      placeholder="Enter banker's name"
                      value={bank.bankerName}
                      onChange={(e) => updateBankField(idx, "bankerName", e.target.value)}
                    />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <Typography level="body-xs" sx={{ mb: 0.5 }}>
                      Primary Contact 
                    </Typography>
                    <Input
                      size="sm"
                      placeholder="Email or phone"
                      value={bank.bankerPrimaryContact}
                      onChange={(e) => updateBankField(idx, "bankerPrimaryContact", e.target.value)}
                    />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <Typography level="body-xs" sx={{ mb: 0.5 }}>
                      Alternate Contact
                    </Typography>
                    <Input
                      size="sm"
                      placeholder="Email or phone"
                      value={bank.bankerAlternateContact}
                      onChange={(e) => updateBankField(idx, "bankerAlternateContact", e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Sheet>
            ))}

            <Button
              variant="outlined"
              color="primary"
              startDecorator={<Add />}
              onClick={addBankRow}
              sx={{ alignSelf: "flex-start" }}
            >
              Add Another Bank
            </Button>
          </Box>

          <DialogActions>
            <Button variant="plain" onClick={closeBankingModal}>
              Cancel
            </Button>
            <Button
              onClick={saveBankingDetails}
              loading={savingBanks}
              disabled={savingBanks}
            >
              Save All Banks
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
}

function LabelValue({ label, value }) {
  return (
    <Box>
      <Typography level="body-xs" sx={{ color: "neutral.500" }}>
        {label}
      </Typography>
      <Typography level="body-md" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

function BankList({ banks = [], bankers = [] }) {
  if (!Array.isArray(banks) || banks.length === 0) {
    return (
      <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
        No banking details added.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {banks.map((b, idx) => {
        const banker = bankers[idx] || {};
        const contacts = banker?.contact_detail || [];
        
        return (
          <Sheet
            key={`bank-${idx}`}
            variant="outlined"
            sx={{ borderRadius: "md", p: 1.25 }}
          >
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <Chip size="sm" variant="soft" color="primary">
                {`Bank ${idx + 1}`}
              </Chip>
              <Typography level="title-sm" sx={{ fontWeight: 700 }}>
                {b?.name || "—"}
              </Typography>
            </Stack>
            <Stack
              direction="column"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <Grid container spacing={1} alignItems="flex-start">
                <Grid xs={12} sm={4}>
                  <LabelValue label="City" value={b?.bank_city_name || "—"} />
                </Grid>
                <Grid xs={12} sm={4}>
                  <LabelValue label="Branch" value={b?.branch || "—"} />
                </Grid>
                <Grid xs={12} sm={4}>
                  <LabelValue label="State" value={b?.state || "—"} />
                </Grid>
              </Grid>
            </Stack>

            <Divider sx={{ my: 0.75 }} />

            <Stack
              direction="column"
              spacing={1}
            >
              <Grid container spacing={1} alignItems="flex-start">
                <Grid xs={12} sm={4}>
                  <LabelValue label="Banker Name" value={banker?.name || "—"} />
                </Grid>
                <Grid xs={12} sm={4}>
                  <LabelValue label="Primary Contact" value={contacts[0] || "—"} />
                </Grid>
                <Grid xs={12} sm={4}>
                  <LabelValue label="Alternate Contact" value={contacts[1] || "—"} />
                </Grid>
              </Grid>
            </Stack>
          </Sheet>
        );
      })}
    </Box>
  );
}

/* -------- Attachments UI -------- */
const isImage = (name = "", type = "") => {
  const ext = fileExt(name);
  return (
    type?.startsWith?.("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)
  );
};

function AttachmentTile({ a }) {
  const name = a?.name || "Attachment";
  const url = safeUrl(a?.url || a?.href || "");
  const size = a?.size ? formatBytes(a.size) : "";
  const isImg = isImage(name, a?.type || "");
  return (
    <Sheet
      variant="soft"
      sx={{
        width: 260,
        borderRadius: "lg",
        p: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        bgcolor: "background.level1",
        position: "relative",
        "&:hover .dl": { opacity: 1 },
      }}
    >
      <Box
        sx={{
          height: 150,
          borderRadius: "md",
          overflow: "hidden",
          bgcolor: "background.surface",
          border: "1px solid",
          borderColor: "neutral.outlinedBorder",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {isImg && url ? (
          <img
            src={url}
            alt={name}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <Box sx={{ fontSize: 52, opacity: 0.7 }}>
            {iconFor(name, a?.type)}
          </Box>
        )}

        <IconButton
          className="dl"
          size="sm"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            opacity: 0,
            transition: "opacity 120ms ease",
            backgroundColor: "#eaf1fa",
            "&:hover": { backgroundColor: "#d0e2f7" },
          }}
          component="a"
          href={url || "#"}
          download={name}
          disabled={!url}
        >
          <DownloadRoundedIcon sx={{ color: "#3366a3" }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 0.5 }}>
        <Tooltip title={name} variant="plain">
          <Typography
            level="body-sm"
            sx={{
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </Typography>
        </Tooltip>
        {size && (
          <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
            {size}
          </Typography>
        )}
      </Box>
    </Sheet>
  );
}

function AttachmentGallery({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <Box
      sx={{
        mt: 0.75,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))",
        gap: 12,
      }}
    >
      {items.map((a, i) => (
        <AttachmentTile key={a?._id || `${a?.url || ""}-${i}`} a={a} />
      ))}
    </Box>
  );
}

function Section({
  title,
  open = true,
  onToggle,
  children,
  right = null,
  outlined = true,
  collapsible = true,
  contentSx = {},
}) {
  return (
    <Sheet
      variant={outlined ? "outlined" : "soft"}
      sx={{ p: 2, borderRadius: "md", mb: 2 }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" gap={1}>
          {collapsible ? (
            <IconButton
              size="sm"
              variant="plain"
              onClick={onToggle}
              aria-label={open ? "Collapse" : "Expand"}
            >
              {open ? (
                <KeyboardArrowDownRoundedIcon />
              ) : (
                <KeyboardArrowRightRoundedIcon />
              )}
            </IconButton>
          ) : null}
          <Typography level="title-md">{title}</Typography>
        </Stack>
        {right}
      </Stack>
      {(collapsible ? open : true) && (
        <Box sx={{ mt: 1.25, ...contentSx }}>{children}</Box>
      )}
    </Sheet>
  );
}