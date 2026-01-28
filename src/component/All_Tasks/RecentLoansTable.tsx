import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Table,
  Input,
  Chip,
  IconButton,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  ListItemDecorator,
  Card,
  Select,
  Option,
} from "@mui/joy";
import KeyboardArrowLeftRoundedIcon from "@mui/icons-material/KeyboardArrowLeftRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useNavigate } from "react-router-dom";

/* ---------- Column config for Loans ---------- */
const initialColumns = [
  { id: "customerName", label: "Customer", visible: true, width: "auto" },
  { id: "contact", label: "Contact", visible: true, width: "auto" },
  { id: "bankName", label: "Bank", visible: true, width: "100px" },
  { id: "projectStatus", label: "Project Status", visible: true, width: "140px" },
  { id: "loanStatus", label: "Loan Status", visible: true, width: "140px" },
  { id: "updatedAt", label: "Updated", visible: true, width: "auto" },
];

// Transform status text for display
const capitalizeFirst = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};
const formatStatusForDisplay = (status) => {
  if (!status) return "—";
  const s = String(status).toLowerCase();
  // Normalize known phrase, then ensure first letter is capitalized
  if (s.includes("under") && s.includes("banking") && s.includes("process")) {
    return capitalizeFirst("bank processing");
  }
  // Otherwise, keep original wording but capitalize the first letter
  return capitalizeFirst(String(status));
};

// map loan statuses to chip styles
const loanStatusChipProps = (statusRaw) => {
  const status = String(statusRaw || "").toLowerCase();

  if (status.includes("disbursed")) return { color: "success", variant: "soft" };
  if (status.includes("sanctioned")) return { color: "success", variant: "outlined" };
  if (status.includes("under") && status.includes("process")) return { color: "primary", variant: "soft" };
  if (status.includes("pending")) return { color: "warning", variant: "soft" };
  if (status.includes("submitted")) return { color: "primary", variant: "outlined" };
  if (status.includes("hold")) return { color: "neutral", variant: "soft" };
  if (status.includes("dead")) return { color: "danger", variant: "soft" };
  
  return { color: "neutral", variant: "soft" };
};

// project status chip styles
const projectStatusChipProps = (statusRaw) => {
  const status = String(statusRaw || "").toLowerCase();

  switch (status) {
    case "completed":
      return { color: "success", variant: "soft" };
    case "ongoing":
      return { color: "primary", variant: "soft" };
    case "delayed":
      return { color: "warning", variant: "soft" };
    case "on hold":
      return { color: "neutral", variant: "soft" };
    case "dead":
      return { color: "danger", variant: "soft" };
    default:
      return { color: "neutral", variant: "soft" };
  }
};

const RecentLoansTable = ({
  rows = [],
  title = "Recent Loan Applications",
  loading = false,
  page = 1,
  total = 0,
  rowsPerPage = 10,
  statusFilter = "all",
  searchQuery = "",
  onPageChange,
  onRowsPerPageChange,
  onStatusFilterChange,
  onSearchChange,
}) => {
  const navigate = useNavigate();
  const [columns, setColumns] = useState(initialColumns);
  const pageCount = Math.max(1, Math.ceil(Math.max(total, 0) / Math.max(rowsPerPage, 1)));
  const currentPage = Math.min(Math.max(page, 1), pageCount);

  /* ---------- Rows shown (server-provided, already filtered) ---------- */
  const paginatedRows = Array.isArray(rows) ? rows : [];

  /* ---------- Visible columns ---------- */
  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible),
    [columns]
  );

  /* ---------- Column toggle ---------- */
  const handleToggleColumn = (id) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === id ? { ...col, visible: !col.visible } : col
      )
    );
  };

  return (
    <Card
      variant="soft"
      sx={{
        overflow: "hidden",
        borderRadius: 28,
        p: { xs: 1, sm: 0.5, md: 1.5 },
        bgcolor: "#fff",
        border: "1px solid",
        borderColor: "rgba(15,23,42,0.08)",
        boxShadow:
          "0 2px 6px rgba(15,23,42,0.06), 0 18px 32px rgba(15,23,42,0.06)",
        transition: "transform .16s ease, box-shadow .16s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow:
            "0 6px 16px rgba(15,23,42,0.10), 0 20px 36px rgba(15,23,42,0.08)",
        },
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5,
          flexShrink: 0,
        }}
      >
        <Typography level="title-md">{title}</Typography>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          {/* Status filter */}
          <Select
            size="sm"
            value={statusFilter}
            onChange={(_, value) => {
              onStatusFilterChange?.(value || "all");
            }}
            sx={{ minWidth: { xs: 120, sm: 150 } }}
          >
            <Option value="all">All Status</Option>
            <Option value="sanctioned">Sanctioned</Option>
            <Option value="disbursed">Disbursed</Option>
            <Option value="under banking process">Under Process</Option>
            <Option value="documents pending"> Documents Pending</Option>
            <Option value="submitted">Submitted</Option>
            <Option value="on hold">On Hold</Option>
            <Option value="dead">Dead</Option>
          </Select>

          {/* Search */}
          <Input
            size="sm"
            placeholder="Search loans..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange?.(e.target.value);
            }}
            sx={{ width: { xs: 150, sm: 220 } }}
          />

          {/* Column visibility */}
          <Dropdown>
            <MenuButton
              size="sm"
              variant="outlined"
              endDecorator={<KeyboardArrowDownRoundedIcon />}
            >
              Columns
            </MenuButton>
            <Menu sx={{ minWidth: 180 }}>
              {columns.map((col) => (
                <MenuItem
                  key={col.id}
                  onClick={() => handleToggleColumn(col.id)}
                >
                  <ListItemDecorator sx={{ mr: 1 }}>
                    {col.visible && <CheckRoundedIcon fontSize="sm" />}
                  </ListItemDecorator>
                  {col.label}
                </MenuItem>
              ))}
            </Menu>
          </Dropdown>
        </Box>
      </Box>

      {/* Table Container with fixed height */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          minHeight: { xs: 300, sm: 400 },
          maxHeight: { xs: 500, sm: 600 },
          border: "1px solid",
          borderColor: "neutral.outlinedBorder",
          borderRadius: "sm",
          mb: 1.5,
        }}
      >
        <Table
          size="sm"
          borderAxis="xBetween"
          stickyHeader
          sx={{
            "--TableCell-paddingX": "16px",
            "--TableCell-paddingY": "10px",
            "& thead th": {
              fontWeight: 700,
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              color: "#0f172a",
              bgcolor: "neutral.50",
              borderBottom: "1px solid",
              borderColor: "neutral.outlinedBorder",
              whiteSpace: "nowrap",
              position: "sticky",
              top: 0,
              zIndex: 10,
            },
          }}
        >
        <thead>
          <tr>
            {visibleColumns.map((col) => (
              <th key={col.id} style={{
                paddingLeft: col.id === "updatedAt" ? "40px" : "16px",
                width: col.width || "auto",
              }}>
                <Typography
                  level="body-xs"
                  sx={{
                    fontWeight: 700,
                    color: "#0f172a",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  {col.label}
                </Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={visibleColumns.length}>
                <Box sx={{ py: 3, textAlign: "center" }}>
                  <Typography level="body-sm" textColor="neutral.500">
                    Loading recent loans...
                  </Typography>
                </Box>
              </td>
            </tr>
          ) : paginatedRows.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length}>
                <Box sx={{ py: 3, textAlign: "center" }}>
                  <Typography level="body-sm" textColor="neutral.500">
                    No loans found.
                  </Typography>
                </Box>
              </td>
            </tr>
          ) : (
            paginatedRows.map((row) => (
              <tr 
                key={row.id || row.projectId}
                onClick={() => row.projectId && navigate(`/view_loan?project_id=${row.projectId}`)}
                style={{ cursor: row.projectId ? "pointer" : "default" }}
              >
                {visibleColumns.map((col) => {
                  const rawValue = row[col.id];

                  if (col.id === "loanStatus") {
                    const chipProps = loanStatusChipProps(rawValue);
                    const isUnderBankingProcess =
                      typeof rawValue === "string" &&
                      rawValue.toLowerCase().includes("under") &&
                      rawValue.toLowerCase().includes("process");
                    const displayText = formatStatusForDisplay(rawValue);
                    return (
                      <td key={col.id}>
                        <Chip
                          size="sm"
                          variant={chipProps.variant}
                          color={chipProps.color}
                          sx={{
                            whiteSpace: "nowrap",
                            "--Chip-minHeight": "28px",
                            "--Chip-paddingInline": "12px",
                            "--Chip-paddingBlock": "6px",
                          }}
                        >
                          {displayText}
                        </Chip>
                      </td>
                    );
                  }

                  if (col.id === "projectStatus") {
                    const chipProps = projectStatusChipProps(rawValue);
                    return (
                      <td key={col.id}>
                        <Chip
                          size="sm"
                          variant={chipProps.variant}
                          color={chipProps.color}
                          sx={{
                            whiteSpace: "nowrap",
                            "--Chip-minHeight": "28px",
                            "--Chip-paddingInline": "12px",
                            "--Chip-paddingBlock": "6px",
                          }}
                        >
                          {capitalizeFirst(rawValue) || "—"}
                        </Chip>
                      </td>
                    );
                  }

                  if (col.id === "updatedAt") {
                    return (
                      <td key={col.id} style={{
                        paddingLeft: col.id === "updatedAt" ? "40px" : "16px",
                      }}>
                        <Typography 
                          level="body-xs"
                          sx={{ 
                            fontWeight: 500,
                            color: "text.secondary",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {rawValue ?? "—"}
                        </Typography>
                      </td>
                    );
                  }

                  return (
                    <td key={col.id} style={{
                      paddingLeft: col.id === "updatedAt" ? "40px" : "16px",
                    }}>
                      <Typography level="body-sm">
                        {rawValue ?? "—"}
                      </Typography>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </Table>
      </Box>

      {/* Footer - Always visible at bottom */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          flexShrink: 0,
          pt: 1,
          borderTop: "1px solid",
          borderColor: "neutral.outlinedBorder",
        }}
      >
        <Typography level="body-xs" textColor="neutral.500">
          {total || (Array.isArray(rows) ? rows.length : 0)} loan(s)
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          {/* Rows per page selector (adjacent to pagination) */}
          <Select
            size="sm"
            value={String(rowsPerPage)}
            onChange={(_, value) => {
              const next = Number(value) || rowsPerPage;
              onRowsPerPageChange?.(next);
              onPageChange?.(1);
            }}
            sx={{ minWidth: 110, mr: { xs: 0, sm: "20px" } }}
          >
            <Option value="10">10 rows</Option>
            <Option value="25">25 rows</Option>
            <Option value="50">50 rows</Option>
          </Select>

          <IconButton
            size="sm"
            variant="outlined"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
          >
            <KeyboardArrowLeftRoundedIcon />
          </IconButton>
          <Typography level="body-xs" sx={{ whiteSpace: "nowrap" }}>
            Page {currentPage} of {pageCount || 1}
          </Typography>
          <IconButton
            size="sm"
            variant="outlined"
            disabled={currentPage >= pageCount}
            onClick={() => onPageChange?.(currentPage + 1)}
          >
            <KeyboardArrowRightRoundedIcon />
          </IconButton>
        </Box>
      </Box>
    </Card>
  );
};

export default RecentLoansTable;