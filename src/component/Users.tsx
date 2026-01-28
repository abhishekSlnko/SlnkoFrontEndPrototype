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
import Tooltip from "@mui/joy/Tooltip";
import Typography from "@mui/joy/Typography";
import Chip from "@mui/joy/Chip";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import DialogTitle from "@mui/joy/DialogTitle";
import DialogContent from "@mui/joy/DialogContent";
import DialogActions from "@mui/joy/DialogActions";
import Textarea from "@mui/joy/Textarea";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import CircularProgress from "@mui/joy/CircularProgress";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NoData from "../assets/alert-bell.svg";
import { toast } from "react-toastify";
import {
  useGetAllUsersQuery,
  useUpdateUserStatusMutation,
} from "../redux/loginSlice";

function Users({ setSelectedIds }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageFromUrl = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10)
  );
  const pageSizeFromUrl = Math.max(
    1,
    parseInt(searchParams.get("pageSize") || "10", 10)
  );
  const tabFromUrl = searchParams.get("tab") || "All";
  const searchFromUrl = searchParams.get("search") || "";
  const departmentFromUrl = searchParams.get("department") || "";
  const statusFromUrl = searchParams.get("status") || "";

  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [rowsPerPage, setRowsPerPage] = useState(pageSizeFromUrl);
  const [selectedTab, setSelectedTab] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);

  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const ps = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10));
    const t = searchParams.get("tab") || "All";
    const s = searchParams.get("search") || "";
    setCurrentPage(p);
    setRowsPerPage(ps);
    setSelectedTab(t);
    setSearchQuery(s);
  }, [searchParams]);

  const [selected, setSelected] = useState([]);

  const options = [1, 5, 10, 20, 50, 100];

  const {
    data: getUsers = {},
    isLoading,
    refetch,
  } = useGetAllUsersQuery({
    page: currentPage,
    status: statusFromUrl,
    search: searchQuery,
    limit: rowsPerPage,
    department: departmentFromUrl,
  });

  const [updateUserStatus, { isLoading: isUpdatingStatus }] =
    useUpdateUserStatusMutation();

  const Users = getUsers?.data || [];

  const totalRecords = Number(getUsers?.total || 0);
  const apiLimit = Number(getUsers?.limit || rowsPerPage);
  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords > 0 ? totalRecords / apiLimit : 1)
  );

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("search", query);
      p.set("page", "1");
      if (selectedTab) p.set("tab", selectedTab);
      if (rowsPerPage) p.set("pageSize", String(rowsPerPage));
      return p;
    });
    setCurrentPage(1);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const ids = Users.map((row) => row._id);
      setSelected(ids);
      setSelectedIds(ids);
    } else {
      setSelected([]);
      setSelectedIds([]);
    }
  };

  const handleRowSelect = (_id) => {
    setSelected((prev) =>
      prev.includes(_id) ? prev.filter((item) => item !== _id) : [...prev, _id]
    );
    setSelectedIds((prev) =>
      prev.includes(_id) ? prev.filter((item) => item !== _id) : [...prev, _id]
    );
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("page", String(page));
        if (selectedTab) p.set("tab", selectedTab);
        if (rowsPerPage) p.set("pageSize", String(rowsPerPage));
        p.set("search", searchQuery || "");
        return p;
      });
      setCurrentPage(page);
    }
  };

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

  // ---------- Status chip helpers + modal ----------
  const statusChipColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "working") return "success";
    if (s === "work_stopped") return "warning";
    if (s === "on leave") return "primary";
    if (s === "idle") return "danger";
    if (s === "travelling") return "info";
    return "neutral";
  };

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusUserId, setStatusUserId] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: "", remarks: "" });

  const openStatusModal = (user) => {
    const currentStatus = user?.current_status?.status || user?.status || "";
    const currentRemarks = user?.current_status?.remarks || "";
    setStatusUserId(user?._id);
    setStatusForm({
      status: currentStatus || "working",
      remarks: currentRemarks || "",
    });
    setStatusModalOpen(true);
  };

  const submitStatusUpdate = async () => {
    if (!statusUserId) return;
    try {
      if (!statusForm.remarks) {
        toast.error("Remarks is required!!");
        return;
      }

      await updateUserStatus({
        userId: statusUserId,
        status: statusForm.status,
        remarks: statusForm.remarks,
      }).unwrap();

      setStatusModalOpen(false);
      await (refetch().unwrap?.() ?? refetch());
    } catch (e) {
      toast.error("Failed to update user status");
    }
  };

  // ✅ NEW: reporting name helpers
  const getReportingName = (v) => {
    if (!v) return "-";
    if (typeof v === "string") return v;
    return v?.name || "-";
  };

  // ✅ NEW: headers (added primary + secondary)
  const tableHeaders = [
    "Emp Id",
    "Name",
    "Phone Number",
    "Department",
    "Location",
    "Primary Reporting",
    "Secondary Reporting",
    "Working Status",
  ];

  const totalCols = 1 + tableHeaders.length; // 1 checkbox + headers

  return (
    <Box
      sx={{
        ml: { lg: "var(--Sidebar-width)" },
        px: "0px",
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
      }}
    >
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
              placeholder="Search by Emp Id, Name, Phone, Department, or Location"
              startDecorator={<SearchIcon />}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
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
                  checked={
                    Users.length > 0 && selected?.length === Users?.length
                  }
                  onChange={handleSelectAll}
                  indeterminate={
                    selected?.length > 0 && selected?.length < Users?.length
                  }
                />
              </th>

              {tableHeaders.map((header) => (
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
                <td colSpan={totalCols} style={{ padding: "8px" }}>
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
            ) : Users?.length > 0 ? (
              Users.map((user, index) => {
                const status = user?.current_status?.status || "-";
                const remarks = user?.current_status?.remarks || "";
                const primaryName = getReportingName(user?.primary_reporting);
                const secondaryName = getReportingName(
                  user?.secondary_reporting
                );

                return (
                  <tr key={user._id || index}>
                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      <Checkbox
                        size="sm"
                        checked={selected.includes(user._id)}
                        onChange={() => handleRowSelect(user._id)}
                      />
                    </td>

                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      <Chip
                        variant="outlined"
                        color="primary"
                        onClick={() =>
                          navigate(`/user_profile?user_id=${user._id}`)
                        }
                      >
                        {user.emp_id || "-"}
                      </Chip>
                    </td>

                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      {user.name || "-"}
                    </td>

                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      {user.phone || "-"}
                    </td>

                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        padding: "8px",
                        textTransform: "capitalize",
                      }}
                    >
                      {user.department || "-"}
                    </td>

                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      {user.location || "-"}
                    </td>

                    {/* ✅ NEW: Primary Reporting */}
                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      {primaryName !== "-" ? (
                        <Chip
                          variant="soft"
                          color="neutral"
                          size="sm"
                          sx={{ fontWeight: 600, cursor: "pointer" }}
                          onClick={() =>
                            navigate(
                              `/user_profile?user_id=${user.primary_reporting?._id}`
                            )
                          }
                        >
                          {primaryName}
                        </Chip>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      {secondaryName !== "-" ? (
                        <Chip
                          variant="soft"
                          color="neutral"
                          size="sm"
                          sx={{ fontWeight: 600, cursor: "pointer" }}
                          onClick={() =>
                            navigate(
                              `/user_profile?user_id=${user?.secondary_reporting?._id}`
                            )
                          }
                        >
                          {secondaryName}
                        </Chip>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* Status chip */}
                    <td
                      style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                    >
                      <Tooltip
                        placement="top"
                        title={
                          remarks
                            ? `Remarks: ${remarks}`
                            : "Click to change status"
                        }
                        arrow
                      >
                        <Chip
                          variant="soft"
                          color={statusChipColor(status)}
                          size="sm"
                          onClick={() => openStatusModal(user)}
                          sx={{ cursor: "pointer", fontWeight: 600 }}
                        >
                          {String(status || "-")
                            .split(" ")
                            .map((w) =>
                              w ? w[0].toUpperCase() + w.slice(1) : ""
                            )
                            .join(" ")}
                        </Chip>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={totalCols}
                  style={{ padding: "8px", textAlign: "left" }}
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
                      style={{
                        width: "50px",
                        height: "50px",
                        marginBottom: "8px",
                      }}
                    />
                    <Typography fontStyle="italic">No Users Found</Typography>
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
          pt: 0.5,
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
          Showing {Users?.length} of {totalRecords} results
        </Box>

        <Box
          sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 1 }}
        >
          {getPaginationRange().map((page, idx) =>
            page === "..." ? (
              <Box key={`ellipsis-${idx}`} sx={{ px: 1 }}>
                ...
              </Box>
            ) : (
              <IconButton
                key={page}
                size="sm"
                variant={page === currentPage ? "contained" : "outlined"}
                color="neutral"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </IconButton>
            )
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={1} sx={{ p: "8px 16px" }}>
          <Select
            value={rowsPerPage}
            onChange={(_e, newValue) => {
              if (newValue !== null) {
                setRowsPerPage(newValue);
                setSearchParams((prev) => {
                  const params = new URLSearchParams(prev);
                  params.set("pageSize", String(newValue));
                  params.set("page", "1");
                  params.set("tab", selectedTab);
                  params.set("search", searchQuery || "");
                  return params;
                });
                setCurrentPage(1);
              }
            }}
            size="sm"
            variant="outlined"
            sx={{ minWidth: 80, borderRadius: "md", boxShadow: "sm" }}
          >
            {options.map((value) => (
              <Option key={value} value={value}>
                {value}
              </Option>
            ))}
          </Select>
        </Box>

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

      {/* Status Change Modal */}
      <Modal open={statusModalOpen} onClose={() => setStatusModalOpen(false)}>
        <ModalDialog variant="outlined" size="md" sx={{ borderRadius: "lg" }}>
          <DialogTitle>Update User Status</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "grid", gap: 1.25 }}>
              <FormControl size="sm">
                <Typography level="body-sm" sx={{ mb: 0.5 }}>
                  Status
                </Typography>
                <Select
                  size="sm"
                  value={statusForm.status}
                  onChange={(_, v) =>
                    setStatusForm((f) => ({ ...f, status: v || f.status }))
                  }
                >
                  <Option value="working">Working</Option>
                  <Option value="idle">Idle</Option>
                  <Option value="travelling">Travelling</Option>
                  <Option value="work_stopped">Work Stopped</Option>
                  <Option value="on leave">On Leave</Option>
                </Select>
              </FormControl>

              <FormControl size="sm">
                <Typography level="body-sm" sx={{ mb: 0.5 }}>
                  Remarks
                </Typography>
                <Textarea
                  minRows={3}
                  value={statusForm.remarks}
                  onChange={(e) =>
                    setStatusForm((f) => ({ ...f, remarks: e.target.value }))
                  }
                  placeholder="Add remarks (mandatory)"
                />
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              size="sm"
              variant="outlined"
              color="neutral"
              onClick={() => setStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submitStatusUpdate}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
}

export default Users;
