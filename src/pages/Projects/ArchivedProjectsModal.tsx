import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  Checkbox,
  Box,
  Input,
  Typography,
  Tooltip,
} from "@mui/joy";
import { toast } from "react-toastify";
import {
  useGetAllProjectsQuery,
  useUnarchiveSelectedProjectsMutation,
} from "../../redux/projectsSlice";

export default function ArchivedProjectsModal({ open, onClose }) {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  const { data, isFetching, refetch } = useGetAllProjectsQuery(
    { page, limit, search, archived: "1" }, // ✅ IMPORTANT: send "1" (string)
    { skip: !open }
  );

  const [unarchiveSelected, { isLoading: isUnarchiving }] =
    useUnarchiveSelectedProjectsMutation();

  const rows = data?.data || [];
  const total = data?.pagination?.totalDocs || 0;

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setSearch("");
      setPage(1);
    }
  }, [open]);

  const allVisibleIds = useMemo(() => rows.map((r) => r._id), [rows]);
  const allChecked =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selected.includes(id));

  const toggleAll = () => {
    if (allChecked) {
      setSelected((prev) => prev.filter((id) => !allVisibleIds.includes(id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...allVisibleIds])));
    }
  };

  const toggleOne = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const formatDDMMYYYY = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("en-GB"); // dd/mm/yyyy
  };

  const handleUnarchive = async () => {
    try {
      if (!selected.length) {
        toast.error("Select at least one project.");
        return;
      }
      const res = await unarchiveSelected({ ids: selected }).unwrap();
      toast.success(`${res?.unarchivedCount || 0} project(s) unarchived`);
      setSelected([]);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to unarchive");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        size="lg"
        variant="outlined"
        sx={{ borderRadius: "lg", width: "min(1200px, 96vw)" }}
      >
        <DialogTitle>Archived Projects</DialogTitle>

        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <Input
              placeholder="Search (name / code / customer)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              sx={{ flex: 1 }}
            />
            <Typography level="body-sm">
              {isFetching ? "Loading..." : `Total: ${total}`}
            </Typography>
          </Box>

          {/* ✅ horizontal scroll if screen is small */}
          <Box sx={{ overflowX: "auto" }}>
            <Table
              size="sm"
              borderAxis="bothBetween"
              sx={{
                minWidth: 980,
                tableLayout: "fixed",
                "& th": { fontWeight: 700, whiteSpace: "nowrap" },
                "& td": { verticalAlign: "top" },
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: 44 }}>
                    <Checkbox checked={allChecked} onChange={toggleAll} />
                  </th>

                  {/* ✅ fixed widths so columns don't collapse */}
                  <th style={{ width: 240 }}>Code</th>
                  <th style={{ width: 240 }}>Name</th>
                  <th style={{ width: 180 }}>Customer</th>
                  <th style={{ width: 120 }}>State</th>
                  <th style={{ width: 160 }}>Archived By</th>
                  <th style={{ width: 120 }}>Archived At</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((p) => {
                  const code = p.code || "-";
                  const name = p.name || "-";
                  const customer = p.customer || "-";
                  const state = p.state || "-";
                  const archivedBy = p.archived_by_name || "-";
                  const archivedAt = formatDDMMYYYY(p.archived_at);

                  return (
                    <tr key={p._id}>
                      <td>
                        <Checkbox
                          checked={selected.includes(p._id)}
                          onChange={() => toggleOne(p._id)}
                        />
                      </td>

                      {/* ✅ one-line + ellipsis + tooltip */}
                      <td>
                        <Tooltip title={code} placement="top-start">
                          <Typography
                            level="body-sm"
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              width: "100%",
                              display: "block",
                            }}
                          >
                            {code}
                          </Typography>
                        </Tooltip>
                      </td>

                      {/* ✅ Name also ellipsis (optional but looks clean) */}
                      <td>
                        <Tooltip title={name} placement="top-start">
                          <Typography
                            level="body-sm"
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              width: "100%",
                              display: "block",
                            }}
                          >
                            {name}
                          </Typography>
                        </Tooltip>
                      </td>

                      <td>
                        <Tooltip title={customer} placement="top-start">
                          <Typography
                            level="body-sm"
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              width: "100%",
                              display: "block",
                            }}
                          >
                            {customer}
                          </Typography>
                        </Tooltip>
                      </td>

                      <td>{state}</td>
                      <td>{archivedBy}</td>
                      <td>{archivedAt}</td>
                    </tr>
                  );
                })}

                {!isFetching && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 12 }}>
                      No archived projects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Button
              size="sm"
              variant="outlined"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Typography level="body-sm">Page: {page}</Typography>
            <Button
              size="sm"
              variant="outlined"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" color="neutral" onClick={onClose}>
            Close
          </Button>
          <Button
            color="success"
            onClick={handleUnarchive}
            disabled={isUnarchiving || !selected.length}
          >
            {isUnarchiving ? "Unarchiving..." : `Unarchive (${selected.length})`}
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
}
