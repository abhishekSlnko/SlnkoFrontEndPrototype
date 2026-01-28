import React from "react";
import { usePayment } from "../store/Context/Payment_History";

import Box from "@mui/joy/Box";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import Chip from "@mui/joy/Chip";
import Table from "@mui/joy/Table";
import Divider from "@mui/joy/Divider";

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const fmtMoney = (n) => {
  const num = Number(n || 0);
  return `₹${num.toLocaleString("en-IN")}`;
};

/**
 * Props:
 * - po_number: string
 * - showClose: boolean (default true)
 * - embedded: boolean (default false)
 * - maxHeight: number (default 520)
 * - emptyText: string
 * - onClose: fn
 */
const PaymentHistory = ({
  po_number,
  showClose = true,
  embedded = false,
  maxHeight = 520,
  emptyText = "No payment history available.",
  onClose,
}) => {
  const { history = [], total_debited = 0, isLoading, error } = usePayment();

  if (isLoading)
    return <Typography level="body-md">Loading payment history…</Typography>;

  if (error)
    return (
      <Typography level="body-md" color="danger">
        Error loading payment history{error?.message ? `: ${error.message}` : "."}
      </Typography>
    );

  if (!history.length)
    return (
      <Typography level="body-md" textColor="text.tertiary">
        {emptyText}
      </Typography>
    );

  return (
    <Sheet
      variant={embedded ? "plain" : "outlined"}
      sx={{
        p: embedded ? 1 : { xs: 1.25, sm: 2 },
        borderRadius: "lg",
        boxShadow: embedded ? "none" : "sm",
        bgcolor: "background.surface",
        maxWidth: "100%",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
            minWidth: 0,
          }}
        >
          <Typography level="title-md" sx={{ mr: 0.5, fontWeight: 700 }}>
            Payment History
          </Typography>

          {po_number ? (
            <Chip size="sm" variant="soft">
              PO: {po_number}
            </Chip>
          ) : null}

          <Chip size="sm" variant="soft">
            Total: {fmtMoney(total_debited)}
          </Chip>
        </Box>

        {showClose ? (
          <Typography
            level="body-sm"
            sx={{
              cursor: "pointer",
              color: "primary.600",
              "&:hover": { textDecoration: "underline" },
            }}
            onClick={() =>
              typeof onClose === "function" ? onClose() : window.history.back()
            }
          >
            Close
          </Typography>
        ) : null}
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Scrollable list */}
      <Sheet
        variant="soft"
        sx={{
          borderRadius: "md",
          overflow: "auto",
          border: "1px solid",
          borderColor: "divider",
          maxHeight,
        }}
      >
        <Table
          stickyHeader
          hoverRow
          size="sm"
          variant="plain"
          sx={{
            "--TableCell-paddingX": "10px",
            "--TableCell-paddingY": "8px",
            "& thead th": {
              bgcolor: "background.level1",
              fontWeight: 700,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              borderBottom: "1px solid",
              borderColor: "divider",
              whiteSpace: "nowrap",
            },
            "& tbody td": {
              borderBottom: "1px solid",
              borderColor: "divider",
              fontSize: 13,
              whiteSpace: "nowrap",
            },
            "& tbody tr:nth-of-type(odd)": {
              bgcolor: "background.level1",
            },
            "& tbody tr:hover": {
              bgcolor: "primary.softBg",
            },
          }}
        >
          <thead>
            <tr>
              <th>Debit Date</th>
              <th>Paid To</th>
              <th>Paid For</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th>UTR</th>
              <th>UTR Submitted</th> {/* ✅ Added */}
            </tr>
          </thead>

          <tbody>
            {history.map((entry, index) => (
              <tr key={entry?._id || `${entry?.po_number || "po"}-${index}`}>
                <td>{fmtDate(entry?.debit_date)}</td>

                <td
                  style={{
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={entry?.paid_to || ""}
                >
                  {entry?.paid_to ?? "-"}
                </td>

                <td
                  style={{
                    maxWidth: 180,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={entry?.paid_for || ""}
                >
                  {entry?.paid_for ?? "-"}
                </td>

                <td style={{ textAlign: "right", fontWeight: 700 }}>
                  {fmtMoney(entry?.amount_paid)}
                </td>

                <td>{entry?.utr || "-"}</td>

                {/* ✅ Added: supports utr_submitted_date OR utrSubmittedDate if backend differs */}
                <td>{fmtDate(entry?.utr_submitted_date ?? entry?.utrSubmittedDate)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>
    </Sheet>
  );
};

export default PaymentHistory;
