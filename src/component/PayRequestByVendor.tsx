// src/pages/PayRequestByVendor.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Sheet,
  Typography,
  Input,
  Table,
  Chip,
  Select,
  Option,
  CircularProgress,
  Stack,
  Checkbox, // 👈 added
} from "@mui/joy";
import IconButton, { iconButtonClasses } from "@mui/joy/IconButton";
import Button from "@mui/joy/Button";
import SearchIcon from "@mui/icons-material/Search";
import FormControl from "@mui/joy/FormControl";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

import { useSearchParams } from "react-router-dom";
import { useGetPayRequestByVendorQuery } from "../redux/paymentsSlice";

// utils
const formatINR = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const num = Number(v);
  if (!Number.isFinite(num)) return String(v);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDate = (isoOrYmd) => {
  if (!isoOrYmd) return "—";
  const date = new Date(isoOrYmd);
  if (isNaN(date)) return isoOrYmd;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const PayRequestByVendor = ({ vendor, setSelectedPaymentsIds }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = Number(searchParams.get("page") || 1);
  const limitParam = Number(searchParams.get("limit") || 10);
  const searchParam = searchParams.get("search") || "";

  // local state mirrors URL (for controlled inputs)
  const [page, setPage] = useState(pageParam);
  const [limit, setLimit] = useState(limitParam);
  const [search, setSearch] = useState(searchParam);

  // ✅ selection state (like PO)
  const [selectedIds, setSelectedIds] = useState([]);

  // keep URL in sync when local changes
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    next.set("limit", String(limit));
    if (search) next.set("search", search);
    else next.delete("search");
    if (vendor) next.set("vendor", vendor);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, vendor]);

  const { data, isLoading, isFetching, isError, error } =
    useGetPayRequestByVendorQuery(
      { vendor, page, limit, search },
      { skip: !vendor } // require vendor
    );

  const rows = useMemo(() => data?.data ?? [], [data]);

  // Clear selection if page / filter changes
  useEffect(() => {
    setSelectedIds([]);
    setSelectedPaymentsIds([]);
  }, [rows]);

  // 🔢 Page totals for current page
  const pageTotals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.totalPoValue += Number(r?.po_value) || 0;
        acc.totalAmountPaid += Number(r?.amount_paid) || 0;
        return acc;
      },
      { totalPoValue: 0, totalAmountPaid: 0 }
    );
  }, [rows]);

  const formatPayId = (s) => {
    if (!s) return "—";
    // remove the last "/segment"
    return s.replace(/\/[^/]*$/, "");
  };

  // ---------- selection handlers ----------
  const handleRowSelect = (id) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      return next;
    });
    setSelectedPaymentsIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      return next;
    });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allIds = rows.map((r) => r._id);
      setSelectedIds(allIds);
      setSelectedPaymentsIds(allIds);
    } else {
      setSelectedIds([]);
      setSelectedPaymentsIds([]);
    }
  };

  const allChecked = rows.length > 0 && selectedIds.length === rows.length;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < rows.length;

  // ----------------------------------------

  // ---------- pagination helpers ----------
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = page;
  const perPage = limit;

  const startIndex = total ? (currentPage - 1) * perPage + 1 : 0;
  const endIndex = Math.min(currentPage * perPage, total);

  const handlePageChange = (newPage) => {
    if (!Number.isFinite(newPage)) return;
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handlePerPageChange = (newValue) => {
    if (!newValue) return;
    setPage(1);
    setLimit(newValue);
  };

  const getPaginationRange = () => {
    const delta = 1;
    const pages = [];
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };
  // ----------------------------------------

  return (
    <Box
      p={2}
      sx={{
        display: "flex",
        flexDirection: "column",
        p: 1.5,
        mt: 2.5,
        gap: 1.5,
      }}
    >
      {/* Controls */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        flexWrap="wrap"
        width={"100%"}
      >
        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          justifyContent={"flex-end"}
          width={"100%"}
        >
          <Input
            size="sm"
            placeholder="Search PO/UTR/Project..."
            value={search}
            startDecorator={<SearchIcon />}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            sx={{ width: "50%" }}
          />
        </Stack>
      </Stack>

      {/* Table */}
      <Sheet
        className="OrderTableContainer"
        variant="outlined"
        sx={{
          borderRadius: "10px",
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "60vh",
          border: "1px solid",
          borderColor: "neutral.outlinedBorder",
        }}
      >
        <Table
          stickyHeader
          sx={{
            minWidth: 900,
            "& thead": {
              backgroundColor: "neutral.softBg",
            },
            "& th, & td": {
              textAlign: "left",
              px: 1.5,
              py: 1,
              verticalAlign: "middle",
              whiteSpace: "normal",
              wordBreak: "break-word",
            },
          }}
        >
          <thead>
            <tr>
              {/* Master checkbox */}
              <th
                style={{
                  width: 40,
                }}
              >
                <Checkbox
                  size="sm"
                  indeterminate={isIndeterminate}
                  checked={allChecked}
                  onChange={handleSelectAll}
                  color={selectedIds.length > 0 ? "primary" : "neutral"}
                />
              </th>

              <th>Project Code</th>
              <th>PO Number</th>
              <th>Debit Date</th>

              {/* PO Value (incl. GST) + page total */}
              <th>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    level="body-sm"
                    fontWeight="lg"
                    sx={{ color: "neutral.700" }}
                  >
                    PO Value (incl. GST)
                  </Typography>
                  <Typography level="body-xs" sx={{ color: "neutral.700" }}>
                    ({formatINR(pageTotals.totalPoValue)})
                  </Typography>
                </Box>
              </th>

              {/* Amount Paid + page total */}
              <th>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    level="body-sm"
                    fontWeight="lg"
                    sx={{ color: "neutral.700" }}
                  >
                    Amount Paid
                  </Typography>
                  <Typography level="body-xs" sx={{ color: "neutral.700" }}>
                    ({formatINR(pageTotals.totalAmountPaid)})
                  </Typography>
                </Box>
              </th>

              <th>Paid For</th>
              <th>UTR</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8}>
                  <Stack direction="row" gap={1} alignItems="center" p={2}>
                    <CircularProgress size="sm" />
                    <Typography level="body-sm">Loading…</Typography>
                  </Stack>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8}>
                  <Typography level="body-sm" color="danger" p={2}>
                    Failed to load:{" "}
                    {error?.data?.message || error?.error || "Unknown error"}
                  </Typography>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <Typography level="body-sm" p={2}>
                    No results.
                  </Typography>
                </td>
              </tr>
            ) : (
              <>
                {rows.map((r) => (
                  <tr key={r._id}>
                    {/* row checkbox */}
                    <td>
                      <Checkbox
                        size="sm"
                        checked={selectedIds.includes(r._id)}
                        onChange={() => handleRowSelect(r._id)}
                        color={
                          selectedIds.includes(r._id) ? "primary" : "neutral"
                        }
                      />
                    </td>

                    <td>
                      <Typography level="body-sm" fontWeight="lg">
                        {formatPayId(r.pay_id)}
                      </Typography>
                    </td>

                    <td>
                      <Typography level="body-sm" fontWeight="md">
                        {r.po_number || "—"}
                      </Typography>
                    </td>

                    <td>
                      <Chip size="sm" variant="soft" color="neutral">
                        {formatDate(r.dbt_date)}
                      </Chip>
                    </td>

                    <td>{formatINR(r.po_value)}</td>
                    <td>{formatINR(r.amount_paid)}</td>
                    <td>{r.paid_for || "—"}</td>
                    <td>
                      {r.utr ? (
                        <Chip size="sm" variant="soft" color="success">
                          {r.utr}
                        </Chip>
                      ) : (
                        <Chip size="sm" variant="soft" color="warning">
                          Not Available
                        </Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </Table>
      </Sheet>

      {/* Footer: pagination + info (custom block) */}
      <Box
        className="Pagination-laptopUp"
        sx={{
          pt: 2,
          gap: 1,
          [`& .${iconButtonClasses.root}`]: { borderRadius: "50%" },
          display: "flex",
          alignItems: "center",
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Button
          size="sm"
          variant="outlined"
          color="neutral"
          startDecorator={<KeyboardArrowLeftIcon />}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isFetching}
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
                variant={p === currentPage ? "solid" : "outlined"}
                color="neutral"
                onClick={() => handlePageChange(p)}
                disabled={isFetching}
              >
                {p}
              </IconButton>
            )
          )}
        </Box>

        <FormControl size="sm" sx={{ minWidth: 80 }}>
          <Select value={perPage} onChange={(_, v) => handlePerPageChange(v)}>
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
          disabled={currentPage === totalPages || isFetching}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default PayRequestByVendor;
