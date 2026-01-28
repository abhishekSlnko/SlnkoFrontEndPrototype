import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import FormControl from "@mui/joy/FormControl";
import IconButton, { iconButtonClasses } from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import Tooltip from "@mui/joy/Tooltip";
import { Avatar, Chip, CircularProgress, Option, Select } from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NoData from "../assets/alert-bell.svg";
import { useGetAdjustmentsQuery } from "../redux/Accounts";

const money = (v) => {
  const n = Number(v || 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `₹ ${safe.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const sumLeg = (arr) =>
  (Array.isArray(arr) ? arr : []).reduce(
    (acc, x) => acc + Number(x?.adjustment_amount || 0),
    0,
  );

const safeStatus = (doc) => {
  const s = doc?.current_status?.status;
  if (Array.isArray(s) && s.length) return String(s[0] || "").toLowerCase();
  if (typeof s === "string") return s.toLowerCase();
  return "pending";
};

const statusChipColor = (s) => {
  if (s === "approved") return "success";
  if (s === "rejected") return "danger";
  return "warning";
};

const relationLabel = (rel) => {
  const r = String(rel || "").toLowerCase();
  return r === "onetomany" ? "One → Many" : "Many → One";
};

const legSummaryLabel = (items) => {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return "-";
  const first = list[0];
  const po = first?.po_id?.po_number || "-";
  const amt = money(first?.adjustment_amount || 0);
  const extra = list.length > 1 ? ` +${list.length - 1}` : "";
  return `${po} - ${amt}${extra}`;
};

const LegHoverContent = ({ items, title }) => {
  const list = Array.isArray(items) ? items : [];

  return (
    <Box sx={{ minWidth: 260 }}>
      <Typography level="title-sm" sx={{ mb: 1 }}>
        {title}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {list.length ? (
          list.map((x, idx) => {
            const poNumber = x?.po_id?.po_number || "-";
            const projectCode = x?.project_id?.code || "-";

            return (
              <Box
                key={x?._id || idx}
                sx={{ display: "flex", flexDirection: "column" }}
              >
                <Typography level="body-sm" sx={{ fontWeight: 600 }}>
                  {poNumber}
                </Typography>
                <Typography
                  level="body-xs"
                  sx={{ color: "text.tertiary", mt: 0.5 }}
                >
                  {projectCode}
                </Typography>
              </Box>
            );
          })
        ) : (
          <Typography level="body-sm">-</Typography>
        )}
      </Box>
    </Box>
  );
};

const Adjustment = ({ setSelectedIds }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const navigate = useNavigate();

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

  const initialPage = readInt("page", 1);
  const initialPageSize = readInt("pageSize", 10);
  const initialSearch = readStr("search", "");

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selected, setSelected] = useState([]);

  const {
    data: adjResp,
    isLoading,
    isFetching,
    error,
  } = useGetAdjustmentsQuery({
    page: currentPage,
    limit: perPage,
    search: searchQuery,
    status: status,
  });

  const total = Number(adjResp?.total || 0);
  const totalPages = Number(adjResp?.totalPages || 1);

  const rows = useMemo(() => {
    return Array.isArray(adjResp?.data) ? adjResp.data : [];
  }, [adjResp]);

  const startIndex = total ? (currentPage - 1) * perPage + 1 : 0;
  const endIndex = total ? Math.min(startIndex + rows.length - 1, total) : 0;

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

  // ---- Handlers ----
  const handleSearch = (query) => {
    const q = query || "";
    setSearchQuery(q);
    updateParams({ search: q || undefined, page: 1, pageSize: perPage });
    setCurrentPage(1);
    setSelected([]);
    setSelectedIds([]);
  };

  const handleRowSelect = (_id) => {
    setSelected((prev) =>
      prev.includes(_id) ? prev.filter((x) => x !== _id) : [...prev, _id],
    );
    setSelectedIds((prev) =>
      prev.includes(_id) ? prev.filter((x) => x !== _id) : [...prev, _id],
    );
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(rows.map((row) => row._id));
      setSelectedIds(rows.map((row) => row._id));
    } else {
      setSelected([]);
      setSelectedIds([]);
    }
  };

  const handlePageChange = (page) => {
    const next = Math.max(1, Math.min(page, totalPages));
    if (next !== currentPage) {
      setCurrentPage(next);
      updateParams({
        page: next,
        pageSize: perPage,
        search: searchQuery || undefined,
      });
      setSelected([]);
      setSelectedIds([]);
    }
  };

  const handlePageSizeChange = (newValue) => {
    const size = Number(newValue || 10);
    setPerPage(size);
    setCurrentPage(1);
    updateParams({ page: 1, pageSize: size, search: searchQuery || undefined });
    setSelected([]);
    setSelectedIds([]);
  };

  useEffect(() => {
    const page = readInt("page", 1);
    const size = readInt("pageSize", 10);
    const search = readStr("search", "");
    setCurrentPage(page);
    setPerPage(size);
    setSearchQuery(search);
  }, [searchParams]);

  const initials2 = (name = "") => {
    const n = String(name).trim();
    if (!n) return "?";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <Box
      sx={{
        ml: { lg: "var(--Sidebar-width)" },
        px: "0px",
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
      }}
    >
      <Box
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
        pb={0.5}
        flexWrap="wrap"
        gap={1}
      >
        <Box
          className="SearchAndFilters-tabletUp"
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
              placeholder="Search by PO Number.."
              startDecorator={<SearchIcon />}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </FormControl>
        </Box>
      </Box>

      {/* Table */}
      <Sheet
        className="OrderTableContainer"
        variant="outlined"
        sx={{
          display: { xs: "none", sm: "block" },
          width: "100%",
          borderRadius: "sm",
          maxHeight: { xs: "66vh", xl: "75vh" },
          overflow: "auto",
        }}
      >
        <Box
          component="table"
          sx={{ width: "100%", borderCollapse: "collapse" }}
        >
          <Box component="thead" sx={{ backgroundColor: "neutral.softBg" }}>
            <Box component="tr">
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
                  fontWeight: "bold",
                }}
              >
                <Checkbox
                  indeterminate={
                    selected.length > 0 && selected.length < rows.length
                  }
                  checked={selected.length === rows.length && rows.length > 0}
                  onChange={handleSelectAll}
                  color={selected.length > 0 ? "primary" : "neutral"}
                />
              </Box>

              {[
                "Relation",
                "From",
                "To",
                "Total Adjustment",
                "Status",
                "Approvers",
                "Created By",
              ].map((header, index) => (
                <Box
                  component="th"
                  key={index}
                  sx={{
                    position: "sticky",
                    top: 0,
                    background: "#e0e0e0",
                    zIndex: 2,
                    borderBottom: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  {header}
                </Box>
              ))}
            </Box>
          </Box>

          <Box component="tbody">
            {error ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                >
                  <Typography color="danger" textAlign="center">
                    {String(error?.data?.message || error?.error || error)}
                  </Typography>
                </td>
              </tr>
            ) : isLoading || isFetching ? (
              <tr>
                <td colSpan={6} style={{ padding: "8px", textAlign: "center" }}>
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
                    <Typography fontStyle="italic">
                      Loading adjustments…
                    </Typography>
                  </Box>
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((doc) => {
                const fromList = Array.isArray(doc?.from) ? doc.from : [];
                const toList = Array.isArray(doc?.to) ? doc.to : [];
                const totalAdj = sumLeg(toList);
                const st = safeStatus(doc);

                const approvers = Array.isArray(doc?.approvers)
                  ? doc.approvers
                  : [];
                const show = approvers.slice(0, 5);
                const extra = Math.max(0, approvers.length - show.length);

                return (
                  <Box
                    component="tr"
                    key={doc._id}
                    sx={{
                      "&:hover": { backgroundColor: "neutral.plainHoverBg" },
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      navigate(`/adjust_request?mode=view&id=${doc._id}`)
                    }
                  >
                    <Box
                      component="td"
                      style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                    >
                      <Checkbox
                        checked={selected.includes(doc._id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRowSelect(doc._id);
                        }}
                        color={
                          selected.includes(doc._id) ? "primary" : "neutral"
                        }
                      />
                    </Box>
                    {/* Relation */}
                    <Box
                      component="td"
                      style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                    >
                      <Chip variant="outlined" size="sm">
                        {relationLabel(doc?.relation)}
                      </Chip>
                    </Box>
                    {/* From */}
                    <Box
                      component="td"
                      style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                    >
                      <Tooltip
                        placement="bottom-start"
                        variant="soft"
                        title={
                          <LegHoverContent items={fromList} title="From" />
                        }
                      >
                        <Chip variant="soft" size="sm" sx={{ cursor: "help" }}>
                          {legSummaryLabel(fromList)}
                        </Chip>
                      </Tooltip>
                    </Box>
                    {/* To */}
                    <Box
                      component="td"
                      style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                    >
                      <Tooltip
                        placement="bottom-start"
                        variant="soft"
                        title={<LegHoverContent items={toList} title="To" />}
                      >
                        <Chip variant="soft" size="sm" sx={{ cursor: "help" }}>
                          {legSummaryLabel(toList)}
                        </Chip>
                      </Tooltip>
                    </Box>
                    {/* Total Adjustment */}
                    <Box
                      component="td"
                      style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                    >
                      {money(totalAdj)}
                    </Box>
                    {/* Status */}
                    <Box
                      component="td"
                      style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                    >
                      <Chip
                        variant="soft"
                        color={statusChipColor(st)}
                        size="sm"
                        sx={{ textTransform: "capitalize" }}
                      >
                        {st}
                      </Chip>
                    </Box>

                    <Box
                      component="td"
                      style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                    >
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
                          <Box sx={{ color: "text.tertiary", fontSize: 12 }}>
                            -
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Box
                      component="td"
                      style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                    >
                      <Tooltip
                        title={doc?.created_by?.name || ""}
                        variant="soft"
                        placement="top"
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Avatar
                            size="sm"
                            src={doc?.created_by?.attachment_url || undefined}
                            alt={doc?.created_by?.name || "User"}
                            sx={{
                              bgcolor: "neutral.softBg",
                              color: "neutral.softColor",
                              fontWeight: 700,
                            }}
                          >
                            {initials2(doc?.created_by?.name)}
                          </Avatar>
                        </Box>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })
            ) : (
              <Box component="tr">
                <Box
                  component="td"
                  colSpan={6}
                  style={{ padding: 8, borderBottom: "1px solid #ddd" }}
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
                    <img
                      src={NoData}
                      alt="No data"
                      style={{ width: 50, height: 50 }}
                    />
                    <Typography fontStyle={"italic"}>
                      No Adjustments available
                    </Typography>
                  </Box>
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
          disabled={currentPage <= 1}
        >
          Previous
        </Button>

        <Box>
          <Typography level="body-sm">
            {total ? (
              <>
                Showing {startIndex}–{endIndex} of {total} results
              </>
            ) : (
              "No results"
            )}
          </Typography>
        </Box>

        <Box
          sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 1 }}
        >
          {getPaginationRange().map((page, idx) =>
            page === "..." ? (
              <Box key={`ellipsis-${idx}`} sx={{ px: 1 }}>
                …
              </Box>
            ) : (
              <IconButton
                key={page}
                size="sm"
                variant={page === currentPage ? "solid" : "outlined"}
                color="neutral"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </IconButton>
            ),
          )}
        </Box>

        <FormControl size="sm" sx={{ minWidth: 80 }}>
          <Select
            value={perPage}
            onChange={(_e, newValue) => handlePageSizeChange(newValue)}
            sx={{
              height: 32,
              borderRadius: "6px",
              borderColor: "#ccc",
              backgroundColor: "#fff",
            }}
          >
            {[5, 10, 20, 50, 100].map((num) => (
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
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default Adjustment;
