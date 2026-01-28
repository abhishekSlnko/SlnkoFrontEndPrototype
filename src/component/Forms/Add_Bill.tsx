import {
  Box,
  Sheet,
  Grid,
  Typography,
  Input,
  Button,
  Chip,
  IconButton,
  Textarea,
  ModalClose,
  ModalDialog,
  Modal,
  DialogTitle,
  DialogContent,
  Divider,
} from "@mui/joy";
import { Plus } from "lucide-react";
import { DeleteOutline, RestartAlt, Send } from "@mui/icons-material";
import {
  useAddBillHistoryMutation,
  useAddBillMutation,
  useGetBillByIdQuery,
  useLazyGetBillHistoryQuery,
  useUpdateBillMutation,
} from "../../redux/billsSlice";
import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";
import POUpdateFeed from "../PoUpdateForm";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ---------------- helpers ---------------- */
const currency = (n) =>
  (Number(n) || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "INR",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const rid = () => Math.random().toString(36).slice(2, 9);

const calcLine = (l) => {
  const qty = Number(l.qty || 0);
  const price = Number(l.price || 0);
  const tax = Number(l.tax || 0);
  const base = qty * price;
  const taxAmt = (base * tax) / 100;
  const total = base + taxAmt;
  return { base, taxAmt, total };
};

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const isoDateOnly = (d) => {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
};

const isObjectId = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || "").trim());

const AMOUNT_LABELS_BY_PATH = {
  bill_value: "Untaxed",
  gst: "GST",
  total: "Total",
};

/* -------- darker disabled helpers (same as PO form) -------- */
const DISABLED_SX = {
  opacity: 1,
  pointerEvents: "none",
  bgcolor: "neutral.softBg",
  color: "text.primary",
  borderColor: "neutral.outlinedBorder",
};
/* ----------------------------------------------------------- */

export default function VendorBillForm({
  poData,
  poLines,
  onClose,
  fromModal = false,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // ---------- Credit Note params ----------
  const cnType = (searchParams.get("type") || "").toLowerCase();
  const cnSourceBillId = searchParams.get("bill_id") || "";
  const cnReasonParam = searchParams.get("reason") || "";
  const cnReversalParam = searchParams.get("reversal_date") || "";

  const isCreditNoteCreate =
    cnType === "credit_note" && isObjectId(cnSourceBillId);

  // mode rules
  const mode = fromModal
    ? "create"
    : isCreditNoteCreate
      ? "create"
      : searchParams.get("mode");

  // In credit note create, we fetch SOURCE bill by bill_id; else edit uses _id
  const billId = isCreditNoteCreate
    ? cnSourceBillId
    : searchParams.get("_id");

  const isEdit = mode === "edit" && !isCreditNoteCreate;

  // ---------- UI state ----------
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // credit note modal state (only opens in EDIT of original bill)
  const [cnOpen, setCnOpen] = useState(false);
  const [cnReason, setCnReason] = useState("");
  const [cnDate, setCnDate] = useState(isoDateOnly(new Date()));

  const openCreditNote = () => {
    if (!isEdit) return toast.info("Open a bill first to create credit note.");
    setCnReason("");
    setCnDate(isoDateOnly(new Date()));
    setCnOpen(true);
  };
  const closeCreditNote = () => setCnOpen(false);

  // on reverse: CLOSE modal + PUSH params (no API call here)
  const handleReverseOnly = () => {
    if (!isEdit) return toast.error("Open bill in edit mode first.");
    const sourceId = String(form?._id || billId || "").trim();
    if (!isObjectId(sourceId)) return toast.error("Bill id missing.");
    if (!cnReason.trim()) return toast.error("Reason is required.");
    if (!cnDate) return toast.error("Reversal date is required.");

    closeCreditNote();

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      next.delete("_id");
      next.set("mode", "create");

      next.set("type", "credit_note");
      next.set("bill_id", sourceId);
      next.set("reason", cnReason.trim());
      next.set("reversal_date", cnDate);

      return next;
    });
  };

  // ---------- Server totals (baseline for diffs) ----------
  const [serverTotals, setServerTotals] = useState({
    bill_value: 0,
    gst: 0,
    bill_date: new Date(),
  });
  const [serverDesc, setServerDesc] = useState("");
  const [serverBillNo, setServerBillNo] = useState("");

  // ---------- Fetch bill (edit OR credit-note-create source) ----------
  const { data: billFetch, isFetching: fetchingBill } = useGetBillByIdQuery(
    { po_number: "", _id: billId || "" },
    { skip: !billId }
  );

  // ---------- header form ----------
  const [form, setForm] = useState(() => ({
    billNo: "",
    project_code: poData?.p_id || poData?.project_code || "",
    po_number: poData?.po_number || "",
    vendor: poData?.name || poData?.vendor || "",
    po_value: toNum(poData?.po_value),
    total_billed: toNum(poData?.total_billed),
    createdAt: poData?.createdAt ? isoDateOnly(poData.createdAt) : "",
    po_date: poData?.date || "",
    billDate: isoDateOnly(new Date()),
    description: "",
    bill_received: "N/A",
    _id: "",
  }));

  const setHeader = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  // ---------- lines ----------
  const [lines, setLines] = useState(
    (poLines || []).map((l) => ({
      id: rid(),
      Category: l.productCategoryName || "",
      category_id: l.productCategoryId || "",
      product_name: l.productName || "",
      product_make: l.makeQ || "",
      uom: l.uom || "",
      qty: toNum(l.quantity),
      price: toNum(l.unitPrice),
      tax: toNum(l.taxPercent),
    }))
  );

  // ---------- editable/disabled props ----------
  const editableInputProps = (disabled) => ({
    disabled,
    sx: disabled ? DISABLED_SX : {},
    slotProps: disabled ? { input: { sx: { color: "text.primary" } } } : {},
  });

  const editableTextareaProps = (disabled) => ({
    disabled,
    sx: disabled ? DISABLED_SX : {},
    slotProps: disabled ? { textarea: { sx: { color: "text.primary" } } } : {},
  });

  // ---------- Load bill doc into form ----------
  useEffect(() => {
    const rows = billFetch?.data || [];
    const doc = Array.isArray(rows) ? rows[0] : null;
    if (!doc) return;

    const mappedLines = (doc.items || doc.item || []).map((it) => ({
      id: rid(),
      Category: it.category_name || it?.category?.category_name || "",
      category_id: it.category_id || it?.category?.category_id || "",
      product_name: it.product_name || "",
      product_make: it.product_make || "",
      uom: it.uom || "",
      qty: toNum(it.quantity),
      price: toNum(it.bill_value),
      tax: toNum(it.gst_percent),
    }));

    setLines(mappedLines);

    const prevTotals = mappedLines.reduce(
      (acc, l) => {
        const { base, taxAmt } = calcLine(l);
        acc.untaxed += base;
        acc.tax += taxAmt;
        return acc;
      },
      { untaxed: 0, tax: 0 }
    );

    setServerTotals({
      bill_value: Number(prevTotals.untaxed || 0),
      gst: Number(prevTotals.tax || 0),
      bill_date: isoDateOnly(doc.bill_date) || "",
    });

    setServerDesc(doc.description || "");
    setServerBillNo(doc.bill_number || "");

    // EDIT mode
    if (isEdit) {
      setForm({
        billNo: doc.bill_number || "",
        project_code: doc?.poData?.p_id || doc?.po_cache?.p_id || "",
        po_number: doc.po_number || "",
        vendor: doc?.poData?.vendor || doc?.po_cache?.vendor_name || "",
        po_value: toNum(doc?.poData?.po_value || doc?.po_cache?.po_value),
        total_billed: 0,
        createdAt: "",
        po_date: isoDateOnly(doc?.poData?.date) || "",
        billDate: isoDateOnly(doc.bill_date) || "",
        description: doc.description || "",
        bill_received: doc?.bill_received?.status || "N/A",
        _id: doc._id || "",
      });
      return;
    }

    // CREDIT NOTE create mode
    if (isCreditNoteCreate) {
      const reason = String(cnReasonParam || "").trim();
      const revDate = cnReversalParam ? cnReversalParam : isoDateOnly(new Date());

      setForm((prev) => ({
        ...prev,
        billNo: `${doc.bill_number || "BILL"}-DN`,
        project_code: doc?.poData?.p_id || doc?.po_cache?.p_id || "",
        po_number: doc.po_number || "",
        vendor: doc?.poData?.vendor || doc?.po_cache?.vendor_name || "",
        po_value: toNum(doc?.poData?.po_value || doc?.po_cache?.po_value),
        total_billed: 0,
        createdAt: "",
        po_date: isoDateOnly(doc?.poData?.date) || "",
        billDate: revDate,
        description: reason
          ? `Debit Note: ${reason}`
          : `Debit Note for ${doc.bill_number || ""}`,
        bill_received: "pending",
        _id: "",
      }));
    }
  }, [billFetch, isEdit, isCreditNoteCreate, cnReasonParam, cnReversalParam]);

  // totals
  const totals = useMemo(() => {
    let untaxed = 0;
    let tax = 0;
    let total = 0;
    for (const l of lines) {
      const { base, taxAmt, total: t } = calcLine(l);
      untaxed += base;
      tax += taxAmt;
      total += t;
    }
    return { untaxed, tax, total };
  }, [lines]);

  // Remaining amount logic
  const remainingAmount = useMemo(() => {
    const poVal = toNum(form.po_value);
    const billed = toNum(form.total_billed);
    const thisBill = toNum(totals.total);

    const effective = isCreditNoteCreate ? -thisBill : thisBill;
    const result = Number((poVal - (billed + effective)).toFixed(2));
    return Object.is(result, -0) ? 0 : result;
  }, [form.po_value, form.total_billed, totals.total, isCreditNoteCreate]);

  const overBilling = !isCreditNoteCreate && remainingAmount < 0;

  const addLine = () =>
    setLines((p) => [
      ...p,
      {
        id: rid(),
        Category: "",
        category_id: "",
        product_name: "",
        product_make: "",
        uom: "",
        qty: 0,
        price: 0,
        tax: 0,
      },
    ]);

  const removeLine = (rowId) => setLines((p) => p.filter((r) => r.id !== rowId));

  const updateLine = (rowId, key, val) =>
    setLines((p) => p.map((r) => (r.id === rowId ? { ...r, [key]: val } : r)));

  const [addBill, { isLoading: postingCreate }] = useAddBillMutation();
  const [updateBill, { isLoading: postingUpdate }] = useUpdateBillMutation();

  const buildPayloadItems = useCallback(
    () =>
      lines.map((l) => ({
        category:
          l.category_id && l.Category
            ? { category_id: l.category_id, category_name: l.Category }
            : {},
        product_name: l.product_name,
        product_make: l.product_make,
        uom: l.uom,
        quantity: l.qty,
        bill_value: l.price,
        gst_percent: l.tax,
      })),
    [lines]
  );

  const [triggerGetBillHistory] = useLazyGetBillHistoryQuery();
  const [addBillHistory] = useAddBillHistoryMutation();

  const getUserData = () => {
    const raw = localStorage.getItem("userDetails");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const feedRef = useRef(null);
  const scrollToFeed = () => {
    if (feedRef.current) {
      feedRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const pushHistoryItem = (itemShape) => {
    const user = getUserData();
    const userName = user?.name || "User";
    const base = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      user: { name: userName },
    };

    let normalized;
    if (itemShape.kind === "note") {
      normalized = { ...base, kind: "note", note: itemShape.note || "" };
    } else if (itemShape.kind === "amount_change") {
      const changes = Array.isArray(itemShape.changes)
        ? itemShape.changes.map((c, idx) => ({
            label: c.label || c.path || `field_${idx + 1}`,
            path: c.path,
            from: c.from,
            to: c.to,
          }))
        : [];
      normalized = {
        ...base,
        kind: "amount_change",
        title: itemShape.title || "Amounts updated",
        currency: "INR",
        changes,
      };
    } else {
      normalized = { ...base, kind: "other", title: itemShape.title || "" };
    }

    setHistoryItems((prev) => [normalized, ...prev]);
    scrollToFeed();
  };

  const handleAddHistoryNote = async (text) => {
    if (!form?._id) return toast.error("Bill id missing.");
    pushHistoryItem({ kind: "note", note: text });
    try {
      const user = getUserData();
      await addBillHistory({
        subject_type: "bill",
        subject_id: form._id,
        event_type: "note",
        message: text,
        createdBy: {
          name: user?.name || "User",
          user_id: user?._id,
        },
        changes: [],
        attachments: [],
      }).unwrap();

      toast.success("Note added");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add note");
    }
  };

  const mapDocToFeedItem = (doc) => {
    const base = {
      id: String(doc._id || crypto.randomUUID()),
      ts: doc.createdAt || doc.updatedAt || new Date().toISOString(),
      user: { name: doc?.createdBy?.name || doc?.createdBy || "System" },
    };

    if (doc.event_type === "amount_change" || doc.event_type === "update") {
      const changes = (Array.isArray(doc?.changes) ? doc.changes : [])
        .filter((c) => typeof c?.from !== "undefined" && typeof c?.to !== "undefined")
        .map((c, idx) => {
          const label =
            c.label ||
            (c.path ? AMOUNT_LABELS_BY_PATH[c.path] || c.path : "") ||
            `field_${idx + 1}`;
          return {
            label,
            path: c.path || undefined,
            from: c.from,
            to: c.to,
          };
        });

      return {
        ...base,
        kind: "amount_change",
        title: doc.message || "Amounts updated",
        currency: "INR",
        changes,
      };
    }
    if (doc.event_type === "note") {
      return { ...base, kind: "note", note: doc.message || "" };
    }
    return { ...base, kind: "other", title: doc.message || "" };
  };

  const fetchBillHistory = async () => {
    if (!form?._id) return;
    try {
      setHistoryLoading(true);
      const data = await triggerGetBillHistory({
        subject_type: "bill",
        subject_id: form._id,
      }).unwrap();
      const rows = Array.isArray(data?.data) ? data.data : [];
      setHistoryItems(rows.map(mapDocToFeedItem));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load PO history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (form._id) fetchBillHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form._id]);

  function buildLogChanges(prev, next) {
    const numericChanges = [];

    const prevUntaxed = Number(prev.bill_value ?? 0);
    const prevGst = Number(prev.gst ?? 0);
    const prevTotal = prevUntaxed + prevGst;

    const nextUntaxed = Number(next.untaxed ?? 0);
    const nextGst = Number(next.tax ?? 0);
    const nextTotal = nextUntaxed + nextGst;

    if (prevUntaxed !== nextUntaxed) {
      numericChanges.push({
        path: "bill_value",
        label: AMOUNT_LABELS_BY_PATH.bill_value,
        from: prevUntaxed,
        to: nextUntaxed,
      });
    }
    if (prevGst !== nextGst) {
      numericChanges.push({
        path: "gst",
        label: AMOUNT_LABELS_BY_PATH.gst,
        from: prevGst,
        to: nextGst,
      });
    }
    if (prevTotal !== nextTotal) {
      numericChanges.push({
        path: "total",
        label: AMOUNT_LABELS_BY_PATH.total,
        from: prevTotal,
        to: nextTotal,
      });
    }

    const prevDate = isoDateOnly(prev.bill_date);
    const nextDate = isoDateOnly(next.bill_date);
    const dateChanged = prevDate !== nextDate;

    const prevDesc = (serverDesc || "").trim();
    const nextDesc = (form.description || "").trim();
    const descChanged = prevDesc !== nextDesc;

    const prevBillNo = (serverBillNo || "").trim();
    const nextBillNo = (form.billNo || "").trim();
    const billChanged = prevBillNo !== nextBillNo;

    return {
      numericChanges,
      dateChanged,
      dateFrom: prevDate,
      dateTo: nextDate,
      descChanged,
      descFrom: prevDesc,
      descTo: nextDesc,
      billChanged,
      billFrom: prevBillNo,
      billTo: nextBillNo,
    };
  }

  const onSubmit = async () => {
    const isCN = isCreditNoteCreate;

    if (!isCN && form.bill_received === "approved") {
      toast.error("Approved bills cannot be updated.Kindly contact IT.");
      return;
    }

    if (!form.billNo?.trim()) return toast.error("Bill Number is required.");
    if (!form.po_number?.trim()) return toast.error("PO Number missing.");

    if (!isCN && overBilling) {
      toast.error("Bill total exceeds remaining PO amount. Please reduce the bill lines.");
      return;
    }

    if (isCN) {
      if (!cnReasonParam.trim()) return toast.error("Debit note reason missing (params).");
      if (!cnReversalParam) return toast.error("Debit note reversal date missing (params).");
      if (!isObjectId(cnSourceBillId)) return toast.error("Debit note bill_id missing (params).");
    }

    try {
      const payload = {
        po_number: form.po_number,
        bill_number: form.billNo,
        bill_date: isoDateOnly(form.billDate),
        bill_value: totals.total,
        description: form.description,
        item: buildPayloadItems(),
      };

      if (isCN) {
        payload.type = "credit_note";
        payload.credit_info = [
          {
            bill_id: cnSourceBillId,
            bill_value: totals.total,
            reason: cnReasonParam.trim(),
            reversal_date: cnReversalParam,
          },
        ];
      }

      if (isEdit) {
        if (!billId) return toast.error("Missing bill id for edit.");

        const nextForCompare = {
          untaxed: totals.untaxed,
          tax: totals.tax,
          bill_date: isoDateOnly(form.billDate),
        };

        const { numericChanges } = buildLogChanges(serverTotals, nextForCompare);

        await updateBill({ _id: billId, updatedData: payload }).unwrap();
        toast.success("Bill updated successfully!");

        const user = getUserData();

        if (numericChanges.length > 0) {
          pushHistoryItem({
            kind: "amount_change",
            title: "Bill updated",
            changes: numericChanges.map((c) => ({
              label: c.label,
              path: c.path,
              from: c.from,
              to: c.to,
            })),
          });

          await addBillHistory({
            subject_type: "bill",
            subject_id: form._id || billId,
            event_type: "amount_change",
            message: "Bill updated",
            createdBy: {
              name: user?.name || "User",
              user_id: user?._id,
            },
            changes: numericChanges,
            attachments: [],
          }).unwrap();
        }

        setServerTotals({
          bill_value: Number(totals.untaxed || 0),
          gst: Number(totals.tax || 0),
          bill_date: isoDateOnly(form.billDate) || "",
        });
        setServerDesc(form.description || "");
        setServerBillNo(form.billNo || "");
      } else {
        await addBill(payload).unwrap();
        toast.success(isCN ? "Debit Note created successfully!" : "Bill created successfully!");

        if (isCN) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("type");
            next.delete("bill_id");
            next.delete("reason");
            next.delete("reversal_date");
            next.delete("mode");
            return next;
          });
        }
      }

      onClose?.();
    } catch (err) {
      console.error(err);
      const msg =
        err?.data?.message ||
        err?.error ||
        (isEdit ? "Failed to update bill" : "Failed to create bill");
      toast.error(msg);
    }
  };

  const onSave = async () => {
    console.log("SAVE payload (draft)", { ...form, lines, totals });
  };

  const loading =
    (isEdit && (fetchingBill || !billId)) ||
    (isCreditNoteCreate && fetchingBill);

  const submitting = postingCreate || postingUpdate;

  const AccountStatus = ({ bill_received }) => {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography level="body-md" sx={{ fontWeight: 600 }}>
          Account Status:
        </Typography>
        <Chip
          color={
            bill_received === "approved"
              ? "success"
              : bill_received === "rejected"
                ? "danger"
                : bill_received === "scm-pending"
                  ? "warning"
                  : "neutral"
          }
          size="md"
          variant="solid"
          sx={{ textTransform: "capitalize", fontWeight: 600 }}
        >
          {`${bill_received || "N/A"}`}
        </Chip>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        ml: fromModal ? 0 : { xs: "0%", lg: "var(--Sidebar-width)" },
        maxWidth: fromModal ? "full" : "100%",
        p: 3,
      }}
    >
      <Box sx={{ boxShadow: "md", p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography level="h3" sx={{ fontWeight: 600, mb: 1 }}>
            {isCreditNoteCreate
              ? "Create Debit Note"
              : isEdit
                ? "Edit Vendor Bill"
                : "Vendor Bill"}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isEdit && (
              <Button
                size="sm"
                variant="outlined"
                onClick={openCreditNote}
                disabled={loading}
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
                Debit Note
              </Button>
            )}

            <AccountStatus bill_received={form.bill_received} />
          </Box>
        </Box>

        {/* Header */}
        <Sheet variant="outlined" sx={{ p: 2, borderRadius: "xl", mb: 2 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography level="body-md" sx={{ mb: 0.5, fontWeight: 600 }}>
                  Bill Number
                </Typography>
                <Input
                  placeholder="e.g. BILL-0001"
                  variant="plain"
                  value={form.billNo}
                  onChange={(e) => setHeader("billNo", e.target.value)}
                  disabled={loading}
                  sx={{
                    "--Input-minHeight": "52px",
                    fontSize: 28,
                    px: 0,
                    color: "#607d8b",
                    "--Input-focusedHighlight": "transparent",
                    "--Input-focusedThickness": "0px",
                    borderBottom: "2px solid #214b7b",
                    borderRadius: 0,
                    ...(loading ? DISABLED_SX : {}),
                  }}
                  slotProps={{
                    input: loading ? { sx: { color: "text.primary" } } : {},
                  }}
                />
              </Box>
            </Grid>

            <Grid container>
              <Grid xs={12} md={6}>
                <Typography level="body-md" sx={{ mb: 0.5, fontWeight: 600 }}>
                  Project Id
                </Typography>
                <Input value={form.project_code} {...editableInputProps(true)} />
              </Grid>

              <Grid xs={12} md={6}>
                <Typography level="body-md" sx={{ mb: 0.5, fontWeight: 600 }}>
                  PO Number
                </Typography>
                <Input value={form.po_number} {...editableInputProps(true)} />
              </Grid>

              <Grid xs={12} md={6}>
                <Typography level="body-md" sx={{ mb: 0.5, fontWeight: 600 }}>
                  PO Value (With GST)
                </Typography>
                <Input type="number" value={form.po_value} {...editableInputProps(true)} />
              </Grid>

              <Grid xs={12} md={6}>
                <Typography level="body-md" sx={{ mb: 0.5, fontWeight: 600 }}>
                  PO Date
                </Typography>
                <Input
                  type="date"
                  value={form.po_date || form.createdAt}
                  {...editableInputProps(true)}
                />
              </Grid>

              <Grid xs={12} md={6}>
                <Typography level="body-md" sx={{ mb: 0.5, fontWeight: 600 }}>
                  Vendor
                </Typography>
                <Input value={form.vendor} {...editableInputProps(true)} />
              </Grid>

              <Grid xs={12} md={6}>
                <Typography level="body-md" sx={{ mb: 0.5, fontWeight: 600 }}>
                  {isCreditNoteCreate ? "Reversal Date" : "Bill Date"}
                </Typography>
                <Input
                  type="date"
                  value={form.billDate}
                  onChange={(e) => setHeader("billDate", e.target.value)}
                  {...editableInputProps(loading)}
                />
              </Grid>
            </Grid>
          </Grid>
        </Sheet>

        {/* Lines */}
        <Sheet variant="outlined" sx={{ p: 2, borderRadius: "xl" }}>
          <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
            <Chip color="primary" variant="soft" size="sm">
              Invoice
            </Chip>
            {isCreditNoteCreate && (
              <Chip color="warning" variant="soft" size="sm">
                Debit Note
              </Chip>
            )}
          </Box>

          <Box
            component="table"
            sx={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: 0,
              "& th, & td": {
                borderBottom: "1px solid var(--joy-palette-neutral-outlinedBorder)",
                p: 1,
                textAlign: "left",
                verticalAlign: "top",
              },
              "& th": { fontWeight: 700, bgcolor: "background.level1" },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: "14%" }}>Category</th>
                <th style={{ width: "18%" }}>Product</th>
                <th style={{ width: "14%" }}>Make</th>
                <th style={{ width: "10%" }}>UoM</th>
                <th style={{ width: "10%" }}>Qty</th>
                <th style={{ width: "14%" }}>Unit Price</th>
                <th style={{ width: "10%" }}>Tax %</th>
                <th style={{ width: "12%" }}>Amount</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const { total } = calcLine(l);
                const lock = loading; // ✅ only lock while loading

                return (
                  <tr key={l.id}>
                    <td style={{ verticalAlign: "top" }}>
                      <Textarea
                        minRows={1}
                        size="sm"
                        variant="plain"
                        placeholder="Category"
                        value={l.Category}
                        onChange={(e) => updateLine(l.id, "Category", e.target.value)}
                        {...editableTextareaProps(lock)}
                        sx={{ whiteSpace: "normal", wordBreak: "break-word" }}
                      />
                    </td>

                    <td style={{ verticalAlign: "top" }}>
                      <Textarea
                        minRows={1}
                        size="sm"
                        variant="plain"
                        placeholder="Product Name"
                        value={l.product_name}
                        onChange={(e) => updateLine(l.id, "product_name", e.target.value)}
                        {...editableTextareaProps(lock)}
                        sx={{ whiteSpace: "normal", wordBreak: "break-word" }}
                      />
                    </td>

                    <td style={{ verticalAlign: "top" }}>
                      <Textarea
                        minRows={1}
                        size="sm"
                        variant="plain"
                        placeholder="Product Make"
                        value={l.product_make}
                        onChange={(e) => updateLine(l.id, "product_make", e.target.value)}
                        {...editableTextareaProps(lock)}
                        sx={{ whiteSpace: "normal", wordBreak: "break-word" }}
                      />
                    </td>

                    <td>
                      <Input
                        variant="plain"
                        size="sm"
                        placeholder="UoM"
                        value={l.uom}
                        onChange={(e) => updateLine(l.id, "uom", e.target.value)}
                        {...editableInputProps(lock)}
                      />
                    </td>

                    <td>
                      <Input
                        variant="plain"
                        size="sm"
                        type="number"
                        placeholder="Quantity"
                        value={l.qty}
                        slotProps={{ input: { min: 0, step: "0.00001" } }}
                        onChange={(e) => updateLine(l.id, "qty", toNum(e.target.value))}
                        {...editableInputProps(lock)}
                      />
                    </td>

                    <td>
                      <Input
                        variant="plain"
                        size="sm"
                        type="number"
                        placeholder="Unit Price"
                        value={l.price}
                        slotProps={{ input: { min: 0, step: "0.00001" } }}
                        onChange={(e) => updateLine(l.id, "price", toNum(e.target.value))}
                        {...editableInputProps(lock)}
                      />
                    </td>

                    <td>
                      <Input
                        variant="plain"
                        size="sm"
                        type="number"
                        placeholder="Tax %"
                        value={l.tax}
                        slotProps={{ input: { min: 0, step: "0.00001" } }}
                        onChange={(e) => updateLine(l.id, "tax", toNum(e.target.value))}
                        {...editableInputProps(lock)}
                      />
                    </td>

                    <td>
                      <Typography level="body-sm" fontWeight="lg">
                        {currency(total)}
                      </Typography>
                    </td>

                    <td>
                      <IconButton
                        variant="plain"
                        color="danger"
                        onClick={() => removeLine(l.id)}
                        disabled={loading}
                      >
                        <DeleteOutline />
                      </IconButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Box>

          {/* Allow add line when NOT edit (same as your old logic) */}
          {!isEdit && (
            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <Button
                size="sm"
                variant="plain"
                startDecorator={<Plus />}
                onClick={addLine}
                disabled={loading}
              >
                Add a line
              </Button>
            </Box>
          )}

          {/* Description */}
          <Textarea
            minRows={3}
            placeholder="Write Description of Bill"
            value={form.description}
            onChange={(e) => setHeader("description", e.target.value)}
            {...editableTextareaProps(loading)}
            sx={{ mt: 2 }}
          />

          {/* Totals block */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 2 }}>
            <Sheet variant="soft" sx={{ borderRadius: "lg", p: 2, minWidth: 320 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  rowGap: 0.5,
                  columnGap: 1.5,
                  alignItems: "center",
                }}
              >
                <Typography level="body-sm" textColor="text.tertiary">
                  Total PO Value:
                </Typography>
                <Typography level="body-sm" fontWeight="lg">
                  {currency(form.po_value)}
                </Typography>

                <Typography level="body-sm">Total Billed Value:</Typography>
                <Typography level="body-sm" fontWeight={700}>
                  {currency(form.total_billed + (isCreditNoteCreate ? -totals.total : totals.total))}
                </Typography>

                <Typography level="title-md" sx={{ mt: 0.5 }}>
                  Remaining Amount:
                </Typography>
                <Typography
                  level="title-md"
                  fontWeight="xl"
                  sx={{
                    mt: 0.5,
                    color: overBilling ? "danger.600" : "success.700",
                  }}
                >
                  {currency(remainingAmount)}
                </Typography>
              </Box>
            </Sheet>

            <Sheet variant="soft" sx={{ borderRadius: "lg", p: 2, minWidth: 320 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  rowGap: 0.5,
                  columnGap: 1.5,
                  alignItems: "center",
                }}
              >
                <Typography level="body-sm" textColor="text.tertiary">
                  Untaxed Amount:
                </Typography>
                <Typography level="body-sm" fontWeight="lg">
                  {currency(totals.untaxed)}
                </Typography>

                <Typography level="body-sm">Tax:</Typography>
                <Typography level="body-sm" fontWeight={700}>
                  {currency(totals.tax)}
                </Typography>

                <Typography level="title-md" sx={{ mt: 0.5 }}>
                  {isCreditNoteCreate ? "Debit Note Amount:" : "This Bill Total:"}
                </Typography>
                <Typography level="title-md" fontWeight="xl" sx={{ mt: 0.5 }}>
                  {currency(totals.total)}
                </Typography>
              </Box>
            </Sheet>
          </Box>
        </Sheet>

        {/* Footer actions */}
        <Box sx={{ display: "flex", gap: 1.5, mt: 2, justifyContent: "flex-end" }}>
          <Button
            startDecorator={<RestartAlt />}
            variant="outlined"
            onClick={onSave}
            disabled={loading}
          >
            Back
          </Button>

          <Button
            startDecorator={<Send />}
            variant="solid"
            onClick={onSubmit}
            disabled={overBilling || submitting || loading || (!isCreditNoteCreate && form.bill_received === "approved")}
          >
            {isCreditNoteCreate ? "Submit Debit Note" : isEdit ? "Update Bill" : "Submit Bill"}
          </Button>
        </Box>
      </Box>

      <Box ref={feedRef}>
        <POUpdateFeed items={historyItems} onAddNote={handleAddHistoryNote} compact />
      </Box>

      {/* Credit Note Modal (only in edit mode of original bill) */}
      <Modal open={cnOpen} onClose={closeCreditNote}>
        <ModalDialog sx={{ width: 1100, borderRadius: "lg" }}>
          <ModalClose />
          <DialogTitle sx={{ fontWeight: 700 }}>Debit Note</DialogTitle>
          <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.12)" }} />

          <DialogContent>
            <Box sx={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 2 }}>
              <Typography level="title-md" sx={{ fontWeight: 700 }}>
                Reason displayed on Debit Note
              </Typography>

              <Input
                variant="plain"
                value={cnReason}
                onChange={(e) => setCnReason(e.target.value)}
                sx={{
                  borderRadius: 0,
                  px: 0,
                  "--Input-focusedHighlight": "transparent",
                  "--Input-focusedThickness": "0px",
                  borderBottom: "2px solid #3366a3",
                  "&:hover": { borderBottomColor: "#3366a3" },
                }}
              />

              <Typography level="title-md" sx={{ fontWeight: 700 }}>
                Reversal date
              </Typography>

              <Input
                type="date"
                value={cnDate}
                onChange={(e) => setCnDate(e.target.value)}
                sx={{ width: 180, "--Input-focusedHighlight": "#3366a3" }}
              />
            </Box>

            <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.12)" }} />

            <Box sx={{ display: "flex", gap: 1.2 }}>
              <Button
                variant="solid"
                onClick={handleReverseOnly}
                sx={{
                  backgroundColor: "#3366a3",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#285680" },
                  height: "8px",
                }}
              >
                Reverse
              </Button>

              <Button
                variant="outlined"
                onClick={closeCreditNote}
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
                Discard
              </Button>
            </Box>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
