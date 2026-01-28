import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Sheet,
  Table,
  Typography,
  Button,
  Select,
  Option,
  Input,
} from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  useDeleteCreditByIdMutation,
  useGetCreditMoneybyProjectIdQuery,
} from "../../redux/Accounts";
import { CurrencyRupee, Search } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";

const RupeeValue = ({ value, showSymbol = true }) => {
  const n = Number(value);
  if (!isFinite(n)) return "—";
  const formatted = n.toLocaleString("en-IN");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
      }}
    >
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


const normalizeMode = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const CreditModeChip = ({ mode }) => {
  const m = normalizeMode(mode);

  const label =
    m === "account_transfer"
      ? "Account Transfer"
      : m === "loan"
      ? "Loan"
      : m === "cash"
      ? "Cash"
      : mode || "—";

  // loan -> green, cash -> light green, account_transfer -> dark green
  const chipSx =
    m === "loan"
      ? { bgcolor: "#2e7d32", color: "#fff" }
      : m === "cash"
      ? { bgcolor: "#c8f7d0", color: "#0b3d1a" }
      : m === "account_transfer"
      ? { bgcolor: "#145a32", color: "#fff" }
      : { bgcolor: "neutral.softBg", color: "neutral.softColor" };

  return (
    <Chip size="sm" variant="solid" sx={{ ...chipSx, px: 1 }}>
      {label}
    </Chip>
  );
};

// ✅ debounce
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

const Credit = () => {
  const [user, setUser] = useState(null);
  const [selectedCredits, setSelectedCredits] = useState([]);

  const [searchParams, setSearchParams] = useSearchParams();

  const project_id = searchParams.get("_id") || "";

  const crPage = toInt(searchParams.get("cr_page"), 1);
  const crLimit = toInt(searchParams.get("cr_limit"), 10);
  const crSearchParam = String(searchParams.get("cr_search") || "");
  const crTab = String(searchParams.get("cr_tab") || "all");

  const [searchInput, setSearchInput] = useState(crSearchParam);
  const debouncedSearch = useDebouncedValue(searchInput, 450);

  // keep input in sync if user changes URL manually or navigation
  useEffect(() => {
    setSearchInput(crSearchParam);
  }, [crSearchParam]);

  const updateParams = (patch, { replace = false } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      const val = String(v ?? "").trim();
      if (!val) next.delete(k);
      else next.set(k, val);
    });
    setSearchParams(next, { replace });
  };

  useEffect(() => {
    // only update if changed
    if (debouncedSearch !== crSearchParam) {
      updateParams(
        {
          cr_search: debouncedSearch,
          cr_page: 1,
        },
        { replace: true }
      );
    }
  }, [debouncedSearch]);

  const apiCrMode = crTab === "all" ? "" : crTab;

  const {
    data: responseData,
    isLoading,
    refetch,
    error,
  } = useGetCreditMoneybyProjectIdQuery({
    project_id,
    page: crPage,
    limit: crLimit,
    search: crSearchParam,
    cr_mode: apiCrMode,
  });

  const CreditSummary = Array.isArray(responseData?.data)
    ? responseData.data
    : [];
  const total = Number(responseData?.total || 0);
  const totalPages = Number(responseData?.totalPages || 1);

  useEffect(() => {
    const raw = localStorage.getItem("userDetails");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  // clear selection when the dataset changes
  useEffect(() => {
    setSelectedCredits([]);
  }, [crPage, crLimit, crTab, crSearchParam, project_id]);

  const allIdsOnPage = useMemo(
    () => CreditSummary.map((r) => r._id).filter(Boolean),
    [CreditSummary]
  );

  const allSelectedOnPage =
    allIdsOnPage.length > 0 &&
    allIdsOnPage.every((id) => selectedCredits.includes(id));

  const totalCreditedOnPage = useMemo(() => {
    return CreditSummary.reduce((sum, row) => {
      const n = Number(row?.cr_amount);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [CreditSummary]);

  const canDelete =
    user?.name === "IT Team" ||
    user?.name === "Guddu Rani Dubey" ||
    user?.name === "Naresh Kumar" ||
    user?.name === "Prachi Singh" ||
    user?.name === "admin";

  const [deleteCreditById, { isLoading: isDeleting }] =
    useDeleteCreditByIdMutation();

  const handleDeleteCredit = async () => {
    console.log({ selectedCredits });
    if (selectedCredits.length === 0) {
      toast.error("No credits selected for deletion.");
      return;
    }

    try {
      await Promise.all(
        selectedCredits.map((id) => deleteCreditById(id).unwrap())
      );

      toast.success("Credit(s) deleted successfully.");
      setSelectedCredits([]);

      await refetch();
    } catch (err) {
      console.error("Error deleting credits:", err);
      const msg =
        err?.data?.msg ||
        err?.data?.message ||
        "Failed to delete selected credits.";
      toast.error(msg);
    }
  };

  const handleLimitChange = (_, v) => {
    const next = Number(v || 10);
    updateParams({ cr_limit: next, cr_page: 1 });
  };

  return (
    <Box mt={2}>
      {/* Header row: Search + Tabs + Delete */}
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
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Search */}
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by comment, UTR, mode..."
            startDecorator={<Search size={16} />}
            sx={{ width: { xs: "100%", md: "50%" } }}
          />

          <Select
            value={crTab} // URL param: cr_tab
            onChange={(_, v) =>
              updateParams({ cr_tab: v || "all", cr_page: 1 })
            }
            size="md"
            variant="outlined"
            sx={{
              width: 200,
              borderRadius: "8px",
            }}
          >
            <Option value="all">All</Option>
            <Option value="account_transfer">Account Transfer</Option>
            <Option value="loan">Loan</Option>
            <Option value="cash">Cash</Option>
          </Select>
        </Box>

        {canDelete && (
          <Box
            sx={{
              display: "flex",
              justifyContent: { xs: "flex-end", md: "flex-end" },
            }}
          >
            <IconButton
              color="danger"
              disabled={selectedCredits.length === 0 || isDeleting}
              onClick={handleDeleteCredit}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        )}
      </Box>

      <Sheet
        variant="outlined"
        sx={{
          borderRadius: "12px",
          overflow: "auto",
          boxShadow: "md",
          width: "100%",
          maxHeight: "60vh",
        }}
      >
        <Table borderAxis="both" stickyHeader sx={{ minWidth: "100%" }}>
          <thead>
            <tr>
              <th>Credit Date</th>
              <th>Credit UTR</th>
              <th>Credit Mode</th>
              <th>Credited Amount (₹)</th>
              <th style={{ textAlign: "center" }}>
                <Checkbox
                  color="primary"
                  onChange={(e) => {
                    if (e.target.checked) setSelectedCredits(allIdsOnPage);
                    else setSelectedCredits([]);
                  }}
                  checked={allSelectedOnPage}
                  indeterminate={
                    selectedCredits.length > 0 && !allSelectedOnPage
                  }
                />
              </th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                  <Typography level="body-md" sx={{ fontStyle: "italic" }}>
                    Loading credit history...
                  </Typography>
                </td>
              </tr>
            ) : CreditSummary.length > 0 ? (
              CreditSummary.map((row) => (
                <tr key={row._id || row.id}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <Typography level="body-sm" fontWeight="lg">
                        {formatDateTime(row.cr_date || row.createdAt)}
                      </Typography>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Typography
                          level="body-xs"
                          sx={{ color: "text.tertiary" }}
                        >
                          By:
                        </Typography>

                        {(() => {
                          const submitName =
                            typeof row.submitted_by?.name === "string" &&
                            row.submitted_by?.name.trim()
                              ? row.submitted_by?.name
                              : null;

                          return (
                            <Chip
                              size="sm"
                              variant="soft"
                              color={submitName ? "primary" : "neutral"}
                              sx={{ px: 0.75 }}
                            >
                              {submitName || "Not Defined"}
                            </Chip>
                          );
                        })()}
                      </div>

                      <Typography
                        level="body-xs"
                        sx={{ color: "text.tertiary" }}
                      >
                        Comment:&nbsp;{row.comment?.trim() ? row.comment : "—"}
                      </Typography>
                    </div>
                  </td>

                  <td>{row.cr_utr || "—"}</td>

                  <td>
                    <CreditModeChip mode={row.cr_mode} />
                  </td>

                  <td>
                    <RupeeValue value={row.cr_amount ?? 0} />
                  </td>

                  <td style={{ textAlign: "center" }}>
                    <Checkbox
                      color="primary"
                      checked={selectedCredits.includes(row._id)}
                      onChange={() =>
                        setSelectedCredits((prev) =>
                          prev.includes(row._id)
                            ? prev.filter((id) => id !== row._id)
                            : [...prev, row._id]
                        )
                      }
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                  <Typography level="body-md">
                    No credit history available
                  </Typography>
                </td>
              </tr>
            )}
          </tbody>

          {CreditSummary.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                <td
                  colSpan={3}
                  style={{ color: "dodgerblue", textAlign: "right" }}
                >
                  Total Credited
                </td>
                <td style={{ color: "dodgerblue" }}>
                  <RupeeValue value={totalCreditedOnPage} />
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </Table>
      </Sheet>

      {/* Pagination Footer */}
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
          Page <b>{crPage}</b> of <b>{totalPages}</b> • Total Rows{" "}
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
            value={String(crLimit)}
            onChange={handleLimitChange}
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
            disabled={crPage <= 1 || isLoading}
            onClick={() => updateParams({ cr_page: Math.max(1, crPage - 1) })}
          >
            Prev
          </Button>

          <Button
            size="sm"
            variant="outlined"
            disabled={crPage >= totalPages || isLoading}
            onClick={() =>
              updateParams({ cr_page: Math.min(totalPages, crPage + 1) })
            }
          >
            Next
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Credit;
