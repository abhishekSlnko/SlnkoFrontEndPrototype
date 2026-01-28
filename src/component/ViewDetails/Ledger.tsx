import React, { useMemo, useEffect, useState } from "react";
import {
  Sheet,
  Table,
  Typography,
  Box,
  Select,
  Option,
  Button,
} from "@mui/joy";
import { useSearchParams } from "react-router-dom";
import { useGetLedgerQuery } from "../../redux/Accounts";

/* ----------------------------- helpers ---------------------------- */

const toStr = (v) => String(v ?? "").trim();

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

const titleCase = (s) =>
  toStr(s)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/* -------------------------- Rupee formatter -------------------------- */

const inrFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function RupeeValue({ value }) {
  const n = Number(value || 0);
  return <span>{inrFmt.format(Number.isFinite(n) ? n : 0)}</span>;
}

/* -------------------------------- UI -------------------------------- */

const Ledger = ({ project_id, search = "", entryType = "" }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ URL driven pagination for ledger
  const ledgerPage = Math.max(
    1,
    parseInt(searchParams.get("ledger_page") || "1", 10),
  );
  const ledgerLimit = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("ledger_limit") || "10", 10)),
  );

  const [page, setPage] = useState(ledgerPage);
  const [limit, setLimit] = useState(ledgerLimit);

  useEffect(() => setPage(ledgerPage), [ledgerPage]);
  useEffect(() => setLimit(ledgerLimit), [ledgerLimit]);

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

  // ✅ reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    updateParams({ ledger_page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project_id, search, entryType]);

  // ✅ call API with params
  const { data, isLoading, isFetching, isError } = useGetLedgerQuery(
    {
      project_id,
      search,
      type: entryType,
      page,
      limit,
    },
    { skip: !project_id },
  );

  const meta = data?.meta || {};
  const total = Number(meta?.total || 0);
  const totalPages = Math.max(1, Number(meta?.totalPages || 1));

  const rows = useMemo(() => {
    const list = Array.isArray(data?.data) ? data.data : [];
    return list.map((r, idx) => ({
      key: `${r?.date || ""}_${idx}`,
      date: r?.date,
      party: r?.party,
      type: r?.type,
      transaction: r?.transaction,
      credit_amount: Number(r?.credit_amount || 0),
      debit_amount: Number(r?.debit_amount || 0),
      balance: Number(r?.balance || 0),
    }));
  }, [data]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.totalCredit += r.credit_amount || 0;
        acc.totalDebit += r.debit_amount || 0;
        acc.lastBalance = r.balance;
        return acc;
      },
      { totalCredit: 0, totalDebit: 0, lastBalance: 0 },
    );
  }, [rows]);

  return (
    <>
      <Sheet
        variant="outlined"
        sx={{
          borderRadius: 12,
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
            minWidth: 1100,
            tableLayout: "fixed",
            "& th, & td": {
              textAlign: "left",
              px: 2,
              py: 1.5,
              verticalAlign: "middle",
            },
            "& th.dateCell, & td.dateCell": { minWidth: 150, width: 150 },
            "& th.partyCell, & td.partyCell": {
              minWidth: 260,
              width: 280,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            },
            "& th.typeCell, & td.typeCell": {
              minWidth: 160,
              width: 180,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            },
            "& th.txnCell, & td.txnCell": {
              minWidth: 180,
              width: 180,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            },
            "& th.money, & td.money": { textAlign: "right", width: 180 },
            "& th.balanceCell, & td.balanceCell": {
              minWidth: 180,
              width: 180,
            },
          }}
        >
          <thead>
            <tr>
              <th className="dateCell">Date</th>
              <th className="partyCell">Party</th>
              <th className="typeCell">Type</th>
              <th className="txnCell">Transaction No.</th>
              <th className="money">Credit Amount</th>
              <th className="money">Debit Amount</th>
              <th className="money balanceCell">Balance</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 20 }}>
                  <Typography level="body-md" sx={{ fontStyle: "italic" }}>
                    Loading ledger...
                  </Typography>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 20 }}>
                  <Typography level="body-md" color="danger">
                    Failed to load ledger
                  </Typography>
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.key}>
                  <td className="dateCell">{formatDateTime(row.date)}</td>

                  <td className="partyCell" title={toStr(row.party) || "-"}>
                    {toStr(row.party) || "-"}
                  </td>

                  <td className="typeCell">{titleCase(row.type) || "-"}</td>

                  <td className="txnCell" title={toStr(row.transaction) || "-"}>
                    {toStr(row.transaction) || "-"}
                  </td>

                  <td className="money">
                    {row.credit_amount ? (
                      <RupeeValue value={row.credit_amount} />
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="money">
                    {row.debit_amount ? (
                      <RupeeValue value={row.debit_amount} />
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="money balanceCell">
                    <RupeeValue value={row.balance || 0} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 20 }}>
                  <Typography level="body-md">
                    No ledger data available
                  </Typography>
                </td>
              </tr>
            )}
          </tbody>

          {!isLoading && !isError && rows.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                <td colSpan={4} style={{ textAlign: "right" }}>
                  Totals:
                </td>
                <td className="money">
                  <RupeeValue value={totals.totalCredit} />
                </td>
                <td className="money">
                  <RupeeValue value={totals.totalDebit} />
                </td>
                <td className="money">
                  <RupeeValue value={totals.lastBalance} />
                </td>
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
          Page <b>{page}</b> of <b>{totalPages}</b> • Total Rows <b>{total}</b>
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
              const newLimit = Number(v || "50");
              setLimit(newLimit);
              setPage(1);
              updateParams({ ledger_limit: newLimit, ledger_page: 1 });
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
              updateParams({ ledger_page: next });
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
              updateParams({ ledger_page: next });
            }}
          >
            Next
          </Button>
        </Box>
      </Box>
    </>
  );
};

export default Ledger;
