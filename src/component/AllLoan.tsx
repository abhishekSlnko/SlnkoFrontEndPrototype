// pages/AllLoan.jsx
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SearchIcon from "@mui/icons-material/Search";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  Alert,
  Avatar,
  Chip,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Modal,
  ModalClose,
  ModalDialog,
  Option,
  Select,
  Sheet,
  Textarea,
  Tooltip,
} from "@mui/joy";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import FormControl from "@mui/joy/FormControl";
import IconButton, { iconButtonClasses } from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import NoData from "../assets/alert-bell.svg";
import { useGetAllProjectsForLoanQuery, useLazyGetProjectSearchDropdownQuery } from "../redux/projectsSlice";
import DOMPurify from "dompurify";
import { useUpdateLoanStatusMutation, useAddCommentMutation, useUpdateLoanInlineMutation, useLazyGetLoanByIdQuery, useLazyGetLoanNameSearchQuery } from "../redux/loanSlice";
import { useGetAllLoanQuery } from "../redux/loanSlice";
import { ColumnFilterPopover } from "./ColumnFilterPopover";
import SearchPickerModal from "./SearchPickerModal";

/* Utilities */
/** Relative time string (e.g., "3h ago", "2 w ago"). */
function relTime(iso) {
  if (!iso) return "";
  const now = Date.now();
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(1, Math.floor((now - t) / 1000)); // sec
  const mins = Math.floor(diff / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (diff < 60) return `${diff}s ago`;
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days} d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

// latestPerUser: removed (unused helper)

function statusColor(s) {
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
      return "dead";
    default:
      return "neutral";
  }
}

/** Formats scheme codes like KA, KC, KC2 → KUSUM A/C/C2.
 * Leaves values starting with "KUSUM" unchanged.
 * Handles case-insensitivity and trims whitespace.
 */
function formatSchemeText(scheme) {
  if (scheme == null) return "";
  const raw = String(scheme).trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper.startsWith("KUSUM")) return raw; // already full name
  // If pattern is K followed by letters/digits (e.g., KA, KC2, Kb)
  if (/^K[A-Z0-9]+$/i.test(raw)) {
    const rest = raw.slice(1).toUpperCase();
    return rest ? `KUSUM ${rest}` : "KUSUM";
  }
  return raw; // leave other schemes untouched
}

/** Sanitizes and renders limited HTML safely */
function SafeHtml({ html, clamp = 2 }) {
  const safe = useMemo(
    () =>
      DOMPurify.sanitize(String(html || ""), {
        ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "br", "ul", "ol", "li"],
        ALLOWED_ATTR: [],
      }),
    [html]
  );

  if (!safe) {
    return (
      <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
        —
      </Typography>
    );
  }

  // Clamp HTML to a limited number of lines
  return (
    <Box
      sx={{
        display: "-webkit-box",
        WebkitLineClamp: clamp,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        textOverflow: "ellipsis",
        lineHeight: 1.4,
        wordBreak: "break-word",
        mt: 0.25,
        "& ul, & ol": {
          margin: 0,
          paddingLeft: "1rem",
        },
      }}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

/**
 * Get the latest comment matching a predicate.
 * Prefers newest by `updatedAt` (fallback `createdAt`); if timestamps missing,
 * falls back to the last matching item by array order.
 */
function getLatestMatchingComment(comments, isMatch) {
  if (!Array.isArray(comments)) return null;
  let latest = null;
  let latestTime = -Infinity;
  for (const c of comments) {
    if (!isMatch?.(c)) continue;
    const tRaw = c?.updatedAt || c?.createdAt;
    const t = tRaw ? new Date(tRaw).getTime() : NaN;
    const time = Number.isNaN(t) ? -Infinity : t;
    if (time > latestTime) {
      latest = c;
      latestTime = time;
    }
  }
  if (latest) return latest;
  const matches = comments.filter((c) => isMatch?.(c));
  return matches.length ? matches[matches.length - 1] : null;
}

function CommentPill({ c }) {
  const name = c?.createdBy?.name || "User";
  const avatar = c?.createdBy?.attachment_url || "";
  const when = relTime(c?.updatedAt || c?.createdAt);
  
  return (
    <Sheet
      variant="outlined"
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: "sm",
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        maxWidth: "100%",
      }}
    >
      <Avatar src={avatar} size="sm" />
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography level="body-xs" sx={{ fontWeight: 600 }}>
          {name}
        </Typography>
        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
          {when}
        </Typography>
      </Stack>
    </Sheet>
  );
}

// ========== MAIN COMPONENT ==========
const AllLoan = forwardRef(({ selected, setSelected }, ref) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [triggerLoanNameSearch] = useLazyGetLoanNameSearchQuery();
  const [triggerProjectSearch] = useLazyGetProjectSearchDropdownQuery();
  
  // Z-index constants for sticky positioning
  const ZINDEX = {
    editorSticky: 25,     // Inline editor in sticky columns (highest)
    editor: 100,          // Inline editor in regular columns
    headerSticky: 20,     // Sticky header + sticky column intersection
    header: 15,           // Regular sticky header
    checkboxSticky: 12,   // Sticky checkbox column in body
    bodySticky: 10,       // Sticky body cells (non-checkbox)
    body: 1,              // Regular body cells
  };
  
  // Default width for sticky columns (in pixels)
  const STICKY_DEFAULT_WIDTH = 150;
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const pageSize = searchParams.get("pageSize");
    return pageSize ? parseInt(pageSize, 10) : 10;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isRemarksModalOpen, setRemarksModalOpen] = useState(false);

  // Extract all filter params from URL
  const project_status = searchParams.get("project_status") || "";
  const state = searchParams.get("state") || "";
  const loan_status = searchParams.get("loan_status") || "";
  const bank_name = searchParams.get("bank_name") || "";
  const matchMode = searchParams.get("matchMode") || "any";
  const expected_sanction_from = searchParams.get("expected_sanction_from") || "";
  const expected_sanction_to = searchParams.get("expected_sanction_to") || "";
  const expected_disbursement_from = searchParams.get("expected_disbursement_from") || "";
  const expected_disbursement_to = searchParams.get("expected_disbursement_to") || "";
  const actual_sanction_from = searchParams.get("actual_sanction_from") || "";
  const actual_sanction_to = searchParams.get("actual_sanction_to") || "";
  const actual_disbursement_from = searchParams.get("actual_disbursement_from") || "";
  const actual_disbursement_to = searchParams.get("actual_disbursement_to") || "";
  // New filter parameters
  const project_id = searchParams.get("project_id") || "";
  const customer = searchParams.get("customer") || "";
  const group = searchParams.get("group") || "";
  const project_scheme = searchParams.get("project_scheme") || "";
  const bank = searchParams.get("bank") || "";
  const banker_name = searchParams.get("banker_name") || "";
  const spoc = searchParams.get("spoc") || "";
  const bank_city_name = searchParams.get("bank_city_name") || "";

  // Keep bank and bank_name URL params in sync regardless of source (header vs sidebar vs chart)
  useEffect(() => {
    const b = searchParams.get("bank") || "";
    const bn = searchParams.get("bank_name") || "";

    // If only one is set or they differ, mirror them to the same value
    if (b !== bn) {
      const next = new URLSearchParams(searchParams);
      if (b && !bn) {
        next.set("bank_name", b);
      } else if (bn && !b) {
        next.set("bank", bn);
      } else if (!b && !bn) {
        next.delete("bank");
        next.delete("bank_name");
      } else {
        // Both present but different -> prefer sidebar/header value 'bank'
        next.set("bank_name", b);
      }
      setSearchParams(next);
    }
  }, [searchParams, bank, bank_name, setSearchParams]);

  // Memoize query parameters to ensure RTK Query properly detects changes
  const queryParams = useMemo(() => {
    const query = {
      page: currentPage,
      limit: rowsPerPage,
      sort: "-createdAt",
    };
    
    // Add search if present
    if (searchQuery) query.search = searchQuery;
    
    // Add existing filters if present
    if (project_status) query.status = project_status;
    if (state) query.bank_state = state;
    if (loan_status) query.loan_status = loan_status;
    if (bank_name) query.bank_name = bank_name;
    // Always include matchMode if any multiselect filters are active
    if (matchMode) query.matchMode = matchMode;
    
    // Add date range filters if present
    if (expected_sanction_from) query.expected_sanction_from = expected_sanction_from;
    if (expected_sanction_to) query.expected_sanction_to = expected_sanction_to;
    if (expected_disbursement_from) query.expected_disbursement_from = expected_disbursement_from;
    if (expected_disbursement_to) query.expected_disbursement_to = expected_disbursement_to;
    if (actual_sanction_from) query.actual_sanction_from = actual_sanction_from;
    if (actual_sanction_to) query.actual_sanction_to = actual_sanction_to;
    if (actual_disbursement_from) query.actual_disbursement_from = actual_disbursement_from;
    if (actual_disbursement_to) query.actual_disbursement_to = actual_disbursement_to;
    
    // Add new filter parameters if present
    if (project_id) query.project_id = project_id;
    if (customer) query.customer = customer;
    if (group) query.group = group;
    if (project_scheme) query.project_scheme = project_scheme;
    if (bank) query.bank = bank;
    if (banker_name) query.banker_name = banker_name;
    if (spoc) query.spoc = spoc;
    if (bank_city_name) query.bank_city_name = bank_city_name;
    
    return query;
  }, [
    currentPage,
    rowsPerPage,
    searchQuery,
    project_status,
    state,
    loan_status,
    bank_name,
    matchMode,
    expected_sanction_from,
    expected_sanction_to,
    expected_disbursement_from,
    expected_disbursement_to,
    actual_sanction_from,
    actual_sanction_to,
    actual_disbursement_from,
    actual_disbursement_to,
    project_id,
    customer,
    group,
    project_scheme,
    bank_city_name,
    banker_name,
    spoc,
  ]);

  const {
    data: getLoan = {},
    isLoading,
    refetch,
  } = useGetAllProjectsForLoanQuery(queryParams);

  const STATUS_OPTIONS = [
    "documents pending",
    "documents submitted",
    "submitted",
    "under banking process",
    "sanctioned",
    "disbursed",
    "dead",
  ];

  const cap = (s) =>
    String(s || "")
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");
      
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [remarks, setRemarks] = useState("");

  const [updateLoanStatus, { isLoading: updating, error: updateErr }] =
    useUpdateLoanStatusMutation();
  const [addComment] = useAddCommentMutation();
  const [updateLoanInline] = useUpdateLoanInlineMutation();
  
  // Loading states for remarks and pendency updates
  const [savingRemarksId, setSavingRemarksId] = useState(null);
  const [savingPendencyId, setSavingPendencyId] = useState(null);

  const openStatusModal = (loan) => {
    setSelectedLoan(loan);
    const activeLoan = getActiveLoan(loan);
    setNextStatus(activeLoan?.current_status?.status || "");
    setRemarks("");
    setStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    setStatusModalOpen(false);
    setSelectedLoan(null);
    setNextStatus("");
    setRemarks("");
  };

  const saveStatus = async () => {
    // Use the currently displayed project (newly selected code or original)
    const displayProject = getDisplayProject(selectedLoan || {});
    if (!displayProject?._id || !nextStatus) {
      toast.error("Project ID or status is missing");
      return;
    }
    try {
      await updateLoanStatus({
        project_id: displayProject._id,
        status: nextStatus,
        remarks,
      }).unwrap();
      closeStatusModal();
      refetch();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const [remarksText, setRemarksText] = useState("");
  const [remarksTargetLoan, setRemarksTargetLoan] = useState(null);
  const [remarksOverrides, setRemarksOverrides] = useState({});
  
  const [isPendencyModalOpen, setPendencyModalOpen] = useState(false);
  const [pendencyText, setPendencyText] = useState("");
  const [pendencyTargetLoan, setPendencyTargetLoan] = useState(null);
  const [pendencyOverrides, setPendencyOverrides] = useState({});

  // ===== INLINE EDITING (Clean Rewrite) =====
  const [editingCell, setEditingCell] = useState(null); // {loanId, fieldId, value}
  const [inlineOverrides, setInlineOverrides] = useState({});
  const blurTimeoutRef = useRef(null);
  
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectPickerTarget, setProjectPickerTarget] = useState(null);
  const [projectSelections, setProjectSelections] = useState({});
  const [fetchedLoans, setFetchedLoans] = useState({}); // Cache fetched loan data by loan._id
  const [triggerGetLoan, { isLoading: isLoadingLoan }] = useLazyGetLoanByIdQuery();

  // Remove inline overrides for a specific loan when data source changes
  const clearInlineOverridesForLoan = (loanId) => {
    if (!loanId) return;
    setInlineOverrides((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${loanId}:`)) delete next[k];
      });
      return next;
    });
  };

  // ===== DRAGGABLE STICKY DIVIDER =====
  const STORAGE_KEY_STICKY_WIDTH = 'loanTable.stickyWidth.v1';
  const DEFAULT_STICKY_WIDTH = 450; // Default width for sticky area
  const MIN_STICKY_WIDTH = 80; // Allow divider to move further left (just checkbox)
  const MAX_STICKY_WIDTH = 5000; // Allow divider to move far right (all columns sticky)
  
  const [stickyAreaWidth, setStickyAreaWidth] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_STICKY_WIDTH);
    return stored ? parseInt(stored, 10) : DEFAULT_STICKY_WIDTH;
  });
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [tableScrollLeft, setTableScrollLeft] = useState(0); // Track horizontal scroll to keep divider fixed
  const dividerDragStartRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [containerRect, setContainerRect] = useState({ left: 0, top: 0, height: 0 });

  
  const handleTableScroll = useCallback((e) => {
    // Track horizontal scroll to keep divider fixed at sticky area boundary
    setTableScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  // Keep divider fixed relative to viewport by tracking container bounds
  const updateContainerRect = useCallback(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setContainerRect({ left: rect.left, top: rect.top, height: rect.height });
  }, []);

  useEffect(() => {
    updateContainerRect();
    window.addEventListener('resize', updateContainerRect);
    // Capture scroll events (page-level or ancestor) to keep position in sync
    window.addEventListener('scroll', updateContainerRect, true);
    return () => {
      window.removeEventListener('resize', updateContainerRect);
      window.removeEventListener('scroll', updateContainerRect, true);
    };
  }, [updateContainerRect]);

  function inlineKey(loanId, fieldId) {
    return `${loanId}:${fieldId}`;
  }

  const openProjectPicker = (loan) => {
    if (!loan) return;
    setProjectPickerTarget(loan);
    setProjectPickerOpen(false);
  };

  const closeProjectPicker = () => {
    setProjectPickerOpen(false);
    setProjectPickerTarget(null);
  };

  // Remarks editing functions
  const openRemarksEdit = (loan) => {
    const activeLoan = getActiveLoan(loan);
    const override = remarksOverrides?.[loan?._id];
    if (override !== undefined) {
      setRemarksText(String(override || ""));
    } else {
      // Read the latest remarks from comments array of the active (fetched) loan
      let currentRemarks = "";
      if (Array.isArray(activeLoan?.comments)) {
        const latest = getLatestMatchingComment(
          activeLoan.comments,
          (c) => c?.remarks && !c?.pendency_remark
        );
        if (latest) currentRemarks = latest.remarks || "";
      }
      // Fallback to current_status.remarks if no comments
      if (!currentRemarks) {
        currentRemarks = activeLoan?.current_status?.remarks || "";
      }
      setRemarksText(String(currentRemarks));
    }
    setRemarksTargetLoan(loan);
    setRemarksModalOpen(true);
  };

  const closeRemarksEdit = () => {
    setRemarksModalOpen(false);
    setRemarksTargetLoan(null);
  };

  const saveRemarksEdit = async () => {
    // Save against the displayed project (handles newly selected project code)
    const displayProject = getDisplayProject(remarksTargetLoan || {});
    if (!displayProject?._id) {
      toast.error("Project ID is missing");
      return;
    }
    
    setSavingRemarksId(remarksTargetLoan._id);
    try {
      await addComment({
        project_id: displayProject._id,
        remarks: remarksText,
      }).unwrap();
      
      // Update local override map for immediate UI feedback
      setRemarksOverrides((prev) => ({ ...prev, [remarksTargetLoan._id]: remarksText }));
      setRemarksModalOpen(false);
      toast.success("Remarks saved successfully");
      refetch(); // Refresh data from backend
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save remarks");
    } finally {
      setSavingRemarksId(null);
    }
  };
  
  // Pendency remarks editing functions
  const openPendencyEdit = (loan) => {
    const activeLoan = getActiveLoan(loan);
    const override = pendencyOverrides?.[loan?._id];
    if (override !== undefined) {
      setPendencyText(String(override || ""));
    } else {
      // Extract latest pendency_remark from comments array
      let currentRemarks = "";
      if (Array.isArray(activeLoan?.comments)) {
        const latest = getLatestMatchingComment(
          activeLoan.comments,
          (c) => c?.pendency_remark
        );
        if (latest) currentRemarks = latest.pendency_remark || "";
      }
      // Fallback to loan_current_status if not found in comments
      if (!currentRemarks) {
        currentRemarks = activeLoan?.loan_current_status?.remarks || "";
      }
      setPendencyText(String(currentRemarks));
    }
    setPendencyTargetLoan(loan);
    setPendencyModalOpen(true);
  };

  const closePendencyEdit = () => {
    setPendencyModalOpen(false);
    setPendencyTargetLoan(null);
  };

  const savePendencyEdit = async () => {
    // Save against the displayed project (handles newly selected project code)
    const displayProject = getDisplayProject(pendencyTargetLoan || {});
    if (!displayProject?._id) {
      toast.error("Project ID is missing");
      return;
    }
    
    setSavingPendencyId(pendencyTargetLoan._id);
    try {
      await addComment({
        project_id: displayProject._id,
        pendency_remark: pendencyText,
      }).unwrap();
      
      // Update local override map for immediate UI feedback
      setPendencyOverrides((prev) => ({ ...prev, [pendencyTargetLoan._id]: pendencyText }));
      setPendencyModalOpen(false);
      toast.success("Pendency remarks saved successfully");
      refetch(); // Refresh data from backend
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save pendency remarks");
    } finally {
      setSavingPendencyId(null);
    }
  };

  // ----- Inline editing helpers -----
  // Parse week input like "3rd week of May" to get the last day of that week
  const parseWeekToDate = (weekInput, referenceDate = new Date()) => {
    try {
      // Try to match pattern like "3rd week of May" or "May 3rd week"
      const pattern1 = /(\d+)(st|nd|rd|th)?\s+week\s+of\s+(\w+)/i;
      const pattern2 = /(\w+)\s+(\d+)(st|nd|rd|th)?\s+week/i;
      
      let weekNum, monthName;
      const match1 = weekInput.match(pattern1);
      const match2 = weekInput.match(pattern2);
      
      if (match1) {
        weekNum = parseInt(match1[1], 10);
        monthName = match1[3];
      } else if (match2) {
        monthName = match2[1];
        weekNum = parseInt(match2[2], 10);
      } else {
        return null; // Invalid format
      }
      
      // Get month index from month name
      const monthNames = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december"
      ];
      const monthIndex = monthNames.findIndex(m => m.startsWith(monthName.toLowerCase()));
      
      if (monthIndex === -1 || weekNum < 1 || weekNum > 5) {
        return null; // Invalid month or week number
      }
      
      // Use year from reference date (expected disbursement date or current)
      const year = referenceDate.getFullYear();
      
      // Calculate last day of the week
      // Week 1: days 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-28, Week 5: 29-31
      const lastDayOfWeek = Math.min(weekNum * 7, 31);
      
      const resultDate = new Date(year, monthIndex, lastDayOfWeek);
      if (Number.isNaN(resultDate.getTime())) {
        return null;
      }
      
      return resultDate;
    } catch (err) {
      return null;
    }
  };

  // ----- Inline editing helpers -----
  const startInlineEdit = (loan, fieldId) => {
    if (!loan?._id) return;
    const activeLoan = getActiveLoan(loan);
    const proj = getDisplayProject(loan);
    
    // Clear any pending blur timeout to prevent race conditions
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    
    // If clicking the same cell that's already editing, do nothing
    if (editingCell && editingCell.loanId === loan._id && editingCell.fieldId === fieldId) {
      return;
    }
    
    // Get initial value
    const key = inlineKey(loan._id, fieldId);
    let initial = inlineOverrides[key] || "";
    if (initial === "") {
      if (fieldId === "expected_sl_month") {
        const raw = activeLoan?.timelines?.expected_sanctioned_date;
        if (raw) {
          const dt = new Date(raw);
          if (!Number.isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, "0");
            const d = String(dt.getDate()).padStart(2, "0");
            initial = `${y}-${m}-${d}`;
          }
        }
      } else if (fieldId === "disbursement_month") {
        const raw = activeLoan?.timelines?.expected_disbursement_date;
        if (raw) {
          const dt = new Date(raw);
          if (!Number.isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, "0");
            const d = String(dt.getDate()).padStart(2, "0");
            initial = `${y}-${m}-${d}`;
          }
        }
      } else if (fieldId === "bank") {
        const banks = Array.isArray(activeLoan?.banking_details)
          ? activeLoan.banking_details
          : [];
        initial = banks?.[0]?.name || "";
      } else if (fieldId === "bank_contact_details") {
        const bankers = Array.isArray(activeLoan?.banker_details)
          ? activeLoan.banker_details
          : [];
        const contacts = bankers
          .map((b) =>
            Array.isArray(b?.contact_detail) ? b.contact_detail.join(", ") : ""
          )
          .filter(Boolean);
        initial = contacts[0] || "";
      } else if (fieldId === "banker_name") {
        const bankers = Array.isArray(activeLoan?.banker_details)
          ? activeLoan.banker_details
          : [];
        initial = bankers?.[0]?.name || "";
      } else if (fieldId === "customer") {
        initial = proj?.customer || "";
      } else if (fieldId === "group") {
        initial = proj?.p_group || "";
      } else if (fieldId === "name") {
        initial = proj?.name || "";
      } else if (fieldId === "contact_number") {
        initial = proj?.number || "";
      } else if (fieldId === "bank_city_name") {
        const banks = Array.isArray(activeLoan?.banking_details) ? activeLoan.banking_details : [];
        initial = banks?.[0]?.bank_city_name || "";
      } else if (fieldId === "week") {
        const raw = activeLoan?.timelines?.expected_disbursement_date;
        if (raw) {
          const dt = new Date(raw);
          if (!Number.isNaN(dt.getTime())) {
            const dayOfMonth = dt.getDate();
            const monthName = dt.toLocaleDateString("en-US", { month: "short" });
            const weekNumber = Math.ceil(dayOfMonth / 7);
            const ordinal = ["", "st", "nd", "rd"][weekNumber] || "th";
            initial = `${monthName} ${weekNumber}${ordinal} week`;
          }
        }
      }
    }

    setEditingCell({ loanId: loan._id, fieldId, value: initial });
  };

  const cancelInlineEdit = () => {
    setEditingCell(null);
  };

  const saveInlineEdit = async (loan) => {
    if (!editingCell?.loanId || editingCell.loanId !== loan?._id) return;
    
    // Get the display project (either newly selected or original)
    const displayProject = getDisplayProject(loan);
    if (!displayProject?._id) {
      toast.error("Project ID is missing");
      cancelInlineEdit();
      return;
    }
    
    const { fieldId, loanId, value } = editingCell;

    const payload = {};
    
    // Build payload based on field type
    if (fieldId === "expected_sl_month") {
      payload.timelines = {
        expected_sanctioned_date: value || null,
      };
    } else if (fieldId === "disbursement_month") {
      payload.timelines = {
        expected_disbursement_date: value || null,
      };
    } else if (fieldId === "bank") {
      const currentBank = Array.isArray(loan?.banking_details)
        ? loan.banking_details?.[0]
        : {};
      payload.banking_details = [{
        name: value || "",
        bank_city_name: currentBank?.bank_city_name || "",
        branch: currentBank?.branch || "",
        state: currentBank?.state || "",
      }];
    } else if (fieldId === "bank_contact_details") {
      const contactList = String(value || "")
        .split(/[,|]/)
        .map((v) => v.trim())
        .filter(Boolean);
      const currentBanker = Array.isArray(loan?.banker_details)
        ? loan.banker_details?.[0]
        : {};
      payload.banker_details = [{
        name: currentBanker?.name || "",
        contact_detail: contactList,
      }];
    } else if (fieldId === "banker_name") {
      const currentBanker = Array.isArray(loan?.banker_details)
        ? loan.banker_details?.[0]
        : {};
      payload.banker_details = [{
        name: value || "",
        contact_detail: Array.isArray(currentBanker?.contact_detail) ? currentBanker.contact_detail : [],
      }];
    } else if (fieldId === "bank_city_name") {
      const currentBank = Array.isArray(loan?.banking_details)
        ? loan.banking_details?.[0]
        : {};
      payload.banking_details = [{
        name: currentBank?.name || "",
        bank_city_name: value || "",
        branch: currentBank?.branch || "",
        state: currentBank?.state || "",
      }];
    } else if (fieldId === "customer") {
      payload.project_id = { customer: value || "" };
    } else if (fieldId === "group") {
      payload.project_id = { p_group: value || "" };
    } else if (fieldId === "name") {
      payload.project_id = { name: value || "" };
    } else if (fieldId === "contact_number") {
      payload.project_id = { number: value || "" };
    } else if (fieldId === "cam_coordinator" || fieldId === "cam_name") {
      payload.camDetail = { cam_name: value || "" };
    } else if (fieldId === "week") {
      // Parse week input and convert to disbursement date
      const referenceDate = new Date(loan?.timelines?.expected_disbursement_date || new Date());
      const parsedDate = parseWeekToDate(value, referenceDate);
      
      if (!parsedDate) {
        toast.error("Invalid week format. Use format like 'May 3rd week' or '3rd week of May'");
        cancelInlineEdit();
        return;
      }
      
      // Format as YYYY-MM-DD for the API
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const d = String(parsedDate.getDate()).padStart(2, "0");
      const dateString = `${y}-${m}-${d}`;
      
      payload.timelines = {
        expected_disbursement_date: dateString,
      };
    } else {
      // Generic field update
      payload[fieldId] = value || "";
    }

    // Frontend-only update: close editor immediately, update local state
    const editKey = inlineKey(loanId, fieldId);
    setInlineOverrides((prev) => ({ ...prev, [editKey]: value }));
    
    // API integration using RTK Query mutation - Call backend with proper structure
    try {
      // Use the display project ID (either newly selected or original)
      const projectId = displayProject._id;
      
      const result = await updateLoanInline({
        project_id: projectId,
        payload,
      }).unwrap();

      cancelInlineEdit(); // Close editor after successful update
      toast.success(result?.message || "Updated successfully");
      refetch(); // Refresh to sync with backend
    } catch (err) {
      const errorMsg = err?.data?.message || err?.message || "Failed to update";
      toast.error(errorMsg);
      
      // Revert optimistic update on error
      setInlineOverrides((prev) => {
        const updated = { ...prev };
        delete updated[editKey];
        return updated;
      });
      return;
    }
  };

  const buildProjectOverrides = (loanId, projectRow) => {
    const safe = (val) => (val === undefined || val === null ? "" : String(val));
    const overrides = {};
    
    // Basic project information
    overrides[inlineKey(loanId, "customer")] = safe(projectRow?.customer);
    overrides[inlineKey(loanId, "group")] = safe(projectRow?.p_group);
    overrides[inlineKey(loanId, "name")] = safe(projectRow?.name);
    overrides[inlineKey(loanId, "contact_number")] = safe(projectRow?.number);
    overrides[inlineKey(loanId, "kwp_ac")] =
      projectRow?.project_kwp !== undefined && projectRow?.project_kwp !== null
        ? String(projectRow.project_kwp)
        : "";
    overrides[inlineKey(loanId, "project_scheme")] = safe(projectRow?.handoverDetails?.project_scheme || projectRow?.scheme);
    overrides[inlineKey(loanId, "module")] = safe(projectRow?.handoverDetails?.module_category_name || projectRow?.module_category);
    overrides[inlineKey(loanId, "state")] = safe(projectRow?.state);
    
    // Banking details - extract from banking_details array if available
    if (Array.isArray(projectRow?.banking_details) && projectRow.banking_details.length > 0) {
      const firstBank = projectRow.banking_details[0];
      if (firstBank) {
        overrides[inlineKey(loanId, "bank")] = safe(firstBank?.name);
        overrides[inlineKey(loanId, "bank_city_name")] = safe(firstBank?.bank_city_name);
      }
    }
    
    // Banker details - extract from banker_details array if available
    if (Array.isArray(projectRow?.banker_details) && projectRow.banker_details.length > 0) {
      const firstBanker = projectRow.banker_details[0];
      if (firstBanker) {
        overrides[inlineKey(loanId, "banker_name")] = safe(firstBanker?.name);
        // Extract contact details
        if (Array.isArray(firstBanker?.contact_detail) && firstBanker.contact_detail.length > 0) {
          const contacts = firstBanker.contact_detail.join(", ");
          overrides[inlineKey(loanId, "bank_contact_details")] = safe(contacts);
        }
      }
    }
    
    // Timeline details - expected sanction and disbursement dates
    if (projectRow?.timelines) {
      if (projectRow.timelines?.expected_sanctioned_date) {
        const dt = new Date(projectRow.timelines.expected_sanctioned_date);
        if (!Number.isNaN(dt.getTime())) {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, "0");
          const d = String(dt.getDate()).padStart(2, "0");
          overrides[inlineKey(loanId, "expected_sl_month")] = `${y}-${m}-${d}`;
        }
      }
      if (projectRow.timelines?.expected_disbursement_date) {
        const dt = new Date(projectRow.timelines.expected_disbursement_date);
        if (!Number.isNaN(dt.getTime())) {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, "0");
          const d = String(dt.getDate()).padStart(2, "0");
          overrides[inlineKey(loanId, "disbursement_month")] = `${y}-${m}-${d}`;
          
          // Also set week format
          const dayOfMonth = dt.getDate();
          const monthName = dt.toLocaleDateString("en-US", { month: "short" });
          const weekNumber = Math.ceil(dayOfMonth / 7);
          const ordinal = ["", "st", "nd", "rd"][weekNumber] || "th";
          overrides[inlineKey(loanId, "week")] = `${monthName} ${weekNumber}${ordinal} week`;
        }
      }
    }
    
    // CAM/SPOC details
    if (projectRow?.camDetail?.cam_name) {
      overrides[inlineKey(loanId, "cam_coordinator")] = safe(projectRow.camDetail.cam_name);
    }
    
    return overrides;
  };

  const applyProjectSelection = async (projectRow) => {
    
    if (!projectRow?._id) {
      toast.error("Select a valid project");
      return;
    }
    if (!projectPickerTarget?._id) {
      toast.error("Row not found");
      return;
    }

    const loanId = projectPickerTarget._id;
    const projectId = projectRow._id; // The project's _id to fetch loan data
    
    
    // Fetch full loan data from backend for the selected project
    try {
      const result = await triggerGetLoan(projectId, true);
      
      const fetchedLoan = result?.data?.data || result?.data || result;
      
     
      if (fetchedLoan?._id) {
       
        setFetchedLoans((prev) => ({ ...prev, [loanId]: fetchedLoan }));

        const completeProject = fetchedLoan?.project_id || projectRow;
        setProjectSelections((prev) => ({ ...prev, [loanId]: completeProject }));
        clearInlineOverridesForLoan(loanId);
        
        // Clear remarks and pendency overrides for this loan to prevent stale remarks data
        setRemarksOverrides((prev) => {
          const next = { ...prev };
          delete next[loanId];
          return next;
        });
        setPendencyOverrides((prev) => {
          const next = { ...prev };
          delete next[loanId];
          return next;
        });

        // Pre-seed inline overrides with project-derived values (dates/bank details) using the complete project
        const overrides = buildProjectOverrides(loanId, completeProject);
        if (Object.keys(overrides).length) {
          setInlineOverrides((prev) => ({ ...prev, ...overrides }));
        }
       
        toast.success("Loan data loaded successfully");
      } else {
        toast.warning("No loan found for this project");
      }
    } catch (err) {

      toast.error(err?.data?.message || "Failed to load loan data");
    }
    
    closeProjectPicker();
  };

  // ===== DRAGGABLE STICKY DIVIDER HANDLERS =====
  const handleDividerMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent column drag-and-drop interference
    setIsDraggingDivider(true);
    dividerDragStartRef.current = {
      startX: e.clientX,
      startWidth: stickyAreaWidth,
    };
  };

  const handleDividerMouseMove = useCallback((e) => {
    if (!isDraggingDivider || !dividerDragStartRef.current) return;
    
    const { startX, startWidth } = dividerDragStartRef.current;
    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;
    
    // Constrain within min/max bounds
    const constrainedWidth = Math.min(Math.max(newWidth, MIN_STICKY_WIDTH), MAX_STICKY_WIDTH);
    // Update state for column calculations
    setStickyAreaWidth(constrainedWidth);
  }, [isDraggingDivider, MIN_STICKY_WIDTH, MAX_STICKY_WIDTH]);

  const handleDividerMouseUp = useCallback(() => {
    if (isDraggingDivider) {
      setIsDraggingDivider(false);
      dividerDragStartRef.current = null;
      // no-op: visual position derives from recalculated widths
      
      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY_STICKY_WIDTH, String(stickyAreaWidth));
    }
  }, [isDraggingDivider, stickyAreaWidth, STORAGE_KEY_STICKY_WIDTH]);

  // Add global mouse listeners for drag + prevent text selection
  useEffect(() => {
    if (isDraggingDivider) {
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      
      document.addEventListener('mousemove', handleDividerMouseMove);
      document.addEventListener('mouseup', handleDividerMouseUp);
      
      return () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleDividerMouseMove);
        document.removeEventListener('mouseup', handleDividerMouseUp);
      };
    }
  }, [isDraggingDivider, handleDividerMouseMove, handleDividerMouseUp]);

  const fetchProjectPage = useCallback(
    async ({ page, search, pageSize }) => {
      try {
        const res = await triggerProjectSearch(
          { search: search || "", page, limit: pageSize },
          true
        );
        const payload = res?.data || {};
        const rows = payload?.data ?? payload?.rows ?? [];
        const total = payload?.pagination?.total ?? rows.length;
        
        return { rows, total };
      } catch (err) {
        return { rows: [], total: 0 };
      }
    },
    [triggerProjectSearch]
  );

  const loanData = getLoan?.data || [];
  const loanPagination = getLoan?.meta || getLoan?.pagination || {};
  
  // Sync page and pageSize from URL
  useEffect(() => {
    const page = parseInt(searchParams.get("page")) || 1;
    setCurrentPage(page);
    
    const pageSize = searchParams.get("pageSize");
    if (pageSize) {
      const parsedSize = parseInt(pageSize, 10);
      if (!isNaN(parsedSize) && parsedSize > 0) {
        setRowsPerPage(parsedSize);
      }
    }
  }, [searchParams]);

  const total = Number(loanPagination?.total || loanPagination?.totalDocs || 0);
  const pageSize = Math.max(1, Number(rowsPerPage || 10)); // Default to 10 if not set
  // Use pages from API response if available, otherwise calculate
  const totalPages = Math.max(1, Number(loanPagination?.pages || Math.ceil(total / pageSize)));

  const handlePageChange = (page) => {
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    if (clampedPage >= 1 && clampedPage <= totalPages) {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("page", clampedPage);
        return params;
      });
      setCurrentPage(clampedPage);
    }
  };

  // When rowsPerPage changes, reset to page 1 and update URL
  const handleRowsPerPageChange = (newPageSize) => {
    if (newPageSize !== null && newPageSize > 0) {
      setRowsPerPage(newPageSize);
      setCurrentPage(1);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("pageSize", String(newPageSize));
        params.set("page", "1"); // Reset to page 1 when changing page size
        return params;
      });
    }
  };

  // Pagination range calculation
  const getPaginationRange = () => {
    const siblings = 1;
    const pages = [];
    if (totalPages <= 5 + siblings * 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const left = Math.max(currentPage - siblings, 2);
      const right = Math.min(currentPage + siblings, totalPages - 1);
      pages.push(1);
      if (left > 2) pages.push("...");
      for (let i = left; i <= right; i++) pages.push(i);
      if (right < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  // Clamp current page if it exceeds totalPages (e.g., user types ?page=999 or changes page size)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("page", String(totalPages));
        return params;
      });
    }
  }, [currentPage, totalPages, setSearchParams]);

  const handleSearch = (query) => setSearchQuery(query.toLowerCase());

  // Helper to get the active loan record for a row - prefer fetched loan, then original
  const getActiveLoan = (loan) => fetchedLoans?.[loan?._id] || loan;

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(loanData.map((row) => row?.project_id?._id));
    } else {
      setSelected([]);
    }
  };

  const handleRowSelect = (_id) => {
    setSelected((prev) =>
      prev.includes(_id) ? prev.filter((item) => item !== _id) : [...prev, _id]
    );
  };

  // ========== COLUMN VISIBILITY LOGIC ==========
  const LS_KEY = "loanTable.columns.v1";
  const LS_STICKY_KEY = "loanTable.stickyColumns.v1";
  
  // Prefer a user-selected project row (from the picker) when available; fallback to the loan's project_id
  const getDisplayProject = (loan) => projectSelections?.[loan?._id] || loan?.project_id || {};

  // Define all available columns
  const COLUMN_DEFS = [
    {
      id: "project_id",
      label: "Project Id",
      isSticky: true,
      width: 280,
      filterType: "list",
      filterParam: "project_id",
      listConfig: {
        filterTypeParam: "project_code",
        getItemLabel: (row) => row?.project_id?.code || "",
        pageSize: 7,
      },
      render: (loan) => {
        const proj = getDisplayProject(loan);
        const code = proj?.code || "-";
        return (
          <Chip
            size="sm"
            variant="outlined"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              openProjectPicker(loan);
            }}
            sx={{ cursor: "pointer" }}
          >
            {code}
          </Chip>
        );
      },
      filterHint: "Filter by project code (e.g., SOL-123)",
    },
    {
      id: "customer",
      label: "Customer",
      isSticky: true,
      width: 180,
      filterType: "list",
      filterParam: "customer",
      listConfig: {
        filterTypeParam: "customer",
        getItemLabel: (row) => row?.project_id?.customer || "",
        pageSize: 7,
      },
      render: (loan) => {
        const override = inlineOverrides[inlineKey(loan?._id, "customer")];
        if (override !== undefined) return override || "-";
        const proj = getDisplayProject(loan);
        return proj?.customer || "-";
      },
    },
    {
      id: "group",
      label: "Group",
      isSticky: true,
      width: 115,
      filterType: "list",
      filterParam: "group",
      listConfig: {
        filterTypeParam: "group",
        getItemLabel: (row) => row?.project_id?.p_group || "",
        pageSize: 7,
      },
      render: (loan) => {
        const override = inlineOverrides[inlineKey(loan?._id, "group")];
        if (override !== undefined) return override || "-";
        const proj = getDisplayProject(loan);
        return proj?.p_group || "-";
      },
    },
    {
      id: "contact_number",
      label: "Contact Number",
      isSticky: false,
      render: (loan) => {
        const override = inlineOverrides[inlineKey(loan?._id, "contact_number")];
        if (override !== undefined) return override || "-";
        const proj = getDisplayProject(loan);
        return proj?.number || "-";
      },
    },
    {
      id: "kwp_ac",
      label: "AC Capacity (kWp)",
      isSticky: false,
      filterType: null,
      render: (loan) => {
        const override = inlineOverrides[inlineKey(loan?._id, "kwp_ac")];
        if (override !== undefined) return override || "-";
        const proj = getDisplayProject(loan);
        return proj?.project_kwp ? `${proj.project_kwp}` : "-";
      },
    },
    {
      id: "project_scheme",
      label: "Project Scheme",
      isSticky: false,
      filterType: null,
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const override = inlineOverrides[inlineKey(loan?._id, "project_scheme")];
        if (override !== undefined) return override || "-";
        const proj = getDisplayProject(loan);
        const scheme =
          activeLoan?.handoverDetails?.project_scheme ||
          proj?.handoverDetails?.project_scheme ||
          proj?.scheme ||
          loan?.project_scheme ||
          loan?.project_id?.scheme ||
          loan?.scheme;
        if (!scheme || String(scheme).trim() === "") return "-";
        return formatSchemeText(scheme);
      },
    },
    {
      id: "module",
      label: "Module",
      isSticky: false,
      filterType: "list",
      filterParam: "module",
      listConfig: {
        filterTypeParam: "module",
        getItemLabel: (row) => row?.module_category || "",
        pageSize: 7,
      },
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const override = inlineOverrides[inlineKey(loan?._id, "module")];
        if (override !== undefined) return override || "-";
        const proj = getDisplayProject(loan);
        return (
          activeLoan?.handoverDetails?.module_category_name ||
          proj?.handoverDetails?.module_category_name ||
          proj?.module_category ||
          loan?.project_id?.module_category ||
          loan?.module_category ||
          "-"
        );
      },
    },
    {
      id: "state",
      label: "State",
      isSticky: false,
      filterType: "multiselect",
      filterParam: "state",
      filterOptions: [
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
        { label: "Dadra and Nagar Haveli and Daman and Diu", value: "dadra and nagar haveli and daman and diu" },
        { label: "Delhi", value: "delhi" },
        { label: "Jammu and Kashmir", value: "jammu kashmir" },
        { label: "Ladakh", value: "ladakh" },
        { label: "Lakshadweep", value: "lakshadweep" },
        { label: "Puducherry", value: "puducherry" },
      ],
      render: (loan) => {
        const override = inlineOverrides[inlineKey(loan?._id, "state")];
        if (override !== undefined) return override || "-";
        const proj = getDisplayProject(loan);
        return proj?.state || "-";
      },
    },
    {
      id: "bank_city_name",
      label: "Bank City Name",
      isSticky: false,
      filterType: "text",
      filterParam: "bank_city_name",
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const override = inlineOverrides[inlineKey(loan?._id, "bank_city_name")];
        if (override !== undefined) return override || "-";
        const banks = Array.isArray(activeLoan?.banking_details) ? activeLoan.banking_details : [];
        if (banks.length === 0) return "-";
        // Show first bank's city, or all if multiple
        if (banks.length === 1) return banks[0]?.bank_city_name || "-";
        const cities = banks.map(b => b?.bank_city_name).filter(Boolean);
        if (cities.length === 0) return "-";
        return (
          <Typography level="body-sm">
            {cities.join(", ")}
          </Typography>
        );
      },
    },
    {
      id: "project_status",
      label: "Project Status",
      isSticky: false,
      filterType: "multiselect",
      filterParam: "project_status",
      filterOptions: [
        { label: "To Be Started", value: "to be started" },
        { label: "Ongoing", value: "ongoing" },
        { label: "Completed", value: "completed" },
        { label: "On Hold", value: "on_hold" },
        { label: "Delayed", value: "delayed" },
        { label: "Dead", value: "dead" },
        { label: "Books Closed", value: "books closed" },
      ],
      render: (loan) => {
        const proj = getDisplayProject(loan);
        const status = proj?.current_status?.status;
        if (!status) return "-";
        const cap = (s) =>
          String(s || "")
            .split(" ")
            .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
            .join(" ");
        return (
          <Chip size="sm" variant="soft" sx={{ textTransform: "capitalize" }}>
            {cap(status)}
          </Chip>
        );
      },
    },
    {
      id: "loan_status",
      label: "Loan Status",
      isSticky: false,
      filterType: "multiselect",
      filterParam: "loan_status",
      filterOptions: [
        { label: "Not Submitted", value: "not submitted" },
        { label: "Submitted", value: "submitted" },
        { label: "Documents Pending", value: "documents pending" },
        { label: "Documents Submitted", value: "documents submitted" },
        { label: "Under Banking Process", value: "under banking process" },
        { label: "Sanctioned", value: "sanctioned" },
        { label: "Disbursed", value: "disbursed" },
        { label: "Dead", value: "dead" },
      ],
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const cap = (s) =>
          String(s || "")
            .split(" ")
            .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
            .join(" ");
        const status = activeLoan?.current_status?.status || "Not Submitted";
        return (
          <Chip
            size="sm"
            variant="soft"
            color={statusColor(status)}
            sx={{
              textTransform: "capitalize",
              fontWeight: 500,
              cursor: "pointer",
              "&:hover": { boxShadow: "sm" },
            }}
            onClick={(e) => {
              e.stopPropagation();
              openStatusModal(loan);
            }}
          >
            {cap(status)}
          </Chip>
        );
      },
    },
    {
      id: "expected_sl_month",
      label: "Expected SL Date",
      isSticky: false,
      filterType: "daterange",
      filterParam: "expected_sanction",
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const override = inlineOverrides[inlineKey(loan?._id, "expected_sl_month")];
        const date = override || activeLoan?.timelines?.expected_sanctioned_date;
        if (!date) return "-";
        try {
          const dt = new Date(date);
          if (isNaN(dt.getTime())) return "-";
          return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        } catch {
          return "-";
        }
      },
    },
    {
      id: "week",
      label: "Week",
      isSticky: false,
      filterType: null,
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const date = activeLoan?.timelines?.expected_disbursement_date;
        if (!date) return "-";
        try {
          const dt = new Date(date);
          if (isNaN(dt.getTime())) return "-";
          
          // Get the day of month and month name
          const dayOfMonth = dt.getDate();
          const monthName = dt.toLocaleDateString("en-US", { month: "short" });
          
          // Calculate week number in the month (1st, 2nd, 3rd, 4th, 5th)
          const weekNumber = Math.ceil(dayOfMonth / 7);
          
          // Format as "May 1st week" or "March 2nd week" etc
          const ordinal = ["", "st", "nd", "rd"][weekNumber] || "th";
          return `${monthName} ${weekNumber}${ordinal} week`;
        } catch {
          return "-";
        }
      },
    },
    {
      id: "disbursement_month",
      label: "Disbursement Date",
      isSticky: false,
      filterType: "daterange",
      filterParam: "expected_disbursement",
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const override = inlineOverrides[inlineKey(loan?._id, "disbursement_month")];
        const date = override || activeLoan?.timelines?.expected_disbursement_date;
        if (!date) return "-";
        try {
          const dt = new Date(date);
          if (isNaN(dt.getTime())) return "-";
          return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        } catch {
          return "-";
        }
      },
    },
    {
      id: "bank",
      label: "Bank",
      isSticky: false,
      filterType: "list",
      filterParam: "bank",
      listConfig: {
        filterTypeParam: "bank_name",
        getItemLabel: (row) => {
          // Extract bank names from banking_details array
          const banks = Array.isArray(row?.banking_details) ? row.banking_details : [];
          if (banks.length === 0) return "";
          // Return first bank name for the list (each row shows one bank)
          return banks[0]?.name || "";
        },
        pageSize: 7,
      },
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const override = inlineOverrides[inlineKey(loan?._id, "bank")];
        if (override !== undefined) return override || "-";
        const banks = Array.isArray(activeLoan?.banking_details) ? activeLoan.banking_details : [];
        if (banks.length === 0) return "-";
        // Show first bank, or all if multiple
        if (banks.length === 1) return banks[0]?.name || "-";
        const names = banks.map(b => b?.name).filter(Boolean);
        if (names.length === 0) return "-";
        return (
          <Typography level="body-sm">
            {names.join(", ")}
          </Typography>
        );
      },
    },
    {
      id: "banker_name",
      label: "Banker Name",
      isSticky: false,
      filterType: "text",
      filterParam: "banker_name",
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const override = inlineOverrides[inlineKey(loan?._id, "banker_name")];
        if (override !== undefined) return override || "-";
        const bankers = Array.isArray(activeLoan?.banker_details) ? activeLoan.banker_details : [];
        if (bankers.length === 0) return "-";
        // Show first banker, or all if multiple
        if (bankers.length === 1) return bankers[0]?.name || "-";
        const names = bankers.map(b => b?.name).filter(Boolean);
        if (names.length === 0) return "-";
        return (
          <Typography level="body-sm">
            {names.join(", ")}
          </Typography>
        );
      },
    },
    {
      id: "bank_contact_details",
      label: "Bank Contact Details",
      isSticky: false,
      filterType: null,
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const override = inlineOverrides[inlineKey(loan?._id, "bank_contact_details")];
        if (override !== undefined) return override || "-";
        const bankers = Array.isArray(activeLoan?.banker_details) ? activeLoan.banker_details : [];
        if (bankers.length === 0) return "-";
        // Flatten contacts across bankers and normalize
        const contacts = bankers
          .flatMap((b) => (Array.isArray(b?.contact_detail) ? b.contact_detail : []))
          .map((c) => String(c || "").trim())
          .filter(Boolean);
        if (contacts.length === 0) return "-";
        const primary = contacts[0];
        const extras = contacts.slice(1);

        return (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Typography level="body-sm" sx={{ whiteSpace: 'nowrap' }}>{primary}</Typography>
            {extras.length > 0 && (
              <Tooltip
                placement="top"
                title={
                  <Box sx={{ py: 0.5 }}>
                    {extras.map((c, idx) => (
                      <Typography key={idx} level="body-xs" sx={{ display: 'block', whiteSpace: 'nowrap', color: '#000' }}>
                        {c}
                      </Typography>
                    ))}
                  </Box>
                }
                sx={{
                  bgcolor: '#fff',
                  color: '#000',
                  border: '1px solid #ddd',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  '& .MuiTooltip-arrow': {
                    color: '#fff',
                    '&::before': {
                      border: '1px solid #ddd',
                    },
                  },
                }}
              >
                <Box
                  component="span"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 22,
                    minWidth: 28,
                    px: 0.75,
                    borderRadius: 999,
                    fontSize: '12px',
                    fontWeight: 700,
                    lineHeight: 1,
                    bgcolor: 'neutral.solidBg',
                    color: 'neutral.solidColor',
                    cursor: 'default',
                    boxShadow: 'sm',
                  }}
                >
                  +{extras.length}
                </Box>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      id: "cam_coordinator",
      label: "SPOC",
      isSticky: false,
      filterType: "text",
      filterParam: "spoc",
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        return activeLoan?.camDetail?.cam_name || "-";
      },
    },
    {
      id: "remarks",
      label: "Remarks",
      isSticky: false,
      filterType: null,
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const override = remarksOverrides?.[loan?._id];
        if (override !== undefined && String(override).trim().length > 0) {
          return <Typography level="body-sm">{override}</Typography>;
        }
        
        // Extract latest remarks from comments array (comments with 'remarks' field, excluding pendency_remark)
        let remarks = "";
        if (Array.isArray(activeLoan?.comments)) {
          const latest = getLatestMatchingComment(
            activeLoan.comments,
            (c) => c?.remarks && !c?.pendency_remark
          );
          if (latest) remarks = latest.remarks || "";
        }
        
        // Fallback to current_status remarks
        if (!remarks) {
          remarks = activeLoan?.current_status?.remarks || "";
        }
        
        return (
          <Typography level="body-sm" sx={{ color: remarks ? "text.primary" : "text.tertiary" }}>
            {remarks || "—"}
          </Typography>
        );
      },
    },
    {
      id: "pendency_remarks",
      label: "Pendency Remarks",
      isSticky: false,
      filterType: null,
      render: (loan) => {
        const activeLoan = getActiveLoan(loan);
        const override = pendencyOverrides?.[loan?._id];
        if (override !== undefined && String(override).trim().length > 0) {
          return <Typography level="body-sm">{override}</Typography>;
        }
        
        // Extract latest pendency_remark from comments array
        let pendencyRemarks = "";
        if (Array.isArray(activeLoan?.comments)) {
          const latest = getLatestMatchingComment(
            activeLoan.comments,
            (c) => c?.pendency_remark
          );
          if (latest) pendencyRemarks = latest.pendency_remark || "";
        }
        
        // Fallback to loan_current_status if comments don't have pendency_remark
        if (!pendencyRemarks) {
          pendencyRemarks = activeLoan?.loan_current_status?.remarks || "";
        }
        
        return (
          <Typography level="body-sm" sx={{ color: pendencyRemarks ? "text.primary" : "text.tertiary" }}>
            {pendencyRemarks || "—"}
          </Typography>
        );
      },
    },

  ];

  // Presets
  const PRESET_ALL = COLUMN_DEFS.map((c) => c.id);
  const PRESET_ESSENTIAL = PRESET_ALL;
  const PRESET_FINANCE = PRESET_ALL;
  const PRESET_LOAN_TRACKING = PRESET_ALL;
  

  // Load visibility from localStorage - defaults to Show All columns
  const loadVisibility = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) && arr.length ? arr : PRESET_ALL;
      }
    } catch {}
    // Default to Show All columns
    return PRESET_ALL;
  };

  // Load sticky columns from localStorage
  const loadStickyColumns = () => {
    try {
      const raw = localStorage.getItem(LS_STICKY_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : ["project_id", "customer", "group", "name"];
      }
    } catch {}
    return ["project_id", "customer", "group", "name"];
  };

  const ORDER_KEY = "loanTable.order.v1";

  const loadOrder = () => {
    try {
      const raw = localStorage.getItem(ORDER_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch {}
    return COLUMN_DEFS.map((c) => c.id);
  };

  const [visibleCols, setVisibleCols] = useState(loadVisibility());
  const [stickyCols, setStickyCols] = useState(loadStickyColumns());
  const [columnOrder, setColumnOrder] = useState(loadOrder);
  const [colModalOpen, setColModalOpen] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState("");
  const [dragState, setDragState] = useState({ activeId: null, overId: null, position: null });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(visibleCols));
  }, [visibleCols]);

  // Persist sticky columns to localStorage
  useEffect(() => {
    localStorage.setItem(LS_STICKY_KEY, JSON.stringify(stickyCols));
  }, [stickyCols]);

  // Ensure column order includes any new columns
  useEffect(() => {
    setColumnOrder((prev) => {
      const known = new Set(prev);
      const missing = COLUMN_DEFS.map((c) => c.id).filter((id) => !known.has(id));
      return missing.length ? [...prev, ...missing] : prev;
    });
  }, []);

  // Persist column order
  useEffect(() => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Apply preset
  const applyPreset = (ids) => setVisibleCols(ids);

  // Toggle sticky state for a column
  const toggleSticky = (colId) => {
    setStickyCols((prev) =>
      prev.includes(colId)
        ? prev.filter((id) => id !== colId)
        : [...prev, colId]
    );
  };


  // Responsive: force Essential on mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const handle = () => {
      if (mq.matches)
        setVisibleCols((prev) =>
          prev.filter((id) => PRESET_ESSENTIAL.includes(id))
        );
    };
    handle();
    mq.addEventListener?.("change", handle);
    return () => mq.removeEventListener?.("change", handle);
  }, []);


  // Filter visible columns and order: sticky group first (in ordered sequence), then non-sticky (ordered)
  const orderedIds = columnOrder.filter((id) => visibleCols.includes(id));
  // Dynamically determine sticky columns based on divider position (stickyAreaWidth)
  const CHECKBOX_WIDTH = 40;
  let accumulatedWidth = CHECKBOX_WIDTH;
  const stickyIds = [];
  const nonStickyIds = [];
  for (const id of orderedIds) {
    const col = COLUMN_DEFS.find((c) => c.id === id);
    if (!col) continue;
    const colWidth = col.width ?? STICKY_DEFAULT_WIDTH;
    if (accumulatedWidth + colWidth <= stickyAreaWidth) {
      stickyIds.push(id);
      accumulatedWidth += colWidth;
    } else {
      nonStickyIds.push(id);
    }
  }
  const orderedDefs = orderedIds.map((id) => {
    const base = COLUMN_DEFS.find((c) => c.id === id);
    if (!base) return null;
    return { ...base, isSticky: stickyIds.includes(id) };
  }).filter(Boolean);
  const stickyDefs = orderedDefs.filter((c) => c.isSticky);
  const nonStickyDefs = orderedDefs.filter((c) => !c.isSticky);
  const visibleDefs = [...stickyDefs, ...nonStickyDefs];
  // Recalculate sticky positions based on visible sticky columns
  const stickyColWidths = [CHECKBOX_WIDTH]; // checkbox
  const stickyLeftPositions = [0]; // checkbox
  let currentLeft = CHECKBOX_WIDTH; // start after checkbox
  stickyDefs.forEach((col) => {
    const effectiveWidth = col.width ?? STICKY_DEFAULT_WIDTH;
    stickyColWidths.push(effectiveWidth);
    stickyLeftPositions.push(currentLeft);
    currentLeft += effectiveWidth;
  });
  // Total width of visible sticky columns (for divider positioning)
  const totalVisibleStickyWidth = currentLeft;

  // Columns that should NOT be inline editable
  const NON_INLINE_EDIT_IDS = new Set([
    "project_id",
    "customer",
    "group",
    "kwp_ac",
    "project_scheme",
    "module",
    "state",
    // Interactive/computed columns (keep behavior)
    "loan_status",
    "project_status",
    "contact_number", // Make Contact Number non-editable
  ]);

  // Columns with their own override rendering handled inside render()
  const SPECIAL_OVERRIDE_IDS = new Set([
    "expected_sl_month",
    "disbursement_month",
    "bank",
    "bank_contact_details",
    "banker_name",
    "week",
  ]);

  const stickyColsCount = visibleDefs.filter((c) => c.isSticky).length;
  const totalCols = visibleDefs.length + 1; // +1 for checkbox
  
  // Find index of last sticky column for visual separator
  // This helps create a clear boundary between sticky and scrollable columns
  const lastStickyIndex = visibleDefs.reduce((lastIdx, col, idx) => 
    col.isSticky ? idx : lastIdx, -1
  );

  // Drag-and-drop column reordering (keeps sticky group separate from non-sticky)
  const clearDragState = () => setDragState({ activeId: null, overId: null, position: null });

  const reorderColumns = (dragId, targetId, position) => {
    if (!dragId || !targetId || dragId === targetId) return;
    const dragIsSticky = stickyCols.includes(dragId);
    const targetIsSticky = stickyCols.includes(targetId);
    if (dragIsSticky !== targetIsSticky) {
      clearDragState();
      return; // Do not allow cross-group reordering to preserve sticky behavior
    }

    setColumnOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(dragId);
      const to = next.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      const insertAt = position === "before" ? next.indexOf(targetId) : next.indexOf(targetId) + 1;
      next.splice(insertAt, 0, dragId);
      return next;
    });
    clearDragState();
  };

  const handleDragStart = (colId) => (e) => {
    e.dataTransfer.effectAllowed = "move";
    setDragState({ activeId: colId, overId: null, position: null });
  };

  const handleDragOver = (colId, isSticky) => (e) => {
    if (!dragState.activeId) return;
    const activeIsSticky = stickyCols.includes(dragState.activeId);
    if (activeIsSticky !== isSticky) return; // ignore cross-group over
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientX - rect.left < rect.width / 2 ? "before" : "after";
    setDragState((prev) => ({ ...prev, overId: colId, position }));
  };

  const handleDragLeave = () => {
    setDragState((prev) => ({ ...prev, overId: null, position: null }));
  };

  const handleDrop = (colId, isSticky) => (e) => {
    e.preventDefault();
    if (!dragState.activeId) return clearDragState();
    const activeIsSticky = stickyCols.includes(dragState.activeId);
    if (activeIsSticky !== isSticky) return clearDragState();
    reorderColumns(dragState.activeId, colId, dragState.position || "after");
  };

  const handleDragEnd = () => clearDragState();

  // Expose method to parent
  useImperativeHandle(ref, () => ({
    openColumnModal: () => setColModalOpen(true),
  }));

  // ========== END COLUMN VISIBILITY LOGIC ==========

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <Box display={"flex"} justifyContent={"flex-end"} pb={0.5}>
        <Box
          className="SearchAndFilters-tabletUp"
          sx={{
            borderRadius: "sm",
            py: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            width: { xs: "100%", lg: "50%" },
          }}
        >
          <FormControl sx={{ flex: 1 }} size="sm">
            <Input
              size="sm"
              placeholder="Search by Project ID, Customer"
              startDecorator={<SearchIcon />}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </FormControl>
        </Box>
      </Box>

      {/* Table Container */}
      <Sheet
        ref={tableContainerRef}
        className="OrderTableContainer"
        variant="outlined"
        onScroll={handleTableScroll}
        sx={{
          display: { xs: "none", sm: "block" },
          width: "100%",
          borderRadius: "sm",
          maxHeight: "66vh",
          overflow: "auto",
          position: "relative", // For absolute positioning of divider
        }}
      >
        
        {/* Drag Handle with Integrated Hidden Column Badge */}
        <Box
          onMouseDown={handleDividerMouseDown}
          sx={{
            position: "fixed", // Viewport-fixed overlay
            left: (containerRect.left + totalVisibleStickyWidth) + "px",
            top: containerRect.top + "px",
            height: containerRect.height + "px",
            width: "18px", // Wider, user-friendly hit zone
            marginLeft: "-9px", // Center the hit zone over the boundary
            cursor: "col-resize",
            zIndex: 1000,
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "none",
            // Hide until rect available
            ...(containerRect.height <= 0 ? { display: "none" } : {}),
            // No visual vertical line; keep hit-zone invisible
          }}
        >
          {/* Drag Indicator Icon with Badge */}
          <Box
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "16px",
              height: "100%",
              minHeight: "100px",
            }}
          >
            {/* Drag Icon - Always Visible */}
            <DragIndicatorIcon
              sx={{
                fontSize: "14px",
                color: isDraggingDivider ? "#666" : "#999",
                opacity: isDraggingDivider ? 1 : 0.6,
                transition: "color 0.2s ease, opacity 0.2s ease",
                pointerEvents: "none",
              }}
            />
          </Box>
          {/* Hidden Column Badge removed: no longer needed, fixes no-undef error */}
        </Box>
        
        <Box
          component="table"
          sx={{ 
            width: "100%",
            minWidth: "1200px", 
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "neutral.softBg" }}>
              {/* Checkbox column header: sticky on both axes (left + top) */}
              <th
                style={{
                  position: "sticky", 
                  left: 0,
                  top: 0, 
                  background: "#e0e0e0",
                  zIndex: ZINDEX.headerSticky,
                  borderBottom: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "left",
                  fontWeight: "bold",
                  width: `${stickyColWidths[0]}px`,
                  minWidth: `${stickyColWidths[0]}px`,
                  maxWidth: `${stickyColWidths[0]}px`,
                }}
              >
                <Checkbox
                  size="sm"
                  checked={selected?.length === loanData?.length}
                  onChange={handleSelectAll}
                  indeterminate={
                    selected?.length > 0 && selected?.length < loanData?.length
                  }
                />
              </th>

              {/* Dynamic headers based on visible columns */}
              {visibleDefs.map((colDef, index) => {
                const stickyIndex = visibleDefs.slice(0, index + 1).filter(c => c.isSticky).length;
                const isSticky = colDef.isSticky;
                const colWidth = isSticky ? (colDef.width ?? STICKY_DEFAULT_WIDTH) : undefined;
                const leftPos = isSticky ? stickyLeftPositions[stickyIndex] : undefined;
                const isLastSticky = index === lastStickyIndex;
                const isFirstScrollable = !isSticky && index === lastStickyIndex + 1;
                const isDragActive = dragState.activeId === colDef.id;
                const isDragOver = dragState.overId === colDef.id;
                const dragShadow = isDragOver
                  ? (dragState.position === "before"
                      ? "inset 3px 0 0 #3366a3"
                      : "inset -3px 0 0 #3366a3")
                  : undefined;
                
                // Get current filter value from searchParams
                const filterParam = colDef.filterParam;
                let currentFilterValue = undefined;
                
                if (filterParam) {
                  if (colDef.filterType === 'multiselect') {
                    // For multiselect, get all values (can be comma-separated or multiple params)
                    const rawValue = searchParams.get(filterParam);
                    if (rawValue) {
                      currentFilterValue = rawValue.split(',').filter(Boolean);
                    }
                  } else if (colDef.filterType === 'daterange') {
                    // For daterange, construct {from, to} object from separate params
                    const fromParam = `${filterParam}_from`;
                    const toParam = `${filterParam}_to`;
                    const from = searchParams.get(fromParam);
                    const to = searchParams.get(toParam);
                    if (from || to) {
                      currentFilterValue = { from, to };
                    }
                  } else {
                    // For other types (text, select), get single value
                    currentFilterValue = searchParams.get(filterParam);
                  }
                }

                // Check if filter is active for this column
                const isFilterActive = (() => {
                  if (currentFilterValue === undefined || currentFilterValue === null || currentFilterValue === '') {
                    return false;
                  }
                  if (Array.isArray(currentFilterValue) && currentFilterValue.length === 0) {
                    return false;
                  }
                  // For daterange objects, check if at least one property has a value
                  if (colDef.filterType === 'daterange' && typeof currentFilterValue === 'object') {
                    return Boolean(currentFilterValue.from || currentFilterValue.to);
                  }
                  return true;
                })();

                // Handle filter change - update searchParams
                const handleFilterChange = (newValue) => {
                  const nextParams = new URLSearchParams(searchParams);
                  if (!filterParam) return; // No filter param defined
                  
                  // Handle different filter types
                  if (colDef.filterType === 'daterange') {
                    // For daterange, use separate from/to params
                    const fromParam = `${filterParam}_from`;
                    const toParam = `${filterParam}_to`;
                    nextParams.delete(fromParam);
                    nextParams.delete(toParam);
                    
                    if (newValue && typeof newValue === 'object') {
                      if (newValue.from) nextParams.set(fromParam, newValue.from);
                      if (newValue.to) nextParams.set(toParam, newValue.to);
                    }
                  } else {
                    // Clear existing value first
                    nextParams.delete(filterParam);
                    // Special-case: keep bank and bank_name mirrored for consistency
                    if (filterParam === 'bank') {
                      nextParams.delete('bank_name');
                    }
                    
                    // Set new value if provided
                    if (newValue !== undefined && newValue !== null && newValue !== '') {
                      if (Array.isArray(newValue)) {
                        // For multiselect, join values with comma
                        // ⚠️ CRITICAL: Values should already be lowercase from filterOptions
                        if (newValue.length > 0) {
                          const joinedValue = newValue.join(',');
                          nextParams.set(filterParam, joinedValue);
                          nextParams.set('matchMode', 'any');
                        }
                      } else {
                        // For single select/text, set as-is (sidebar single selects only)
                        nextParams.set(filterParam, String(newValue));
                        if (filterParam === 'bank') {
                          nextParams.set('bank_name', String(newValue));
                        }
                      }
                    } else {
                      // No value - clear matchMode only if this is multiselect clearing
                      if (colDef.filterType === 'multiselect') {
                        nextParams.delete('matchMode');
                      }
                      if (filterParam === 'bank') {
                        nextParams.delete('bank_name');
                      }
                    }
                  }
                  
                  nextParams.set('page', '1'); // Reset to first page when filter changes
                  setSearchParams(nextParams);
                };
                
                return (
                  <th
                    key={colDef.id}
                    style={{
                      position: "sticky", // Always sticky vertically; conditionally sticky horizontally
                      left: leftPos, // Moves with horizontal scroll unless sticky column
                      top: 0, // CRITICAL: Always stick to top when scrolling vertically, regardless of horizontal stickiness
                      background: "#e0e0e0", // Always use the original header background color
                      zIndex: isSticky ? ZINDEX.headerSticky : ZINDEX.header,
                      borderBottom: "1px solid #ddd",
                      // Remove moving vertical line from first scrollable column
                      ...(isFirstScrollable && { borderLeft: "none" }),
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: "bold",
                      width: colWidth ? `${colWidth}px` : undefined,
                      minWidth: colWidth ? `${colWidth}px` : "120px",
                      maxWidth: colWidth ? `${colWidth}px` : undefined,
                      whiteSpace: "nowrap",
                      boxShadow: dragShadow,
                      transition: isDragOver ? 'box-shadow 0.2s, opacity 0.2s' : undefined,
                      // Remove background color change on drag over for header
                      ...(isLastSticky && {
                        // Use shadow to suggest boundary; divider line renders the actual boundary
                        boxShadow: "3px 0 5px -2px rgba(0,0,0,0.15)",
                        // Ensure positioned ancestor for badge anchoring
                        position: "sticky",
                      }),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {/* Drag handle - only on the label text, not affecting filter controls */}
                      <span
                        draggable
                        onDragStart={handleDragStart(colDef.id)}
                        onDragOver={handleDragOver(colDef.id, isSticky)}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop(colDef.id, isSticky)}
                        onDragEnd={handleDragEnd}
                        style={{
                          cursor: "grab",
                          opacity: dragState.activeId === colDef.id ? 0.6 : 1,
                          padding: "0px 4px",
                          borderRadius: "4px",
                          userSelect: "none",
                          backgroundColor: dragState.activeId === colDef.id ? "rgba(0,0,0,0.1)" : "transparent",
                          transition: "opacity 0.2s, background-color 0.2s",
                        }}
                      >
                        {colDef.label}
                      </span>
                      {colDef.filterType && (
                        <ColumnFilterPopover
                          columnId={colDef.id}
                          columnLabel={colDef.label}
                          filterType={colDef.filterType}
                          value={currentFilterValue}
                          options={colDef.filterOptions}
                          onChange={handleFilterChange}
                          isActive={isFilterActive}
                          placeholder={colDef.id === "project_id" ? "Search by code (e.g., SOL-123)" : undefined}
                          {...(colDef.filterType === 'list'
                            ? {
                                fetchPage: async ({ page, search, pageSize }) => {
                                  const ft = colDef.listConfig?.filterTypeParam;
                                  try {
                                    const res = await triggerLoanNameSearch(
                                      { search: search || '', page, limit: pageSize, filterType: ft },
                                      true
                                    );
                                    const payload = res?.data || {};
                                    const rows = payload?.data ?? [];
                                    const total = payload?.pagination?.total ?? rows.length;
                                    return { rows, total };
                                  } catch (e) {
                                    return { rows: [], total: 0 };
                                  }
                                },
                                pageSize: colDef.listConfig?.pageSize ?? 7,
                                getItemLabel: colDef.listConfig?.getItemLabel,
                              }
                            : {})}
                        />
                      )}
                    </Box>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={totalCols}
                  style={{ padding: "8px", textAlign: "center" }}
                >
                  <Box
                    sx={{
                      fontStyle: "italic",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CircularProgress size="sm" sx={{ marginBottom: "8px" }} />
                    <Typography fontStyle="italic">Loading...</Typography>
                  </Box>
                </td>
              </tr>
            ) : loanData?.length > 0 ? (
              loanData.map((loan) => {
                return (
                  <tr
                    key={loan._id}
                    style={{
                      cursor: "pointer",
                    }}
                    onDoubleClick={() => {
                      const selected = projectSelections[loan?._id];
                      const targetId = selected?._id || loan?.project_id?._id;
                      if (targetId) {
                        navigate(`/view_loan?project_id=${targetId}`);
                      }
                    }}
                  >
                    {/* checkbox cell */}
                    <td
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "sticky",
                        left: 0,
                        borderBottom: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "left",
                        background: "#fff",
                        zIndex: ZINDEX.checkboxSticky,
                        width: `${stickyColWidths[0]}px`,
                        minWidth: `${stickyColWidths[0]}px`,
                        maxWidth: `${stickyColWidths[0]}px`,
                      }}
                    >
                      <Checkbox
                        size="sm"
                        checked={selected.includes(loan?.project_id?._id)}
                        onChange={() => handleRowSelect(loan?.project_id?._id)}
                      />
                    </td>

                    {/* Dynamic cells based on visible columns */}
                    {visibleDefs.map((colDef, index) => {
                      const stickyIndex = visibleDefs.slice(0, index + 1).filter(c => c.isSticky).length;
                      const isSticky = colDef.isSticky;
                      const colWidth = isSticky ? (colDef.width ?? STICKY_DEFAULT_WIDTH) : undefined;
                      const leftPos = isSticky ? stickyLeftPositions[stickyIndex] : undefined;
                      const isLastSticky = index === lastStickyIndex;
                      
                      return (
                        <td
                          key={colDef.id}
                          onClickCapture={(e) => {
                            // Don't trigger edit mode if clicking on buttons inside the editor
                            if (editingCell?.loanId === loan._id && editingCell?.fieldId === colDef.id) {
                              return; // Allow button clicks to propagate
                            }

                            const isEditable = !NON_INLINE_EDIT_IDS.has(colDef.id) &&
                              colDef.id !== "remarks" &&
                              colDef.id !== "pendency_remarks";

                            if (colDef.id === "remarks") {
                              e.preventDefault(); e.stopPropagation(); openRemarksEdit(loan);
                            } else if (colDef.id === "pendency_remarks") {
                              e.preventDefault(); e.stopPropagation(); openPendencyEdit(loan);
                            } else if (isEditable) {
                              e.preventDefault(); e.stopPropagation(); startInlineEdit(loan, colDef.id);
                            }
                          }}
                          onClick={(e) => {
                            // Don't trigger edit mode if clicking on buttons inside the editor
                            if (editingCell?.loanId === loan._id && editingCell?.fieldId === colDef.id) {
                              return; // Allow button clicks to propagate
                            }

                            const isEditable = !NON_INLINE_EDIT_IDS.has(colDef.id) &&
                              colDef.id !== "remarks" &&
                              colDef.id !== "pendency_remarks";
                            if (isEditable) { e.preventDefault(); e.stopPropagation(); }
                          }}
                          style={{
                            position: isSticky ? "sticky" : "static",
                            left: leftPos,
                            background: "#fff",
                            borderBottom: "1px solid #ddd",
                            // Remove moving vertical line from first scrollable column cells
                            ...(index === lastStickyIndex + 1 && !isSticky ? { borderLeft: "none" } : {}),
                            padding: "10px 8px",
                            zIndex: editingCell?.loanId === loan._id && editingCell?.fieldId === colDef.id && isSticky ? ZINDEX.editorSticky : (isSticky ? ZINDEX.bodySticky : ZINDEX.body),
                            width: colWidth ? `${colWidth}px` : undefined,
                            minWidth: colWidth ? `${colWidth}px` : "120px",
                            maxWidth: colWidth ? `${colWidth}px` : undefined,
                            overflow: editingCell?.loanId === loan._id && editingCell?.fieldId === colDef.id ? "visible" : "hidden",
                            ...((colDef.id === "remarks" || colDef.id === "pendency_remarks") && { cursor: "pointer" }),
                            ...((!NON_INLINE_EDIT_IDS.has(colDef.id) && colDef.id !== "remarks" && colDef.id !== "pendency_remarks") && { cursor: "text" }),
                            ...(isLastSticky && {
                              // Use shadow to indicate boundary; divider draws the exact line
                              boxShadow: "3px 0 5px -2px rgba(0,0,0,0.15)",
                            }),
                          }}
                        >
                          {editingCell?.loanId === loan._id && editingCell?.fieldId === colDef.id ? (
                            <Input
                              size="sm"
                              variant="plain"
                              autoFocus
                              value={editingCell.value}
                              type={
                                colDef.id === "expected_sl_month" || colDef.id === "disbursement_month"
                                  ? "date"
                                  : "text"
                              }
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  saveInlineEdit(loan);
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  cancelInlineEdit();
                                }
                              }}
                              onBlur={() => {
                                // Store timeout ref so we can cancel it if switching cells
                                blurTimeoutRef.current = setTimeout(() => {
                                  blurTimeoutRef.current = null;
                                  // Only cancel if still editing this exact cell
                                  if (editingCell?.loanId === loan._id && editingCell?.fieldId === colDef.id) {
                                    cancelInlineEdit();
                                  }
                                }, 100);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                width: "100%",
                                backgroundColor: "#f5f7fa",
                                borderRadius: "3px",
                                transition: "all 0.15s ease-out",
                                "--Input-minHeight": "1.5rem",
                                "& input": {
                                  padding: "4px 6px !important",
                                  fontSize: "0.875rem",
                                  fontFamily: "inherit",
                                  height: "1.5rem",
                                  lineHeight: "1.5rem",
                                  outline: "none",
                                },
                                "& input::selection": {
                                  backgroundColor: "rgba(66, 153, 225, 0.25)",
                                },
                                boxShadow: "inset 0 0 0 1px #cbd5e0",
                                "&:focus-within": {
                                  backgroundColor: "#fff",
                                  boxShadow: "inset 0 0 0 2px #4299e1",
                                },
                              }}
                            />
                          ) : (colDef.id === "remarks" || colDef.id === "pendency_remarks") ? (
                            // Comments cell wrapper: hover effect communicates interactivity
                            <Box
                              sx={{
                                borderRadius: "sm",
                                transition: "box-shadow 0.15s ease, background-color 0.15s ease",
                                px: 0.5,
                                py: 0.25,
                                maxHeight: "120px",
                                overflowY: "auto",
                                minWidth:"200px",
                                wordBreak: "break-word",           
                                '&:hover': {
                                  boxShadow: "inset 0 0 0 1px var(--joy-palette-neutral-outlinedBorder)",
                                  backgroundColor: "var(--joy-palette-neutral-50)",
                                },
                              }}
                            >
                              {colDef.render(loan)}
                            </Box>
                          ) : (
                            (() => {
                              const key = inlineKey(loan?._id, colDef.id);
                              const hasOwnOverride = SPECIAL_OVERRIDE_IDS.has(colDef.id);
                              const override = inlineOverrides[key];
                              if (!hasOwnOverride && override !== undefined) {
                                return (
                                  <Typography level="body-sm">{String(override || "-")}</Typography>
                                );
                              }
                              return colDef.render(loan);
                            })()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={totalCols}
                  style={{ padding: "40px 8px", textAlign: "center" }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 4,
                    }}
                  >
                    <img
                      src={NoData}
                      alt="No data"
                      style={{ width: 50, height: 50, marginBottom: 8 }}
                    />
                    <Typography fontStyle="italic">
                      No Loan Projects Found
                    </Typography>
                  </Box>
                </td>
              </tr>
            )}
          </tbody>
        </Box>
      </Sheet>

      {/* Pagination */}
      <Box
        className="Pagination-laptopUp"
        sx={{
          pt: 0.5,
          gap: 1,
          [`& .${iconButtonClasses.root}`]: { borderRadius: "50%" },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
        }}
      >
        <Button
          size="sm"
          variant="outlined"
          color="neutral"
          startDecorator={<KeyboardArrowLeftIcon />}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          sx={{
            minHeight: 36,
            fontWeight: 600,
            transition: "all 0.2s ease",
            "&:hover:not(:disabled)": {
              bgcolor: "primary.softBg",
              borderColor: "primary.outlinedBorder",
              color: "primary.solidColor",
              transform: "translateX(-2px)",
              boxShadow: "sm",
            },
          }}
        >
          Previous
        </Button>

        <Box sx={{ 
          fontSize: "14px", 
          fontWeight: 500, 
          color: "text.secondary",
          px: 2,
        }}>
          Showing {loanData?.length} results
        </Box>

        <Box
          sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 1 }}
        >
          {getPaginationRange().map((page, idx) =>
            page === "..." ? (
              <Box key={`ellipsis-${idx}`} sx={{ px: 1 }}>
                ...
              </Box>
            ) : (
              <IconButton
                key={page}
                size="sm"
                variant={page === currentPage ? "contained" : "outlined"}
                color="neutral"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </IconButton>
            )
          )}
        </Box>

        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ padding: "8px 16px" }}
        >
          <Select
            value={rowsPerPage}
            onChange={(e, newValue) => handleRowsPerPageChange(newValue)}
            size="sm"
            variant="outlined"
            sx={{ 
              minWidth: 80, 
              borderRadius: "md", 
              boxShadow: "sm",
              fontWeight: 600,
              "&:hover": {
                bgcolor: "background.level1",
                borderColor: "primary.outlinedBorder",
              },
            }}
            slotProps={{
              listbox: {
                sx: {
                  maxHeight: 240,
                  overflow: "auto",
                  boxShadow: "lg",
                  borderRadius: "md",
                  p: 0.5,
                },
              },
            }}
          >
            {[10, 25, 50, 100].map((value) => (
              <Option 
                key={value} 
                value={value}
                sx={{
                  py: 1,
                  px: 1.5,
                  fontSize: "14px",
                  fontWeight: 500,
                  borderRadius: "sm",
                  "&:hover": {
                    bgcolor: "primary.softBg",
                  },
                  "&[aria-selected='true']": {
                    bgcolor: "primary.softBg",
                    fontWeight: 600,
                  },
                }}
              >
                {value}
              </Option>
            ))}
          </Select>
        </Box>

        <Button
          size="sm"
          variant="outlined"
          color="neutral"
          endDecorator={<KeyboardArrowRightIcon />}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          sx={{
            minHeight: 36,
            fontWeight: 600,
            transition: "all 0.2s ease",
            "&:hover:not(:disabled)": {
              bgcolor: "primary.softBg",
              borderColor: "primary.outlinedBorder",
              color: "primary.solidColor",
              transform: "translateX(2px)",
              boxShadow: "sm",
            },
          }}
        >
          Next
        </Button>
      </Box>

      {/* Project Picker Modal */}
      <SearchPickerModal
        open={projectPickerOpen}
        onClose={() => {
          closeProjectPicker();
        }}
        onPick={applyProjectSelection}
        title="Select Project"
        columns={[
          { key: "code", label: "Project Code", width: 180 },
          { key: "customer", label: "Customer Name", width: 260 },
        ]}
        fetchPage={fetchProjectPage}
        searchKey="code"
        pageSize={10}
        rowKey="_id"
      />

      {/* ---------- Status Update Modal ---------- */}
      <Modal open={statusModalOpen} onClose={closeStatusModal} sx={{ zIndex: 10000 }}>
        <ModalDialog
          aria-labelledby="loan-status-title"
          variant="outlined"
          sx={{ borderRadius: "lg", minWidth: 420, maxWidth: "90vw", zIndex: 10001 }}
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
              size="md"
              sx={{
                minHeight: 42,
                fontSize: "14px",
                fontWeight: 500,
                "&:hover": {
                  bgcolor: "background.level1",
                  borderColor: "primary.outlinedBorder",
                },
              }}
              slotProps={{
                listbox: {
                  sx: {
                    zIndex: 15010,
                    maxHeight: 320,
                    overflow: "auto",
                    boxShadow: "lg",
                    borderRadius: "md",
                    p: 0.5,
                  },
                },
                popper: {
                  sx: { zIndex: 15010 },
                  placement: "bottom-start",
                  modifiers: [
                    {
                      name: "offset",
                      options: { offset: [0, 4] },
                    },
                  ],
                },
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <Option
                  key={s}
                  value={s}
                  sx={{
                    py: 1.25,
                    px: 1.5,
                    borderRadius: "sm",
                    fontSize: "14px",
                    fontWeight: 500,
                    minHeight: 40,
                    "&:hover": {
                      bgcolor: "primary.softBg",
                    },
                    "&[aria-selected='true']": {
                      bgcolor: "primary.softBg",
                      fontWeight: 600,
                    },
                  }}
                >
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
              disabled={!selectedLoan || !nextStatus}
            >
              Save
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* Remarks Edit Modal */}
      <Modal open={isRemarksModalOpen} onClose={closeRemarksEdit} sx={{ backdropFilter: "blur(2px)", zIndex: 10000 }}>
        <ModalDialog
          aria-labelledby="loan-remarks-edit-title"
          variant="outlined"
          sx={{ borderRadius: "lg", width: { xs: "90vw", sm: 500 }, maxWidth: 500, zIndex: 10001 }}
        >
          <ModalClose />
          <DialogTitle id="loan-remarks-edit-title">Edit Remarks</DialogTitle>

          <Box sx={{ display: "grid", gap: 1.5 }}>
            <Textarea
              autoFocus
              minRows={4}
              placeholder="Enter remarks"
              value={remarksText}
              onChange={(e) => setRemarksText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  saveRemarksEdit();
                }
              }}
            />
          </Box>

          <DialogActions>
            <Button variant="plain" onClick={closeRemarksEdit} disabled={savingRemarksId === remarksTargetLoan?._id}>
              Cancel
            </Button>
            <Button onClick={saveRemarksEdit} loading={savingRemarksId === remarksTargetLoan?._id}>Save Remarks</Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* Pendency Remarks Edit Modal */}
      <Modal open={isPendencyModalOpen} onClose={closePendencyEdit} sx={{ backdropFilter: "blur(2px)", zIndex: 10000 }}>
        <ModalDialog
          aria-labelledby="loan-pendency-edit-title"
          variant="outlined"
          sx={{ borderRadius: "lg", width: { xs: "90vw", sm: 500 }, maxWidth: 500, zIndex: 10001 }}
        >
          <ModalClose />
          <DialogTitle id="loan-pendency-edit-title">Edit Pendency Remarks</DialogTitle>

          <Box sx={{ display: "grid", gap: 1.5 }}>
            <Textarea
              autoFocus
              minRows={4}
              placeholder="Enter pendency remarks"
              value={pendencyText}
              onChange={(e) => setPendencyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  savePendencyEdit();
                }
              }}
            />
          </Box>

          <DialogActions>
            <Button variant="plain" onClick={closePendencyEdit} disabled={savingPendencyId === pendencyTargetLoan?._id}>
              Cancel
            </Button>
            <Button onClick={savePendencyEdit} loading={savingPendencyId === pendencyTargetLoan?._id}>Save Pendency</Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* ---------- Column Visibility Modal ---------- */}
      <Modal open={colModalOpen} onClose={() => setColModalOpen(false)} sx={{ zIndex: 10000 }}>
        <ModalDialog sx={{ width: 640, maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', zIndex: 10001 }}>
          <ModalClose />
          <Typography level="title-lg" sx={{ mb: 2, fontWeight: 600 }}>
            Customize Columns
          </Typography>

          {/* Presets */}
          <Box sx={{ mb: 2 }}>
            <Typography level="body-sm" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
              Quick Presets
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              <Chip 
                onClick={() => applyPreset(PRESET_ESSENTIAL)} 
                variant="soft" 
                color="primary"
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'primary.softHoverBg' } }}
              >
                Essential
              </Chip>
              <Chip 
                onClick={() => applyPreset(PRESET_FINANCE)} 
                variant="soft" 
                color="success"
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'success.softHoverBg' } }}
              >
                Finance
              </Chip>
              <Chip 
                onClick={() => applyPreset(PRESET_LOAN_TRACKING)} 
                variant="soft" 
                color="warning"
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'warning.softHoverBg' } }}
              >
                Loan Tracking
              </Chip>
              <Chip 
                onClick={() => applyPreset(PRESET_ALL)} 
                variant="soft" 
                color="neutral"
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'neutral.softHoverBg' } }}
              >
                Show All
              </Chip>
            </Stack>
          </Box>

          {/* Search */}
          <Box sx={{ mb: 2 }}>
            <Input
              size="sm"
              placeholder="Search columns..."
              value={columnSearchQuery}
              onChange={(e) => setColumnSearchQuery(e.target.value)}
              sx={{ width: '100%' }}
            />
          </Box>

          {/* Sticky warning */}
          {stickyCols.length > 5 && (
            <Alert color="warning" variant="soft" sx={{ mb: 2 }}>
              You have pinned more than 5 columns. Pinned columns remain visible while scrolling and may exceed the available sheet width.
            </Alert>
          )}

          {/* Column List */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 1, px: 1 }}>
              <Typography level="body-xs" sx={{ fontWeight: 600, color: 'text.secondary', flex: 1 }}>
                COLUMN NAME
              </Typography>
              <Typography level="body-xs" sx={{ fontWeight: 600, color: 'text.secondary', width: 80, textAlign: 'center' }}>
                VISIBLE
              </Typography>
              <Typography level="body-xs" sx={{ fontWeight: 600, color: 'text.secondary', width: 80, textAlign: 'center' }}>
                PINNED
              </Typography>
            </Stack>
          </Box>

          <Sheet
            variant="outlined"
            sx={{
              borderRadius: 'md',
              overflow: 'auto',
              flex: 1,
              minHeight: 0,
            }}
          >
            <Stack spacing={0}>
              {COLUMN_DEFS
                .filter((col) => 
                  columnSearchQuery.trim() === '' || 
                  col.label.toLowerCase().includes(columnSearchQuery.toLowerCase())
                )
                .map((col, index) => {
                  const isVisible = visibleCols.includes(col.id);
                  const isSticky = stickyCols.includes(col.id);
                  return (
                    <Box
                      key={col.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        px: 2,
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                        '&:hover': {
                          bgcolor: 'background.level1',
                        },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <Typography level="body-sm" sx={{ flex: 1, fontWeight: isSticky ? 600 : 400 }}>
                        {col.label}
                        {isSticky && (
                          <Chip size="sm" variant="soft" color="primary" sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}>
                            Pinned
                          </Chip>
                        )}
                      </Typography>
                      <Box sx={{ width: 80, display: 'flex', justifyContent: 'center' }}>
                        <Checkbox
                          size="sm"
                          checked={isVisible}
                          onChange={(e) => {
                            setVisibleCols((prev) =>
                              e.target.checked
                                ? [...prev, col.id]
                                : prev.filter((x) => x !== col.id)
                            );
                            // If making invisible, also remove from sticky
                            if (!e.target.checked && isSticky) {
                              setStickyCols((prev) => prev.filter((x) => x !== col.id));
                            }
                          }}
                        />
                      </Box>
                      <Box sx={{ width: 80, display: 'flex', justifyContent: 'center' }}>
                        <Checkbox
                          size="sm"
                          checked={isSticky}
                          disabled={!isVisible}
                          onChange={() => toggleSticky(col.id)}
                          color="primary"
                          variant="soft"
                        />
                      </Box>
                    </Box>
                  );
                })}
            </Stack>
          </Sheet>

          {/* Info Footer */}
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.level1', borderRadius: 'sm' }}>
            <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
              💡 <strong>Tip:</strong> Sticky columns will always appear on the left and remain visible while scrolling horizontally.
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            sx={{ mt: 2 }}
          >
            <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
              {visibleCols.length} of {COLUMN_DEFS.length} columns visible
              {stickyCols.length > 0 && ` • ${stickyCols.length} pinned`}
            </Typography>
            <Button
              size="sm"
              variant="solid"
              onClick={() => setColModalOpen(false)}
              sx={{ minWidth: 100 }}
            >
              Done
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
});

export default AllLoan;