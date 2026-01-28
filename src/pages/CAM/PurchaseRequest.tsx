import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../component/Partials/Sidebar";
import PurchaseReqSummary from "../../component/PurchaseReqSummary";
import MainHeader from "../../component/Partials/MainHeader";
import SubHeader from "../../component/Partials/SubHeader";
import { Button, IconButton } from "@mui/joy";
import { useNavigate, useSearchParams } from "react-router-dom";
import Filter from "../../component/Partials/Filter";

import { useGetCategoriesNameSearchQuery } from "../../redux/productsSlice";
import { Delete } from "@mui/icons-material";
import { useDeletePurchaseRequestMutation } from "../../redux/camsSlice";
import { toast } from "react-toastify";

function PurchaseRequestSheet() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ---- helpers ----
  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) return JSON.parse(userData);
    return null;
  };

  useEffect(() => {
    setUser(getUserData());
  }, []);

  const cannotSeeHandover =
    user?.department === "Loan" && user?.name !== "Prachi Singh";

  // ---- URL params (source of truth) ----
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const projectId = searchParams.get("projectId") || "";

  const itemSearch = searchParams.get("itemSearch") || "";

  const createdFrom = searchParams.get("from") || "";
  const createdTo = searchParams.get("to") || "";
  const deadlineFrom = searchParams.get("deadlineFrom") || "";
  const deadlineTo = searchParams.get("deadlineTo") || "";

  const createdDateRange = [createdFrom, createdTo];
  const etdDateRange = [deadlineFrom, deadlineTo];

  const { data: catInitialData } = useGetCategoriesNameSearchQuery({
    page: 1,
    search: "",
    pr: false,
    projectId: projectId || "",
  });

  const categoryOptions = useMemo(() => {
    const rows = (catInitialData?.data || []).map((r) => {
      const name = r?.name ?? r?.category ?? r?.make ?? "";
      return { label: name, value: name };
    });

    if (itemSearch && !rows.some((o) => o.value === itemSearch)) {
      rows.unshift({ label: itemSearch, value: itemSearch });
    }
    return rows;
  }, [catInitialData?.data, itemSearch]);

  const fields = useMemo(
    () => [
      {
        key: "itemSearch",
        label: "Category",
        type: "select",
        options: categoryOptions,
      },
      {
        key: "createdAt",
        label: "Filter by Created Date",
        type: "daterange",
      },
    ],
    [categoryOptions]
  );

  const [deletePurchaseRequest] = useDeletePurchaseRequestMutation();

  const handleDelete = async () => {
    if (selectedId.length === 0) {
      toast.error("No items selected for deletion.");
      return;
    }
    try {
      const response = await deletePurchaseRequest({
        ids: selectedId,
      }).unwrap();

      toast.success("Deletion successful:", response.message);
      setSelectedId([]);
    } catch (error) {
      const errorMessage =
        error.data?.message || "An unexpected error occurred during deletion.";
      toast.error(
        "PR Cannot be delete because PO has been created",
        errorMessage,
        error
      );
      if (error.data?.failedRequests) {
        console.error("Failed requests details:", error.data.failedRequests);
      }
    }
  };

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100dvh" }}>
        <Sidebar />

        <MainHeader title="CAM" sticky>
          <Box display="flex" gap={1}>
            <Button
              size="sm"
              onClick={() => navigate(`/cam_dash`)}
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
              Handover
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/project_scope`)}
              sx={{
                color: "white",
                bgcolor: "transparent",
                fontWeight: 500,
                fontSize: "1rem",
                letterSpacing: 0.5,
                borderRadius: "6px",
                px: 1.5,
                py: 0.5,
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.15)",
                },
              }}
            >
              Project Scope
            </Button>
          </Box>
        </MainHeader>

        <SubHeader
          title="Purchase Request"
          isBackEnabled={false}
          sticky
          rightSlot={
            <>
              {selectedId.length > 0 && (
                <IconButton
                  onClick={handleDelete}
                  variant="plain"
                  color="danger"
                >
                  <Delete />
                </IconButton>
              )}
              <Filter
                open={open}
                onOpenChange={setOpen}
                fields={fields}
                title="Filters"
                onApply={(values) => {
                  setSearchParams((prev) => {
                    const merged = Object.fromEntries(prev.entries());
                    delete merged.from;
                    delete merged.to;
                    delete merged.deadlineFrom;
                    delete merged.deadlineTo;
                    delete merged.matchMode;
                    delete merged.itemSearch;

                    const next = {
                      ...merged,
                      page: "1",
                    };

                    if (values.matcher) {
                      next.matchMode = values.matcher === "OR" ? "any" : "all";
                    }

                    // itemSearch from select
                    if (values.itemSearch) {
                      // in case Filter returns an object {label,value}
                      next.itemSearch =
                        typeof values.itemSearch === "string"
                          ? values.itemSearch
                          : values.itemSearch.value ?? "";
                    }

                    // createdAt range
                    if (values.createdAt?.from)
                      next.from = String(values.createdAt.from);
                    if (values.createdAt?.to)
                      next.to = String(values.createdAt.to);

                    // deadline range
                    if (values.deadline?.from)
                      next.deadlineFrom = String(values.deadline.from);
                    if (values.deadline?.to)
                      next.deadlineTo = String(values.deadline.to);

                    return next;
                  });
                  setOpen(false);
                }}
                onReset={() => {
                  setSearchParams((prev) => {
                    const merged = Object.fromEntries(prev.entries());
                    delete merged.itemSearch;
                    delete merged.from;
                    delete merged.to;
                    delete merged.deadlineFrom;
                    delete merged.deadlineTo;
                    delete merged.matchMode;
                    return { ...merged, page: "1" };
                  });
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
            p: "16px",
            px: "24px",
          }}
        >
          <PurchaseReqSummary
            itemSearch={itemSearch}
            createdDateRange={createdDateRange}
            setSelectedId={setSelectedId}
          />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}

export default PurchaseRequestSheet;
