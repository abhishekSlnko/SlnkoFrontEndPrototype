import {
  Box,
  FormControl,
  Input,
  Option,
  Select,
  Sheet,
  Table,
  Typography,
  Button,
} from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CurrencyRupee, Search } from "@mui/icons-material";
import { useGetDebitMoneybyProjectIdQuery } from "../../redux/Accounts";

const RupeeValue = ({ value, showSymbol = true }) => {
  const n = Number(value);
  if (!isFinite(n)) return "—";
  const formatted = n.toLocaleString("en-IN");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {showSymbol && (
        <CurrencyRupee style={{ fontSize: 16, marginBottom: 1 }} />
      )}
      <span>{formatted}</span>
    </span>
  );
};

const formatDateTime = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "—";

  return x.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }); // e.g. 18 Jan 2026
};

const useDebouncedValue = (value, delay = 450) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const toInt = (v, fallback) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const PAY_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Payment Against PO", label: "Payment Against PO" },
  { value: "Adjustment", label: "Customer Adjustment" },
  { value: "Slnko Service Charge", label: "Slnko Service Charge" },
  { value: "Payment Adjustment", label: "Payment Adjustment" },
  { value: "Other", label: "Other" },
];

const Debit = () => {
  const [user, setUser] = useState(null);
  const [selectedDebits, setSelectedDebits] = useState([]);

  const [searchParams, setSearchParams] = useSearchParams();
  const project_id = searchParams.get("_id") || "";

  const dbPage = toInt(searchParams.get("db_page"), 1);
  const dbLimit = toInt(searchParams.get("db_limit"), 10);
  const dbSearchParam = String(searchParams.get("db_search") || "");
  const dbPayType = String(searchParams.get("db_pay_type") || "all");

  // local input for typing
  const [searchInput, setSearchInput] = useState(dbSearchParam);
  const debouncedSearch = useDebouncedValue(searchInput, 450);

  useEffect(() => {
    const raw = localStorage.getItem("userDetails");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  // keep input synced if URL changes
  useEffect(() => {
    setSearchInput(dbSearchParam);
  }, [dbSearchParam]);

  const updateParams = (patch, { replace = false } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      const val = String(v ?? "").trim();
      if (!val) next.delete(k);
      else next.set(k, val);
    });
    setSearchParams(next, { replace });
  };

  // push debounced search to URL and reset page
  useEffect(() => {
    if (debouncedSearch !== dbSearchParam) {
      updateParams(
        { db_search: debouncedSearch, db_page: 1 },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // API expects empty string for "all"
  const pay_type = dbPayType === "all" ? "" : dbPayType;

  const {
    data: debit,
    isLoading,
    refetch,
    error,
  } = useGetDebitMoneybyProjectIdQuery({
    project_id,
    page: dbPage,
    limit: dbLimit,
    search: dbSearchParam,
    pay_type,
  });

  const DebitSummary = Array.isArray(debit?.data) ? debit.data : [];
  const total = Number(debit?.total || 0);
  const totalPages = Number(debit?.totalPages || 1);

  // clear selection on dataset change
  useEffect(() => {
    setSelectedDebits([]);
  }, [dbPage, dbLimit, dbSearchParam, dbPayType, project_id]);

  const allIdsOnPage = useMemo(
    () => DebitSummary.map((r) => r._id).filter(Boolean),
    [DebitSummary],
  );

  const totalDebitedOnPage = useMemo(() => {
    return DebitSummary.reduce((sum, row) => {
      const n = Number(row?.amount_paid);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [DebitSummary]);

  return (
    <Box mt={2}>
      {/* Header Controls */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "flex-end" },
          flexDirection: { md: "row", xs: "column" },
          gap: 2,
          "@media print": { display: "none" },
        }}
        mb={2}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Search */}
          <FormControl sx={{ minWidth: { xs: "100%", md: "50%" } }}>
            <Input
              placeholder="Search by PO Number, Paid For, Vendor, UTR..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              startDecorator={<Search size={16} />}
            />
          </FormControl>

          {/* Pay Type dropdown */}
          <Select
            value={dbPayType}
            onChange={(_, v) =>
              updateParams({ db_pay_type: v || "all", db_page: 1 })
            }
            sx={{ minWidth: 240 }}
          >
            {PAY_TYPE_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Box>
      </Box>

      <Sheet
        variant="outlined"
        sx={{
          borderRadius: "12px",
          overflow: "auto",
          boxShadow: "md",
          maxWidth: "100%",
          maxHeight: "60vh",
        }}
      >
        <Table
          borderAxis="both"
          stickyHeader
          sx={{
            minWidth: "100%",
            tableLayout: "fixed",
            "& th, & td": {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
            "& th.payIdCell, & td.payIdCell": {
              width: 220,
              maxWidth: 220,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            },
            "& th.payTypeCell, & td.payTypeCell": {
              width: 220,
              maxWidth: 220,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            },
            "& th.payToCell, & td.payToCell": {
              width: 220,
              maxWidth: 220,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            },
            "& th.poNumberCell, & td.poNumberCell": {
              width: 220,
              maxWidth: 220,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            },
            "& th.utrCell, & td.utrCell": {
              width: 180,
              maxWidth: 180,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            },
            "& th": { fontWeight: 700 },
          }}
        >
          <thead>
            <tr>
              <th>Debit Date</th>
              <th>Pay Id</th>
              <th>Pay Type</th>
              <th>PO Number</th>
              <th>Paid For</th>
              <th>Paid To</th>
              <th>Amount (₹)</th>
              <th className="utrCell">UTR</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
                  <Typography level="body-md" sx={{ fontStyle: "italic" }}>
                    Loading debit history...
                  </Typography>
                </td>
              </tr>
            ) : DebitSummary.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
                  <Typography level="body-md">
                    No debit history available
                  </Typography>
                </td>
              </tr>
            ) : (
              DebitSummary.map((row) => (
                <tr key={row._id || row.id}>
                  <td>{formatDateTime(row.dbt_date || row.createdAt)}</td>
                  <td className="payIdCell" title={row?.pay_id || "-"}>
                    {row?.pay_id || "—"}
                  </td>
                  <td className="payTypeCell" title={row?.pay_type || "-"}>
                    {row.pay_type || "—"}
                  </td>
                  <td className="poNumberCell" title={row?.po_number || "-"}>
                    {row.po_number || "—"}
                  </td>
                  <td>{row.paid_for || "—"}</td>
                  <td className="payToCell" title={row?.vendor || "-"}>
                    {row.vendor || "—"}
                  </td>
                  <td>
                    <RupeeValue value={row.amount_paid ?? 0} />
                  </td>
                  <td className="utrCell" title={row.utr || "-"}>
                    {row.utr || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {DebitSummary.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                <td colSpan={6} style={{ color: "red", textAlign: "right" }}>
                  Total Debited
                </td>
                <td colSpan={2} style={{ color: "red" }}>
                  <RupeeValue value={totalDebitedOnPage} />
                </td>
              </tr>
            </tfoot>
          )}
        </Table>

        {/* ✅ Pagination Footer */}
      </Sheet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          mt: 2,
          "@media print": { display: "none" },
        }}
      >
        <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
          Page <b>{dbPage}</b> of <b>{totalPages}</b> • Total Rows{" "}
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
            value={String(dbLimit)}
            onChange={(_, v) =>
              updateParams({ db_limit: v || "10", db_page: 1 })
            }
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
            disabled={dbPage <= 1 || isLoading}
            onClick={() => updateParams({ db_page: Math.max(1, dbPage - 1) })}
          >
            Prev
          </Button>

          <Button
            size="sm"
            variant="outlined"
            disabled={dbPage >= totalPages || isLoading}
            onClick={() =>
              updateParams({ db_page: Math.min(totalPages, dbPage + 1) })
            }
          >
            Next
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Debit;
