import KeyboardDoubleArrowLeft from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import KeyboardDoubleArrowRight from "@mui/icons-material/KeyboardDoubleArrowRight";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/joy/Box";
import FormControl from "@mui/joy/FormControl";
import IconButton from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import Typography from "@mui/joy/Typography";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Option, Select, Tab, TabList, Tabs } from "@mui/joy";
import { useGetPaymentRecordQuery } from "../redux/Accounts";
import InstantRequest from "./PaymentTable/Payment";
import CreditRequest from "./PaymentTable/Credit";

// small debounce hook (optional but recommended)
function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const PaymentRequest = forwardRef(() => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const urlPageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const urlSearch = searchParams.get("search") || "";
  const urlStatus = searchParams.get("status") || "";
  const urlTab = searchParams.get("tab") || "instant"; 

  const activeTab = urlTab === "credit" ? 1 : 0;

  const [searchInput, setSearchInput] = useState(urlSearch);

  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // Debounce so API is not called on every keystroke
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  // When debouncedSearch changes, push it into URL search param
  useEffect(() => {
    // if already same, do nothing
    if (debouncedSearch === urlSearch) return;

    const next = new URLSearchParams(searchParams);
    if (debouncedSearch?.trim()) next.set("search", debouncedSearch.trim());
    else next.delete("search");

    next.set("page", "1"); // reset page on new search
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // ---- Query args derived from URL ----
  const queryArgs = useMemo(
    () => ({
      page: urlPage,
      pageSize: urlPageSize,
      search: urlSearch,
      status: urlStatus,
      tab: urlTab, // "instant" | "credit"
    }),
    [urlPage, urlPageSize, urlSearch, urlStatus, urlTab]
  );

  const { data: responseData, isLoading } = useGetPaymentRecordQuery(queryArgs);

  const paginatedData = responseData?.data || [];
  const total = responseData?.total || 0;
  const count = responseData?.count ?? paginatedData.length;

  const totalPages = Math.max(1, Math.ceil(total / urlPageSize));
  const startIndex = total === 0 ? 0 : (urlPage - 1) * urlPageSize + 1;
  const endIndex = total === 0 ? 0 : Math.min(startIndex + count - 1, total);

  // helper: update URL params safely
  const patchParams = (patchFn) => {
    const next = new URLSearchParams(searchParams);
    patchFn(next);
    setSearchParams(next, { replace: true });
  };

  const renderFilters = () => {
    return (
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <FormControl size="sm" sx={{ minWidth: 80 }}>
          <Select
            value={urlStatus || ""}
            onChange={(_, newValue) => {
              patchParams((p) => {
                if (newValue) p.set("status", newValue);
                else p.delete("status");
                p.set("page", "1");
              });
            }}
            placeholder="All"
          >
            <Option value="">All</Option>
            <Option value="Approved">Approved</Option>
            <Option value="Pending">Pending</Option>
            <Option value="Rejected">Rejected</Option>
          </Select>
        </FormControl>
      </Box>
    );
  };

  return (
    <>
      <Box
        className="OrderTableContainer"
        variant="outlined"
        sx={{
          borderRadius: "sm",
          overflow: "auto",
          minHeight: 0,
          ml: { lg: "var(--Sidebar-width)" },
          maxWidth: { sm: "100%", lg: "85%", xl: "100%" },
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            py: 1,
            borderRadius: "md",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, value) => {
              patchParams((p) => {
                p.set("tab", value === 1 ? "credit" : "instant");
                p.set("page", "1");
              });
            }}
            variant="plain"
            sx={{ borderRadius: "xl", p: 0.5, minHeight: "50px" }}
          >
            <TabList
              disableUnderline
              sx={{
                borderRadius: "xl",
                overflow: "hidden",
                minHeight: "36px",
                backgroundColor: "background.level1",
                border: "1px solid",
                borderColor: "neutral.outlinedBorder",
              }}
            >
              <Tab
                variant={activeTab === 0 ? "soft" : "plain"}
                color="neutral"
                disableIndicator
                sx={{
                  fontWeight: 500,
                  transition: "all 0.2s",
                  minHeight: "36px",
                  "&:hover": { backgroundColor: "neutral.softHoverBg" },
                }}
              >
                Instant ({responseData?.instantTotal || 0})
              </Tab>
              <Tab
                variant={activeTab === 1 ? "soft" : "plain"}
                color="neutral"
                disableIndicator
                sx={{
                  fontWeight: 500,
                  transition: "all 0.2s",
                  minHeight: "36px",
                  "&:hover": { backgroundColor: "neutral.softHoverBg" },
                }}
              >
                Credit ({responseData?.creditTotal || 0})
              </Tab>
            </TabList>
          </Tabs>

          <Box
            className="SearchAndFilters-tabletUp"
            sx={{
              borderRadius: "sm",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              flexWrap: "wrap",
              gap: 1.5,
              mb: 2,
            }}
          >
            <FormControl sx={{ flex: 1 }} size="sm">
              <Input
                size="sm"
                placeholder="Search by Pay ID, Items, Clients Name or Vendor"
                startDecorator={<SearchIcon />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                sx={{
                  width: 450,
                  borderColor: "neutral.outlinedBorder",
                  borderBottom: searchInput
                    ? "2px solid #1976d2"
                    : "1px solid #ddd",
                  borderRadius: 5,
                  boxShadow: "none",
                  "&:hover": { borderBottom: "2px solid #1976d2" },
                  "&:focus-within": { borderBottom: "2px solid #1976d2" },
                }}
              />
            </FormControl>

            {renderFilters()}
          </Box>
        </Box>

        <Box>
          {activeTab === 0 ? (
            <InstantRequest
              data={paginatedData}
              isLoading={isLoading}
              searchQuery={urlSearch}
              perPage={urlPageSize}
              currentPage={urlPage}
              status={urlStatus}
            />
          ) : (
            <CreditRequest
              data={paginatedData}
              isLoading={isLoading}
              searchQuery={urlSearch}
              perPage={urlPageSize}
              currentPage={urlPage}
              status={urlStatus}
            />
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          ml: { lg: "var(--Sidebar-width)" },
          maxWidth: { xs: "100%" },
        }}
      >
        {/* Rows per page */}
        <Box>
          <Select
            size="sm"
            value={urlPageSize}
            onChange={(_, value) => {
              if (!value) return;
              patchParams((p) => {
                p.set("pageSize", String(value));
                p.set("page", "1");
              });
            }}
            sx={{ minWidth: 64 }}
          >
            {[10, 25, 50, 100].map((value) => (
              <Option key={value} value={value}>
                {value}
              </Option>
            ))}
          </Select>
        </Box>

        <Box display={"flex"} alignItems={"center"}>
          <Typography level="body-sm">{`${startIndex}-${endIndex} of ${total}`}</Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              size="sm"
              disabled={urlPage === 1}
              onClick={() =>
                patchParams((p) => {
                  p.set("page", "1");
                })
              }
            >
              <KeyboardDoubleArrowLeft />
            </IconButton>

            <IconButton
              size="sm"
              disabled={urlPage === 1}
              onClick={() =>
                patchParams((p) => {
                  p.set("page", String(Math.max(urlPage - 1, 1)));
                })
              }
            >
              <KeyboardArrowLeft />
            </IconButton>

            <IconButton
              size="sm"
              disabled={urlPage === totalPages}
              onClick={() =>
                patchParams((p) => {
                  p.set("page", String(Math.min(urlPage + 1, totalPages)));
                })
              }
            >
              <KeyboardArrowRight />
            </IconButton>

            <IconButton
              size="sm"
              disabled={urlPage === totalPages}
              onClick={() =>
                patchParams((p) => {
                  p.set("page", String(totalPages));
                })
              }
            >
              <KeyboardDoubleArrowRight />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </>
  );
});

export default PaymentRequest;
