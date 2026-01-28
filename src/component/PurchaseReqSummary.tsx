import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SearchIcon from "@mui/icons-material/Search";
import {
  Chip,
  CircularProgress,
  Option,
  Select,
  Tooltip,
  Tabs,
  TabList,
  Tab,
} from "@mui/joy";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import FormControl from "@mui/joy/FormControl";
import IconButton, { iconButtonClasses } from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { useGetAllPurchaseRequestQuery } from "../redux/camsSlice";
import { useLazyGetCategoriesNameSearchQuery } from "../redux/productsSlice";
import SearchPickerModal from "../component/SearchPickerModal";

function PurchaseReqSummary({ setSelectedId }) {
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selecteditem, setSelecteditem] = useState("");
  const [selectedstatus, setSelectedstatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // URL params
  const page = parseInt(searchParams.get("page") || "1", 10) || 1;
  const search = searchParams.get("search") || "";
  const itemSearch = searchParams.get("itemSearch") || "";
  // Removed poValueSearch param
  const statusSearch = searchParams.get("statusSearch") || "";
  const createdFromParam = searchParams.get("from") || "";
  const createdToParam = searchParams.get("to") || "";
  // Removed etdFromParam, etdToParam
  const tab = searchParams.get("tab") || "all";
  const openPR = tab === "open";
  const limit = parseInt(searchParams.get("limit") || "10", 10) || 10;
  const projectId = searchParams.get("projectId") || "";
  const navigate = useNavigate();
  // Category UI state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const updateParams = (patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === "" || v == null) next.delete(k);
        else next.set(k, String(v));
      });
      return next;
    });
  };

  // Main PR list query
  const { data, isLoading } = useGetAllPurchaseRequestQuery(
    {
      page,
      search,
      itemSearch,
      statusSearch,
      createdFrom: createdFromParam || "",
      createdTo: createdToParam || "",
      open_pr: tab === "open" ? "true" : tab === "cancel" ? "cancel" : "false",
      limit,
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  // Lazy search for categories (modal paging & searching)
  const [triggerCategorySearch] = useLazyGetCategoriesNameSearchQuery();

  useEffect(() => {
    setCurrentPage(page);
    setSearchQuery(search);
    setSelecteditem(itemSearch);
    setSelectedstatus(statusSearch);
  }, [page, search, itemSearch, statusSearch]);

  const purchaseRequests = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;

  useEffect(() => {
    setCurrentPage(page);
    setSearchQuery(search);
  }, [page, search]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    updateParams({ page: 1, search: query });
  };

  // Select all PR Ids (assuming selection is per PR, not per item)
  const allItemIds =
    (purchaseRequests || []).map((r) => r._id).filter(Boolean) || [];

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(allItemIds);
      setSelectedId(allItemIds);
    } else {
      setSelected([]);
      setSelectedId([]);
    }
  };

  const handleRowSelect = (prId) => {
    setSelected((prev) =>
      prev.includes(prId) ? prev.filter((id) => id !== prId) : [...prev, prId]
    );
    setSelectedId((prev) =>
      prev.includes(prId) ? prev.filter((id) => id !== prId) : [...prev, prId]
    );
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateParams({ page: newPage, search: searchQuery, limit });
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

  const fetchCategoriesPage = async ({ page, search }) => {
    try {
      const res = await triggerCategorySearch(
        {
          page: page || 1,
          search: search || "",
          limit: 7,
          pr: openPR,
          projectId: projectId || "",
        },
        true
      ).unwrap();

      const rows = (res?.data || []).map((r) => ({
        ...r,
        name: r?.name ?? r?.category ?? r?.make ?? "",
      }));

      const total =
        res?.pagination?.total ?? res?.total ?? res?.totalCount ?? rows.length;

      return { rows, total };
    } catch (e) {
      return { rows: [], total: 0 };
    }
  };

  const onPickCategory = (row) => {
    const pickedName = row?.name ?? row?.category ?? row?.make ?? "";
    setSelecteditem(pickedName);
    setCurrentPage(1);
    updateParams({
      page: 1,
      search: searchQuery,
      itemSearch: pickedName || "",
      statusSearch: selectedstatus,
      // Removed poValueSearch
    });
    setCategoryModalOpen(false);
  };

  // ---------- Render helpers ----------
  const RenderPRNo = ({ pr_no, pr_id ,project_id}) => {
    const navigate = useNavigate();

    const isClickable = Boolean(pr_no && pr_id );

    const handleOpen = () => {
      if (isClickable) navigate(`/pr_form?mode=view&id=${pr_id}&projectId=${project_id}`);
    };

    return (
      <>
        <Box>
          <Tooltip
            title={isClickable ? "Open PR" : ""}
            placement="bottom"
            arrow
          >
            <Chip
              size="sm"
              variant="solid"
              color={isClickable ? "primary" : "neutral"}
              onClick={handleOpen}
              component={isClickable ? "button" : "div"}
              role={isClickable ? "link" : undefined}
              tabIndex={isClickable ? 0 : -1}
              onKeyDown={(e) => {
                if (isClickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleOpen();
                }
              }}
              sx={{
                "--Chip-radius": "9999px",
                "--Chip-borderWidth": 0,
                "--Chip-paddingInline": "10px",
                "--Chip-minHeight": "22px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                cursor: isClickable ? "pointer" : "default",
                border: "none",
                userSelect: "none",
              }}
            >
              {pr_no || "-"}
            </Chip>
          </Tooltip>
        </Box>
      </>
    );
  };

  // REFACTORED HELPERS to ONLY use item_name and product_data
  const getItemName = (it) => it?.item_name || "(Unnamed item)";
  const norm = (s) => (s == null ? "" : String(s).trim().toLowerCase());

  const uniqueByName = (items) => {
    const seen = new Set();
    const out = [];
    const arr = Array.isArray(items)
      ? items.filter(Boolean)
      : [items].filter(Boolean);

    for (const it of arr) {
      const name = getItemName(it);
      const key = norm(name);
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ item: it, name });
      }
    }
    return out;
  };

  const getName = (it) => it?.item_name ?? "-";

  const getProductData = (it) => it?.product_data ?? it?.product_Data ?? "-";

  const RenderItemCell = (item) => {
    const name = getName(item);
    const productData = getProductData(item);
    const quantity = item?.quantity || "-";

    return (
      <Box>
        <Typography fontWeight="md" level="body-sm">
          {name}
        </Typography>
      </Box>
    );
  };

  const ItemsCell = ({ items }) => {
    const uniq = uniqueByName(items);
    if (!uniq?.length) return <span>-</span>;

    if (uniq.length === 1) {
      return <>{RenderItemCell(uniq[0].item)}</>;
    }

    const tooltipContent = (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, py: 0.5 }}>
        {/* Start mapping from index 1 (slice(1)) */}
        {uniq.slice(1).map(({ item }, i) => {
          const nm = getName(item);
          return (
            <Typography level="body-sm" key={`${nm}-${i}`}>
              {nm}
            </Typography>
          );
        })}
      </Box>
    );

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <span>{RenderItemCell(uniq[0].item)}</span>
        <Tooltip title={tooltipContent} variant="soft" arrow placement="bottom">
          <Chip
            size="sm"
            variant="solid"
            sx={{
              bgcolor: "#214b7b",
              color: "#fff",
              cursor: "pointer",
              "&:hover": { bgcolor: "#1d416b" },
            }}
          >
            +{uniq.length - 1}
          </Chip>
        </Tooltip>
      </Box>
    );
  };

  const TABS = [
    { value: "all", label: "All" },
    { value: "open", label: "Open PR" },
    {value: "cancel", label:"Cancel PR"}
  ];

  return (
    <Box
      sx={{
        ml: {
          lg: "var(--Sidebar-width)",
        },
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
        >
          {/* Tabs */}

          <Tabs
            value={tab}
            onChange={(_e, newValue) => {
              updateParams({ tab: newValue, page: 1, limit });
            }}
            indicatorPlacement="none"
            sx={{
              bgcolor: "background.level1",
              borderRadius: 9999,
              boxShadow: "sm",
              width: "fit-content",
            }}
          >
            <TabList sx={{ gap: 1 }}>
              {TABS.map((t) => (
                <Tab
                  key={t.value}
                  value={t.value}
                  disableIndicator
                  sx={{
                    borderRadius: 9999,
                    fontWeight: "md",
                    textTransform: "none",
                    "&.Mui-selected": {
                      bgcolor: "background.surface",
                      boxShadow: "sm",
                    },
                  }}
                >
                  {t.label}
                </Tab>
              ))}
            </TabList>
          </Tabs>
        </Box>
        <Box
          className="SearchAndFilters-tabletUp"
          sx={{
            borderRadius: "sm",
            py: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            width: { lg: "100%" },
          }}
        >
          {/* Search */}
          <FormControl sx={{ flex: 1, minWidth: 300 }} size="sm">
            <Input
              size="sm"
              placeholder="Search by PR No."
              startDecorator={<SearchIcon />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                handleSearch(searchQuery);
              }}
            />
          </FormControl>
        </Box>

        {/* Tabs + Rows-per-page */}
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
          sx={{ width: "100%", borderCollapse: "collapse" }}
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
                    selected?.length > 0 &&
                    selected.length === allItemIds?.length
                  }
                  onChange={handleSelectAll}
                  indeterminate={
                    selected?.length > 0 &&
                    selected?.length < (allItemIds?.length || 0)
                  }
                />
              </th>
              {[
                "PR No.",
                "Project Id",
                "Project Name",
                "Category Name",
                "Created At",
                "Created By",
                "PO Status",
              ].map((header, index) => (
                <th
                  key={index}
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
                <td
                  colSpan={7}
                  style={{ textAlign: "center", padding: "16px" }}
                >
                  <CircularProgress size="sm" />
                </td>
              </tr>
            ) : purchaseRequests.length > 0 ? (
              purchaseRequests.map((row) => {
                const prId = row._id;
                return (
                  <tr key={prId}>
                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        textAlign: "left",
                        padding: "8px",
                      }}
                    >
                      <Checkbox
                        size="sm"
                        checked={selected.includes(prId)}
                        onChange={() => handleRowSelect(prId)}
                      />
                    </td>

                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        textAlign: "left",
                        padding: "8px",
                      }}
                    >
                      <RenderPRNo
                        pr_no={row.pr_no}
                        createdAt={row.createdAt}
                        pr_id={prId}
                        project_id={row.project_id?._id}
                        createdBy={row?.created_by?.name}
                      />
                    </td>

                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        textAlign: "left",
                        padding: "8px",
                      }}
                    >
                      <Chip
                        size="sm"
                        variant="outlined"
                        color="primary"
                        sx={{ cursor: "pointer" }}
                        onClick={() =>
                          navigate(
                            `/project_detail?project_id=${row.project_id?._id}`
                          )
                        }
                      >
                        {row.project_id?.code || "-"}
                      </Chip>
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        textAlign: "left",
                        padding: "8px",
                      }}
                    >
                      <Typography fontWeight="md">
                        {row.project_id?.name || "-"}
                      </Typography>
                    </td>

                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        textAlign: "left",
                        padding: "8px",
                      }}
                    >
                      <ItemsCell items={row.items} />
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        textAlign: "left",
                        padding: "8px",
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 400 }}>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "N/A"}
                      </Typography>
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        textAlign: "left",
                        padding: "8px",
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 400 }}>
                        {row?.created_by?.name || "-"}
                      </Typography>
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #ddd",
                        textAlign: "left",
                        padding: "8px",
                      }}
                    >
                      {row?.po_status === "true" ? (
                        <Chip
                          size="sm"
                          variant="soft"
                          color="success"
                          sx={{ fontSize: 12, fontWeight: 500 }}
                        >
                          Created
                        </Chip>
                      ) : row?.po_status === "cancel" ? (
                        <Chip
                          size="sm"
                          variant="soft"
                          color="danger"
                          sx={{ fontSize: 12, fontWeight: 500 }}
                        >
                          Cancelled
                        </Chip>
                      ) : (
                        <Chip
                          size="sm"
                          variant="soft"
                          color="warning"
                          sx={{ fontSize: 12, fontWeight: 500 }}
                        >
                          Pending
                        </Chip>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={10}
                  style={{ textAlign: "center", padding: "16px" }}
                >
                  No Data Found
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
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        <Box>
          Showing page {currentPage} of {totalPages} ({totalCount} results)
        </Box>

        <Box
          sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 1 }}
        >
          {getPaginationRange().map((p, idx) =>
            p === "..." ? (
              <Box key={`ellipsis-${idx}`} sx={{ px: 1 }}>
                ...
              </Box>
            ) : (
              <IconButton
                key={p}
                size="sm"
                variant={p === currentPage ? "contained" : "outlined"}
                color="neutral"
                onClick={() => handlePageChange(p)}
              >
                {p}
              </IconButton>
            )
          )}
        </Box>
        {/* Rows per page */}
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ padding: "8px 16px" }}
        >
          <Select
            value={String(limit)}
            onChange={(_e, newValue) => {
              const newLimit = parseInt(newValue || "10", 10) || 10;
              updateParams({
                limit: String(newLimit),
                page: 1,
                tab,
                search: searchQuery || undefined,
                itemSearch: selecteditem || undefined,
                statusSearch: selectedstatus || undefined,
                createdFrom: createdFromParam || undefined,
                createdTo: createdToParam || undefined,
              });
            }}
            sx={{
              minWidth: 80,
              borderRadius: "md",
              boxShadow: "sm",
            }}
            size="sm"
            placeholder="Rows"
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <Option key={n} value={String(n)}>
                {n}
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
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </Box>

      <SearchPickerModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onPick={onPickCategory}
        title="Select Category"
        columns={[{ key: "name", label: "Category", width: 320 }]}
        fetchPage={fetchCategoriesPage}
        searchKey="name"
        pageSize={7}
        backdropSx={{ backdropFilter: "none", bgcolor: "rgba(0,0,0,0.1)" }}
      />
    </Box>
  );
}

export default PurchaseReqSummary;
