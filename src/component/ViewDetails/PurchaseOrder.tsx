import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  Dropdown,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  Sheet,
  Table,
  Typography,
  Select,
  Option,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  Stack,
  FormControl,
  FormLabel,
  Textarea,
} from "@mui/joy";
import DeleteIcon from "@mui/icons-material/Delete";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import InsertDriveFileRounded from "@mui/icons-material/InsertDriveFileRounded";
import { CurrencyRupee, Search } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import {
  useGetPurchaseOrderbyProjectIdQuery,
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

// ✅ Pending (red) vs Fully Sold (green)
const getSalesStatus = (client) => {
  const poBasic = toNum(client?.po_basic);
  const billBasic = toNum(
    client?.totalBasicBillValue ?? client?.bill_basic ?? 0,
  );
  const remainingSales = toNum(client?.remaining_sales_value);

  const isFullySold =
    poBasic > 0 && billBasic === poBasic && remainingSales === 0;

  return {
    label: isFullySold ? "Fully Sold" : "Pending",
    color: isFullySold ? "success" : "danger",
  };
};

const PurchaseOrder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const project_id = searchParams.get("_id") || "";

  const poPage = Math.max(1, parseInt(searchParams.get("po_page") || "1", 10));
  const poLimit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("po_limit") || "10", 10)),
  );

  const [searchClient, setSearchClient] = useState(
    searchParams.get("search") || "",
  );
  const [page, setPage] = useState(poPage);
  const [limit, setLimit] = useState(poLimit);

  const [ClientSummary, setClientSummary] = useState([]);
  const [clientHistory, setClientHistory] = useState(null);

  const [selectedClients, setSelectedClients] = useState([]);

  // ✅ Sales conversion states (moved from CustomerPaymentSummary)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [salesRemarks, setSalesRemarks] = useState("");
  const [salesInvoice, setSalesInvoice] = useState("");
  const [salesFiles, setSalesFiles] = useState([]); // [{file}]
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const [selectedPO, setSelectedPO] = useState([]); // full PO objects
  const [salesAmounts, setSalesAmounts] = useState({}); // { [poId]: { basic, gst } }

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

  useEffect(() => {
    setPage(poPage);
    setLimit(poLimit);
  }, [poPage, poLimit]);

  // ---------------- columns ----------------
  const COLUMN_CONFIG = useMemo(
    () => [
      { key: "vendor", label: "Vendor" },
      { key: "item", label: "Item" },
      { key: "poBasic", label: "PO Basic" },
      { key: "poGst", label: "PO GST" },
      { key: "poTotal", label: "PO Total" },
      { key: "advancePaid", label: "Advance Paid" },
      { key: "advanceRemaining", label: "Advance Remaining" },
      { key: "billBasic", label: "Bill Basic" },
      { key: "billGst", label: "Bill GST" },
      { key: "billedTotal", label: "Billed Total" },
      { key: "remainingSales", label: "Remaining Sales (w/o GST)" },
      { key: "remainingSalesGST", label: "Remaining Sales (inc GST)" },
      { key: "select", label: "Select" },
    ],
    [],
  );

  const STORAGE_KEY = "customer_po_columns";

  // ✅ default visibility (all true)
  const defaults = useMemo(() => {
    const o = {};
    for (const c of COLUMN_CONFIG) o[c.key] = c.defaultVisible !== false;
    return o;
  }, [COLUMN_CONFIG]);

  const [vis, setVis] = useState(() => {
    // ✅ load once from localStorage (safe)
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

  // ✅ persist every time it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vis));
    } catch {}
  }, [vis]);

  const show = (k) => !!vis[k];
  const toggle = (k) => setVis((p) => ({ ...p, [k]: !p[k] }));
  const setAll = (flag) =>
    setVis(() => {
      const next = {};
      for (const c of COLUMN_CONFIG) next[c.key] = !!flag;
      return next;
    });
  const reset = () =>
    setVis(() => {
      const next = {};
      for (const c of COLUMN_CONFIG) next[c.key] = true;
      return next;
    });

  const visibleCount = (...keys) => keys.filter((k) => show(k)).length;

  // ---------------- data fetch ----------------
  const {
    data: apiRes,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetPurchaseOrderbyProjectIdQuery(
    { project_id, page, limit: limit, search: searchClient },
    { skip: !project_id },
  );

  useEffect(() => {
    if (!apiRes) return;
    setClientHistory(apiRes);
    setClientSummary(Array.isArray(apiRes?.data) ? apiRes.data : []);
    setSelectedClients([]);
  }, [apiRes]);

  // ---------------- pagination ----------------
  const total = clientHistory?.meta?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / (limit || 10)));

  // ---------------- totals (page fallback) ----------------
  const pageTotals = useMemo(() => {
    const rows = Array.isArray(ClientSummary) ? ClientSummary : [];
    const sum = (k) => rows.reduce((a, r) => a + Number(r?.[k] || 0), 0);

    return {
      total_po_basic: sum("po_basic"),
      total_gst: sum("gst"),
      total_po_value: sum("po_value"),
      total_advance_paid: sum("amount_paid") || sum("advance_paid"),
      total_remaining_advance: sum("remaining_advance"),
      total_bill_basic: sum("bill_basic") || sum("totalBasicBillValue"),
      total_bill_gst: sum("bill_gst") || sum("totalBillGst"),
      total_billed_value: sum("total_billed_value") || sum("total_billed"),
      total_remaining_sales_value: sum("remaining_sales_value"),
      total_remaining_sales_value_with_gst: sum(
        "remaining_sales_value_with_gst",
      ),
    };
  }, [ClientSummary]);

  const metaTotals = clientHistory?.meta || {};
  const footer = {
    total_po_basic: metaTotals?.total_po_basic ?? pageTotals.total_po_basic,
    total_gst: metaTotals?.total_gst ?? pageTotals.total_gst,
    total_po_value: metaTotals?.total_po_value ?? pageTotals.total_po_value,
    total_advance_paid:
      metaTotals?.total_advance_paid ?? pageTotals.total_advance_paid,
    total_remaining_advance:
      metaTotals?.total_remaining_advance ?? pageTotals.total_remaining_advance,
    total_bill_basic:
      metaTotals?.total_bill_basic ?? pageTotals.total_bill_basic,
    total_bill_gst: metaTotals?.total_bill_gst ?? pageTotals.total_bill_gst,
    total_billed_value:
      metaTotals?.total_billed_value ?? pageTotals.total_billed_value,
    total_remaining_sales_value:
      metaTotals?.total_remaining_sales_value ??
      pageTotals.total_remaining_sales_value,
    total_remaining_sales_value_with_gst:
      metaTotals?.total_remaining_sales_value_with_gst ??
      pageTotals.total_remaining_sales_value_with_gst,
  };

  // ---------------- item label ----------------
  const getItemLabel = (client) => {
    const items = Array.isArray(client?.item) ? client.item : [];
    if (!items.length) return "—";
    return items
      .map((it) => it?.category?.name || it?.category_name || it?.product_name)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
  };

  // ---------------- sales conversion mutation ----------------
  const [updateSalesPO, { isLoading: isConverting }] =
    useUpdateSalesPOMutation();

  const openConfirm = () => {
    if (!selectedClients.length) return;
    setConfirmCloseOpen(true);
  };

  const openSalesModalFromSelection = () => {
    if (!selectedClients.length) {
      toast.error("Select at least 1 PO for Sales Conversion.");
      return;
    }

    const selectedPOsData = ClientSummary.filter((po) =>
      selectedClients.includes(po._id),
    );

    if (!selectedPOsData.length) {
      toast.error("Selected PO(s) not found in current list.");
      return;
    }

    // ✅ allow only if billed > 0
    const validPOs = selectedPOsData.filter((po) => {
      const billed =
        Number(po?.total_billed_value ?? po?.total_billed ?? 0) ||
        Number(po?.billed_total ?? 0);
      return billed > 0;
    });

    if (!validPOs.length) {
      toast.error("Only POs with billed value > 0 can be converted.");
      return;
    }

    setSelectedPO(validPOs);

    // init input map
    setSalesAmounts(
      validPOs.reduce((acc, po) => {
        acc[po._id] = { basic: "", gst: "" };
        return acc;
      }, {}),
    );

    setSalesInvoice("");
    setSalesRemarks("");
    setSalesFiles([]);
    setSalesOpen(true);
  };

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

  const handleSalesConvert = async () => {
    try {
      if (!Array.isArray(selectedPO) || selectedPO.length === 0) {
        toast.error("Select at least one PO.");
        return;
      }

      const inv = String(salesInvoice || "").trim();
      if (!inv) {
        toast.error("Sales Invoice No. is required.");
        return;
      }

      const results = await Promise.allSettled(
        selectedPO.map(async (po) => {
          const id = po?._id;
          const poNumber = po?.po_number;

          const basic = Number(salesAmounts?.[id]?.basic ?? 0);
          const gstPercent = Number(salesAmounts?.[id]?.gst ?? 0);

          if (!Number.isFinite(basic) || basic <= 0) {
            throw new Error(`Invalid Basic Sales for PO ${poNumber}`);
          }
          if (!Number.isFinite(gstPercent) || gstPercent < 0) {
            throw new Error(`Invalid GST % for PO ${poNumber}`);
          }

          return await updateSalesPO({
            id,
            po_number: poNumber,
            remarks: String(salesRemarks || "").trim(),
            basic_sales: basic,
            gst_on_sales: gstPercent, // ✅ percent
            sales_invoice: inv,
            isSales: "true",
            files: salesFiles || [],
          }).unwrap();
        }),
      );

      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.filter((r) => r.status === "rejected").length;

      if (ok) toast.success(`Converted ${ok} PO(s).`);
      if (fail) {
        const firstErr = results.find((r) => r.status === "rejected")?.reason;
        toast.warning(
          `Failed ${fail} PO(s). ${firstErr?.message ? firstErr.message : ""}`,
        );
      }

      if (ok) {
        setSalesOpen(false);
        setConfirmCloseOpen(false);
        setSelectedPO([]);
        setSelectedClients([]);
        setSalesFiles([]);
        setSalesRemarks("");
        setSalesInvoice("");
        setSalesAmounts({});
        refetch?.();
      }
    } catch (err) {
      toast.error(err?.message || "Sales conversion failed.");
    }
  };

  return (
    <>
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
          }}
        >
          <Input
            placeholder="Search PO Number, Item or Vendor..."
            value={searchClient}
            onChange={(e) => {
              const v = e.target.value;
              setSearchClient(v);
              setPage(1);
              updateParams({ search: v, po_page: 1 });
            }}
            startDecorator={<Search size={16} />}
            sx={{ width: { xs: "100%", md: "50%" } }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="solid"
              color="primary"
              disabled={selectedClients.length === 0}
              onClick={openConfirm}
            >
              Sales Conversion
            </Button>

            {/* Column menu */}
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
                    Columns
                  </Typography>

                  {COLUMN_CONFIG.map((c) => (
                    <Box
                      key={c.key}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        py: 0.5,
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
                  <Button
                    size="sm"
                    variant="plain"
                    onClick={() => setAll(true)}
                  >
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
        </Box>

        {/* Table */}
        <Sheet
          variant="outlined"
          sx={{
            borderRadius: 12,
            overflowX: "auto",
            boxShadow: "md",
            maxHeight: "60vh",
            overflow: "auto",
          }}
        >
          <Table
            borderAxis="both"
            stickyHeader
            sx={{
              width: "max-content",
              minWidth: "100%",
              tableLayout: "auto",
              "& thead th": { textAlign: "center", whiteSpace: "nowrap" },
              "& td": { whiteSpace: "nowrap" },
            }}
          >
            <thead>
              <tr>
                <th rowSpan={2}>PO Number</th>
                {show("vendor") && <th rowSpan={2}>Vendor</th>}
                {show("item") && <th rowSpan={2}>Item</th>}

                {(show("poBasic") || show("poGst") || show("poTotal")) && (
                  <th colSpan={visibleCount("poBasic", "poGst", "poTotal")}>
                    PO Value (₹)
                  </th>
                )}

                {show("advancePaid") && <th rowSpan={2}>Advance Paid (₹)</th>}
                {show("advanceRemaining") && (
                  <th rowSpan={2}>Advance Remaining (₹)</th>
                )}

                {(show("billBasic") ||
                  show("billGst") ||
                  show("billedTotal")) && (
                  <th
                    colSpan={visibleCount(
                      "billBasic",
                      "billGst",
                      "billedTotal",
                    )}
                  >
                    Total Billed (₹)
                  </th>
                )}

                {show("remainingSales") && (
                  <th rowSpan={2}>Remaining Sales Closure(w/o GST)</th>
                )}
                {show("remainingSalesGST") && (
                  <th rowSpan={2}>Remaining Sales Closure(inc GST)</th>
                )}

                {show("select") && (
                  <th rowSpan={2}>
                    <Checkbox
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedClients(ClientSummary.map((c) => c._id));
                        else setSelectedClients([]);
                      }}
                      checked={
                        ClientSummary.length > 0 &&
                        selectedClients.length === ClientSummary.length
                      }
                      disabled={ClientSummary.length === 0}
                    />
                  </th>
                )}
              </tr>

              <tr>
                {show("poBasic") && <th>Basic (₹)</th>}
                {show("poGst") && <th>GST (₹)</th>}
                {show("poTotal") && <th>Total (₹)</th>}

                {show("billBasic") && <th>Basic (₹)</th>}
                {show("billGst") && <th>GST (₹)</th>}
                {show("billedTotal") && <th>Total (₹)</th>}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: "center", padding: 20 }}>
                    <Typography level="body-md" sx={{ fontStyle: "italic" }}>
                      Loading purchase history...
                    </Typography>
                  </td>
                </tr>
              ) : ClientSummary.length > 0 ? (
                ClientSummary.map((client) => (
                  <tr key={client._id}>
                    <td>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        <Typography level="body-sm" fontWeight={600}>
                          {client.po_number || "N/A"}
                        </Typography>
                        {(() => {
                          const st = getSalesStatus(client);
                          return (
                            <Chip size="sm" variant="soft" color={st.color}>
                              {st.label}
                            </Chip>
                          );
                        })()}
                      </Box>
                    </td>

                    {show("vendor") && <td>{client.vendor || "N/A"}</td>}
                    {show("item") && (
                      <td title={getItemLabel(client)}>
                        {getItemLabel(client)}
                      </td>
                    )}

                    {show("poBasic") && (
                      <td>
                        <RupeeValue value={client.po_basic || 0} />
                      </td>
                    )}
                    {show("poGst") && (
                      <td>
                        <RupeeValue value={client.gst || 0} />
                      </td>
                    )}
                    {show("poTotal") && (
                      <td>
                        <RupeeValue value={client.po_value || 0} />
                      </td>
                    )}

                    {show("advancePaid") && (
                      <td>
                        <RupeeValue
                          value={client.amount_paid || client.advance_paid || 0}
                        />
                      </td>
                    )}
                    {show("advanceRemaining") && (
                      <td>
                        <RupeeValue value={client.remaining_advance || 0} />
                      </td>
                    )}

                    {show("billBasic") && (
                      <td>
                        <RupeeValue
                          value={
                            client.totalBasicBillValue || client.bill_basic || 0
                          }
                        />
                      </td>
                    )}
                    {show("billGst") && (
                      <td>
                        <RupeeValue
                          value={client.totalBillGst || client.bill_gst || 0}
                        />
                      </td>
                    )}
                    {show("billedTotal") && (
                      <td>
                        <RupeeValue
                          value={
                            client.total_billed_value ||
                            client.total_billed ||
                            0
                          }
                        />
                      </td>
                    )}

                    {show("remainingSales") && (
                      <td>
                        <RupeeValue value={client.remaining_sales_value || 0} />
                      </td>
                    )}
                    {show("remainingSalesGST") && (
                      <td>
                        <RupeeValue
                          value={client.remaining_sales_value_with_gst || 0}
                        />
                      </td>
                    )}

                    {show("select") && (
                      <td style={{ textAlign: "center" }}>
                        <Checkbox
                          checked={selectedClients.includes(client._id)}
                          onChange={() =>
                            setSelectedClients((prev) =>
                              prev.includes(client._id)
                                ? prev.filter((id) => id !== client._id)
                                : [...prev, client._id],
                            )
                          }
                        />
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} style={{ textAlign: "center", padding: 20 }}>
                    <Typography level="body-md">
                      No purchase history available
                    </Typography>
                  </td>
                </tr>
              )}
            </tbody>

            {ClientSummary.length > 0 && (
              <tfoot>
                <tr>
                  <td
                    colSpan={
                      1 + (show("vendor") ? 1 : 0) + (show("item") ? 1 : 0)
                    }
                    style={{ textAlign: "right", fontWeight: 700 }}
                  >
                    Total
                  </td>

                  {show("poBasic") && (
                    <td>
                      <RupeeValue value={footer.total_po_basic || 0} />
                    </td>
                  )}
                  {show("poGst") && (
                    <td>
                      <RupeeValue value={footer.total_gst || 0} />
                    </td>
                  )}
                  {show("poTotal") && (
                    <td>
                      <RupeeValue value={footer.total_po_value || 0} />
                    </td>
                  )}

                  {show("advancePaid") && (
                    <td>
                      <RupeeValue value={footer.total_advance_paid || 0} />
                    </td>
                  )}
                  {show("advanceRemaining") && (
                    <td>
                      <RupeeValue value={footer.total_remaining_advance || 0} />
                    </td>
                  )}

                  {show("billBasic") && (
                    <td>
                      <RupeeValue value={footer.total_bill_basic || 0} />
                    </td>
                  )}
                  {show("billGst") && (
                    <td>
                      <RupeeValue value={footer.total_bill_gst || 0} />
                    </td>
                  )}
                  {show("billedTotal") && (
                    <td>
                      <RupeeValue value={footer.total_billed_value || 0} />
                    </td>
                  )}

                  {show("remainingSales") && (
                    <td>
                      <RupeeValue
                        value={footer.total_remaining_sales_value || 0}
                      />
                    </td>
                  )}
                  {show("remainingSalesGST") && (
                    <td>
                      <RupeeValue
                        value={footer.total_remaining_sales_value_with_gst || 0}
                      />
                    </td>
                  )}

                  {show("select") && <td />}
                </tr>
              </tfoot>
            )}
          </Table>
        </Sheet>

        {/* ✅ Pagination BELOW table */}
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
                updateParams({ po_limit: newLimit, po_page: 1 });
              }}
              sx={{ minWidth: 60 }}
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
                updateParams({ po_page: next });
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
                updateParams({ po_page: next });
              }}
            >
              Next
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ✅ Confirm modal */}
      <Modal open={confirmCloseOpen} onClose={() => setConfirmCloseOpen(false)}>
        <ModalDialog sx={{ width: 420 }}>
          <DialogTitle>
            Close selected PO{selectedClients.length > 1 ? "s" : ""}?
          </DialogTitle>

          <DialogContent>
            Are you sure you want to convert {selectedClients.length} PO
            {selectedClients.length > 1 ? "s" : ""} to Sales?
          </DialogContent>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="plain" onClick={() => setConfirmCloseOpen(false)}>
              No
            </Button>

            <Button
              variant="solid"
              color="danger"
              onClick={() => {
                setConfirmCloseOpen(false);
                openSalesModalFromSelection();
              }}
            >
              Yes, continue
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>

      {/* ✅ Sales Conversion modal */}
      <Modal open={salesOpen} onClose={() => setSalesOpen(false)}>
        <ModalDialog sx={{ width: 1100, borderRadius: "lg", p: 3 }}>
          <DialogTitle sx={{ fontWeight: 700, mb: 1 }}>
            Sales Conversion
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
                  const id = po._id;
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
                      key={id}
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
                        value={salesAmounts[id]?.basic ?? ""}
                        placeholder="Basic"
                        onChange={(e) => {
                          const raw = e.target.value;

                          if (raw === "") {
                            setSalesAmounts((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], basic: "" },
                            }));
                            return;
                          }

                          const val = Number(raw);
                          if (!Number.isFinite(val)) return;

                          const maxAllowed = Math.max(
                            0,
                            Number(remainingSales || 0),
                          );
                          if (val > maxAllowed) {
                            toast.warning(
                              "Basic Sales can't be greater than Remaining Sales (w/o GST).",
                            );
                            setSalesAmounts((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], basic: String(maxAllowed) },
                            }));
                            return;
                          }

                          setSalesAmounts((prev) => ({
                            ...prev,
                            [id]: { ...prev[id], basic: raw },
                          }));
                        }}
                        inputProps={{
                          min: 0,
                          max: Math.max(0, Number(remainingSales || 0)),
                          step: "0.01",
                        }}
                        sx={{ width: 120, ml: "auto" }}
                      />

                      <Input
                        size="sm"
                        type="number"
                        value={salesAmounts[id]?.gst ?? ""}
                        placeholder="GST %"
                        onChange={(e) =>
                          setSalesAmounts((prev) => ({
                            ...prev,
                            [id]: { ...prev[id], gst: e.target.value },
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
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
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
                  onChange={onFileInputChange}
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
    </>
  );
};

export default PurchaseOrder;
