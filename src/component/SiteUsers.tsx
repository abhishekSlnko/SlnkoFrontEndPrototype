import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SearchIcon from "@mui/icons-material/Search";

// ⭐ ICONS FOR STATUS
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded"; // working
import PauseCircleFilledRoundedIcon from "@mui/icons-material/PauseCircleFilledRounded"; // idle
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded"; // travelling
import BlockRoundedIcon from "@mui/icons-material/BlockRounded"; // work_stopped
import BeachAccessRoundedIcon from "@mui/icons-material/BeachAccessRounded"; // on leave

import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import FormControl from "@mui/joy/FormControl";
import IconButton, { iconButtonClasses } from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import Sheet from "@mui/joy/Sheet";
import Tooltip from "@mui/joy/Tooltip";
import Typography from "@mui/joy/Typography";
import Chip from "@mui/joy/Chip";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import CircularProgress from "@mui/joy/CircularProgress";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NoData from "../assets/alert-bell.svg";

import { useGetSiteEngineerStatusQuery } from "../redux/projectsSlice";

// (kept in case you use elsewhere)
const statusChipColor = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "working") return "success";
  if (s === "work_stopped") return "warning";
  if (s === "on leave") return "primary";
  if (s === "idle") return "danger";
  if (s === "travelling") return "info";
  return "neutral";
};

// utils/dateUtils.js (or inside same file)
export const formatToDDMMYYYY = (value) => {
  if (!value) return "N/A";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0"); // 0-based
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

const DateChip = ({ date }) => {
  return (
    <Chip size="sm" variant="soft" color="neutral" sx={{ fontWeight: 500 }}>
      {formatToDDMMYYYY(date)}
    </Chip>
  );
};

// ⭐ meta for status -> color + Icon component
const statusMeta = (status) => {
  const s = String(status || "").toLowerCase();

  if (s === "working") return { color: "success", Icon: PlayArrowRoundedIcon };
  if (s === "idle")
    return { color: "danger", Icon: PauseCircleFilledRoundedIcon };
  if (s === "travelling")
    return { color: "info", Icon: DirectionsCarFilledRoundedIcon };
  if (s === "work_stopped") return { color: "warning", Icon: BlockRoundedIcon };
  if (s === "on leave") return { color: "primary", Icon: BeachAccessRoundedIcon };

  return { color: "neutral", Icon: null };
};

/**
 * ✅ FULL UPDATED CODE (keeping your UI same):
 * - Selection stores ONLY userIds (for bulk role update)
 * - Select All works using userIds
 * - Optional `onSelectionChange(ids)` callback to parent
 */
function SiteEngineers({ onSelectionChange }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ store ONLY userIds
  const [selectUser, setSelectUser] = useState([]);

  const initialPageSize = parseInt(searchParams.get("pageSize")) || 10;
  const searchFromUrl = searchParams.get("search") || "";
  const stateFromUrl = searchParams.get("state") || "";
  const projectIdFromUrl = searchParams.get("projectId") || "";
  const engineerFromUrl = searchParams.get("engineer") || "";
  const statusFromUrl = searchParams.get("status") || "";
  const reportingFromUrl = searchParams.get("reporting") || "";
  const isAssignedFromUrl = searchParams.get("isAssigned") || "";
  const fromFromUrl = searchParams.get("from") || "";
  const toFromUrl = searchParams.get("to") || "";

  const [perPage, setPerPage] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [statusFilter, setStatusFilter] = useState(statusFromUrl || "");
  const [reporting, setReporting] = useState(reportingFromUrl || "");
  const [isAssigned, setIsAssigned] = useState(isAssignedFromUrl || "");

  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const s = searchParams.get("search") || "";
    const st = searchParams.get("status") || "";
    const rp = searchParams.get("reporting") || "";
    const iau = searchParams.get("isAssigned") || "";

    setCurrentPage(p);
    setSearchQuery(s);
    setStatusFilter(st);
    setReporting(rp);
    setIsAssigned(iau);
  }, [searchParams]);

  // ✅ let parent know selected userIds (optional)
  useEffect(() => {
    if (typeof onSelectionChange === "function") {
      onSelectionChange(selectUser);
    }
  }, [selectUser, onSelectionChange]);

  // 🔁 Call API – backend pagination + backend search + date range
  const { data: siteRes = {}, isLoading } = useGetSiteEngineerStatusQuery(
    {
      state: stateFromUrl || undefined,
      startDate: fromFromUrl || undefined,
      endDate: toFromUrl || undefined,
      projectId: projectIdFromUrl || undefined,
      reporting: reporting || undefined,
      isAssigned: isAssigned ? isAssigned : undefined,
      search: searchQuery || undefined,
      page: currentPage,
      limit: perPage,
      status: statusFilter || undefined,
    },
    {
      refetchOnMountOrArgChange: true, // ✅ ensures refetch when args change
    }
  );

  const total = siteRes?.total || 0;
  const totalPages = siteRes?.totalPages || 1;

  const apiRows = Array.isArray(siteRes?.data) ? siteRes.data : [];

  // 🔍 client-side status filter (search handled by backend)
  const filteredRows = useMemo(() => {
    let list = apiRows;

    if (statusFilter) {
      list = list.filter((row) => {
        const cs = row?.userDetail?.current_status;
        const s = typeof cs === "string" ? cs : cs?.status || "";
        return String(s || "").toLowerCase() === statusFilter.toLowerCase();
      });
    }

    return list;
  }, [apiRows, statusFilter]);

  const rows = filteredRows;

  // ✅ userIds of current page (for select all)
  const pageUserIds = useMemo(() => {
    const ids = rows
      .map((row) => String(row?.userDetail?._id || ""))
      .filter(Boolean);
    return Array.from(new Set(ids));
  }, [rows]);

  const isAllChecked =
    pageUserIds.length > 0 && pageUserIds.every((id) => selectUser.includes(id));

  const isIndeterminate =
    pageUserIds.some((id) => selectUser.includes(id)) && !isAllChecked;

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

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (query) p.set("search", query);
      else p.delete("search");
      p.set("page", "1");
      if (statusFilter) p.set("status", statusFilter);
      if (stateFromUrl) p.set("state", stateFromUrl);
      if (projectIdFromUrl) p.set("projectId", projectIdFromUrl);
      if (engineerFromUrl) p.set("engineer", engineerFromUrl);
      if (reporting) p.set("reporting", reporting);
      if (isAssigned) p.set("isAssigned", isAssigned);
      if (fromFromUrl) p.set("from", fromFromUrl);
      if (toFromUrl) p.set("to", toFromUrl);
      return p;
    });
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value) => {
    const v = value || "";
    setStatusFilter(v);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (v) p.set("status", v);
      else p.delete("status");
      p.set("page", "1");
      p.set("search", searchQuery || "");
      if (stateFromUrl) p.set("state", stateFromUrl);
      if (projectIdFromUrl) p.set("projectId", projectIdFromUrl);
      if (reporting) p.set("reporting", reporting);
      if (isAssigned) p.set("isAssigned", isAssigned);
      if (fromFromUrl) p.set("from", fromFromUrl);
      if (toFromUrl) p.set("to", toFromUrl);
      return p;
    });
    setCurrentPage(1);
  };

  // ✅ select all only userIds
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectUser((prevSelected) => [
        ...new Set([...(prevSelected || []), ...pageUserIds]),
      ]);
    } else {
      setSelectUser((prevSelected) =>
        (prevSelected || []).filter((id) => !pageUserIds.includes(id))
      );
    }
  };

  // ✅ select row only userId
  const handleRowSelect = (userId) => {
    if (!userId) return;
    setSelectUser((prev) =>
      prev.includes(userId)
        ? prev.filter((item) => item !== userId)
        : [...prev, userId]
    );
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("page", String(page));
        p.set("pageSize", String(perPage));
        if (searchQuery) p.set("search", searchQuery);
        else p.delete("search");
        if (statusFilter) p.set("status", statusFilter);
        else p.delete("status");
        if (stateFromUrl) p.set("state", stateFromUrl);
        if (projectIdFromUrl) p.set("projectId", projectIdFromUrl);
        if (reporting) p.set("reporting", reporting);
        if (isAssigned) p.set("isAssigned", isAssigned);
        if (fromFromUrl) p.set("from", fromFromUrl);
        if (toFromUrl) p.set("to", toFromUrl);
        return p;
      });
      setCurrentPage(page);
    }
  };

  return (
    <Box
      sx={{
        ml: { lg: "var(--Sidebar-width)" },
        px: "0px",
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
      }}
    >
      {/* Top filter + search bar */}
      <Box display={"flex"} justifyContent={"space-between"} pb={0.5}>
        <Box
          display={"flex"}
          justifyContent={"space-between"}
          width={"100%"}
          alignItems={"center"}
        ></Box>

        <Box
          className="SearchAndFilters-tabletUp"
          sx={{
            borderRadius: "sm",
            py: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            width: { lg: "100%" },
          }}
        >
          <FormControl sx={{ flex: 1 }} size="sm">
            <Input
              size="sm"
              placeholder="Search by User / Project / State / Location"
              startDecorator={<SearchIcon />}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </FormControl>
        </Box>
      </Box>

      {/* Table */}
      <Sheet
        variant="outlined"
        sx={{
          display: { xs: "none", sm: "block" },
          width: "100%",
          borderRadius: "sm",
          maxHeight: "66vh",
          overflowY: "auto",
        }}
      >
        <Box
          component="table"
          sx={{
            width: "100%",
            borderCollapse: "collapse",
            maxHeight: "40vh",
            overflowY: "auto",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
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
                  size="sm"
                  checked={isAllChecked}
                  indeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                />
              </th>

              {[
                "User",
                "Project ID",
                "Project Name",
                "Primary/Secondary",
                "State",
                "Location",
                "Status",
                "Planned Start",
                "Planned Finish",
                "Actual Start",
                "Actual Finish",
              ].map((header) => (
                <th
                  key={header}
                  style={{
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
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ padding: "8px" }}>
                  <Box
                    sx={{
                      fontStyle: "italic",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CircularProgress size="sm" sx={{ mb: "8px" }} />
                    <Typography fontStyle="italic">Loading...</Typography>
                  </Box>
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((row) => {
                const project = row.projectDetail || {};
                const user = row.userDetail || {};

                const projectId = project._id || "-";
                const projectCode = project.code || String(projectId) || "-";
                const projectName = project.name || "-";
                const state = project.state || "-";
                const location = project.location || "-";

                const cs = user.current_status;
                const status = typeof cs === "string" ? cs : cs?.status || "-";
                const remarks =
                  typeof cs === "object" && cs !== null ? cs.remarks || "" : "";

                // keep your row key format (no UI change)
                const rowId = `${user._id || "user"}_${project._id || "noproj"}`;

                const { color, Icon: StatusIcon } = statusMeta(status);

                const userId = String(user?._id || "");

                return (
                  <tr key={rowId}>
                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      <Checkbox
                        size="sm"
                        checked={!!userId && selectUser.includes(userId)}
                        onChange={() => handleRowSelect(userId)}
                      />
                    </td>

                    {/* User */}
                    <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
                      <Chip
                        variant="outlined"
                        color="primary"
                        onClick={() => navigate(`/user_profile?user_id=${user._id}`)}
                      >
                        {user?.name || "-"}
                      </Chip>
                    </td>

                    {/* Project ID / Code */}
                    <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
                      {projectCode || "-"}
                    </td>

                    {/* Project Name */}
                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      {projectName || "-"}
                    </td>

                    {/* Primary / Secondary */}
                    <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
                      {row.primary || row.secondary ? (
                        <Chip
                          size="sm"
                          variant="soft"
                          color={row.primary ? "success" : "warning"}
                          sx={{ textTransform: "capitalize", fontWeight: 600 }}
                        >
                          {row.primary ? "Primary" : "Secondary"}
                        </Chip>
                      ) : (
                        <Chip
                          size="sm"
                          variant="outlined"
                          color="neutral"
                          sx={{ fontWeight: 500 }}
                        >
                          Unassigned
                        </Chip>
                      )}
                    </td>

                    {/* State */}
                    <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
                      {state}
                    </td>

                    {/* Location */}
                    <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
                      {location}
                    </td>

                    {/* Status with icon */}
                    <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
                      <Tooltip
                        placement="top"
                        title={remarks ? `Remarks: ${remarks}` : ""}
                        arrow
                      >
                        <Chip
                          variant="soft"
                          color={color}
                          size="sm"
                          sx={{ fontWeight: 600 }}
                          startDecorator={
                            StatusIcon ? <StatusIcon fontSize="small" /> : null
                          }
                        >
                          {String(status || "-")
                            .split(" ")
                            .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
                            .join(" ")}
                        </Chip>
                      </Tooltip>
                    </td>

                    <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
                      <DateChip date={row?.activityDetail?.actual_start || "N/A"} />
                    </td>
                    <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
                      <DateChip date={row?.activityDetail?.actual_finish || "N/A"} />
                    </td>
                    <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
                      <DateChip date={row?.activityDetail?.planned_start || "N/A"} />
                    </td>
                    <td style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>
                      <DateChip date={row?.activityDetail?.planned_finish || "N/A"} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: "8px", textAlign: "left" }}>
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
                      style={{
                        width: "50px",
                        height: "50px",
                        marginBottom: "8px",
                      }}
                    />
                    <Typography fontStyle="italic">No Site Engineers Found</Typography>
                  </Box>
                </td>
              </tr>
            )}
          </tbody>
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
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        <Box>
          Showing page {currentPage} of {totalPages} ({total} results)
        </Box>

        <Box sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 1 }}>
          {getPaginationRange().map((page, idx) =>
            page === "..." ? (
              <Box key={`ellipsis-${idx}`} sx={{ px: 1 }}>
                ...
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
            )
          )}
        </Box>

        <FormControl size="sm" sx={{ minWidth: 80 }}>
          <Select
            value={perPage}
            onChange={(_e, newValue) => {
              const v = Number(newValue) || 10;
              setPerPage(v);
              setCurrentPage(1);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("page", "1");
                next.set("pageSize", String(v));
                if (fromFromUrl) next.set("from", fromFromUrl);
                if (toFromUrl) next.set("to", toFromUrl);
                return next;
              });
            }}
          >
            {[10, 30, 60, 100, 500, 1000].map((num) => (
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
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
}

export default SiteEngineers;