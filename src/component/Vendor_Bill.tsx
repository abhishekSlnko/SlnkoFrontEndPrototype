import { keyframes } from "@emotion/react";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SearchIcon from "@mui/icons-material/Search";
import {
  Chip,
  CircularProgress,
  Modal,
  ModalClose,
  ModalDialog,
  Option,
  Select,
  Sheet,
  Stack,
  Textarea,
  Tooltip,
} from "@mui/joy";
import Checkbox from "@mui/joy/Checkbox";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import FormControl from "@mui/joy/FormControl";
import IconButton, { iconButtonClasses } from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import Typography from "@mui/joy/Typography";
import CloseIcon from "@mui/icons-material/Close";
import { useSnackbar } from "notistack";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useExportBillsMutation,
  useGetAllBillsQuery,
} from "../redux/billsSlice";
import Axios from "../utils/Axios";
import dayjs from "dayjs";

const VendorBillSummary = forwardRef((props, ref) => {
  const { onSelectionChange, setSelected } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const initialPage = parseInt(searchParams.get("page")) || 1;
  const initialPageSize = parseInt(searchParams.get("pageSize")) || 10;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPageSize);

  const po_number = searchParams.get("po_number") || "";
  const dateFilterEnd = searchParams.get("to") || "";
  const dateFilterFrom = searchParams.get("from") || "";
  const selectStatus = searchParams.get("status") || "";
  const bill_received_status = searchParams.get("bill_received_status") || "";
  const [selectedIds, setSelectedIds] = useState([]);

  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = localStorage.getItem("userDetails");
    setUser(userData ? JSON.parse(userData) : null);
  }, []);

  const { data: getBill = {}, isLoading ,refetch } = useGetAllBillsQuery({
    page: currentPage,
    pageSize: perPage,
    po_number: po_number,
    search: searchQuery,
    dateFrom: dateFilterFrom,
    dateEnd: dateFilterEnd,
    status: selectStatus,
    bill_received_status,
  });

  useEffect(() => {
    refetch();
  }, [currentPage, perPage, searchQuery, po_number, dateFilterFrom, dateFilterEnd, selectStatus, refetch,bill_received_status,]);
  


  useEffect(() => {
    onSelectionChange?.(selectedIds.length, selectedIds);
  }, [selectedIds, onSelectionChange]);

  const { total = 0, page = 0, pageSize = 0, totalPages = 0 } = getBill;

  const bills = useMemo(
    () => (Array.isArray(getBill?.data) ? getBill.data : []),
    [getBill]
  );

  const [exportBills, { isLoading: isExporting }] = useExportBillsMutation();

  const handleExport = async (isExportAll) => {
    try {
      if (isExportAll) {
        const status = searchParams.get("status") || "";
        const from = searchParams.get("from") || "";
        const to = searchParams.get("to") || "";

        const res = await exportBills({
          status,
          from,
          to,
          exportAll: isExportAll,
        }).unwrap();

        const url = URL.createObjectURL(res);
        const link = document.createElement("a");
        link.href = url;
        link.download = "bills_export.csv";
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
      const res = await exportBills({ Ids: selectedIds }).unwrap();

      const url = URL.createObjectURL(res);
      const link = document.createElement("a");
      link.href = url;
      link.download = "bills_export.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export bills");
    }
  };

  useImperativeHandle(ref, () => ({
    handleExport,
    selectedIds,
    openColumnModal: () => setColModalOpen(true),
  }));

 useEffect(() => {
    setSelectedIds([]);
    setSelected?.([]);
  }, [searchQuery, po_number, dateFilterFrom, dateFilterEnd, selectStatus,bill_received_status]);

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const handlePageChange = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(pageNum));
        return next;
      });
    }
  };

  const handlePerPageChange = (newValue) => {
    setPerPage(newValue);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      next.set("pageSize", String(newValue));
      return next;
    });
  };

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

  const allIdsOnPage = useMemo(
    () => bills.map((b) => b._id).filter(Boolean),
    [bills]
  );

  const isAllSelected =
    allIdsOnPage.length > 0 &&
    allIdsOnPage.every((id) => selectedIds.includes(id));

  const isIndeterminate =
    selectedIds.length > 0 && !isAllSelected && allIdsOnPage.some((id) => selectedIds.includes(id));

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds((prev) => {
        const merged = new Set(prev);
        allIdsOnPage.forEach((id) => merged.add(id));
        const next = Array.from(merged);
        setSelected?.(next);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = prev.filter((id) => !allIdsOnPage.includes(id));
        setSelected?.(next);
        return next;
      });
    }
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      setSelected?.(next);
      return next;
    });
  };

  // Helpers
  const capitalize = (s = "") =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const fmtINR = (n) => (isFinite(n) ? `₹${Number(n).toFixed(2)}` : "₹0.00");
  const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-");

 const BillingStatusChip = ({ status, balance }) => {
  const normalized = String(status || "").trim().toLowerCase();

  const isFullyBilled = normalized === "fully billed";
  const isWaitingBills = normalized === "partially billed";
  const isBillPending = normalized === "bill pending";

  let label = status || "—";

  if (isFullyBilled) {
    label = "Fully Billed";
  } else if (isWaitingBills) {
    label = balance != null ? `${balance} - Partially Billed` : "Partially Billed";
  } else if (isBillPending) {
    label = "Bill Pending";
  }

  const icon = isFullyBilled ? (
    <CheckRoundedIcon />
  ) : isWaitingBills || isBillPending ? (
    <AutorenewRoundedIcon />
  ) : null;

  const color = isFullyBilled
    ? "success"
    : isWaitingBills || isBillPending
    ? "warning"
    : "neutral";

  return (
    <Chip variant="soft" size="sm" startDecorator={icon} color={color}>
      {label}
    </Chip>
  );
};


const BillAcceptance = ({
  pre_bill_value,
  billNumber,
  poNumber,
  approved_by_name,
  rejected_by_name,
  rejectionRemarks,
  billReceivedStatus,
  approved_by,
  currentUser,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  const normalizedStatus = (billReceivedStatus || "").toLowerCase();

  const canTakeAction = useMemo(() => {
    if (!currentUser) return false;

    const rawRole = currentUser.role || "";
    const rawDept = currentUser.department || "";

    const role = String(rawRole).toLowerCase();
    const dept = String(rawDept);

    const isSuperAdmin =
      role.includes("superadmin") && role.includes("superadmin");
    const isDeptAdmin =
      role.includes("department") && role.includes("admin");
    const isAccountsDept = dept === "Accounts";

    return isSuperAdmin || isDeptAdmin || isAccountsDept;
  }, [currentUser]);

  const [isAccepted, setIsAccepted] = useState(normalizedStatus === "approved");
  const [isRejected, setIsRejected] = useState(normalizedStatus === "rejected");

  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [openRemarksDialog, setOpenRemarksDialog] = useState(false);


  const formatBillValue = (value) => {
    if (value == null || value === "") return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return num.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  };

  const handleAcceptance = async () => {
    if (!canTakeAction) return;
    if (loading || isAccepted) return;
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token found");

      const payload = {
        po_number: poNumber,
        bill_number: billNumber,
        bill_received: "approved",
        remarks: "",
      };

      const res = await Axios.put("/accepted-by", payload, {
        headers: { "x-auth-token": token },
      });

      if (res.status === 200) {
        setIsAccepted(true);
        setIsRejected(false);
        enqueueSnackbar("Bill approved successfully", { variant: "success" });
      } else {
        enqueueSnackbar("Failed to approve the bill. Please try again.", {
          variant: "error",
        });
      }
    } catch (err) {
      enqueueSnackbar("Something went wrong. Please try again.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    if (!canTakeAction) return;
    setOpenRemarksDialog(true);
  };

  const handleSubmitRemarks = async () => {
    if (!canTakeAction) return;

    if (!remarks.trim()) {
      enqueueSnackbar("Remarks are required for rejection.", {
        variant: "warning",
      });
      return;
    }

    await handleRejection();
  };

  const handleRejection = async () => {
    if (!canTakeAction) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token found");

      const payload = {
        po_number: poNumber,
        bill_number: billNumber,
        bill_received: "rejected",
        remarks: remarks,
      };

      const res = await Axios.put("/accepted-by", payload, {
        headers: { "x-auth-token": token },
      });

      if (res.status === 200) {
        setIsRejected(true);
        setIsAccepted(false);
        enqueueSnackbar("Bill rejected successfully", { variant: "error" });
        setOpenRemarksDialog(false);
      } else {
        enqueueSnackbar("Failed to reject the bill. Please try again.", {
          variant: "error",
        });
      }
    } catch (err) {
      enqueueSnackbar("Something went wrong. Please try again.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenRemarksDialog(false);
  };

  const renderPendingStatusChip = () => (
    <Chip
      variant="soft"
      color="neutral"
      sx={{
        fontSize: "14px",
      }}
    >
      Pending
    </Chip>
  );

  const renderApprovedTooltipContent = () => (
    <Box sx={{ p: 0.5, }}>
      <Typography level="body-xs">
        <strong>Approved by:</strong> {approved_by_name || approved_by || "Unknown"}
      </Typography>
    </Box>
  );


  const renderRejectedTooltipContent = () => (
    <Box sx={{ p: 0.5 }}>
      <Typography level="body-xs">
        <strong>Bill Value:</strong> {formatBillValue(pre_bill_value)}
      </Typography>
      <Typography level="body-xs">
        <strong>Rejected by:</strong> {rejected_by_name || "Unknown"}
      </Typography>
      <Typography level="body-xs">
        <strong>Remarks:</strong> {rejectionRemarks || "-"}
      </Typography>
    </Box>
  );


  const renderActionTooltipContent = (action) => (
    <Box sx={{ p: 0.5 }}>
      <Typography level="body-xs">
        <strong>Action:</strong>{" "}
        {action === "approve" ? "Approve Bill" : "Reject Bill"}
      </Typography>
      <Typography level="body-xs">
        <strong>Bill Value:</strong> {formatBillValue(pre_bill_value)}
      </Typography>
      {billNumber && (
        <Typography level="body-xs">
          <strong>Bill No:</strong> {billNumber}
        </Typography>
      )}
      {poNumber && (
        <Typography level="body-xs">
          <strong>PO No:</strong> {poNumber}
        </Typography>
      )}
    </Box>
  );

  return (
    <div>
      {/* Approved */}
      {isAccepted ? (
        <Tooltip title={renderApprovedTooltipContent()} placement="top" sx={{backgroundColor:"#ffffff"}}>
          <Chip
            variant="solid"
            color="success"
            sx={{
              cursor: "help",
              fontSize: "14px",
            }}
          >
            Approved
          </Chip>
        </Tooltip>
      ) : isRejected ? (
        // Rejected
        <Tooltip title={renderRejectedTooltipContent()} placement="top" sx={{backgroundColor:"#ffffff"}}>
          <Chip
            variant="solid"
            color="danger"
            sx={{
              cursor: "help",
              fontSize: "14px",
            }}
          >
            Rejected
          </Chip>
        </Tooltip>
      ) : (
        // Pending case
        <div>
          {canTakeAction ? (
            <>
              {!isAccepted && (
                <Tooltip
                  title={renderActionTooltipContent("approve")}
                  placement="top"
                  sx={{backgroundColor:"#ffffff"}}
                >
                  <span>
                    {/* span wrapper so tooltip works on disabled button */}
                    <Button
                      variant="soft"
                      color="success"
                      onClick={handleAcceptance}
                      size="sm"
                      disabled={loading || isAccepted}
                      sx={{
                        boxShadow: "0 2px 6px rgba(0, 128, 0, 0.2)",
                        transition: "all .2s",
                        "&:hover": {
                          transform: "scale(1.1)",
                          boxShadow: "0 4px 10px rgba(0, 128, 0, 0.3)",
                        },
                        opacity: loading || isAccepted ? 0.7 : 1,
                        pointerEvents: loading || isAccepted ? "none" : "auto",
                        mr: 1,
                      }}
                    >
                      <CheckRoundedIcon />
                    </Button>
                  </span>
                </Tooltip>
              )}

              {!isRejected && (
                <Tooltip
                  title={renderActionTooltipContent("reject")}
                  placement="top"
                  sx={{backgroundColor:"#ffffff"}}
                >
                  <span>
                    <IconButton
                      variant="soft"
                      color="error"
                      onClick={handleReject}
                      size="sm"
                      disabled={loading || isRejected}
                      sx={{
                        boxShadow: "0 2px 6px rgba(255, 0, 0, 0.2)",
                        transition: "all .2s",
                        "&:hover": {
                          transform: "scale(1.1)",
                          boxShadow: "0 4px 10px rgba(255, 0, 0, 0.3)",
                        },
                        opacity: loading || isRejected ? 0.7 : 1,
                        pointerEvents: loading || isRejected ? "none" : "auto",
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </>
          ) : (
            renderPendingStatusChip()
          )}
        </div>
      )}

      {/* Remarks Modal */}
      <Modal open={openRemarksDialog} onClose={handleCloseDialog}>
        <Sheet
          sx={{
            maxWidth: 500,
            width: "100%",
            margin: "0 auto",
            borderRadius: "16px",
            padding: "24px",
            backgroundColor: "#fff",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
          }}
        >
          <Typography
            level="h6"
            sx={{ fontWeight: "600", color: "#003366", mb: 2 }}
          >
            Rejection Remarks
          </Typography>
          <Textarea
            fullWidth
            minRows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter your rejection remarks"
            sx={{
              background: "#f7f7f7",
              borderRadius: "8px",
              padding: "8px",
              fontSize: "14px",
            }}
          />
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Button variant="outlined" color="neutral" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="danger"
              onClick={handleSubmitRemarks}
              disabled={loading}
            >
              Submit
            </Button>
          </Box>
        </Sheet>
      </Modal>
    </div>
  );
};


  const downloadFile = (url, filename = "file") => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadAttachment = (att) => {
    if (!att) return;
    const url = att.attachment_url || "";
    const name = att.attachment_name || "Attachment";
    if (!url) return;
    downloadFile(url, name);
  };

  const LS_KEY = "billTable.columns.v1";
  const PRESET_ESSENTIAL = [
    "bill_no",
    "bill_date",
    "bill_value",
    "po_no",
    "vendor",
    "po_status",
    "attachments",
  ];
  const PRESET_FINANCE = [
    "bill_no",
    "bill_date",
    "bill_value",
    "total_billed",
    "po_value",
    "po_status",
    "created_on",
  ];
  const PRESET_LOGISTICS = [
    "bill_no",
    "po_no",
    "vendor",
    "delivery_status",
    "attachments",
    "created_on",
  ];

  const COLUMN_DEFS = [
    {
      id: "bill_no",
      label: "Bill No.",
      render: (bill) => (
        <Chip
          variant="outlined"
          color="primary"
          sx={{ cursor: "pointer" }}
          onClick={() => navigate(`/add_bill?mode=edit&_id=${bill._id}`)}
        >
          {bill.bill_no}
        </Chip>
      ),
    },
    {
      id: "bill_date",
      label: "Bill Date",
      render: (b) => fmtDate(b.bill_date),
    },
    {
      id: "bill_value",
      label: "Bill Value",
      render: (b) => fmtINR(b.bill_value),
    },
    {
      id: "total_billed",
      label: "Total Billed",
      render: (b) => fmtINR(b.total_billed),
    },
    {
      id: "category",
      label: "Category",
      render: (bill) => {
        if (Array.isArray(bill.item) && bill.item.length) {
          const unique = [
            ...new Set(
              bill.item.map((it) => it?.category_name).filter(Boolean)
            ),
          ];
          const first = unique[0];
          const remaining = unique.slice(1);
          return (
            <>
              {first || "-"}
              {remaining.length > 0 && (
                <Tooltip title={remaining.join(", ")} arrow>
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      px: 1,
                      borderRadius: "50%",
                      backgroundColor: "primary.solidBg",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 500,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "22px",
                      height: "22px",
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    +{remaining.length}
                  </Box>
                </Tooltip>
              )}
            </>
          );
        }
        return bill.item?.category_name || "-";
      },
    },
    {
      id: "project_id",
      label: "Project ID",
      render: (b) => b.project_id || "-",
    },
    {
      id: "po_no",
      label: "PO No.",
      render: (b) => b.po_no || "-",
    },
    {
      id: "vendor",
      label: "Vendor",
      render: (b) => b.vendor || "-",
    },
    {
      id: "po_value",
      label: "PO Value",
      render: (b) => fmtINR(b.po_value || 0),
    },
    {
      id: "po_status",
      label: "PO Status",
      render: (b) => (
        <BillingStatusChip
          status={b.po_status}
          balance={(
            Number(b.po_value || 0) - Number(b.total_billed || 0)
          ).toFixed(2)}
        />
      ),
    },
    {
      id: "delivery_status",
      label: "Delivery Status",
      render: (b) => (
        <Chip
          size="sm"
          variant={b.delivery_status === "delivered" ? "solid" : "soft"}
          color={b.delivery_status === "delivered" ? "success" : "neutral"}
        >
          {b.delivery_status || "-"}
        </Chip>
      ),
    },
{
  id: "attachments",
  label: "Attachments",
  render: (bill) =>
    Array.isArray(bill.attachments) && bill.attachments.length ? (
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        {bill.attachments.slice(0, 3).map((att, i) => (
          <Chip
            key={att._id || `${bill._id}-att-${i}`}
            size="sm"
            variant="soft"
            color="primary"
            onClick={() => downloadAttachment(att)}
            sx={{
              cursor: "pointer",
              maxWidth: 200,
              "& .MuiChip-label": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            }}
          >
            {att.attachment_name || "Attachment"}
          </Chip>
        ))}

        {bill.attachments.length > 3 && (() => {
          const extraAttachments = bill.attachments.slice(3);
          return (
            <Tooltip
              arrow
              placement="top"
           sx={{backgroundColor:"#ffffff"}}
              disableInteractive={false}
              title={
                <Box sx={{ maxWidth: 260 }}>
                  {extraAttachments.map((att, idx) => (
                    <Typography
                      key={att._id || `${bill._id}-extra-${idx}`}
                      level="body-xs"
                      component="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        downloadAttachment(att);
                      }}
                      sx={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        color: "var(--joy-palette-primary-600)",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      {att.attachment_name || "Attachment"}
                    </Typography>
                  ))}
                </Box>
              }
            >
              <Chip
                size="sm"
                variant="soft"
                color="neutral"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadAttachment(extraAttachments[0]);
                }}
                sx={{ cursor: "pointer" }}
              >
                +{extraAttachments.length} more
              </Chip>
            </Tooltip>
          );
        })()}
      </Box>
    ) : (
      "—"
    ),
}
,
    {
      id: "received",
      label: "Received",
      render: (b) => (
        <BillAcceptance
          billNumber={b.bill_no || []}
          poNumber={b.po_no || []}
          approved_by_name={b.approved_by_name}
         rejected_by_name={b.rejected_by_name}
         rejectionRemarks={b?.bill_received?.remarks}
         billReceivedStatus={b?.bill_received?.status}
         approved_by={b.approved_by}
         currentUser={user}
         pre_bill_value={b.pre_bill_value}
        />
      ),
    },
    {
      id: "created_on",
      label: "Created On",
      render: (b) => fmtDate(b.created_on),
    },
  ];

  const PRESET_ALL = COLUMN_DEFS.map((c) => c.id);

  const loadVisibility = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) && arr.length ? arr : PRESET_ESSENTIAL;
      }
    } catch {}
    return PRESET_ESSENTIAL;
  };

  const [visibleCols, setVisibleCols] = useState(loadVisibility());
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(visibleCols));
  }, [visibleCols]);

  const applyPreset = (ids) => setVisibleCols(ids);

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

  const [colModalOpen, setColModalOpen] = useState(false);

  const visibleDefs = COLUMN_DEFS.filter((c) => visibleCols.includes(c.id));
  const dynamicColSpan = 1 + visibleDefs.length;

  // 🔢 Odoo-style page totals for current page
  const pageTotals = useMemo(
    () =>
      bills.reduce(
        (acc, b) => {
          acc.billValue += Number(b?.bill_value) || 0;
          acc.totalBilled += Number(b?.total_billed) || 0;
          acc.poValue += Number(b?.po_value) || 0;
          return acc;
        },
        { billValue: 0, totalBilled: 0, poValue: 0 }
      ),
    [bills]
  );

  return (
    <Box
      sx={{
        ml: { lg: "var(--Sidebar-width)" },
        px: "0px",
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
      }}
    >
      {/* Search + Columns */}
      <Box
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
        pb={0.5}
        flexWrap="wrap"
        gap={1}
      >
        <Box
          sx={{
            py: 1,
            display: "flex",
            alignItems: "flex-end",
            gap: 1.5,
            width: { xs: "100%", md: "50%" },
          }}
        >
          <FormControl sx={{ flex: 1 }} size="sm">
            <Input
              size="sm"
              placeholder="Search Project Id, PO Number, Vendor"
              startDecorator={<SearchIcon />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </FormControl>
        </Box>
      </Box>

      <Sheet
        className="OrderTableContainer"
        variant="outlined"
        sx={{
          display: { xs: "none", sm: "block" },
          width: "100%",
          borderRadius: "sm",
          maxHeight: { xs: "66vh", xl: "75vh" },
          overflow: "auto",
          "& table tbody tr:nth-of-type(odd)": {
            backgroundColor: "var(--joy-palette-neutral-softBg)",
          },
        }}
      >
        <Box
          component="table"
          sx={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
        >
          <Box component="thead" sx={{ backgroundColor: "neutral.softBg" }}>
            <Box component="tr">
              {/* Select-All header cell */}
              <Box
                component="th"
                sx={{
                  position: "sticky",
                  top: 0,
                  background: "#e0e0e0",
                  zIndex: 2,
                  borderBottom: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "left",
                  width: 44,
                }}
              >
                <Checkbox
                  size="sm"
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </Box>

              {/* Dynamic headers */}
              {visibleDefs.map((col) => (
                <Box
                  component="th"
                  key={col.id}
                  sx={{
                    position: "sticky",
                    top: 0,
                    background: "#e0e0e0",
                    zIndex: 2,
                    borderBottom: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    {/* Main header label */}
                    <Typography
                      level="body-sm"
                      fontWeight="lg"
                      sx={{ color: "neutral.700" }}
                    >
                      {col.label}
                    </Typography>

                    {/* Page totals under specific columns */}
                    {col.id === "bill_value" && (
                      <Typography level="body-xs" sx={{ color: "neutral.700" }}>
                        ({fmtINR(pageTotals.billValue)})
                      </Typography>
                    )}

                    {col.id === "total_billed" && (
                      <Typography level="body-xs" sx={{ color: "neutral.700" }}>
                        ({fmtINR(pageTotals.totalBilled)})
                      </Typography>
                    )}

                    {col.id === "po_value" && (
                      <Typography level="body-xs" sx={{ color: "neutral.700" }}>
                        ({fmtINR(pageTotals.poValue)})
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          <Box component="tbody">
            {isLoading ? (
              <Box component="tr">
                <Box
                  component="td"
                  colSpan={dynamicColSpan}
                  sx={{ py: 5, textAlign: "center" }}
                >
                  <Box
                    sx={{
                      fontStyle: "italic",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <CircularProgress size="sm" sx={{ color: "primary.500" }} />
                    <Typography fontStyle="italic">
                      Loading bills… please hang tight ⏳
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : bills.length > 0 ? (
              <>
                {bills.map((bill, idx) => {
                  const id = bill._id || `${bill.bill_no}-${idx}`;
                  const isChecked = selectedIds.includes(id);

                  return (
                    <Box
                      component="tr"
                      key={id}
                      sx={{ borderBottom: "1px solid #ddd" }}
                    >
                      {/* Row checkbox */}
                      <Box
                        component="td"
                        sx={{
                          borderBottom: "1px solid #ddd",
                          padding: "8px",
                          width: 44,
                          position: "sticky",
                          left: 0,
                          background: "var(--joy-palette-background-surface)",
                          zIndex: 1,
                        }}
                      >
                        <Checkbox
                          size="sm"
                          checked={isChecked}
                          onChange={() => toggleRow(id)}
                        />
                      </Box>

                      {/* Dynamic data cells */}
                      {visibleDefs.map((col) => (
                        <Box
                          key={`${id}-${col.id}`}
                          component="td"
                          sx={{
                            borderBottom: "1px solid #ddd",
                            padding: "8px",
                            verticalAlign: "top",
                          }}
                        >
                          {col.render(bill)}
                        </Box>
                      ))}
                    </Box>
                  );
                })}
              </>
            ) : (
              <Box component="tr">
                <Box
                  component="td"
                  colSpan={dynamicColSpan}
                  sx={{ textAlign: "center", p: 2 }}
                >
                  No bills found.
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Sheet>

      {/* Pagination */}
      <Box
        className="Pagination-laptopUp"
        sx={{
          pt: 1,
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
        >
          Previous
        </Button>

        <Box>
          <Typography level="body-sm">
            Showing {startIndex}–{endIndex} of {total} results
          </Typography>
        </Box>

        <Box
          sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 1 }}
        >
          {getPaginationRange()?.map((p, idx) =>
            p === "..." ? (
              <Box key={`ellipsis-${idx}`} sx={{ px: 1 }}>
                ...
              </Box>
            ) : (
              <IconButton
                key={p}
                size="sm"
                variant={p === currentPage ? "contained" : "outlined"}
                color="neutral"
                onClick={() => handlePageChange(p)}
              >
                {p}
              </IconButton>
            )
          )}
        </Box>

        <FormControl size="sm" sx={{ minWidth: 120 }}>
          <Select value={perPage} onChange={(e, v) => handlePerPageChange(v)}>
            {[10, 30, 60, 100].map((num) => (
              <Option key={num} value={num}>
                {num}
              </Option>
            ))}
          </Select>
        </FormControl>

        <Button
          size="sm"
          variant="outlined"
          color="neutral"
          endDecorator={<KeyboardArrowRightIcon />}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </Box>

      {/* Column Visibility Modal */}
      <Modal open={colModalOpen} onClose={() => setColModalOpen(false)}>
        <ModalDialog sx={{ width: 520 }}>
          <Typography level="title-md" sx={{ mb: 1 }}>
            Visible Columns
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 1 }}>
            <Chip onClick={() => applyPreset(PRESET_ESSENTIAL)} variant="soft">
              Essential
            </Chip>
            <Chip onClick={() => applyPreset(PRESET_FINANCE)} variant="soft">
              Finance
            </Chip>
            <Chip onClick={() => applyPreset(PRESET_LOGISTICS)} variant="soft">
              Logistics
            </Chip>
            <Chip onClick={() => applyPreset(PRESET_ALL)} variant="soft">
              All
            </Chip>
          </Stack>

          <Sheet
            variant="outlined"
            sx={{
              p: 1,
              borderRadius: "sm",
              maxHeight: 300,
              overflow: "auto",
            }}
          >
            <Stack spacing={0.5}>
              {COLUMN_DEFS.map((col) => {
                const checked = visibleCols.includes(col.id);
                return (
                  <Box
                    key={col.id}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Checkbox
                      size="sm"
                      checked={checked}
                      onChange={(e) => {
                        setVisibleCols((prev) =>
                          e.target.checked
                            ? [...prev, col.id]
                            : prev.filter((x) => x !== col.id)
                        );
                      }}
                    />
                    <Typography level="body-sm">{col.label}</Typography>
                  </Box>
                );
              })}
            </Stack>
          </Sheet>

          <Stack
            direction="row"
            justifyContent="flex-end"
            spacing={1}
            sx={{ mt: 1 }}
          >
            <Button
              size="sm"
              variant="plain"
              onClick={() => setColModalOpen(false)}
            >
              Close
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>


    </Box>
  );
});

export default VendorBillSummary;
