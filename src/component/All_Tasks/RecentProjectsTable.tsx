import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Table,
  Input,
  Chip,
  LinearProgress,
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

/* ---------- Column config ---------- */
const initialColumns = [
  { id: "projectName", label: "Project Name", visible: true },
  { id: "clientName", label: "Client Name", visible: true },
  { id: "startDate", label: "Start Date", visible: true },
  { id: "deadline", label: "Deadline", visible: true },
  {
    id: "completionDate",
    label: "Completion", // ⬅️ changed here
    visible: true,
  },
  { id: "status", label: "Status", visible: true },
  { id: "progress", label: "Progress", visible: true },
];

// map backend statuses to chip styles
const statusChipProps = (statusRaw) => {
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
    case "books closed":
      return { color: "neutral", variant: "outlined" };
    case "to be started":
    default:
      return { color: "warning", variant: "soft" };
  }
};

// progress bar color by percentage
const getProgressColor = (pct) => {
  if (pct <= 0) return "neutral"; // 0% -> grey
  if (pct < 40) return "primary"; // 1–39% -> blue
  if (pct < 80) return "warning"; // 40–79% -> orange
  return "success"; // 80–100% -> green
};

// simple DD/MM/YYYY formatting for ISO or Date
const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const RecentProjectsTable = ({
  rows = [], // <-- comes from API now
  title = "Recent Projects",
}) => {
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [columns, setColumns] = useState(initialColumns);
  const [page, setPage] = useState(0);
  const rowsPerPage = 6;

  /* ---------- Filtering (search + status) ---------- */
  const filteredRows = useMemo(() => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const q = filterText.trim().toLowerCase();

    return safeRows.filter((r) => {
      const projectName = (r.projectName || "").toLowerCase();
      const clientName = (r.clientName || "").toLowerCase();
      const status = (r.status || "").toLowerCase();

      const matchesText =
        !q || projectName.includes(q) || clientName.includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        status === String(statusFilter || "").toLowerCase();

      return matchesText && matchesStatus;
    });
  }, [rows, filterText, statusFilter]);

  /* ---------- Pagination ---------- */
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount - 1);

  const paginatedRows = useMemo(() => {
    const start = currentPage * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  /* ---------- Column visibility ---------- */
  const visibleColumns = columns.filter((c) => c.visible);

  const handleToggleColumn = (id) => {
    setColumns((prev) => {
      const visibleCount = prev.filter((c) => c.visible).length;
      return prev.map((c) => {
        if (c.id !== id) return c;
        // prevent hiding the last visible column
        if (c.visible && visibleCount === 1) return c;
        return { ...c, visible: !c.visible };
      });
    });
  };

  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
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
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5,
        }}
      >
        <Typography level="title-md">{title}</Typography>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {/* Status filter */}
          <Select
            size="sm"
            value={statusFilter}
            onChange={(_, value) => {
              setStatusFilter(value || "all");
              setPage(0);
            }}
            sx={{ minWidth: 170 }}
          >
            <Option value="all">All Status</Option>
            <Option value="to be started">To be started</Option>
            <Option value="ongoing">Ongoing</Option>
            <Option value="completed">Completed</Option>
            <Option value="delayed">Delayed</Option>
            <Option value="on hold">On Hold</Option>
            <Option value="dead">Dead</Option>
            <Option value="books closed">Books Closed</Option>
          </Select>

          {/* Search */}
          <Input
            size="sm"
            placeholder="Filter projects..."
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              setPage(0);
            }}
            sx={{ width: 220 }}
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

      {/* Table */}
      <Table
        size="sm"
        borderAxis="xBetween"
        sx={{
          "--TableCell-paddingX": "12px",
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
          },
        }}
      >
        <thead>
          <tr>
            {visibleColumns.map((col) => (
              <th key={col.id}>
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
          {paginatedRows.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length}>
                <Box sx={{ py: 3, textAlign: "center" }}>
                  <Typography level="body-sm" textColor="neutral.500">
                    No projects found.
                  </Typography>
                </Box>
              </td>
            </tr>
          ) : (
            paginatedRows.map((row) => (
              <tr key={row.id || row.project_id}>
                {visibleColumns.map((col) => {
                  const rawValue = row[col.id];

                  if (col.id === "status") {
                    const chipProps = statusChipProps(rawValue);
                    return (
                      <td key={col.id}>
                        <Chip
                          size="sm"
                          variant={chipProps.variant}
                          color={chipProps.color}
                        >
                          {rawValue || "—"}
                        </Chip>
                      </td>
                    );
                  }

                  if (col.id === "progress") {
                    const pct = Number(rawValue ?? 0);
                    const barColor = getProgressColor(pct);
                    return (
                      <td key={col.id}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            minWidth: 140,
                          }}
                        >
                          <Box sx={{ flexGrow: 1 }}>
                            <LinearProgress
                              determinate
                              value={pct}
                              variant="solid"
                              color={barColor}
                              sx={{
                                "--LinearProgress-radius": "999px",
                                "--LinearProgress-thickness": "6px",
                              }}
                            />
                          </Box>
                          <Typography level="body-xs" sx={{ fontWeight: 600 }}>
                            {pct}%
                          </Typography>
                        </Box>
                      </td>
                    );
                  }

                  if (
                    col.id === "startDate" ||
                    col.id === "deadline" ||
                    col.id === "completionDate"
                  ) {
                    return (
                      <td key={col.id}>
                        <Typography level="body-sm">
                          {formatDate(rawValue)}
                        </Typography>
                      </td>
                    );
                  }

                  return (
                    <td key={col.id}>
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

      {/* Footer */}
      <Box
        sx={{
          mt: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography level="body-xs" textColor="neutral.500">
          {filteredRows.length} project(s)
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            size="sm"
            variant="outlined"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <KeyboardArrowLeftRoundedIcon />
          </IconButton>
          <Typography level="body-xs">
            Page {currentPage + 1} of {pageCount}
          </Typography>
          <IconButton
            size="sm"
            variant="outlined"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            <KeyboardArrowRightRoundedIcon />
          </IconButton>
        </Box>
      </Box>
    </Card>
  );
};

export default RecentProjectsTable;
