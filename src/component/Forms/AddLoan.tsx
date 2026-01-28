// AddLoan Form Component
import * as React from "react";
import {
  CssVarsProvider,
  extendTheme,
  Sheet,
  Box,
  Typography,
  Grid,
  Input,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Button,
  Table,
  IconButton,
  Divider,
  Chip,
  Modal,
  ModalDialog,
  Select,
  Option,
  Textarea,
  Radio,
  RadioGroup,
} from "@mui/joy";
import Delete from "@mui/icons-material/Delete";
import Add from "@mui/icons-material/Add";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DownloadIcon from "@mui/icons-material/Download";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import SearchPickerModal from "../../component/SearchPickerModal";
import { useLazyGetProjectSearchDropdownQuery } from "../../redux/projectsSlice";
import {
  useGetDocumentByNameQuery,
  useLazyGetDocumentByNameQuery,
  useGetProjectDocumentsQuery,
  useGetDocumentsByProjectIdQuery,
  useAddDocumentToProjectMutation,
  useDeleteDocumentListMutation,
  useCreateProjectDocumentsMutation,
  useUpdateDocumentListMutation,
} from "../../redux/documentSlice";


import {
  useGetUniqueBanksQuery,
  useCreateLoanMutation,
} from "../../redux/loanSlice";
import { toast } from "react-toastify";

// Theme configuration
const theme = extendTheme({
  colorSchemes: {
    light: { palette: { background: { body: "#ffffff", surface: "#ffffff" } } },
  },
  fontFamily: {
    body: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
});

const FIRST_LIMIT = 7;
const MODAL_LIMIT = 7;
const ACCENT = "#3363a3";

// India States and Union Territories
const IN_STATES = [
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
];

const IN_UTS = [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// Utility: Debounce input changes
function useDebounce(val, delay = 300) {
  const [v, setV] = React.useState(val);
  React.useEffect(() => {
    const id = setTimeout(() => setV(val), delay);
    return () => clearTimeout(id);
  }, [val, delay]);
  return v;
}

// Extract project label from row data
const labelFromRow = (r) => {
  const code = r?.code || "";
  return [code].filter(Boolean).join(", ");
};

// Validates IFSC code format (e.g., SBIN0001234)
const isValidIFSC = (ifsc) => {
  if (!ifsc || typeof ifsc !== "string") return true;
  const trimmed = ifsc.trim();
  if (!trimmed) return true;
  return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(trimmed);
};

// Validates Indian phone numbers (10 digits starting with 6-9)
const isValidPhone = (phone) => {
  if (!phone || typeof phone !== "string") return true;
  const trimmed = phone.trim();
  if (!trimmed) return true;
  return /^(\+91[-\s]?)?[6-9]\d{9}$/.test(trimmed);
};

// Drag & Drop Upload Modal Component
function UploadModal({ open, onClose, onPick }) {
  const [isOver, setIsOver] = React.useState(false);
  const fileRef = React.useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onPick(file);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout="center"
        sx={{ p: 2, width: 520, borderRadius: "md", boxShadow: "lg" }}
      >
        <Typography level="title-md" sx={{ mb: 1 }}>
          Upload Document
        </Typography>
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            mt: 1,
            mb: 2,
            p: 4,
            textAlign: "center",
            border: "2px dashed",
            borderColor: isOver ? "primary.solidBg" : "neutral.outlinedBorder",
            borderRadius: "md",
            bgcolor: isOver ? "primary.softBg" : "neutral.softBg",
            transition: "all .15s",
            cursor: "pointer",
          }}
          onClick={() => fileRef.current?.click()}
        >
          <Typography level="body-sm">
            Drag & drop a file here, or <strong>click to browse</strong>
          </Typography>
          <input
            ref={fileRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = "";
            }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  );
}

// Searchable Project Dropdown Component
function SearchableSelect({
  placeholder = "Type to find a project...",
  valueLabel,
  onChangeLabel,
  options = [],
  onPickRow,
  onSearchMore,
}) {
  const rootRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState(valueLabel || "");
  const debounced = useDebounce(input, 150);

  React.useEffect(() => setInput(valueLabel || ""), [valueLabel]);

  const filtered = React.useMemo(() => {
    const q = (debounced || "").toLowerCase();
    if (!q) return options;
    return options.filter((r) => labelFromRow(r).toLowerCase().includes(q));
  }, [debounced, options]);

  React.useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const choose = (row) => {
    const label = labelFromRow(row);
    onChangeLabel?.(label);
    onPickRow?.(row);
    setOpen(false);
  };

  return (
    <Box ref={rootRef} sx={{ position: "relative" }}>
      <Input
        placeholder={placeholder}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          onChangeLabel?.(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        startDecorator={<SearchRoundedIcon />}
        variant="plain"
        sx={{
          fontSize: 18,
          borderRadius: 0,
          px: 0,
          "--Input-focusedThickness": "0px",
          borderBottom: `2px solid ${ACCENT}`,
          "& input": { pb: 0.5 },
        }}
      />

      {open && (
        <Sheet
          variant="outlined"
          sx={{
            position: "absolute",
            zIndex: 10,
            mt: 0.5,
            left: 0,
            right: 0,
            borderRadius: "sm",
            overflow: "hidden",
            bgcolor: "#fff",
            borderColor: "#fff",
            color: "#fff",
            boxShadow:
              "0px 8px 24px rgba(0,0,0,0.25), 0 1px 0 0 rgba(255,255,255,0.06) inset",
          }}
        >
          <Box
            sx={{
              maxHeight: 240,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {filtered.map((r) => {
              const lbl = labelFromRow(r);
              return (
                <Box
                  key={String(r?._id ?? lbl)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(r)}
                  sx={{
                    px: 1.25,
                    py: 1,
                    cursor: "pointer",
                    borderBottom: "1px solid black",
                    "&:last-of-type": { borderBottom: "none" },
                    "&:hover": { backgroundColor: "#fff" },
                  }}
                >
                  <Typography level="body-md">{lbl}</Typography>
                </Box>
              );
            })}

            <Box
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSearchMore?.();
                setOpen(false);
              }}
              sx={{ px: 1.25, py: 1, cursor: "pointer", color: ACCENT }}
            >
              <Typography level="body-md" sx={{ fontStyle: "italic" }}>
                Search more…
              </Typography>
            </Box>
          </Box>
        </Sheet>
      )}
    </Box>
  );
}

// Document Title Input Cell
function DocTitleCell({ value, onChange }) {
  return (
    <Input
      placeholder="Document title (e.g., LOI)"
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      variant="plain"
      sx={{
        fontSize: 16,
        fontWeight: 400,
        width: "100%",
        borderRadius: 0,
        borderBottom: "2px solid #3363a3",
        "--Input-focusedThickness": "0px",
        px: 0,
        backgroundColor: "transparent",
        "&:hover": { borderBottomColor: "#3363a3" },
        "& input": { paddingBottom: "0px" },
      }}
    />
  );
}

// Document Presence and Upload Cell
function DocPresenceCell({
  projectId,
  title,
  source,
  file,
  onChangePresence,
  onChangeSource,
  onFilePicked,
  onMaybeSetTitle,
  fileurl,
}) {
  const [openUpload, setOpenUpload] = React.useState(false);
  const debouncedTitle = useDebounce(title || "", 400);
  const skip = !projectId || !debouncedTitle?.trim();
  const { data } = useGetDocumentByNameQuery(
    { projectId, name: debouncedTitle },
    { skip }
  );

  const hits = data?.data || [];
  const firstUrl = fileurl || hits[0]?.fileurl;

  const isExisting = source === "existing" && !!firstUrl;
  const isUploaded = source === "uploaded";

  const handleChipClick = () => {
    if (!isExisting) setOpenUpload(true);
  };

  const handlePick = (picked) => {
    onFilePicked?.(picked);
    onChangeSource?.("uploaded");
    onChangePresence?.(false);
    if (!title?.trim()) onMaybeSetTitle?.(picked?.name || "");
    setOpenUpload(false);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!firstUrl) return;
    const link = document.createElement("a");
    link.href = firstUrl;
    link.download = title || "document";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Chip
          size="sm"
          color={isExisting ? "success" : "neutral"}
          variant="soft"
          onClick={handleChipClick}
          sx={{
            cursor: isExisting ? "default" : "pointer",
            userSelect: "none",
          }}
        >
          {isExisting ? "Present" : "Not Present"}
        </Chip>

        {isExisting && (
          <IconButton
            size="sm"
            variant="outlined"
            color="primary"
            onClick={handleDownload}
            sx={{
              borderRadius: "md",
              p: 0.6,
              "&:hover": { backgroundColor: "primary.softBg" },
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        )}

        {!isExisting && isUploaded && file?.name && (
          <Typography level="body-sm" sx={{ color: "neutral.700" }}>
            {file.name}
          </Typography>
        )}
      </Box>

      <UploadModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        onPick={handlePick}
      />
    </>
  );
}

// Bank Name Cell with server-side autocomplete
function BankNameCell({ value, onPick, accent = "#3363a3" }) {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState(value || "");
  const debounced = useDebounce(input, 250);
  const rootRef = React.useRef(null);

  const { data } = useGetUniqueBanksQuery(
    { search: debounced },
    { skip: !debounced }
  );
  const options = React.useMemo(() => data?.data || [], [data]);

  React.useEffect(() => setInput(value || ""), [value]);

  React.useEffect(() => {
    const onClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (b) => {
    onPick?.({
      name: (b?.name || "").toUpperCase(),
      branch: b?.branch || "",
      ifsc_code: (b?.ifsc_code || "").toUpperCase(),
      state: b?.state || "",
    });
    setOpen(false);
  };

  return (
    <Box ref={rootRef} sx={{ position: "relative" }}>
      <Input
        placeholder="Bank Name"
        value={input}
        onChange={(e) => {
          const v = e.target.value;
          setInput(v);
          onPick?.({ name: v });
        }}
        onFocus={() => setOpen(true)}
        variant="plain"
        sx={{
          fontSize: 16,
          borderRadius: 0,
          px: 0,
          "--Input-focusedThickness": "0px",
          borderBottom: `2px solid ${accent}`,
          "& input": { pb: 0.5 },
        }}
      />

      {open && options.length > 0 && (
        <Sheet
          variant="outlined"
          sx={{
            position: "absolute",
            zIndex: 10,
            mt: 0.5,
            left: 0,
            right: 0,
            borderRadius: "sm",
            overflow: "hidden",
            bgcolor: "#fff",
            borderColor: "neutral.outlinedBorder",
            boxShadow: "0px 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <Box
            sx={{
              maxHeight: 240,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {options.map((b, idx) => (
              <Box
                key={`${b.name}-${b.ifsc_code}-${idx}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(b)}
                sx={{
                  px: 1.25,
                  py: 1,
                  cursor: "pointer",
                  borderBottom: "1px solid var(--joy-palette-neutral-200)",
                  "&:last-of-type": { borderBottom: "none" },
                  "&:hover": { backgroundColor: "neutral.softBg" },
                }}
              >
                <Typography level="body-sm">
                  {(b.name || "").toUpperCase()} •{" "}
                  {(b.ifsc_code || "").toUpperCase()}
                  {b.branch ? ` • ${b.branch}` : ""}
                  {b.state ? ` • ${b.state}` : ""}
                </Typography>
              </Box>
            ))}
          </Box>
        </Sheet>
      )}
    </Box>
  );
}

/* ----------- Contact Field with Add Button ----------- */
function ContactFieldWithAdd({
  contactValue = "",
  onChangeContact,
  onAddContact,
  onRemoveContact,
  showRemove = false,
  isLastContact = false,
  contactIndex = 0,
}) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        width: "100%",
        mb: contactIndex !== 0 ? 1 : 0,
        flexDirection: { xs: "column", sm: "row" },
      }}
    >
      {/* Input Field */}
      <Input
        placeholder={contactIndex === 0 ? "Enter contact (email/phone)" : "Add another contact"}
        value={contactValue || ""}
        onChange={(e) => onChangeContact?.(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        variant="plain"
        sx={{
          fontSize: 14,
          borderRadius: 0,
          px: 0,
          flex: 1,
          width: { xs: "100%", sm: "auto" },
          "--Input-focusedThickness": "0px",
          borderBottom: `2px solid ${isFocused ? ACCENT : "#ccc"}`,
          transition: "border-color 0.2s",
          "& input": { pb: 0.5 },
          "&:hover": {
            borderBottomColor: ACCENT,
          },
        }}
      />

      {/* Action Buttons Container */}
      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          ml: { xs: 0, sm: "auto" },
          width: { xs: "100%", sm: "auto" },
          justifyContent: { xs: "flex-end", sm: "flex-start" },
        }}
      >
        {/* Add Button - Show for last contact only */}
        {isLastContact && (
          <IconButton
            variant="plain"
            color="primary"
            onClick={onAddContact}
            title="Add another contact"
            sx={{
              p: 0.5,
              minWidth: 32,
              height: 32,
              "&:hover": { backgroundColor: "rgba(51, 99, 163, 0.08)" },
              transition: "background-color 0.2s",
            }}
          >
            <Add fontSize="small" />
          </IconButton>
        )}

        {showRemove && (
          <IconButton
            variant="plain"
            color="danger"
            onClick={onRemoveContact}
            title="Remove this contact"
            sx={{
              p: 0.5,
              minWidth: 32,
              height: 32,
              "&:hover": { backgroundColor: "rgba(220, 0, 0, 0.08)" },
              transition: "background-color 0.2s",
            }}
          >
            <Delete fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

// Main AddLoan Form Component
export default function AddLoan({ onCancel }) {
  // Mutation hooks
  const [deleteDocumentList, { isLoading: deletingDoc }] = useDeleteDocumentListMutation();
  const [addDocumentToProject, { isLoading: addingDoc }] = useAddDocumentToProjectMutation();
  const [createProjectDocuments, { isLoading: creatingDoc }] = useCreateProjectDocumentsMutation();
  const [updateDocumentList, { isLoading: updatingDoc }] = useUpdateDocumentListMutation();

  // Handler for deleting a document by documentList_id
  const handleDeleteDocument = async (documentListId) => {
    if (!header.project_id) {
      toast.error("Project ID is required to delete document");
      return;
    }

    if (!documentListId) {
      toast.error("Document ID is required");
      return;
    }

    try {
      const result = await deleteDocumentList({
        projectId: header.project_id,
        documentListId
      }).unwrap();

      toast.success(result?.message || "Document deleted successfully!");

      // Refetch will happen automatically due to cache invalidation
      // But we can explicitly call it to ensure UI updates
      if (refetchProjectDocs) {
        refetchProjectDocs();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete document");
    }
  };

  const [tab, setTab] = React.useState(0);

  // State for add document form
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [newDocForm, setNewDocForm] = React.useState({
    filename: "",
    filetype: "",
  });

  // Form state: header information
  const [header, setHeader] = React.useState({
    project: "",
    project_id: "",
    expectedSanctionDate: "",
    expectedDisbursementMonth: "",
    expectedDisbursementWeek: "",
  });

  // Form state: documents
  const [docs, setDocs] = React.useState([
    { title: "", file: null, present: false, source: null, fileurl: "", filetype: "", documentList_id: "", filename: "" },
  ]);

  // Form state: banking and banker details
  const [banks, setBanks] = React.useState([
    {
      name: "",
      city: "",
      branch: "",
      ifsc_code: "",
      state: "",
      bankerName: "",
      bankerPrimaryContact: "",
      bankerAlternateContact: "",
    },
  ]);

  // Form state: remark or tendency selection
  const [remarkTendencyType, setRemarkTendencyType] = React.useState("remark");
  const [remarkTendencyText, setRemarkTendencyText] = React.useState("");

  // Fetch unique bank suggestions
  const { data: uniqueBanksResp } = useGetUniqueBanksQuery();
  const uniqueBanks = React.useMemo(
    () => uniqueBanksResp?.data || [],
    [uniqueBanksResp]
  );

  const [createLoan, { isLoading: creating }] = useCreateLoanMutation();

  // Event handlers for form fields
  const onHeader = (key) => (e, v) => {
    const value = e?.target ? e.target.value : v;
    setHeader((h) => ({ ...h, [key]: value }));
  };
  const addDoc = () =>
    setDocs((d) => [
      ...d,
      { title: "", file: null, present: false, source: null, fileurl: "", filetype: "", documentList_id: "", filename: "" },
    ]);
  const removeDoc = (idx) => setDocs((d) => d.filter((_, i) => i !== idx));
  const updateDoc = (idx, key, value) =>
    setDocs((d) =>
      d.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    );

  const addBank = () =>
    setBanks((b) => [
      ...b,
      {
        name: "",
        city: "",
        branch: "",
        ifsc_code: "",
        state: "",
        bankerName: "",
        bankerPrimaryContact: "",
        bankerAlternateContact: "",
      },
    ]);
  const removeBank = (idx) => setBanks((b) => b.filter((_, i) => i !== idx));
  const updateBank = (idx, key, value) =>
    setBanks((b) =>
      b.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    );

  // Form submission handler
  const submit = async (e) => {
    e.preventDefault();

    if (!header.project_id) {
      toast.error("Pick a project first.");
      return;
    }

    if (!header.expectedSanctionDate) {
      toast.error("Expected Sanction Date is required");
      return;
    }

    // Validate IFSC codes
    const invalidIFSC = banks.find((b) => b.ifsc_code && !isValidIFSC(b.ifsc_code));
    if (invalidIFSC) {
      toast.error(
        `Invalid IFSC code: "${invalidIFSC.ifsc_code}". Format: 4 letters + 0 + 6 alphanumeric (e.g., SBIN0001234)`
      );
      return;
    }

    // Validate banking details - all fields are compulsory
    for (let i = 0; i < banks.length; i++) {
      const b = banks[i];
      const bankNum = i + 1;

      // Check if any banking detail field has data
      const hasAnyBankData = b.name || b.city || b.branch || b.ifsc_code || b.state || b.bankerName || b.bankerPrimaryContact;
      
      if (!hasAnyBankData) {
        continue; // Skip empty banks (allow empty bank row)
      }

      // If there's any data, all main banking fields must be filled
      if (!b.name || !b.name.trim()) {
        toast.error(`Bank ${bankNum}: Bank Name is required`);
        return;
      }
    }

    // Ensure at least one complete banking detail is filled
    const hasAnyCompleteBank = banks.some((b) => {
      return (b.name && b.name.trim());  
    });

    if (!hasAnyCompleteBank) {
      toast.error("Please fill in at least one complete banking detail");
      return;
    }

    try {
      // Helper function to extract file type/extension
      const getFileType = (file) => {
        if (!file || !file.name) return "";
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        return ext;
      };

      // Prepare file attachments from uploaded documents
      const files = [];
      docs.forEach((d) => {
        if (d?.source === "uploaded" && d?.file) {
          const filetype = getFileType(d.file);
          files.push({ 
            file: d.file, 
            name: d.title || d.file.name,
            filetype: filetype
          });
        }
      });

      // Prepare existing document links
      const links = docs
        .filter((d) => d?.source === "existing" && d?.fileurl)
        .map((d) => ({
          url: d.fileurl,
          name:
            d.title ||
            (() => {
              try {
                const seg = decodeURIComponent(
                  new URL(d.fileurl).pathname.split("/").pop() || ""
                );
                return seg || "document";
              } catch {
                return "document";
              }
            })(),
        }));

      // Format disbursement week as "1st week of January" etc
      const expectedDisbursementWeekFormatted = 
        header.expectedDisbursementMonth && header.expectedDisbursementWeek
          ? `${header.expectedDisbursementWeek} of ${header.expectedDisbursementMonth}`
          : "";

      // Build payload data
      const data = {
        expectedSanctionDate: header.expectedSanctionDate || "",
        expectedDisbursementWeek: expectedDisbursementWeekFormatted,
        documents: docs.map((d) => {
          const filename = d?.title || d?.filename || d?.file?.name || "";
          const filetype = d?.filetype || (d?.file ? getFileType(d.file) : "");
          const fileurl = d?.fileurl || "";
          const documentListId = d?.documentList_id || d?.documentListId || "";
          return {
            filename: String(filename || ""),
            fileurl: String(fileurl || ""),
            filetype: String(filetype || ""),
            documentListId: String(documentListId || ""),
          };
        }),
        // Map bank details to backend-required shape
        banking_details: banks
          .map((b) => ({
            name: (b.name || "").trim(),
            bank_city_name: (b.city || "").trim(),
            branch: (b.branch || "").trim(),
            ifsc_code: (b.ifsc_code || "").trim(),
            state: (b.state || "").trim(),
          }))
          .filter((b) => b.name || b.branch || b.ifsc_code || b.bank_city_name || b.state),

        // Separate banker details: { name, contact_detail: [ ... ] }
        banker_details: banks
          .map((b) => {
            const name = (b.bankerName || "").trim();
            const contacts = [
              (b.bankerPrimaryContact || "").trim(),
              (b.bankerAlternateContact || "").trim(),
            ].filter((c) => !!c);
            if (!name && contacts.length === 0) return null;
            return { name, contact_detail: contacts };
          })
          .filter(Boolean),
      };

      // Submit loan creation
      const res = await createLoan({
        projectId: header.project_id,
        data,
        files,
        links,
      }).unwrap();

      // Reset form on success
      setHeader({
        project: "",
        project_id: "",
        expectedSanctionDate: "",
        expectedDisbursementMonth: "",
        expectedDisbursementWeek: "",
      });
      setDocs([{ title: "", file: null, present: false, source: null, fileurl: "", filetype: "", documentList_id: "", filename: "" }]);
      setBanks([
        {
          name: "",
          city: "",
          branch: "",
          ifsc_code: "",
          state: "",
          bankerName: "",
          bankerPrimaryContact: "",
          bankerAlternateContact: "",
        },
      ]);
      setTab(0);

      toast.success("Loan created successfully.");
    } catch (err) {
      toast.error(
        err?.data?.message ||
        err?.error ||
        "Failed to create loan. Check console."
      );
    }
  };

  // Project search and selection
  const [triggerSearch] = useLazyGetProjectSearchDropdownQuery();
  const [projectOptions, setProjectOptions] = React.useState([]);
  const [projectModalOpen, setProjectModalOpen] = React.useState(false);
  const debouncedProjectQuery = useDebounce(header.project, 300);

  // Fetch projects based on search query
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await triggerSearch(
          { search: debouncedProjectQuery || "", page: 1, limit: FIRST_LIMIT },
          true
        );
        const payload = res?.data || {};
        const rows = payload?.data || payload?.rows || [];
        if (!cancelled) setProjectOptions(rows);
      } catch {
        if (!cancelled) setProjectOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedProjectQuery, triggerSearch]);

  // Load initial project options on mount
  const loadInitialProjects = React.useCallback(async () => {
    try {
      const res = await triggerSearch(
        { search: "", page: 1, limit: FIRST_LIMIT },
        true
      );
      const payload = res?.data || {};
      const rows = payload?.data || payload?.rows || [];
      setProjectOptions(rows);
    } catch (err) {
      setProjectOptions([]);
    }
  }, [triggerSearch]);

  React.useEffect(() => {
    loadInitialProjects();
  }, [loadInitialProjects]);

  const [triggerDocumentFetch] = useLazyGetDocumentByNameQuery();

  // Handle project selection and load associated documents
  const onPickProject = async (row) => {
    if (!row) return;
    setHeader((h) => ({
      ...h,
      project_id: String(row._id || ""),
      project: labelFromRow(row),
    }));

    try {
      const res = await triggerDocumentFetch({ projectId: row._id, name: "" });
      const docsData = res?.data?.data || [];

      const mappedDocs = (docsData[0]?.items || []).map((d) => ({
        title: d.documentInfo?.name || d.filename || "",
        filename: d.filename || d.documentInfo?.name || "",
        filetype: d.filetype || "",
        documentList_id: d.documentList_id || d.documentListId || "",
        file: null,
        present: true,
        source: "existing",
        fileurl: d.fileurl || "",
      }));
      setDocs(
        mappedDocs.length
          ? mappedDocs
          : [{ title: "", file: null, present: false, source: null, fileurl: "", filetype: "", documentList_id: "", filename: "" }]
      );
    } catch (err) {
      setDocs([{ title: "", file: null, present: false, source: null, fileurl: "", filetype: "", documentList_id: "", filename: "" }]);
    }
  };

  // Fetch all uploaded project documents for the selected project (new API)
  const {
    data: projectDocsResp,
    isLoading: docsLoading,
    refetch: refetchProjectDocs,
  } = useGetDocumentsByProjectIdQuery(
    header.project_id,
    { skip: !header.project_id }
  );
  const projectDocs = projectDocsResp?.data || [];

  // Handler for adding a document - Single PUT call
  const handleAddDocumentToProject = async () => {
    // Validation
    if (!header.project_id) {
      toast.error("Pick a project first.");
      return;
    }

    if (!newDocForm.filename?.trim()) {
      toast.error("File name is required");
      return;
    }

    if (!newDocForm.filetype?.trim()) {
      toast.error("TEAM is required");
      return;
    }

    try {
      // Single PUT call - backend creates documentList and adds to project
      await updateDocumentList({
        projectId: header.project_id,
        name: newDocForm.filename.trim(),
        fileType: newDocForm.filetype.trim(), // TEAM name - backend finds template_id
      }).unwrap();

      toast.success("Document added successfully!");

      // Reset form and close
      setNewDocForm({ filename: "", filetype: "" });
      setIsAddingNew(false);

      // Refetch to update the list
      if (refetchProjectDocs) {
        refetchProjectDocs();
      }
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to add document");
    }
  };

  // Handler to cancel adding document
  const handleCancelAddDocument = () => {
    setNewDocForm({ filename: "", filetype: "" });
    setIsAddingNew(false);
  };

  // Shared input styling
  const lineInputSx = {
    fontSize: 16,
    fontWeight: 400,
    width: "100%",
    borderRadius: 0,
    borderBottom: `2px solid ${ACCENT}`,
    "--Input-focusedThickness": "0px",
    px: 0,
    backgroundColor: "transparent",
    "&:hover": { borderBottomColor: "#3363a3" },
    "& input": { paddingBottom: "0px" },
  };

  // Bank table styling
  const bankTableSx = {
    "--TableCell-paddingY": "10px",
    "--TableCell-paddingX": "12px",
    tableLayout: "fixed",
    minWidth: 760,
    borderCollapse: "separate",
    borderSpacing: "0 6px",
    "& thead th": {
      color: "#57677a",
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.4px",
      textTransform: "uppercase",
      padding: "12px 12px 10px",
      textAlign: "left",
      border: "none",
      backgroundColor: "#f6f7f9",
      borderBottom: "1px solid #e1e5ed",
    },
    "& thead th:not(:last-of-type)": {
      borderRight: "1px solid #eef2f7",
    },
    "& tbody td": {
      backgroundColor: "transparent",
      border: "none",
      borderRadius: 0,
    },
  };

  return (
    <CssVarsProvider theme={theme} defaultMode="light">
      <Sheet
        variant="plain"
        sx={{
          mx: "auto",
          my: 1,
          p: 2,
          maxWidth: 1180,
          bgcolor: "#fff",
          borderRadius: "md",
          border: "1px solid var(--joy-palette-neutral-200)",
        }}
      >
        {/* Project (top) */}
        <Box sx={{ mb: 2 }}>
          <Typography level="body-md" sx={{ color: "neutral.900", mb: 0.5 }}>
            Project
          </Typography>
          <SearchableSelect
            placeholder="Type to find a project..."
            valueLabel={header.project}
            onChangeLabel={(lbl) => setHeader((h) => ({ ...h, project: lbl }))}
            options={projectOptions}
            onPickRow={onPickProject}
            onSearchMore={() => setProjectModalOpen(true)}
          />
        </Box>

        {/* Dates - Single Row */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="flex-end">
            {/* Expected Sanctioning Date */}
            <Grid xs={12} sm={6} md={4}>
              <Box>
                <Typography level="body-sm" sx={{ color: "neutral.900", mb: 0.75, fontWeight: 600 }}>
                  Expected Sanctioning Date
                </Typography>
                <Input
                  type="date"
                  value={header.expectedSanctionDate}
                  onChange={onHeader("expectedSanctionDate")}
                  variant="outlined"
                  sx={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid #d9e0eb",
                    "--Input-focusedThickness": "2px",
                    "--Input-focusedHighlight": ACCENT,
                    "& input": { py: 1 },
                  }}
                />
              </Box>
            </Grid>

            {/* Expected Disbursement Month */}
            <Grid xs={12} sm={6} md={4}>
              <Box>
                <Typography level="body-sm" sx={{ color: "neutral.900", mb: 0.75, fontWeight: 600 }}>
                  Disbursement Month
                </Typography>
                <Select
                  placeholder="Select month"
                  value={header.expectedDisbursementMonth}
                  onChange={(_, v) => setHeader((h) => ({ ...h, expectedDisbursementMonth: v || "" }))}
                  variant="outlined"
                  sx={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid #d9e0eb",
                    backgroundColor: "#fff",
                    "--Select-focusedThickness": "2px",
                    "--Select-focusedHighlight": ACCENT,
                    "& button": { py: 1 },
                  }}
                >
                  <Option value="">Choose month</Option>
                  <Option value="January">January</Option>
                  <Option value="February">February</Option>
                  <Option value="March">March</Option>
                  <Option value="April">April</Option>
                  <Option value="May">May</Option>
                  <Option value="June">June</Option>
                  <Option value="July">July</Option>
                  <Option value="August">August</Option>
                  <Option value="September">September</Option>
                  <Option value="October">October</Option>
                  <Option value="November">November</Option>
                  <Option value="December">December</Option>
                </Select>
              </Box>
            </Grid>

            {/* Expected Disbursement Week */}
            <Grid xs={12} sm={6} md={4}>
              <Box>
                <Typography level="body-sm" sx={{ color: "neutral.900", mb: 0.75, fontWeight: 600 }}>
                  Disbursement Week
                </Typography>
                <Select
                  placeholder="Select week"
                  value={header.expectedDisbursementWeek}
                  onChange={(_, v) => setHeader((h) => ({ ...h, expectedDisbursementWeek: v || "" }))}
                  disabled={!header.expectedDisbursementMonth}
                  variant="outlined"
                  sx={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid #d9e0eb",
                    backgroundColor: "#fff",
                    "--Select-focusedThickness": "2px",
                    "--Select-focusedHighlight": ACCENT,
                    "& button": { py: 1 },
                  }}
                >
                  <Option value="">Choose week</Option>
                  <Option value="1st week">1st week</Option>
                  <Option value="2nd week">2nd week</Option>
                  <Option value="3rd week">3rd week</Option>
                  <Option value="4th week">4th week</Option>
                </Select>
              </Box>
            </Grid>

            {/* Display Selected Disbursement Preview */}
            {header.expectedDisbursementMonth && header.expectedDisbursementWeek && (
              <Grid xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1.5,
                    backgroundColor: `${ACCENT}08`,
                    border: `1px solid ${ACCENT}20`,
                    borderRadius: "8px",
                    mt: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: ACCENT,
                    }}
                  />
                  <Typography
                    level="body-sm"
                    sx={{
                      color: ACCENT,
                      fontWeight: 600,
                      fontSize: "14px",
                    }}
                  >
                    Expected Disbursement: <strong>{header.expectedDisbursementWeek} of {header.expectedDisbursementMonth}</strong>
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Tabs */}
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <TabList variant="plain" sx={{ gap: 1, mb: 1 }}>
            <Tab>Documents Required</Tab>
            <Tab>Banking Details</Tab>
          </TabList>

          {/* Documents Required */}
          {/* <TabPanel value={0} sx={{ p: 0, pt: 1 }}>
            <Box sx={{ mb: 2 }}>
              <Typography level="body-md" sx={{ mb: 1, fontWeight: 600 }}>
                Uploaded Project Documents
              </Typography>
              {docsLoading ? (
                <Typography level="body-sm" sx={{ p: 2, textAlign: "center", color: "neutral.500" }}>
                  Loading documents...
                </Typography>
              ) : projectDocs.length === 0 ? (
                <Typography level="body-sm" sx={{ p: 2, textAlign: "center", color: "neutral.500" }}>
                  No documents uploaded yet. Select a project to view documents.
                </Typography>
              ) : (
                <Table size="sm">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Name</th>
                      <th style={{ width: 80 }}>Download</th>
                      <th style={{ width: 60 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectDocs.map((doc, idx) => (
                      <tr key={doc.documentList_id || idx}>
                        <td>{doc.filetype || "-"}</td>
                        <td>{doc.filename || "-"}</td>
                        <td>
                          {doc.fileurl && (
                            <Button
                              component="a"
                              href={doc.fileurl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              size="sm"
                              variant="solid"
                              startDecorator={<DownloadIcon />}
                              sx={{
                                backgroundColor: ACCENT,
                                color: "#fff",
                                minHeight: "28px",
                                fontSize: "12px",
                                "&:hover": {
                                  backgroundColor: "#2c558e",
                                },
                              }}
                            >
                              Download
                            </Button>
                          )}
                        </td>
                      <td>
                        <IconButton
                          variant="plain"
                          color="danger"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.documentList_id)}
                          disabled={deletingDoc}
                          loading={deletingDoc}
                          title="Delete Document"
                        >
                          <Delete />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </Table>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              {!isAddingNew ? (
                <Button
                  startDecorator={<Add />}
                  variant="soft"
                  size="sm"
                  onClick={() => setIsAddingNew(true)}
                  disabled={!header.project_id}
                  sx={{
                    backgroundColor: `${ACCENT}14`,
                    color: ACCENT,
                    fontWeight: 600,
                    px: 2,
                    borderRadius: "md",
                    "&:hover": {
                      backgroundColor: `${ACCENT}24`,
                    },
                    "&:disabled": {
                      opacity: 0.5,
                      cursor: "not-allowed",
                    },
                  }}
                >
                  Add Document
                </Button>
              ) : (
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: "transparent",
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid xs={12} sm={5}>
                      <Box>
                        <Typography level="body-sm" sx={{ mb: 0.5, fontWeight: 600, color: "neutral.700" }}>
                          File Name
                        </Typography>
                        <Input
                          placeholder="Enter file name"
                          value={newDocForm.filename}
                          onChange={(e) => setNewDocForm(prev => ({ ...prev, filename: e.target.value }))}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleAddDocumentToProject();
                            }
                          }}
                          autoFocus
                          sx={{
                            "--Input-focusedThickness": "2px",
                            "--Input-focusedHighlight": ACCENT,
                          }}
                        />
                      </Box>
                    </Grid>
                    <Grid xs={12} sm={5}>
                      <Box>
                        <Typography level="body-sm" sx={{ mb: 0.5, fontWeight: 600, color: "neutral.700" }}>
                          TEAM
                        </Typography>
                        <Input
                          placeholder="e.g., Engineering, Sales"
                          value={newDocForm.filetype}
                          onChange={(e) => setNewDocForm(prev => ({ ...prev, filetype: e.target.value }))}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleAddDocumentToProject();
                            }
                          }}
                          sx={{
                            "--Input-focusedThickness": "2px",
                            "--Input-focusedHighlight": ACCENT,
                          }}
                        />
                      </Box>
                    </Grid>
                    <Grid xs={12} sm={2}>
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", pt: { xs: 0, sm: 3 } }}>
                        <IconButton
                          variant="solid"
                          color="success"
                          onClick={handleAddDocumentToProject}
                          disabled={updatingDoc}
                          loading={updatingDoc}
                          title="Save Document"
                          sx={{
                            backgroundColor: "#4caf50",
                            "&:hover": { backgroundColor: "#45a049" },
                          }}
                        >
                          <CheckIcon />
                        </IconButton>
                        <IconButton
                          variant="outlined"
                          color="neutral"
                          onClick={handleCancelAddDocument}
                          disabled={updatingDoc}
                          title="Cancel"
                          sx={{
                            borderColor: "#ccc",
                            "&:hover": { borderColor: "#999", backgroundColor: "#f5f5f5" },
                          }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          </TabPanel> */}

          <TabPanel value={0} sx={{ p: 0, pt: 1 }}>
            <Table size="sm" sx={{ mb: 1.5 }}>
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Present / Upload</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {docs.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ position: "relative" }}>
                      <DocTitleCell
                        value={row.title}
                        projectId={header.project_id}
                        onChange={(v) => {
                          updateDoc(idx, "title", v);
                          if (!v || !v.trim()) {
                            updateDoc(idx, "present", false);
                            updateDoc(idx, "file", null);
                            updateDoc(idx, "source", null);
                            updateDoc(idx, "fileurl", "");
                          } else {
                            updateDoc(idx, "present", false);
                            if (row.source === "existing") {
                              updateDoc(idx, "source", null);
                              updateDoc(idx, "fileurl", "");
                            }
                          }
                        }}
                        onPickExisting={(doc) => {
                          const pickedName =
                            (doc?.filename || doc?.name || "").trim() ||
                            (doc?.fileurl
                              ? decodeURIComponent(
                                doc.fileurl.split("/").pop() || ""
                              )
                              : "");
                          updateDoc(idx, "title", pickedName);
                          updateDoc(idx, "filename", doc?.filename || pickedName);
                          updateDoc(idx, "filetype", doc?.filetype || "");
                          updateDoc(idx, "documentList_id", doc?.documentList_id || doc?.documentListId || "");
                          updateDoc(idx, "present", true);
                          updateDoc(idx, "source", "existing");
                          updateDoc(idx, "file", null);
                          updateDoc(idx, "fileurl", doc?.fileurl || "");
                        }}
                      />
                    </td>

                    <td>
                      <DocPresenceCell
                        projectId={header.project_id}
                        title={row.title}
                        source={row.source}
                        file={row.file}
                        fileurl={row.fileurl}
                        onChangePresence={(p) => updateDoc(idx, "present", p)}
                        onChangeSource={(s) => updateDoc(idx, "source", s)}
                        onFilePicked={(file) => updateDoc(idx, "file", file)}
                        onMaybeSetTitle={(name) =>
                          updateDoc(idx, "title", name)
                        }
                      />
                    </td>

                    <td>
                      <IconButton
                        variant="plain"
                        color="danger"
                        onClick={() => removeDoc(idx)}
                      >
                        <Delete />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <Button
              startDecorator={<Add />}
              variant="plain"
              onClick={addDoc}
              sx={{ px: 0, borderRadius: 0 }}
            >
              Add documents
            </Button>
          </TabPanel>

          {/* Banking Details */}
          <TabPanel value={1} sx={{ p: 0, pt: 1 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {banks.map((row, idx) => (
                <Box
                  key={`bank-block-${idx}`}
                  sx={{
                    border: "1px solid #d5dbe5",
                    borderRadius: "lg",
                    p: { xs: 1.25, sm: 1.75 },
                    backgroundColor: "#fff",
                    boxShadow: "none",
                    overflowX: "auto",
                    transition:
                      "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "0 0 0 1px rgba(51, 99, 163, 0.12)",
                      borderColor: `${ACCENT}70`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      mb: 1.25,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        size="sm"
                        variant="soft"
                        sx={{
                          backgroundColor: `${ACCENT}14`,
                          color: ACCENT,
                          fontWeight: 700,
                          letterSpacing: "0.2px",
                        }}
                      >
                        Bank {idx + 1}
                      </Chip>
                    </Box>

                    {banks.length > 1 && (
                      <IconButton
                        size="sm"
                        variant="outlined"
                        color="danger"
                        onClick={() => removeBank(idx)}
                        title="Remove bank"
                        sx={{
                          borderColor: "#f3d8dc",
                          backgroundColor: "#fff",
                          color: "#c62828",
                          "&:hover": {
                            backgroundColor: "#fff5f5",
                            borderColor: "#e57373",
                          },
                        }}
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Box>

                  <Table size="sm" sx={{ ...bankTableSx, mb: 1 }}>
                    <thead>
                      <tr>
                        <th style={{ width: "32%" }}>Bank Name<span style={{ color: "red", marginLeft: "4px" }}>*</span></th>
                        <th style={{ width: "22%" }}>Bank City Name</th>
                        <th style={{ width: "22%" }}>Branch</th>
                        <th style={{ width: "24%" }}>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <BankNameCell
                            value={row.name || ""}
                            accent={ACCENT}
                            onPick={(picked) => {
                              if (picked.name !== undefined)
                                updateBank(idx, "name", picked.name);
                              if (picked.branch !== undefined)
                                updateBank(idx, "branch", picked.branch);
                              if (picked.ifsc_code !== undefined)
                                updateBank(idx, "ifsc_code", picked.ifsc_code);
                              if (picked.state !== undefined)
                                updateBank(idx, "state", picked.state);
                            }}
                          />
                        </td>
                        <td>
                          <Input
                            placeholder="City"
                            value={row.city || ""}
                            onChange={(e) => updateBank(idx, "city", e.target.value)}
                            variant="plain"
                            sx={lineInputSx}
                          />
                        </td>
                        <td>
                          <Input
                            placeholder="Branch"
                            value={row.branch || ""}
                            onChange={(e) =>
                              updateBank(idx, "branch", e.target.value)
                            }
                            variant="plain"
                            sx={lineInputSx}
                          />
                        </td>
                        <td>
                          <Select
                            placeholder="Select State"
                            value={row.state || ""}
                            onChange={(_, v) => updateBank(idx, "state", v || "")}
                            slotProps={{ listbox: { sx: { maxHeight: 320 } } }}
                            sx={{
                              minWidth: 160,
                              "--Select-indicatorPadding": "6px",
                              borderRadius: "8px",
                              border: "1px solid #d9e0eb",
                              backgroundColor: "#fff",
                              "--Select-focusedThickness": "0px",
                              "& button": { py: 0.75 },
                              "&:hover": { borderColor: `${ACCENT}55` },
                            }}
                          >
                            <Option value="" disabled>
                              Choose state
                            </Option>
                            {IN_STATES.map((s) => (
                              <Option key={s} value={s}>
                                {s}
                              </Option>
                            ))}
                            <Option value="__divider__" disabled>
                              — Union Territories —
                            </Option>
                            {IN_UTS.map((s) => (
                              <Option key={s} value={s}>
                                {s}
                              </Option>
                            ))}
                          </Select>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                  <Table size="sm" sx={bankTableSx}>
                    <thead>
                      <tr>
                        <th style={{ width: "34%" }}>Banker's Name</th>
                        <th style={{ width: "33%" }}>Primary Contact</th>
                        <th style={{ width: "33%" }}>Alternate Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <Input
                            placeholder="Enter banker's name"
                            value={row.bankerName || ""}
                            onChange={(e) =>
                              updateBank(idx, "bankerName", e.target.value)
                            }
                            variant="plain"
                            sx={lineInputSx}
                          />
                        </td>
                        <td>
                          <Input
                            placeholder="Enter primary contact"
                            value={row.bankerPrimaryContact || ""}
                            onChange={(e) =>
                              updateBank(
                                idx,
                                "bankerPrimaryContact",
                                e.target.value
                              )
                            }
                            variant="plain"
                            sx={lineInputSx}
                          />
                        </td>
                        <td>
                          <Input
                            placeholder="Enter alternate contact"
                            value={row.bankerAlternateContact || ""}
                            onChange={(e) =>
                              updateBank(
                                idx,
                                "bankerAlternateContact",
                                e.target.value
                              )
                            }
                            variant="plain"
                            sx={lineInputSx}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: { xs: "stretch", sm: "flex-end" },
                mt: 1.25,
              }}
            >
              <Button
                startDecorator={<Add />}
                variant="soft"
                onClick={addBank}
                sx={{
                  color: "#fff",
                  backgroundColor: ACCENT,
                  px: { xs: 1.25, sm: 2 },
                  borderRadius: "999px",
                  boxShadow: "0 10px 18px rgba(51, 99, 163, 0.28)",
                  "&:hover": {
                    backgroundColor: "#2c558e",
                    boxShadow: "0 12px 22px rgba(51, 99, 163, 0.35)",
                  },
                }}
              >
                Add Bank
              </Button>
            </Box>
          </TabPanel>
        </Tabs>

        <Divider sx={{ my: 2 }} />

        {/* Footer */}
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            sx={{
              color: "#3363a3",
              borderColor: "#3363a3",
              backgroundColor: "transparent",
              "--Button-hoverBg": "#e0e0e0",
              "--Button-hoverBorderColor": "#3363a3",
              "&:hover": { color: "#3363a3" },
              height: "8px",
            }}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={creating}
            sx={{
              backgroundColor: "#3363a3",
              color: "#fff",
              "&:hover": { backgroundColor: "#285680" },
              height: "8px",
            }}
          >
            {creating ? "Saving…" : "Save"}
          </Button>
        </Box>
      </Sheet>

      {/* Search Picker Modal */}
      <SearchPickerModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onPick={(row) => {
          onPickProject(row);
          setProjectModalOpen(false);
        }}
        title="Pick Projects"
        columns={[
          { key: "code", label: "Project Code" },
          { key: "name", label: "Project Name" },
        ]}
        fetchPage={async ({ page, search, pageSize }) => {
          const res = await triggerSearch(
            { search: search || "", page, limit: pageSize },
            true
          );
          const payload = res?.data || {};
          const rows = payload?.data ?? [];
          const total = payload?.pagination?.total ?? rows.length;
          return { rows, total };
        }}
        searchKey="name"
        pageSize={MODAL_LIMIT}
        rowKey="_id"
        multi={false}
      />
    </CssVarsProvider>
  );
}