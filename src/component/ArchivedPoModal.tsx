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
  useGetArchivedPaginatedPOsQuery,
  useUnarchiveSelectedPoMutation,
} from "../redux/purchasesSlice";

/* ---------------------------------------------
   Helper: category display + tooltip
--------------------------------------------- */
const getCategoryDisplay = (categories = []) => {
  if (!Array.isArray(categories) || categories.length === 0) {
    return { text: "-", tooltip: "-" };
  }

  // remove duplicates (optional but recommended)
  const unique = [...new Set(categories)];

  const first = unique[0];
  const extraCount = unique.length - 1;

  return {
    text: extraCount > 0 ? `${first} +${extraCount}` : first,
    tooltip: unique.join(", "),
  };
};

export default function ArchivedPoModal({ open, onClose }) {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  const { data, isFetching, refetch } = useGetArchivedPaginatedPOsQuery(
    { page, limit, search, archived: "1" },
    { skip: !open }
  );

  const [unarchiveSelected, { isLoading: isUnarchiving }] =
    useUnarchiveSelectedPoMutation();

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
    return dt.toLocaleDateString("en-GB");
  };

  const handleUnarchive = async () => {
    try {
      if (!selected.length) {
        toast.error("Select at least one PO.");
        return;
      }

      const res = await unarchiveSelected({ ids: selected }).unwrap();

      toast.success(`${res?.unarchivedCount || 0} PO(s) unarchived`);
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
        <DialogTitle>Archived Purchase Orders</DialogTitle>

        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <Input
              placeholder="Search"
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
                  <th style={{ width: 200 }}>Project ID</th>
                  <th style={{ width: 200 }}>PO Number</th>
                  <th style={{ width: 200 }}>Category</th>
                  <th style={{ width: 120 }}>PO Value</th>
                  <th style={{ width: 160 }}>Archived By</th>
                  <th style={{ width: 120 }}>Archived At</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((p) => {
                  const { text, tooltip } = getCategoryDisplay(
                    p.category_names
                  );

                  return (
                    <tr key={p._id}>
                      <td>
                        <Checkbox
                          checked={selected.includes(p._id)}
                          onChange={() => toggleOne(p._id)}
                        />
                      </td>

                      <td>
                        <Tooltip title={p.p_id || "-"} placement="top-start">
                          <Typography
                            level="body-sm"
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 200,
                              display: "block",
                            }}
                          >
                            {p.p_id || "-"}
                          </Typography>
                        </Tooltip>
                      </td>

                      <td>
                        <Tooltip title={p.po_number || "-"} placement="top-start">
                          <Typography
                            level="body-sm"
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 200,
                              display: "block",
                            }}
                          >
                            {p.po_number || "-"}
                          </Typography>
                        </Tooltip>
                      </td>


                      {/* ✅ CATEGORY COLUMN */}
                      <td>
                        <Tooltip title={tooltip} placement="top-start">
                          <Typography
                            level="body-sm"
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              cursor: "default",
                            }}
                          >
                            {text}
                          </Typography>
                        </Tooltip>
                      </td>

                      <td>{p.po_value || "-"}</td>
                      <td>{p.archiverName || "-"}</td>
                      <td>
                        {formatDDMMYYYY(p?.po_archived?.updatedAt)}
                      </td>
                    </tr>
                  );
                })}

                {!isFetching && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 12 }}>
                      No archived PO found.
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
            {isUnarchiving
              ? "Unarchiving..."
              : `Unarchive (${selected.length})`}
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
}
