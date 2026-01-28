import { Box, Button, CssBaseline, CssVarsProvider } from "@mui/joy";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../component/Partials/Sidebar";
import MainHeader from "../../component/Partials/MainHeader";
import SubHeader from "../../component/Partials/SubHeader";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import PurchaseOrderSummary from "../../component/PurchaseOrderSummary";
import Filter from "../../component/Partials/Filter";
import {
  useAddArchivedPoMutation,
  useExportPosMutation,
  useUpdatePoStatusMutation,
} from "../../redux/purchasesSlice";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";

import {
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  CircularProgress,
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  FormControl,
  FormLabel,
  Select,
  Option,
  Textarea,
  Stack,
} from "@mui/joy";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { useGetAllCategoriesDropdownQuery } from "../../redux/productsSlice";
import ArchivedPoModal from "../../component/ArchivedPoModal";

function DashboardSCM() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedPOIds, setSelectedPOIds] = useState([]);
  const selectedCount = selectedPOIds.length;
  const [open, setOpen] = useState(false);
  const [archivedModalOpen, setArchivedModalOpen] = useState(false);

  const poSummaryRef = useRef();
  const [user, setUser] = useState(null);

  // ✅ Change status modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkRemarks, setBulkRemarks] = useState("");

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) return JSON.parse(userData);
    return null;
  };

  const parseMulti = (v) =>
    typeof v === "string" && v.trim()
      ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      : [];

  const [exportPos, { isLoading: isExporting }] = useExportPosMutation();
  const [archivedPo, { isLoading: isPoArchiving }] = useAddArchivedPoMutation();
  const [exportingScope, setExportingScope] = useState(null);

  const [updatePoStatus, { isLoading: isUpdatingStatus }] =
    useUpdatePoStatusMutation();

  const handleExportToCSV = async ({ scope, view }) => {
    setExportingScope(`${view}_${scope}`);
    try {
      const isListView = view === "list";

      if (scope === "selected") {
        const ids = (selectedPOIds || []).filter(Boolean);
        if (!ids.length) {
          toast.info("Please select at least one PO from the table.");
          return;
        }

        // ✅ body
        const payload = { purchaseorders: ids };
        if (isListView) payload.listView = true; // ✅ only for list view

        const blob = await exportPos(payload).unwrap();

        const fileName = `po_${view}_${new Date().toISOString().slice(0, 10)}.csv`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        toast.success(
          `Exported ${ids.length} PO${ids.length > 1 ? "s" : ""} (${view} view)`
        );
        return;
      }

      // scope === "all"
      const filters = {
        search,
        filter: Array.isArray(selectStatus) ? selectStatus.join(",") : "",
        status: Array.isArray(selectBillStatus) ? selectBillStatus.join(",") : "",
        itemSearch: Array.isArray(selectItem) ? selectItem.join(",") : "",
        etdFrom: etdDateFrom,
        etdTo: etdDateTo,
        deliveryFrom,
        deliveryTo,
        lock_status: selectLockStatus || "",
      };

      const payload = { filters };
      if (isListView) payload.listView = true; // ✅ only for list view

      const blob = await exportPos(payload).unwrap();

      const fileName = `po_filtered_${view}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(`Exported all matching POs (${view} view)`);
    } catch (error) {
      console.error("Export POs failed:", error);
      const msg =
        error?.data?.message ||
        error?.error ||
        "Failed to export POs. Please try again.";
      toast.error(msg);
    } finally {
      setExportingScope(null);
    }
  };

  const handleArchived = async () => {
    try {
      const ids = (selectedPOIds || []).filter(Boolean);

      if (!ids.length) {
        toast.info("Please select at least one PO from the table.");
        return;
      }

      const payload = { ids };

      const res = await archivedPo(payload);


      toast.success("PO archived successfully");

      setSelectedPOIds([]);

    } catch (error) {
      console.error("Archive POs failed:", error);

      const msg =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        "Failed to archive POs. Please try again.";

      toast.error(msg);
    }
  };



  const handleOpenLogisticsWithSeed = () => {
    const seed = poSummaryRef.current?.getSelectedPOSeed?.();
    const list = seed?.pos || [];

    if (!list.length) {
      toast.info("Please select at least one PO from the table.");
      return;
    }
    navigate("/logistics-form?mode=add", { state: { logisticSeed: seed } });
  };

  // ✅ Bulk status options (UI label -> API enum value)
  const BULK_STATUS_OPTIONS = [
    { label: "Material Ready", value: "material_ready" },
    { label: "Ready to Dispatch", value: "ready_to_dispatch" },
    { label: "Out for Delivery", value: "out_for_delivery" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancel", value: "cancel" },
  ];

  const openStatusModal = () => {
    if (!selectedCount) {
      toast.info("Please select at least one PO from the table.");
      return;
    }
    setBulkStatus("");
    setBulkRemarks("");
    setIsStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    if (isUpdatingStatus) return;
    setIsStatusModalOpen(false);
  };

  const handleSubmitBulkStatus = async () => {
    try {
      const ids = (selectedPOIds || []).filter(Boolean);

      if (!ids.length) {
        toast.info("Please select at least one PO from the table.");
        return;
      }
      if (!bulkStatus) {
        toast.error("Please select a status.");
        return;
      }

      await updatePoStatus({
        ids,
        status: bulkStatus,
        remarks: bulkRemarks,
      }).unwrap();

      toast.success(
        `Status updated for ${ids.length} PO${ids.length > 1 ? "s" : ""}`
      );
      setIsStatusModalOpen(false);
      // optional: clear selection after update
      // setSelectedPOIds([]);
    } catch (error) {
      console.error("updatePoStatus failed:", error);
      const msg =
        error?.data?.message ||
        error?.error ||
        "Failed to update status. Please try again.";
      toast.error(msg);
    }
  };

  const { data: allMaterial } = useGetAllCategoriesDropdownQuery();
  const allMaterials = Array.isArray(allMaterial)
    ? allMaterial
    : allMaterial?.data ?? [];

  const statusOptions = [
    "Approval Pending",
    "Approval Done",
    "ETD Pending",
    "ETD Done",
    "Material Ready",
    "Ready to Dispatch",
    "Out for Delivery",
    "Partially Delivered",
    "Short Quantity",
    "Delivered",
    "Cancel",
  ];

  const statusOptionsLock = [
    "Lock",
    "Unlock"
  ];

  const billStatusOptions = [
    { label: "All Status", value: "" },
    { label: "Fully Billed", value: "Fully Billed" },
    { label: "Partially Billed", value: "Partially Billed" },
    { label: "Bill Pending", value: "Bill Pending" },
  ];

  const fields = [
    {
      key: "status",
      label: "Filter By PO Status",
      type: "multiselect",
      options: statusOptions.map((d) => ({ label: d, value: d })),
    },
    {
      key: "lock_status",
      label: "Filter By Lock Status",
      type: "select",
      options: statusOptionsLock.map((d) => ({ label: d, value: d })),
    },
    {
      key: "poStatus",
      label: "Filter By Bill Status",
      type: "multiselect",
      options: billStatusOptions.map((d) => ({
        label: d.label,
        value: d.value,
      })),
    },
    {
      key: "itemSearch",
      label: "Filter By Category",
      type: "multiselect",
      options: allMaterials.map((d) => ({ label: d.name, value: d.name })),
    },
    { key: "etd", label: "Filter By ETD Date", type: "daterange" },
    { key: "delivery", label: "Filter By Delivery Date", type: "daterange" },

  ];

  const [selectStatus, setSelectStatus] = useState(
    parseMulti(searchParams.get("status") || "")
  );
  const [selectBillStatus, setSelectBillStatus] = useState(
    parseMulti(searchParams.get("poStatus") || "")
  );
  const [selectItem, setSelectItem] = useState(
    parseMulti(searchParams.get("itemSearch") || "")
  );

  const [selectLockStatus, setSelectLockStatus] = useState(searchParams.get("lock_status") || "");

  const [etdDateFrom, setEtdDateFrom] = useState(
    searchParams.get("etd_from") || ""
  );
  const [etdDateTo, setEtdDateTo] = useState(searchParams.get("etd_to") || "");
  const [deliveryFrom, setDeliveryFrom] = useState(
    searchParams.get("delivery_from") || ""
  );
  const [deliveryTo, setDeliveryTo] = useState(
    searchParams.get("delivery_to") || ""
  );

  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams);

    if (Array.isArray(selectStatus) && selectStatus.length)
      sp.set("status", selectStatus.join(","));
    else sp.delete("status");

    if (Array.isArray(selectBillStatus) && selectBillStatus.length)
      sp.set("poStatus", selectBillStatus.join(","));
    else sp.delete("poStatus");

    if (Array.isArray(selectItem) && selectItem.length)
      sp.set("itemSearch", selectItem.join(","));
    else sp.delete("itemSearch");

    if (selectLockStatus) sp.set("lock_status", selectLockStatus);
    else sp.delete("lock_status");

    if (etdDateTo) sp.set("etd_to", etdDateTo);
    else sp.delete("etd_to");

    if (etdDateFrom) sp.set("etd_from", etdDateFrom);
    else sp.delete("etd_from");

    if (deliveryFrom) sp.set("delivery_from", deliveryFrom);
    else sp.delete("delivery_from");

    if (deliveryTo) sp.set("delivery_to", deliveryTo);
    else sp.delete("delivery_to");

    const hasAnyFilter =
      (selectBillStatus?.length || 0) > 0 ||
      (selectStatus?.length || 0) > 0 ||
      (selectItem?.length || 0) > 0 ||
      !!etdDateFrom ||
      !!etdDateTo ||
      !!deliveryFrom ||
      !!deliveryTo;


    if (hasAnyFilter) sp.set("page", 1);

    setSearchParams(sp);
  }, [
    selectStatus,
    selectBillStatus,
    selectItem,
    selectLockStatus,
    etdDateFrom,
    etdDateTo,
    deliveryFrom,
    deliveryTo,
  ]);

  console.log(user?.department);
  console.log(user?.role);

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Modal open={isStatusModalOpen} onClose={closeStatusModal}>
        <ModalDialog sx={{ width: 520, maxWidth: "92vw" }}>
          <ModalClose disabled={isUpdatingStatus} />
          <Typography level="h4">Change PO Status</Typography>
          <Typography level="body-sm" sx={{ mt: 0.5 }}>
            Selected POs: <b>{selectedCount}</b>
          </Typography>

          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl required>
              <FormLabel>Status</FormLabel>
              <Select
                value={bulkStatus}
                onChange={(e, val) => setBulkStatus(val || "")}
                placeholder="Select status"
                disabled={isUpdatingStatus}
              >
                {BULK_STATUS_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Remarks</FormLabel>
              <Textarea
                minRows={3}
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                placeholder="Write remarks (optional)"
                disabled={isUpdatingStatus}
              />
            </FormControl>

            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button
                variant="outlined"
                color="neutral"
                onClick={closeStatusModal}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitBulkStatus}
                loading={isUpdatingStatus}
              >
                Update
              </Button>
            </Box>
          </Stack>
        </ModalDialog>
      </Modal>

      <Box sx={{ display: "flex", minHeight: "100dvh" }}>
        <Sidebar />

        <MainHeader title="SCM" sticky>
          <Box display="flex" gap={1}>
            {user?.name === "IT Team" ||
              user?.department === "admin" ||
              (user?.department === "Accounts" &&
                (user?.name === "Deepak Kumar Maurya" ||
                  user?.name === "Gagan Tayal" ||
                  user?.name === "Ajay Singh" ||
                  user?.name === "Sachin Raghav" ||
                  user?.name === "Anamika Poonia" ||
                  user?.name === "Meena Verma" ||
                  user?.name === "Kailash Chand" ||
                  user?.name === "Chandan Singh")) ||
              (user?.department === "Accounts" &&
                user?.name === "Sujan Maharjan") ||
              user?.name === "Guddu Rani Dubey" ||
              user?.name === "Naresh Kumar" ||
              user?.name === "Prachi Singh" ||
              user?.name === "Ashish Jha" ||
              user?.name === "Mayank Kumar" ||
              user?.name === "Gaurav Sharma" ||
              user?.role === "purchase" ||
              (user?.role === "manager" && user?.name === "Naresh Kumar") ||
              user?.role === "visitor" ||
              (user?.department === "CAM" && user?.name === "Shantanu Sameer") ? (
              <Button
                size="sm"
                onClick={() => navigate("/purchase-order")}
                sx={{
                  color: "white",
                  bgcolor: "transparent",
                  fontWeight: 500,
                  fontSize: "1rem",
                  letterSpacing: 0.5,
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                }}
              >
                Purchase Order
              </Button>
            ) : null}

            {user?.name === "IT Team" ||
              user?.department === "admin" ||
              user?.name === "Guddu Rani Dubey" ||
              user?.name === "Naresh Kumar" ||
              user?.name === "Prachi Singh" ||
              user?.name === "Ashish Jha" ||
              user?.role === "purchase" ||
              (user?.role === "manager" && user?.name === "Naresh Kumar") ||
              user?.department === "Logistic" ? (
              <Button
                size="sm"
                onClick={() => navigate(`/logistics`)}
                sx={{
                  color: "white",
                  bgcolor: "transparent",
                  fontWeight: 500,
                  fontSize: "1rem",
                  letterSpacing: 0.5,
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                }}
              >
                Logistics
              </Button>
            ) : null}

            {(user?.department === "SCM" ||
              user?.department === "Accounts" ||
              user?.department === "superadmin" ||
              user?.department === "admin") && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/vendors`)}
                  sx={{
                    color: "white",
                    bgcolor: "transparent",
                    fontWeight: 500,
                    fontSize: "1rem",
                    letterSpacing: 0.5,
                    borderRadius: "6px",
                    px: 1.5,
                    py: 0.5,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  Vendors
                </Button>
              )}

            {user?.name === "IT Team" ||
              user?.department === "admin" ||
              (user?.department === "Accounts" &&
                (user?.name === "Deepak Kumar Maurya" ||
                  user?.name === "Gagan Tayal" ||
                  user?.name === "Ajay Singh" ||
                  user?.name === "Sachin Raghav" ||
                  user?.name === "Anamika Poonia" ||
                  user?.name === "Meena Verma" ||
                  user?.name === "Kailash Chand" ||
                  user?.name === "Chandan Singh")) ||
              (user?.department === "Accounts" &&
                user?.name === "Sujan Maharjan") ||
              user?.name === "Guddu Rani Dubey" ||
              user?.name === "Naresh Kumar" ||
              user?.name === "Prachi Singh" ||
              user?.role === "purchase" ||
              (user?.role === "manager" && user?.name === "Naresh Kumar") ? (
              <Button
                size="sm"
                onClick={() => navigate(`/vendor_bill`)}
                sx={{
                  color: "white",
                  bgcolor: "transparent",
                  fontWeight: 500,
                  fontSize: "1rem",
                  letterSpacing: 0.5,
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                }}
              >
                Vendor Bill
              </Button>
            ) : null}
          </Box>
        </MainHeader>

        <SubHeader
          title="Purchase Order"
          isBackEnabled={false}
          sticky
          rightSlot={
            <>
              {
                selectedCount === 0 && ((user?.role === "manager" && user?.department === "SCM") || (user?.role === "admin" || user?.role === "superadmin")) && (
                  <Button
                    onClick={() => setArchivedModalOpen(true)}
                    color="primary"
                    variant="outlined"
                    sx={{
                      height: "35px",
                      width: "35px",
                    }}
                  >
                    <ArchiveOutlinedIcon fontSize="small" />
                  </Button>
                )
              }

              {selectedCount > 0 && (
                <>
                  {
                    ((user?.role === "manager" && user?.department === "SCM") || (user?.role === "admin" || user?.role === "superadmin")) && (
                      <Button
                        color="danger"
                        onClick={handleArchived}
                        variant="outlined"
                        sx={{
                          height: "35px",
                          width: "35px",
                        }}
                      >
                        <ArchiveOutlinedIcon fontSize="small" />
                      </Button>
                    )

                  }

                  <Button
                    color="primary"
                    variant="outlined"
                    size="sm"
                    onClick={openStatusModal}
                    disabled={isUpdatingStatus}
                  >
                    Change Status
                  </Button>

                  <Button
                    color="primary"
                    variant="outlined"
                    size="sm"
                    onClick={handleOpenLogisticsWithSeed}
                  >
                    Logistics Form
                  </Button>

                  <Dropdown>
                    <MenuButton
                      variant="outlined"
                      color="primary"
                      size="sm"
                      disabled={isExporting}
                      endDecorator={
                        isExporting ? <CircularProgress size="sm" /> : <KeyboardArrowDownRoundedIcon />
                      }
                    >
                      {isExporting ? "Exporting…" : "Export CSV"}
                    </MenuButton>

                    <Menu placement="bottom-start">
                      {/* ✅ Detailed View */}
                      <MenuItem disabled sx={{ fontWeight: 700, opacity: 0.9 }}>
                        Detailed View
                      </MenuItem>

                      <MenuItem
                        disabled={selectedCount === 0 || isExporting}
                        onClick={() => handleExportToCSV({ scope: "selected", view: "detailed" })}
                      >
                        {isExporting && exportingScope === "detailed_selected" ? (
                          <>
                            <CircularProgress size="sm" sx={{ mr: 1 }} />
                            Exporting Selected…
                          </>
                        ) : (
                          "Selected"
                        )}
                      </MenuItem>

                      <MenuItem
                        disabled={isExporting}
                        onClick={() => handleExportToCSV({ scope: "all", view: "detailed" })}
                      >
                        {isExporting && exportingScope === "detailed_all" ? (
                          <>
                            <CircularProgress size="sm" sx={{ mr: 1 }} />
                            Exporting All…
                          </>
                        ) : (
                          "All"
                        )}
                      </MenuItem>

                      <MenuItem disabled sx={{ height: 6, opacity: 0.4 }} />

                      {/* ✅ List View */}
                      <MenuItem disabled sx={{ fontWeight: 700, opacity: 0.9 }}>
                        List View
                      </MenuItem>

                      <MenuItem
                        disabled={selectedCount === 0 || isExporting}
                        onClick={() => handleExportToCSV({ scope: "selected", view: "list" })}
                      >
                        {isExporting && exportingScope === "list_selected" ? (
                          <>
                            <CircularProgress size="sm" sx={{ mr: 1 }} />
                            Exporting Selected…
                          </>
                        ) : (
                          "Selected"
                        )}
                      </MenuItem>

                      <MenuItem
                        disabled={isExporting}
                        onClick={() => handleExportToCSV({ scope: "all", view: "list" })}
                      >
                        {isExporting && exportingScope === "list_all" ? (
                          <>
                            <CircularProgress size="sm" sx={{ mr: 1 }} />
                            Exporting All…
                          </>
                        ) : (
                          "All"
                        )}
                      </MenuItem>
                    </Menu>
                  </Dropdown>

                </>
              )}

              <Filter
                open={open}
                onOpenChange={setOpen}
                title="Filters"
                fields={fields}
                onApply={(values) => {
                  setSelectStatus(
                    Array.isArray(values?.status) ? values.status : []
                  );
                  setSelectBillStatus(
                    Array.isArray(values?.poStatus) ? values.poStatus : []
                  );
                  setSelectItem(
                    Array.isArray(values?.itemSearch) ? values.itemSearch : []
                  );
                  setSelectLockStatus(values?.lock_status || "");
                  setEtdDateFrom(values?.etd?.from || "");
                  setEtdDateTo(values?.etd?.to || "");
                  setDeliveryFrom(values?.delivery?.from || "");
                  setDeliveryTo(values?.delivery?.to || "");
                  setOpen(false);
                }}
                onReset={() => {
                  setSelectStatus([]);
                  setSelectBillStatus([]);
                  setSelectLockStatus("");
                  setSelectItem([]);
                  setEtdDateFrom("");
                  setEtdDateTo("");
                  setDeliveryFrom("");
                  setDeliveryTo("");
                  setOpen(false);
                }}
              />
            </>
          }
        />

        <Box
          component="main"
          className="MainContent"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            mt: "108px",
            pr: "30px",
            ml: "24px",
            overflow: "hidden",
          }}
        >
          <PurchaseOrderSummary
            ref={poSummaryRef}
            onSelectionChange={setSelectedPOIds}
            hideInlineBulkBar
            selectStatus={selectStatus.join(",")}
            selectBillStatus={selectBillStatus.join(",")}
            selectItem={selectItem.join(",")}
            delivery_From={deliveryFrom}
            delivery_To={deliveryTo}
            etdDateFrom={etdDateFrom}
            etdDateTo={etdDateTo}
          />
        </Box>

        <ArchivedPoModal
          open={archivedModalOpen}
          onClose={() => setArchivedModalOpen(false)}
        />
      </Box>



    </CssVarsProvider>
  );
}

export default DashboardSCM;
