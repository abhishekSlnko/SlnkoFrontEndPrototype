import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Dropdown,
  IconButton,
  Input,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  Sheet,
  Stack,
  Table,
  Typography,
  Select,
  Option,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  Textarea,
  FormControl,
  FormLabel,
  Chip,
} from "@mui/joy";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import InsertDriveFileRounded from "@mui/icons-material/InsertDriveFileRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/Delete";
import { CurrencyRupee, Search } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { debounce } from "lodash";
import { toast } from "react-toastify";

import {
  useGetSalesbyProjectIdQuery,
  useUpdateSalesDetailByIdMutation,
  useUpdateSalesPOMutation,
} from "../../redux/Accounts";

// ---------------- helpers ----------------
const RupeeValue = ({ value, showSymbol = true }) => {
  const n = Number(value);
  if (!isFinite(n)) return "—";
  const formatted = n.toLocaleString("en-IN");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {showSymbol && <CurrencyRupee style={{ fontSize: 16 }} />}
      {formatted}
    </span>
  );
};

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatDateTime = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x) ? "—" : x.toLocaleDateString();
};

const normalizeAttachments = (atts) => {
  const arr = Array.isArray(atts) ? atts : atts ? [atts] : [];
  return arr
    .map((a) => {
      const url = a?.url || a?.attachment_url || a?.fileurl || "";
      const name =
        a?.name ||
        a?.attachment_name ||
        a?.filename ||
        (url ? url.split("/").pop() : "File");
      return { url, name };
    })
    .filter((a) => a.url);
};

// ---------------- component ----------------
const Sales = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const project_id = searchParams.get("_id") || "";

  // URL driven state
  const salesPage = Math.max(
    1,
    parseInt(searchParams.get("sales_page") || "1", 10),
  );
  const salesLimit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("sales_limit") || "10", 10)),
  );
  const salesSearchParam = searchParams.get("sales_search") || "";

  const [page, setPage] = useState(salesPage);
  const [limit, setLimit] = useState(salesLimit);

  // search (debounced)
  const [searchSales, setSearchSales] = useState(salesSearchParam);
  const [searchDebounced, setSearchDebounced] = useState(salesSearchParam);

  useEffect(() => setPage(salesPage), [salesPage]);
  useEffect(() => setLimit(salesLimit), [salesLimit]);

  useEffect(() => {
    const fn = debounce((v) => setSearchDebounced(v), 350);
    fn(searchSales);
    return () => fn.cancel();
  }, [searchSales]);

  const updateParams = (patch) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === undefined || String(v) === "") sp.delete(k);
        else sp.set(k, String(v));
      });
      return sp;
    });
  };

  // ---------------- columns + localStorage ----------------
  const SALES_COLUMNS = useMemo(
    () => [
      { key: "convDate", label: "Conversion Date" },
      { key: "item", label: "Item" },
      { key: "invoice", label: "Invoice Number" },
      { key: "billBasic", label: "Bill Basic (₹)" },
      { key: "salesBasic", label: "Sales Value (₹)" },
      { key: "salesGst", label: "Sales GST (₹)" },
      { key: "salesTotal", label: "Total Sales (₹)" },
      { key: "actions", label: "Actions" },
    ],
    [],
  );

  const STORAGE_KEY = "customer_sales_columns";

  const defaults = useMemo(() => {
    const o = {};
    for (const c of SALES_COLUMNS) o[c.key] = c.defaultVisible !== false;
    return o;
  }, [SALES_COLUMNS]);

  const [vis, setVis] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const saved = JSON.parse(raw);
      const merged = { ...defaults };
      for (const k of Object.keys(saved || {})) {
        if (k in merged) merged[k] = !!saved[k];
      }
      return merged;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vis));
    } catch {}
  }, [vis]);

  const show = (k) => !!vis[k];
  const toggle = (k) => setVis((p) => ({ ...p, [k]: !p[k] }));
  const setAll = (flag) => {
    const next = {};
    for (const c of SALES_COLUMNS) next[c.key] = !!flag;
    setVis(next);
  };
  const reset = () => setVis(defaults);

  // ---------------- RTK Query ----------------
  const {
    data: apiRes,
    isLoading,
    isFetching,
    refetch,
  } = useGetSalesbyProjectIdQuery(
    { project_id, page, limit, search: searchDebounced },
    { skip: !project_id },
  );

  const SalesSummary = Array.isArray(apiRes?.data) ? apiRes.data : [];
  const meta = apiRes?.meta || {};
  const total = Number(meta?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / (limit || 10)));

  // sync url on search
  useEffect(() => {
    setPage(1);
    updateParams({ sales_search: searchSales, sales_page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDebounced]);

  // item label from api
  const getItemLabel = (sale) => {
    const items = Array.isArray(sale?.items) ? sale.items : [];
    if (!items.length) return "—";
    return items
      .map((it) => it?.category_name || it?.product_name || "")
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
  };

  // totals for current page
  const totals = useMemo(() => {
    const sum = (k) => SalesSummary.reduce((a, r) => a + toNum(r?.[k]), 0);
    return {
      bill_basic: sum("bill_basic"),
      sales_basic: sum("sales_basic"),
      sales_gst_value: sum("sales_gst_value"),
      total_sales: sum("total_sales"),
    };
  }, [SalesSummary]);

  // ---------------- view modal ----------------
  const [saleDetailOpen, setSaleDetailOpen] = useState(false);
  const [activeSale, setActiveSale] = useState(null);

  const openSaleDetail = (sale) => {
    setActiveSale(sale);
    setSaleDetailOpen(true);
  };
  const closeSaleDetail = () => {
    setSaleDetailOpen(false);
    setActiveSale(null);
  };

  // ---------------- edit modal + mutation ----------------
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [editForm, setEditForm] = useState({
    basic_sales: "",
    gst_on_sales: "",
    sales_invoice: "",
    remarks: "",
  });

  const [updateSalesDetailById, { isLoading: isSaving }] =
    useUpdateSalesDetailByIdMutation();

  const openEdit = (sale) => {
    const basic = toNum(sale?.sales_basic);

    setEditRow(sale);
    setEditForm({
      basic_sales: String(basic || ""),
      gst_on_sales: String(toNum(sale?.sales_gst)),
      sales_invoice: String(sale?.sales_invoice || sale?.invoice_number || ""),
      remarks: String(sale?.remarks || ""),
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
  };

  const onEditChange = (k) => (e) =>
    setEditForm((s) => ({ ...s, [k]: e.target.value }));

  const handleEditSave = async () => {
    try {
      const salesId = editRow?.sales_id || editRow?._id;
      if (!salesId) {
        toast.error("Sales ID not found");
        return;
      }

      const basic = toNum(editForm.basic_sales);
      const gstPct = toNum(editForm.gst_on_sales);
      const inv = String(editForm.sales_invoice || "").trim();
      const remarks = String(editForm.remarks || "").trim();

      if (!Number.isFinite(basic) || basic <= 0) {
        toast.error("Enter valid Sales Basic (must be > 0)");
        return;
      }
      if (!Number.isFinite(gstPct) || gstPct < 0) {
        toast.error("Enter valid GST %");
        return;
      }
      if (!inv) {
        toast.error("Sales Invoice is required");
        return;
      }
      if (!remarks) {
        toast.error("Remarks are required");
        return;
      }

      await updateSalesDetailById({
        salesId,
        body: {
          basic_sales: basic,
          gst_on_sales: gstPct,
          sales_invoice: inv,
          remarks,
        },
      }).unwrap();

      toast.success("Sales detail updated");
      closeEdit();
      refetch?.();
    } catch (e) {
      toast.error(e?.data?.message || e?.message || "Failed to update");
    }
  };

  // ===================== CREDIT NOTE (OPEN SAME MODAL) =====================
  const [salesOpen, setSalesOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState([]);
  const [salesAmounts, setSalesAmounts] = useState({});
  const [salesRemarks, setSalesRemarks] = useState("");
  const [salesInvoice, setSalesInvoice] = useState("");
  const [salesFiles, setSalesFiles] = useState([]); // [{file}]
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const [creditSalesId, setCreditSalesId] = useState("");
  const [modeType, setModeType] = useState("sales"); // "sales" | "credit"

  // ✅ NEW credit fields
  const [creditReason, setCreditReason] = useState("");
  const [creditReversalDate, setCreditReversalDate] = useState("");

  const [updateSalesPO, { isLoading: isConverting }] =
    useUpdateSalesPOMutation();

  const addFiles = (files) => {
    const newFiles = Array.from(files).map((file) => ({ file }));
    setSalesFiles((prev) => {
      const all = [...prev, ...newFiles];
      const seen = new Set();
      return all.filter((f) => {
        const key = `${f.file.name}-${f.file.size}-${f.file.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  };

  const onFileInputChange = (e) => addFiles(e.target.files);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const removeFile = (file) => {
    setSalesFiles((prev) =>
      prev.filter(
        (f) =>
          !(
            f.file.name === file.name &&
            f.file.size === file.size &&
            f.file.lastModified === file.lastModified
          ),
      ),
    );
  };

  const clearAllFiles = () => setSalesFiles([]);

  const openCreditNoteModal = (sale) => {
    const poNo = sale?.po_number;
    const sid = sale?.sales_id || sale?._id;

    if (!poNo) return toast.error("PO number not found on this card.");
    if (!sid) return toast.error("sales_id not found on this card.");

    const mapped = {
      _id: sale?.po_id || null,
      po_number: poNo,
      po_value: sale?.po_value ?? 0,
      totalBasicBillValue: sale?.bill_basic ?? 0,
      bill_basic: sale?.bill_basic ?? 0,
      amount_paid: sale?.total_advance_paid ?? 0,
      remaining_sales_value: sale?.remaining_sales_value ?? 0,
    };

    const rowKey = mapped._id || mapped.po_number;

    setModeType("credit");
    setCreditSalesId(String(sid));

    // ✅ credit defaults
    setCreditReason("");
    setCreditReversalDate(new Date().toISOString().slice(0, 10));

    setSelectedPO([mapped]);

    setSalesAmounts({
      [rowKey]: {
        basic: "",
        gst: String(toNum(sale?.sales_gst ?? sale?.gst_on_sales ?? 0)),
      },
    });

    setSalesInvoice(String(sale?.sales_invoice || sale?.invoice_number || ""));
    setSalesRemarks("");
    setSalesFiles([]);
    setSalesOpen(true);
    setSaleDetailOpen(false);
  };

  const handleSalesConvert = async () => {
    try {
      if (!Array.isArray(selectedPO) || selectedPO.length === 0) {
        toast.error("No PO selected.");
        return;
      }

      const inv = String(salesInvoice || "").trim();
      if (!inv) {
        toast.error("Sales Invoice No. is required.");
        return;
      }

      const remarks = String(salesRemarks || "").trim();
      if (!remarks) {
        toast.error("Remarks are required.");
        return;
      }

      // ✅ credit validations
      if (modeType === "credit") {
        if (!creditSalesId) {
          toast.error("credit_info.sales_id missing.");
          return;
        }
        if (!String(creditReason || "").trim()) {
          toast.error("Credit Reason is required.");
          return;
        }
        if (!creditReversalDate) {
          toast.error("Reversal Date is required.");
          return;
        }
      }

      const results = await Promise.allSettled(
        selectedPO.map(async (po) => {
          const rowKey = po?._id || po?.po_number;
          const poNumber = po?.po_number;

          const enteredBasic = Number(salesAmounts?.[rowKey]?.basic ?? 0);
          const gstPercent = Number(salesAmounts?.[rowKey]?.gst ?? 0);

          if (!Number.isFinite(enteredBasic) || enteredBasic <= 0) {
            throw new Error(`Invalid Basic for PO ${poNumber}`);
          }
          if (!Number.isFinite(gstPercent) || gstPercent < 0) {
            throw new Error(`Invalid GST % for PO ${poNumber}`);
          }

          return await updateSalesPO({
            id: po?._id || undefined,
            po_number: poNumber,
            remarks,
            basic_sales: enteredBasic,
            gst_on_sales: gstPercent,
            sales_invoice: inv,
            isSales: "true",
            files: salesFiles || [],
            type: modeType === "credit" ? "credit_note" : "sales",
            credit_info:
              modeType === "credit"
                ? [
                    {
                      sales_id: creditSalesId,
                      reason: String(creditReason || "").trim(),
                      reversal_date: creditReversalDate,
                    },
                  ]
                : undefined,
          }).unwrap();
        }),
      );

      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.filter((r) => r.status === "rejected").length;

      if (ok)
        toast.success(
          `Done (${modeType === "credit" ? "Credit Note" : "Sales"}): ${ok}`,
        );
      if (fail) {
        const firstErr = results.find((r) => r.status === "rejected")?.reason;
        toast.error(firstErr?.message || "Failed");
      }

      if (ok) {
        setSalesOpen(false);
        setSelectedPO([]);
        setSalesAmounts({});
        setSalesRemarks("");
        setSalesInvoice("");
        setSalesFiles([]);
        setCreditSalesId("");
        setModeType("sales");
        setCreditReason("");
        setCreditReversalDate("");
        refetch?.();
      }
    } catch (err) {
      toast.error(err?.message || "Failed");
    }
  };

  return (
    <>
      {/* ------- YOUR EXISTING TABLE UI ABOVE (unchanged) ------- */}
      <Box mt={2}>
        {/* Toolbar */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            mb: 2,
            "@media print": { display: "none" },
          }}
        >
          <Input
            placeholder="Search by PO, Category, Invoice, Remarks..."
            value={searchSales}
            onChange={(e) => setSearchSales(e.target.value)}
            sx={{ width: { xs: "100%", md: "50%" } }}
            startDecorator={<Search size={16} />}
          />

          {/* column menu */}
          <Dropdown>
            <MenuButton
              variant="outlined"
              startDecorator={<ViewColumnIcon />}
              sx={{ whiteSpace: "nowrap" }}
            >
              Columns
            </MenuButton>

            <Menu
              placement="bottom-end"
              sx={{ minWidth: 260, maxHeight: 380, overflow: "auto" }}
            >
              <MenuItem disabled sx={{ fontWeight: 600 }}>
                Column visibility
              </MenuItem>
              <Divider />

              <Sheet
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: "md",
                  boxShadow: "sm",
                  minWidth: 220,
                  maxHeight: 320,
                  overflow: "auto",
                }}
              >
                <Typography level="body-sm" sx={{ mb: 1, fontWeight: 600 }}>
                  Sales Columns
                </Typography>

                {SALES_COLUMNS.map((c) => (
                  <Box
                    key={c.key}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      py: 0.4,
                    }}
                  >
                    <Checkbox
                      checked={!!vis[c.key]}
                      size="sm"
                      onChange={() => toggle(c.key)}
                    />
                    <Typography level="body-sm">{c.label}</Typography>
                  </Box>
                ))}
              </Sheet>

              <Divider />
              <MenuItem>
                <Button size="sm" variant="plain" onClick={() => setAll(true)}>
                  Select all
                </Button>
                <Button
                  size="sm"
                  variant="plain"
                  onClick={() => setAll(false)}
                  sx={{ ml: "auto" }}
                >
                  None
                </Button>
              </MenuItem>

              <MenuItem>
                <Button
                  size="sm"
                  variant="outlined"
                  color="neutral"
                  onClick={reset}
                  fullWidth
                >
                  Reset to default
                </Button>
              </MenuItem>
            </Menu>
          </Dropdown>
        </Box>

        {/* Table */}
        <Sheet
          variant="outlined"
          sx={{
            borderRadius: "12px",
            overflow: "auto",
            boxShadow: "md",
            width: "100%",
            maxWidth: "100%",
            maxHeight: "60vh",
          }}
        >
          <Table
            borderAxis="both"
            stickyHeader
            sx={{
              width: "max-content",
              minWidth: "100%",
              tableLayout: "auto",
              fontSize: { xs: 12, sm: 14 },
              "& thead": { backgroundColor: "neutral.softBg" },
              "& tbody tr:nth-of-type(even)": {
                backgroundColor: "rgba(0,0,0,0.02)",
              },
              "& th, & td": {
                px: { xs: 1, sm: 2 },
                py: { xs: 1, sm: 1.25 },
                verticalAlign: "top",
                textAlign: "left",
                lineHeight: 1.4,
                whiteSpace: "nowrap",
              },
              "& th.num, & td.num": {
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              },
            }}
          >
            <thead>
              <tr>
                <th rowSpan={2}>Converted PO's</th>
                {show("convDate") && <th rowSpan={2}>Conversion Date</th>}
                {show("item") && <th rowSpan={2}>Item</th>}
                {show("invoice") && <th rowSpan={2}>Invoice Number</th>}
                {show("billBasic") && (
                  <th rowSpan={2} className="num">
                    Bill Basic (₹)
                  </th>
                )}

                {(show("salesBasic") ||
                  show("salesGst") ||
                  show("salesTotal")) && (
                  <th
                    colSpan={
                      [
                        show("salesBasic"),
                        show("salesGst"),
                        show("salesTotal"),
                      ].filter(Boolean).length
                    }
                    style={{ textAlign: "center" }}
                  >
                    Sales
                  </th>
                )}

                {show("actions") && (
                  <th rowSpan={2} style={{ textAlign: "center" }}>
                    Actions
                  </th>
                )}
              </tr>

              <tr>
                {show("salesBasic") && <th className="num">Value (₹)</th>}
                {show("salesGst") && <th className="num">GST (₹)</th>}
                {show("salesTotal") && (
                  <th className="num" style={{ backgroundColor: "#E3F2FD" }}>
                    Total Sales (₹)
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: 20 }}>
                    <Typography level="body-md" sx={{ fontStyle: "italic" }}>
                      Loading sales history...
                    </Typography>
                  </td>
                </tr>
              ) : SalesSummary.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: 20 }}>
                    <Typography level="body-md">
                      No sales history available
                    </Typography>
                  </td>
                </tr>
              ) : (
                SalesSummary.map((sale, idx) => {
                  const atts = normalizeAttachments(sale.attachments);
                  const billBasic = toNum(sale.bill_basic);
                  const salesBasic = toNum(sale.sales_basic);
                  const salesGstAmt = toNum(sale.sales_gst_value);
                  const totalSales = toNum(sale.total_sales);

                  const isCreditNote =
                    String(sale?.type || "").toLowerCase() === "credit_note";
                  const ci0 =
                    isCreditNote && Array.isArray(sale?.credit_info)
                      ? sale.credit_info[0]
                      : null;

                  const cnOnInvoice = String(ci0?.sales_invoice || "").trim();
                  const cnReason = String(ci0?.reason || "").trim();

                  return (
                    <tr
                      key={
                        sale.sales_id || sale._id || `${sale.po_number}-${idx}`
                      }
                    >
                      <td style={{ minWidth: 180 }}>
                        <Stack spacing={0.75}>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            flexWrap="wrap"
                          >
                            <Chip size="sm" variant="soft" color="primary">
                              <Typography
                                level="body-sm"
                                sx={{ fontWeight: 700 }}
                              >
                                {sale.po_number || "N/A"}
                              </Typography>
                            </Chip>

                            <IconButton
                              size="sm"
                              variant="plain"
                              onClick={() => openSaleDetail(sale)}
                            >
                              <VisibilityRounded fontSize="small" />
                            </IconButton>
                          </Stack>

                          {isCreditNote && (cnOnInvoice || cnReason) && (
                            <Chip
                              size="sm"
                              variant="soft"
                              color="warning"
                              sx={{ alignSelf: "flex-start", fontSize: 12 }}
                            >
                              {`(CN on ${cnOnInvoice || "—"}${cnReason ? `, ${cnReason}` : ""})`}
                            </Chip>
                          )}

                          {/* Attachments */}
                          <Stack
                            direction="row"
                            spacing={0.75}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mt: 0.5 }}
                          >
                            {atts.length ? (
                              atts.map((att, i) => (
                                <Link
                                  key={att.url || `${sale.sales_id}-att-${i}`}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener"
                                  underline="hover"
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    fontSize: 12,
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: "8px",
                                    backgroundColor: "neutral.softBg",
                                    maxWidth: 160,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={att.name}
                                >
                                  <AttachFileIcon sx={{ fontSize: 15 }} />
                                  {att.name || `File ${i + 1}`}
                                </Link>
                              ))
                            ) : (
                              <Typography
                                level="body-xs"
                                sx={{ opacity: 0.6, fontStyle: "italic" }}
                              >
                                No attachments
                              </Typography>
                            )}
                          </Stack>
                        </Stack>
                      </td>

                      {show("convDate") && (
                        <td style={{ whiteSpace: "nowrap" }}>
                          {formatDateTime(sale?.converted_at)}
                        </td>
                      )}

                      {show("item") && (
                        <td
                          title={getItemLabel(sale)}
                          style={{
                            maxWidth: 380,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {getItemLabel(sale)}
                        </td>
                      )}

                      {show("invoice") && (
                        <td>
                          {sale.sales_invoice || sale.invoice_number || "—"}
                        </td>
                      )}

                      {show("billBasic") && (
                        <td className="num">
                          <RupeeValue value={Math.round(billBasic)} />
                        </td>
                      )}

                      {show("salesBasic") && (
                        <td className="num">
                          <RupeeValue value={Math.round(salesBasic)} />
                        </td>
                      )}

                      {show("salesGst") && (
                        <td className="num">
                          <RupeeValue value={Math.round(salesGstAmt)} />
                        </td>
                      )}

                      {show("salesTotal") && (
                        <td
                          className="num"
                          style={{ backgroundColor: "#E3F2FD" }}
                        >
                          <RupeeValue value={Math.round(totalSales)} />
                        </td>
                      )}

                      {show("actions") && (
                        <td style={{ textAlign: "center" }}>
                          <IconButton
                            size="sm"
                            variant="plain"
                            onClick={() => openEdit(sale)}
                          >
                            <EditRounded fontSize="small" />
                          </IconButton>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Totals (current page) */}
            {SalesSummary.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: "bold", backgroundColor: "#FFF9C4" }}>
                  <td
                    colSpan={
                      1 +
                      (show("convDate") ? 1 : 0) +
                      (show("item") ? 1 : 0) +
                      (show("invoice") ? 1 : 0)
                    }
                    style={{ textAlign: "right" }}
                  >
                    Total:
                  </td>

                  {show("billBasic") && (
                    <td className="num">
                      <RupeeValue value={Math.round(totals.bill_basic)} />
                    </td>
                  )}
                  {show("salesBasic") && (
                    <td className="num">
                      <RupeeValue value={Math.round(totals.sales_basic)} />
                    </td>
                  )}
                  {show("salesGst") && (
                    <td className="num">
                      <RupeeValue value={Math.round(totals.sales_gst_value)} />
                    </td>
                  )}
                  {show("salesTotal") && (
                    <td className="num" style={{ backgroundColor: "#E3F2FD" }}>
                      <RupeeValue value={Math.round(totals.total_sales)} />
                    </td>
                  )}
                  {show("actions") && <td />}
                </tr>
              </tfoot>
            )}
          </Table>
        </Sheet>

        {/* Pagination */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
            mt: 2,
          }}
        >
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            Page <b>{page}</b> of <b>{totalPages}</b> • Total Rows{" "}
            <b>{total}</b>
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Select
              size="sm"
              value={String(limit)}
              onChange={(_, v) => {
                const newLimit = Number(v || "10");
                setLimit(newLimit);
                setPage(1);
                updateParams({ sales_limit: newLimit, sales_page: 1 });
              }}
              sx={{ minWidth: 90 }}
            >
              <Option value="10">10</Option>
              <Option value="20">20</Option>
              <Option value="50">50</Option>
              <Option value="100">100</Option>
            </Select>

            <Button
              size="sm"
              variant="outlined"
              disabled={page <= 1 || isLoading || isFetching}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                updateParams({ sales_page: next });
              }}
            >
              Prev
            </Button>

            <Button
              size="sm"
              variant="outlined"
              disabled={page >= totalPages || isLoading || isFetching}
              onClick={() => {
                const next = Math.min(totalPages, page + 1);
                setPage(next);
                updateParams({ sales_page: next });
              }}
            >
              Next
            </Button>
          </Box>
        </Box>
      </Box>

      {/* View modal */}
      <Modal open={saleDetailOpen} onClose={closeSaleDetail}>
        <ModalDialog sx={{ width: 520 }}>
          <DialogTitle>Sales Conversion</DialogTitle>
          <DialogContent>
            <Stack spacing={1.25}>
              <Typography level="title-sm">
                PO: <strong>{activeSale?.po_number ?? "—"}</strong>
              </Typography>

              <Typography level="body-sm">
                <strong>Converted By:</strong> {activeSale?.converted_by ?? "—"}
              </Typography>

              <Typography level="body-sm" sx={{ whiteSpace: "pre-wrap" }}>
                <strong>Remarks:</strong> {activeSale?.remarks?.trim() || "—"}
              </Typography>

              <Box>
                <Typography level="body-sm" sx={{ mb: 0.5 }}>
                  <strong>Attachments</strong>
                </Typography>

                <Sheet
                  variant="soft"
                  sx={{
                    p: 1,
                    borderRadius: "md",
                    maxHeight: 220,
                    overflow: "auto",
                  }}
                >
                  <Stack spacing={0.75}>
                    {(() => {
                      const files = normalizeAttachments(
                        activeSale?.attachments,
                      );
                      return files.length ? (
                        files.map((a, i) => (
                          <Box
                            key={a.url || `file-${i}`}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 1,
                              px: 1,
                              py: 0.75,
                              borderRadius: "sm",
                              "&:hover": {
                                backgroundColor: "neutral.plainHoverBg",
                              },
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <InsertDriveFileRounded fontSize="small" />
                              <Link
                                href={a.url}
                                target="_blank"
                                rel="noopener"
                                underline="hover"
                              >
                                {a.name || a.url?.split("/").pop() || "File"}
                              </Link>
                            </Stack>
                          </Box>
                        ))
                      ) : (
                        <Typography level="body-xs" sx={{ opacity: 0.7 }}>
                          No attachments
                        </Typography>
                      );
                    })()}
                  </Stack>
                </Sheet>
              </Box>

              <Stack
                direction="row"
                spacing={1}
                justifyContent="flex-end"
                sx={{ mt: 1 }}
              >
                <Button
                  variant="soft"
                  color="warning"
                  onClick={() => openCreditNoteModal(activeSale)}
                >
                  Credit Note
                </Button>
                <Button variant="outlined" onClick={closeSaleDetail}>
                  Close
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>

      {/* ✅ SAME MODAL, now includes reason + reversal_date when credit */}
      <Modal open={salesOpen} onClose={() => setSalesOpen(false)}>
        <ModalDialog sx={{ width: 1100, borderRadius: "lg", p: 3 }}>
          <DialogTitle sx={{ fontWeight: 700, mb: 1 }}>
            Sales Conversion
            {modeType === "credit" && (
              <Chip size="sm" variant="soft" color="warning" sx={{ ml: 1 }}>
                Credit Note
              </Chip>
            )}
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2.5}>
              {/* PO Table */}
              <Sheet
                variant="outlined"
                sx={{
                  borderRadius: "md",
                  overflow: "auto",
                  maxHeight: 280,
                  borderColor: "neutral.outlinedBorder",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    backgroundColor: "neutral.softBg",
                    position: "sticky",
                    top: 0,
                    borderBottom: "1px solid",
                    borderColor: "neutral.outlinedBorder",
                    zIndex: 2,
                  }}
                >
                  {[
                    { label: "PO No.", align: "left" },
                    { label: "PO Value", align: "right" },
                    { label: "Bill Basic", align: "right" },
                    { label: "Advance Paid", align: "right" },
                    { label: "Remaining Sales(w/o GST)", align: "right" },
                    { label: "Basic Sales", align: "right" },
                    { label: "GST on Sales(%)", align: "right" },
                  ].map((col) => (
                    <Typography
                      key={col.label}
                      level="body-sm"
                      textAlign={col.align}
                      sx={{ fontWeight: 700 }}
                    >
                      {col.label}
                    </Typography>
                  ))}
                </Box>

                {(selectedPO || []).map((po, idx) => {
                  const rowKey = po._id || po.po_number;
                  const poValue = Number(po.po_value || 0);
                  const billBasic = Number(
                    po.totalBasicBillValue ?? po.bill_basic ?? 0,
                  );
                  const advancePaid = Number(
                    po.amount_paid ?? po.advance_paid ?? 0,
                  );
                  const remainingSales = Number(po.remaining_sales_value ?? 0);

                  return (
                    <Box
                      key={rowKey}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr",
                        gap: 1,
                        px: 1.5,
                        py: 0.9,
                        alignItems: "center",
                        borderBottom: "1px dashed",
                        borderColor: "neutral.outlinedBorder",
                        backgroundColor:
                          idx % 2 === 0 ? "background.body" : "neutral.softBg",
                      }}
                    >
                      <Typography level="body-sm" sx={{ fontWeight: 600 }}>
                        {po.po_number}
                      </Typography>

                      <Typography level="body-sm" textAlign="right">
                        {poValue.toLocaleString("en-IN")}
                      </Typography>
                      <Typography level="body-sm" textAlign="right">
                        {billBasic.toLocaleString("en-IN")}
                      </Typography>
                      <Typography level="body-sm" textAlign="right">
                        {advancePaid.toLocaleString("en-IN")}
                      </Typography>
                      <Typography level="body-sm" textAlign="right">
                        {remainingSales.toLocaleString("en-IN")}
                      </Typography>

                      <Input
                        size="sm"
                        type="number"
                        value={salesAmounts[rowKey]?.basic ?? ""}
                        placeholder="Basic"
                        onChange={(e) => {
                          const raw = e.target.value;

                          if (raw === "") {
                            setSalesAmounts((prev) => ({
                              ...prev,
                              [rowKey]: { ...prev[rowKey], basic: "" },
                            }));
                            return;
                          }

                          const val = Number(raw);
                          if (!Number.isFinite(val)) return;

                          // credit: allow typing any value

                          const maxAllowed = Math.abs(
                            Number(remainingSales || 0),
                          );
                          if (val > maxAllowed) {
                            toast.warning(
                              "Basic Sales can't be greater than Remaining Sales (w/o GST).",
                            );
                            setSalesAmounts((prev) => ({
                              ...prev,
                              [rowKey]: {
                                ...prev[rowKey],
                                basic: String(maxAllowed),
                              },
                            }));
                            return;
                          }

                          setSalesAmounts((prev) => ({
                            ...prev,
                            [rowKey]: { ...prev[rowKey], basic: raw },
                          }));
                        }}
                        inputProps={{
                          min: 0,
                          max:
                            modeType !== "credit"
                              ? Math.max(0, Number(remainingSales || 0))
                              : undefined,
                          step: "0.01",
                        }}
                        sx={{ width: 120, ml: "auto" }}
                      />

                      <Input
                        size="sm"
                        type="number"
                        value={salesAmounts[rowKey]?.gst ?? ""}
                        placeholder="GST %"
                        onChange={(e) =>
                          setSalesAmounts((prev) => ({
                            ...prev,
                            [rowKey]: { ...prev[rowKey], gst: e.target.value },
                          }))
                        }
                        sx={{ width: 120, ml: "auto" }}
                      />
                    </Box>
                  );
                })}
              </Sheet>

              {/* File Upload */}
              <Sheet
                variant="soft"
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                sx={{
                  border: "2px dashed",
                  borderColor: isDragging
                    ? "primary.solidBg"
                    : "neutral.outlinedBorder",
                  borderRadius: "lg",
                  p: 3,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all .2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.solidBg",
                    backgroundColor: "neutral.softBg",
                  },
                }}
              >
                <Typography level="title-sm">
                  <strong>Drop files here</strong> or <u>browse</u>
                </Typography>
                <Typography level="body-xs" color="neutral">
                  Supports multiple files (.PNG, .JPG, .PDF)
                </Typography>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => addFiles(e.target.files)}
                  style={{ display: "none" }}
                />

                <Typography level="body-sm" sx={{ mt: 1 }}>
                  {salesFiles.length
                    ? `${salesFiles.length} file(s) selected`
                    : "No files selected"}
                </Typography>
              </Sheet>

              {salesFiles.length > 0 && (
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    maxHeight: 140,
                    overflowY: "auto",
                  }}
                >
                  {salesFiles.map(({ file }) => (
                    <Box
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        backgroundColor: "background.level1",
                        borderRadius: "sm",
                        px: 1.2,
                        py: 0.6,
                        border: "1px solid",
                        borderColor: "neutral.outlinedBorder",
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <InsertDriveFileRounded fontSize="small" />
                        <Typography
                          level="body-sm"
                          sx={{ wordBreak: "break-all" }}
                        >
                          {file.name}
                        </Typography>
                      </Stack>

                      <IconButton
                        size="sm"
                        color="danger"
                        variant="plain"
                        onClick={() => removeFile(file)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}

                  <Button
                    variant="outlined"
                    color="neutral"
                    size="sm"
                    onClick={clearAllFiles}
                    sx={{ alignSelf: "flex-end" }}
                  >
                    Clear All
                  </Button>
                </Box>
              )}

              {/* Invoice */}
              <FormControl>
                <FormLabel sx={{ fontWeight: 600 }}>
                  Sales Invoice No.
                </FormLabel>
                <Input
                  size="md"
                  placeholder="Enter Sales Invoice Number"
                  value={salesInvoice}
                  onChange={(e) => setSalesInvoice(e.target.value)}
                />
              </FormControl>

              {/* ✅ credit fields */}
              {modeType === "credit" && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <FormControl sx={{ flex: 1 }}>
                    <FormLabel sx={{ fontWeight: 600 }}>
                      Credit Reason
                    </FormLabel>
                    <Input
                      placeholder="Enter reason"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                    />
                  </FormControl>

                  <FormControl sx={{ width: { sm: 240 } }}>
                    <FormLabel sx={{ fontWeight: 600 }}>
                      Reversal Date
                    </FormLabel>
                    <Input
                      type="date"
                      value={creditReversalDate}
                      onChange={(e) => setCreditReversalDate(e.target.value)}
                    />
                  </FormControl>
                </Stack>
              )}

              {/* Remarks */}
              <Textarea
                minRows={3}
                placeholder="Enter remarks..."
                value={salesRemarks}
                onChange={(e) => setSalesRemarks(e.target.value)}
              />

              {/* Actions */}
              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button
                  variant="plain"
                  color="neutral"
                  onClick={() => setSalesOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="solid"
                  color="primary"
                  loading={isConverting}
                  onClick={handleSalesConvert}
                >
                  Convert
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>

       <Modal open={editOpen} onClose={closeEdit}>
        <ModalDialog sx={{ width: 520 }}>
          <DialogTitle>Edit Sales Conversion</DialogTitle>
          <DialogContent>
            <Stack spacing={1.25}>
              <Typography level="body-sm">
                PO: <strong>{editRow?.po_number ?? "—"}</strong>
              </Typography>

              <Stack direction="row" spacing={1}>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Sales Basic (₹)</FormLabel>
                  <Input
                    type="number"
                    value={editForm.basic_sales}
                    onChange={onEditChange("basic_sales")}
                    slotProps={{ input: { min: 0, step: "0.01" } }}
                  />
                </FormControl>

                <FormControl sx={{ width: 180 }}>
                  <FormLabel>Sales GST (%)</FormLabel>
                  <Input
                    type="number"
                    value={editForm.gst_on_sales}
                    onChange={onEditChange("gst_on_sales")}
                    slotProps={{ input: { min: 0, step: "0.01" } }}
                  />
                </FormControl>
              </Stack>

              <FormControl>
                <FormLabel>Sales Invoice No.</FormLabel>
                <Input
                  value={editForm.sales_invoice}
                  onChange={onEditChange("sales_invoice")}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Remarks</FormLabel>
                <Textarea
                  minRows={3}
                  value={editForm.remarks}
                  onChange={onEditChange("remarks")}
                />
              </FormControl>

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="plain" onClick={closeEdit}>
                  Cancel
                </Button>
                <Button loading={isSaving} onClick={handleEditSave}>
                  Save
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </>
  );
};

export default Sales;
