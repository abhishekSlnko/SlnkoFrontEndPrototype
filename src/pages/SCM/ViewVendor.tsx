import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import Box from "@mui/joy/Box";
import Sidebar from "../../component/Partials/Sidebar";
import MainHeader from "../../component/Partials/MainHeader";
import SubHeader from "../../component/Partials/SubHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  CircularProgress,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  Modal,
  ModalDialog,
} from "@mui/joy";
import { useEffect, useState } from "react";
import Vendor_Detail from "../../component/ViewVendor";
import AddVendor from "../../component/Forms/Add_Vendor";
import { useGetAllCategoriesDropdownQuery } from "../../redux/productsSlice";
import Filter from "../../component/Partials/Filter";
import { useExportPosMutation } from "../../redux/purchasesSlice";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { toast } from "react-toastify";
import { useExportPayRequestMutation } from "../../redux/paymentsSlice";

function ViewVendors() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("id") || "";
  const vendor = searchParams.get("vendor") || "";
  const [open, setOpen] = useState(false);
  const [openAddVendorModal, setOpenAddVendorModal] = useState(false);
  const [editVendorId, setEditVendorId] = useState(null);
  const [selectedPOIds, setSelectedPOIds] = useState([]);
  const selectedCount = selectedPOIds.length;
  const [user, setUser] = useState(null);
  const tab = searchParams.get("tab");
  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  };
  const openEditModal = () => {
    setEditVendorId(id);
    setOpenAddVendorModal(true);
  };

  const closeModal = () => {
    setOpenAddVendorModal(false);
    setEditVendorId(null);
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
  ];

  const status = [
    { label: "All Status", value: "" },
    { label: "Fully Billed", value: "Fully Billed" },
    { label: "Bill Pending", value: "Bill Pending" },
  ];

  const [selectStatus, setSelectStatus] = useState(
    searchParams.get("status" || "")
  );
  const [selectBillStatus, setSelectBillStatus] = useState(
    searchParams.get("poStatus") || ""
  );
  const [selectItem, setSelectItem] = useState(
    searchParams.get("itemSearch") || ""
  );
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

  const fields = [
    {
      key: "status",
      label: "Filter By Delivery Status",
      type: "select",
      options: statusOptions.map((d) => ({ label: d, value: d })),
    },
    {
      key: "poStatus",
      label: "Filter By Bill Status",
      type: "select",
      options: status.map((d) => ({
        label: d.label,
        value: d.value,
      })),
    },
    {
      key: "itemSearch",
      label: "Filter By Category",
      type: "select",
      options: allMaterials.map((d) => ({ label: d.name, value: d.name })),
    },
    {
      key: "etd",
      label: "Filter By ETD Date",
      type: "daterange",
    },
    {
      key: "delivery",
      label: "Filter By Delivery Date",
      type: "daterange",
    },
  ];

  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);

    if (selectStatus) sp.set("status", selectStatus);
    else sp.delete("status");

    if (selectBillStatus) sp.set("poStatus", selectBillStatus);
    else sp.delete("poStatus");

    if (selectItem) sp.set("itemSearch", selectItem);
    else sp.delete("itemSearch");

    if (etdDateTo) sp.set("etd_to", etdDateTo);
    else sp.delete("etd_to");

    if (etdDateFrom) sp.set("etd_from", etdDateFrom);
    else sp.delete("etd_from");

    if (deliveryFrom) sp.set("delivery_from", deliveryFrom);
    else sp.delete("delivery_from");

    if (deliveryTo) sp.set("delivery_to", deliveryTo);
    else sp.delete("delivery_to");

    if (
      selectBillStatus ||
      selectStatus ||
      selectItem ||
      etdDateFrom ||
      etdDateTo ||
      deliveryFrom ||
      deliveryTo
    )
      sp.set("page", 1);

    setSearchParams(sp);
  }, [
    selectStatus,
    selectBillStatus,
    selectItem,
    etdDateFrom,
    etdDateTo,
    deliveryFrom,
    deliveryTo,
  ]);
  const [exportPos, { isLoading: isExporting }] = useExportPosMutation();
  const [exportingScope, setExportingScope] = useState(null);
  const handleExportToCSV = async ({ scope }) => {
    setExportingScope(scope);
    try {
      if (scope === "selected") {
        const ids = (selectedPOIds || []).filter(Boolean);
        if (!ids.length) {
          toast.info("Please select at least one PO from the table.");
          return;
        }
        const blob = await exportPos({ purchaseorders: ids }).unwrap();
        const fileName = `po_${new Date().toISOString().slice(0, 10)}.csv`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${ids.length} PO${ids.length > 1 ? "s" : ""}`);
        return;
      }

      // scope === "all"
      const filters = {
        search: search,
        filter: selectStatus,
        status: selectBillStatus,
        itemSearch: selectItem,
        etdFrom: etdDateFrom,
        etdTo: etdDateTo,
        deliveryFrom: deliveryFrom,
        deliveryTo: deliveryTo,
        vendor_id: id,
      };
      const blob = await exportPos({ filters }).unwrap();
      const fileName = `po_filtered_${new Date()
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
      toast.success("Exported all matching POs");
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

  const [exportPayments, { isLoading: isExportingPayments }] =
    useExportPayRequestMutation();
  const [selectedPaymentsIds, setSelectedPaymentsIds] = useState([]);

  const handleExportToCSVPayments = async ({ scope }) => {
    setExportingScope(scope);
    try {
      if (scope === "selected") {
        const ids = (selectedPaymentsIds || []).filter(Boolean);
        if (!ids.length) {
          toast.info("Please select at least one payment from the table.");
          return;
        }
        const blob = await exportPayments({
          vendor: vendor,
          type: "selected",
          ids,
        }).unwrap();
        const fileName = `payments_${new Date()
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
        toast.success(
          `Exported ${ids.length} payment${ids.length > 1 ? "s" : ""}`
        );
        return;
      }

      // scope === "all"
      const blob = await exportPayments({
        vendor: vendor,
        type: "all",
      }).unwrap();
      const fileName = `payments_all_${new Date()
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
      toast.success("Exported all matching payments");
    } catch (error) {
      console.error("Export payments failed:", error);
      const msg =
        error?.data?.message ||
        error?.error ||
        "Failed to export payments. Please try again.";
      toast.error(msg);
    } finally {
      setExportingScope(null);
    }
  };

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <MainHeader title="SCM" sticky>
          <Box display="flex" gap={1}>
            <Button
              size="sm"
              onClick={() => navigate(`/purchase-order`)}
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
              Vendor Bills
            </Button>
          </Box>
        </MainHeader>

        <SubHeader
          title="Vendor Detail"
          isBackEnabled={true}
          sticky
          rightSlot={
            <>
              {(user?.name === "Guddu Rani Dubey" ||
                user?.name === "Naresh Kumar" ||
                user?.name === "Chandan Singh" ||
                user?.department === "superadmin" ||
                user?.department === "admin") && (
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={openEditModal}
                  sx={{
                    color: "#3366a3",
                    borderColor: "#3366a3",
                    backgroundColor: "transparent",
                    "--Button-hoverBg": "#e0e0e0",
                    "--Button-hoverBorderColor": "#3366a3",
                    "&:hover": { color: "#3366a3" },
                    height: "8px",
                  }}
                >
                  Edit Detail
                </Button>
              )}
              {tab === "payments" && (
                <>
                  {selectedPaymentsIds.length > 0 && (
                    <Dropdown>
                      <MenuButton
                        variant="outlined"
                        sx={{
                          color: "#3366a3",
                          borderColor: "#3366a3",
                          backgroundColor: "transparent",
                          "--Button-hoverBg": "#e0e0e0",
                          "--Button-hoverBorderColor": "#3366a3",
                          "&:hover": { color: "#3366a3" },
                          height: "8px",
                        }}
                        size="sm"
                        disabled={isExportingPayments}
                        endDecorator={
                          isExportingPayments ? (
                            <CircularProgress size="sm" />
                          ) : (
                            <KeyboardArrowDownRoundedIcon />
                          )
                        }
                      >
                        {isExportingPayments ? "Exporting…" : "Export CSV"}
                      </MenuButton>
                      <Menu placement="bottom-start">
                        <MenuItem
                          disabled={
                            setSelectedPaymentsIds.length === 0 ||
                            isExportingPayments
                          }
                          onClick={() =>
                            handleExportToCSVPayments({ scope: "selected" })
                          }
                        >
                          {isExportingPayments &&
                          exportingScope === "selected" ? (
                            <>
                              <CircularProgress size="sm" sx={{ mr: 1 }} />
                              Exporting Selected…
                            </>
                          ) : (
                            "Selected"
                          )}
                        </MenuItem>
                        <MenuItem
                          disabled={isExportingPayments}
                          onClick={() =>
                            handleExportToCSVPayments({ scope: "all" })
                          }
                        >
                          {isExportingPayments && exportingScope === "all" ? (
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
                  )}
                </>
              )}
              {tab !== "payments" && (
                <>
                  {selectedCount > 0 && (
                    <Dropdown>
                      <MenuButton
                        variant="outlined"
                        sx={{
                          color: "#3366a3",
                          borderColor: "#3366a3",
                          backgroundColor: "transparent",
                          "--Button-hoverBg": "#e0e0e0",
                          "--Button-hoverBorderColor": "#3366a3",
                          "&:hover": { color: "#3366a3" },
                          height: "8px",
                        }}
                        size="sm"
                        disabled={isExporting}
                        endDecorator={
                          isExporting ? (
                            <CircularProgress size="sm" />
                          ) : (
                            <KeyboardArrowDownRoundedIcon />
                          )
                        }
                      >
                        {isExporting ? "Exporting…" : "Export CSV"}
                      </MenuButton>
                      <Menu placement="bottom-start">
                        <MenuItem
                          disabled={selectedCount === 0 || isExporting}
                          onClick={() =>
                            handleExportToCSV({ scope: "selected" })
                          }
                        >
                          {isExporting && exportingScope === "selected" ? (
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
                          onClick={() => handleExportToCSV({ scope: "all" })}
                        >
                          {isExporting && exportingScope === "all" ? (
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
                  )}
                  <Filter
                    open={open}
                    onOpenChange={setOpen}
                    title="Filters"
                    fields={fields}
                    onApply={(values) => {
                      setSelectStatus(values?.status);
                      setSelectBillStatus(values?.poStatus);
                      setSelectItem(values?.itemSearch);
                      setEtdDateFrom(values?.etd?.from);
                      setEtdDateTo(values?.etd?.to);
                      setDeliveryFrom(values?.delivery?.from);
                      setDeliveryTo(values?.delivery?.to);

                      setOpen(false);
                    }}
                    onReset={() => {
                      setSelectStatus("");
                      setSelectBillStatus("");
                      setSelectItem("");
                      setEtdDateFrom("");
                      setEtdDateTo("");
                      setDeliveryFrom("");
                      setDeliveryTo("");
                      setOpen(false);
                    }}
                  />
                </>
              )}
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
            p: "16px",
            px: "24px",
          }}
        >
          <Vendor_Detail
            onSelectionChange={setSelectedPOIds}
            setSelectedPaymentsIds={setSelectedPaymentsIds}
          />
        </Box>

        <Modal open={openAddVendorModal} onClose={closeModal}>
          <ModalDialog
            aria-labelledby="edit-vendor-modal"
            layout="center"
            sx={{ p: 0, maxWidth: 1200, width: "96vw" }}
          >
            <AddVendor
              setOpenAddVendorModal={setOpenAddVendorModal}
              vendorId={editVendorId}
            />
          </ModalDialog>
        </Modal>
      </Box>
    </CssVarsProvider>
  );
}
export default ViewVendors;
