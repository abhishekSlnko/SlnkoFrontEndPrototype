import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/joy/Box";
import Input from "@mui/joy/Input";
import Sheet from "@mui/joy/Sheet";
import Table from "@mui/joy/Table";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import { useGetAdjustmentsByProjectIdQuery } from "../../redux/Accounts";
import { Avatar, Chip, FormControl, Tooltip } from "@mui/joy";

// (keep your existing helpers)
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

const Adjustment = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get("_id") || "";
  // ---- URL helpers ----
  const readInt = (key, fallback) => {
    const v = parseInt(searchParams.get(key) || "", 10);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  const readStr = (key, fallback) => {
    const v = searchParams.get(key);
    return v != null ? v : fallback;
  };
  const updateParams = (partial) => {
    const current = Object.fromEntries(searchParams.entries());
    Object.entries(partial).forEach(([k, v]) => {
      if (v === undefined || v === "") delete current[k];
      else current[k] = String(v);
    });
    setSearchParams(current);
  };

  // ---- pagination/search state (synced with URL) ----
  const adjustmentPage = readInt("adjustment_page", 1);
  const adjustmentLimit = readInt("adjustment_limit", 10);
  const initialSearch = readStr("adjustment_search", "");
  const initialStatus = readStr("status", "");

  const [searchAdjustment, setSearchAdjustment] = useState(initialSearch);
  const [selectedAdjust, setSelectedAdjust] = useState([]);

  const STATUS_OPTIONS = [
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  const parseStatusCsv = (csv) =>
    String(csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const normalizeValues = (vals) => {
    const arr = Array.isArray(vals) ? vals : [];
    return arr
      .map((x) => (typeof x === "string" ? x : x?.value)) // ✅ handle objects
      .filter(Boolean);
  };

  // ---- call API ----
  const {
    data: resp,
    isLoading,
    isFetching,
    error,
  } = useGetAdjustmentsByProjectIdQuery(
    {
      project_id: projectId,
      page: adjustmentPage,
      limit: adjustmentLimit,
      search: searchParams.get("adjustment_search") || "",
      status: initialStatus,
    },
    { skip: !projectId },
  );

  const total = Number(resp?.total || 0);
  const totalPages = Number(resp?.totalPages || 1);
  const rows = Array.isArray(resp?.data) ? resp.data : [];

  const money = (v) => {
    const n = Number(v || 0);
    const safe = Number.isFinite(n) ? n : 0;
    return `₹ ${safe.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const initials2 = (name = "") => {
    const n = String(name).trim();
    if (!n) return "?";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const AdjustmentSummary = useMemo(() => {
    const pid = String(projectId || "");
    return rows.map((doc) => {
      const inFrom = (doc.from || []).some(
        (x) => String(x?.project_id?._id || x?.project_id || "") === pid,
      );
      const inTo = (doc.to || []).some(
        (x) => String(x?.project_id?._id || x?.project_id || "") === pid,
      );

      const type =
        inFrom && !inTo
          ? "Debit Adjustment"
          : !inFrom && inTo
            ? "Credit Adjustment"
            : "Both";

      const fromFirst = (doc.from || [])[0];
      const toFirst = (doc.to || [])[0];

      return {
        _id: doc._id,
        adj_date: doc.createdAt || doc.updatedAt,
        pay_type: type,
        relation: doc.relation || "-",
        po_number: fromFirst?.po_id?.po_number || "-",
        paid_for: toFirst?.po_id?.po_number || "-",
        comment: doc?.current_status?.remarks || "-",
        status: (doc?.current_status?.status || "pending").toString(),
        totalAdj: (doc.to || []).reduce(
          (s, x) => s + Number(x?.adjustment_amount || 0),
          0,
        ),
        approvers: Array.isArray(doc?.approvers) ? doc.approvers : [],
        created_by: doc?.created_by || null,
        credit: inTo
          ? (doc.to || []).reduce(
              (s, x) => s + Number(x?.adjustment_amount || 0),
              0,
            )
          : 0,
        debit: inFrom
          ? (doc.from || []).reduce(
              (s, x) => s + Number(x?.adjustment_amount || 0),
              0,
            )
          : 0,
      };
    });
  }, [rows, projectId]);

  const totalCredit = useMemo(
    () => AdjustmentSummary.reduce((s, r) => s + Number(r.credit || 0), 0),
    [AdjustmentSummary],
  );
  const totalDebit = useMemo(
    () => AdjustmentSummary.reduce((s, r) => s + Number(r.debit || 0), 0),
    [AdjustmentSummary],
  );

  // ---- search handler (allow spaces) ----
  const handleSearchChange = (v) => {
    setSearchAdjustment(v);
    updateParams({
      adjustment_search: (v || "").trim() || undefined,
      adjustment_page: 1,
    });
  };

  const relationLabel = (rel) => {
    const r = String(rel || "").toLowerCase();
    if (r === "onetomany") return "One → Many";
    if (r === "manytoone") return "Many → One";
    return "-";
  };

  const statusColor = (s) => {
    const v = String(s || "").toLowerCase();
    if (v === "approved") return "success";
    if (v === "rejected") return "danger";
    return "warning"; // pending/other
  };

  return (
    <>
      <Box mt={4}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: { md: "row", xs: "column" },
          }}
          mb={2}
        >
          <Input
            placeholder="Search by PO Number.."
            value={searchAdjustment}
            onChange={(e) => handleSearchChange(e.target.value)}
            sx={{ width: { xs: "100%", md: "50%" } }}
          />

          {/* OPTIONAL: status filter in same UI (comma string) */}
          <FormControl size="sm" sx={{ minWidth: 240 }}>
            <Select
              multiple
              size="sm"
              placeholder="Status"
              value={parseStatusCsv(initialStatus)}
              onChange={(_, vals) => {
                const selected = normalizeValues(vals);
                updateParams({
                  status: selected.join(","),
                  adjustment_page: 1,
                });
              }}
              renderValue={(selected) => {
                const arr = Array.isArray(selected) ? selected : [];
                if (!arr.length) return "All";

                return arr
                  .map((opt) =>
                    typeof opt === "string"
                      ? opt
                      : (opt?.label ?? opt?.value ?? ""),
                  )
                  .filter(Boolean)
                  .join(", ");
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <Option key={o.value} value={o.value} label={o.label}>
                  {o.label}
                </Option>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Sheet
          variant="outlined"
          sx={{
            borderRadius: "12px",
            overflowX: "auto",
            overflowY: "hidden",
            boxShadow: "md",
            maxWidth: "100%",
          }}
        >
          <Table
            borderAxis="both"
            stickyHeader
            sx={{
              minWidth: "100%",
              tableLayout: "fixed",
              "& th, & td": {
                textAlign: "left",
                px: 2,
                py: 1.5,
                verticalAlign: "middle",
              },
              "& th.dateCell, & td.dateCell": { minWidth: 120 },
              "& th.typeCell, & td.typeCell": {
                minWidth: 140,
                whiteSpace: "normal",
              },
              "& th.reasonCell, & td.reasonCell": { minWidth: 120 },
              "& th.poCell, & td.poCell, & th.paidForCell, & td.paidForCell": {
                whiteSpace: "normal",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                minWidth: 180,
              },
              "& th.money, & td.money": { textAlign: "right" },
            }}
          >
            <thead>
              <tr>
                <th className="dateCell">Adjust Date</th>
                <th className="typeCell">Adjustment Type</th>
                <th className="reasonCell">Relation</th>
                <th className="poCell">From</th>
                <th className="paidForCell">To</th>
                <th>Total Adjustment</th>
                <th>Status</th>
                <th>Approvers</th>
                <th>Created By</th>
              </tr>
            </thead>

            <tbody>
              {error ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 20 }}>
                    <Typography level="body-md" color="danger">
                      {String(error?.data?.message || error?.error || error)}
                    </Typography>
                  </td>
                </tr>
              ) : isLoading || isFetching ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 20 }}>
                    <Typography level="body-md" sx={{ fontStyle: "italic" }}>
                      Loading adjustment history...
                    </Typography>
                  </td>
                </tr>
              ) : AdjustmentSummary.length > 0 ? (
                AdjustmentSummary.map((row) => (
                  <tr key={row._id}>
                    <td className="dateCell">{formatDateTime(row.adj_date)}</td>
                    <td className="typeCell">{row.pay_type}</td>

                    {/* Relation pill */}
                    <td className="reasonCell">
                      <Chip
                        variant="outlined"
                        size="sm"
                        sx={{
                          borderRadius: "999px",
                          px: 1.2,
                          py: 0.25,
                          bgcolor: "#fff",
                          borderColor: "#cfd7e3",
                          color: "#1f2d3d",
                          fontWeight: 600,
                          fontSize: 14,
                          lineHeight: 1,
                        }}
                      >
                        {relationLabel(row.relation)}
                      </Chip>
                    </td>

                    <td className="poCell">{row.po_number || "-"}</td>
                    <td className="paidForCell">{row.paid_for || "-"}</td>

                    {/* ✅ Total Adjustment */}
                    <td className="money">{money(row.totalAdj)}</td>

                    {/* Status */}
                    <td>
                      <Chip
                        variant="soft"
                        color={statusColor(row.status)}
                        size="sm"
                        sx={{ textTransform: "capitalize" }}
                      >
                        {String(row.status || "pending")}
                      </Chip>
                    </td>

                    {/* ✅ Approvers avatars */}
                    <td>
                      {(() => {
                        const approvers = row.approvers || [];
                        const show = approvers.slice(0, 5);
                        const extra = Math.max(
                          0,
                          approvers.length - show.length,
                        );

                        return (
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            {show.length ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                {show.map((a, idx) => (
                                  <Tooltip
                                    key={a?.user_id || idx}
                                    title={a?.name || ""}
                                    variant="soft"
                                    placement="top"
                                  >
                                    <Avatar
                                      size="sm"
                                      src={a?.attachment_url || undefined}
                                      alt={a?.name || "Approver"}
                                      sx={{
                                        width: 28,
                                        height: 28,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        bgcolor: "neutral.softBg",
                                        color: "neutral.softColor",
                                        ml: idx === 0 ? 0 : -0.6,
                                        border: "2px solid",
                                        borderColor: "background.body",
                                      }}
                                    >
                                      {initials2(a?.name)}
                                    </Avatar>
                                  </Tooltip>
                                ))}

                                {extra > 0 && (
                                  <Tooltip
                                    title={`${extra} more`}
                                    variant="soft"
                                    placement="top"
                                  >
                                    <Avatar
                                      size="sm"
                                      sx={{
                                        width: 28,
                                        height: 28,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        bgcolor: "neutral.softBg",
                                        color: "neutral.softColor",
                                        ml: -0.6,
                                        border: "2px solid",
                                        borderColor: "background.body",
                                      }}
                                    >
                                      +{extra}
                                    </Avatar>
                                  </Tooltip>
                                )}
                              </Box>
                            ) : (
                              <Box
                                sx={{ color: "text.tertiary", fontSize: 12 }}
                              >
                                -
                              </Box>
                            )}
                          </Box>
                        );
                      })()}
                    </td>

                    {/* ✅ Created By avatar */}
                    <td>
                      <Tooltip
                        title={row?.created_by?.name || ""}
                        variant="soft"
                        placement="top"
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Avatar
                            size="sm"
                            src={row?.created_by?.attachment_url || undefined}
                            alt={row?.created_by?.name || "User"}
                            sx={{
                              bgcolor: "neutral.softBg",
                              color: "neutral.softColor",
                              fontWeight: 700,
                            }}
                          >
                            {initials2(row?.created_by?.name)}
                          </Avatar>
                        </Box>
                      </Tooltip>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 20 }}>
                    <Typography level="body-md">
                      No adjustment history available
                    </Typography>
                  </td>
                </tr>
              )}
            </tbody>

            {!isLoading && !isFetching && AdjustmentSummary.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                  <td colSpan={5} style={{ textAlign: "right" }}>
                    Total:
                  </td>
                  <td
                    className="money"
                    colSpan={2}
                    style={{ textAlign: "right" }}
                  >
                    Credit: <b>{totalCredit.toLocaleString("en-IN")}</b>
                    &nbsp; | &nbsp; Debit:{" "}
                    <b>{totalDebit.toLocaleString("en-IN")}</b>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </Table>
        </Sheet>

        {/* ✅ Pagination (exact style you gave) */}
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
            Page <b>{adjustmentPage}</b> of <b>{totalPages}</b> • Total Rows{" "}
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
              value={String(adjustmentLimit)}
              onChange={(_, v) =>
                updateParams({
                  adjustment_limit: v || "10",
                  adjustment_page: 1,
                })
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
              disabled={adjustmentPage <= 1 || isLoading || isFetching}
              onClick={() =>
                updateParams({
                  adjustment_page: Math.max(1, adjustmentPage - 1),
                })
              }
            >
              Prev
            </Button>

            <Button
              size="sm"
              variant="outlined"
              disabled={adjustmentPage >= totalPages || isLoading || isFetching}
              onClick={() =>
                updateParams({
                  adjustment_page: Math.min(totalPages, adjustmentPage + 1),
                })
              }
            >
              Next
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Adjustment;
