import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Sheet,
  Typography,
  Table,
  Chip,
  Input,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Stack,
  Tooltip,
  Card,
  Grid,
  Select,
  Option,
} from "@mui/joy";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CurrencyRupee from "@mui/icons-material/CurrencyRupee";
import Axios from "../../utils/Axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import BoltIcon from "@mui/icons-material/Bolt";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import GroupsIcon from "@mui/icons-material/Groups";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import FolderIcon from "@mui/icons-material/Folder";
import PrintIcon from "@mui/icons-material/Print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { debounce } from "lodash";
import {
  useGetBalanceSummaryByProjectIdQuery,
  useGetCustomerSummaryQuery,
  useLazyExportProjectFinanceCsvQuery,
} from "../../redux/Accounts";
import { toast } from "react-toastify";
import Ledger from "./Ledger";
import Credit from "./Credit";
import Debit from "./Debit";
import PurchaseOrder from "./PurchaseOrder";
import Sales from "./Sales";
import { Search } from "@mui/icons-material";
import { useGetProjectByIdQuery } from "../../redux/projectsSlice";
import Adjustment from "./Adjustment.js";

// ---------------- constants ----------------
const TABS = ["credit", "debit", "purchase", "sales", "adjustment", "ledger"];
const DEFAULT_PAGE_SIZE = 20;

export default function CustomerPaymentSummary() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL params -> local state
  const p_id = searchParams.get("p_id");
  const _id = searchParams.get("_id");
  const tabParam = (searchParams.get("tab") || "credit").toLowerCase();
  const pageParam = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSizeParam = Math.max(
    1,
    parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10),
  );

  const [activeTab, setActiveTab] = useState(
    TABS.includes(tabParam) ? tabParam : "credit",
  );
  const [page, setPage] = useState(pageParam);
  const [pageSize, setPageSize] = useState(pageSizeParam);

  // filters & local UI state
  const [startDate, setStartDate] = useState(searchParams.get("start") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end") || "");
  const [searchClient, setSearchClient] = useState(
    searchParams.get("searchClient") || "",
  );
  const [searchDebit, setSearchDebit] = useState(
    searchParams.get("searchDebit") || "",
  );
  const [searchAdjustment, setSearchAdjustment] = useState(
    searchParams.get("searchAdjustment") || "",
  );

  const [user, setUser] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("userDetails");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  useEffect(() => {
    const newTab = (searchParams.get("tab") || "credit").toLowerCase();
    const newPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const newPageSize = Math.max(
      1,
      parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10),
    );

    setActiveTab(TABS.includes(newTab) ? newTab : "credit");
    setPage(newPage);
  }, [searchParams]);

  const handleTabChange = (_, newTab) => {
    const safeTab = String(newTab).toLowerCase();
    const next = new URLSearchParams(searchParams);
    next.set("tab", safeTab);
    next.set("page", "1");
    next.set("pageSize", String(pageSize));
    if (p_id) next.set("p_id", p_id);

    // keep current filters in the URL
    startDate ? next.set("start", startDate) : next.delete("start");
    endDate ? next.set("end", endDate) : next.delete("end");
    searchClient
      ? next.set("searchClient", searchClient)
      : next.delete("searchClient");
    searchDebit
      ? next.set("searchDebit", searchDebit)
      : next.delete("searchDebit");
    searchAdjustment
      ? next.set("searchAdjustment", searchAdjustment)
      : next.delete("searchAdjustment");

    setSearchParams(next);
  };

  const COLUMN_CONFIG = useMemo(
    () => [
      // "poNumber" kept always visible (not in menu) – add here if you want it toggleable
      { key: "vendor", label: "Vendor" },
      { key: "item", label: "Item" },

      // PO group
      { key: "poBasic", label: "PO Basic (₹)" },
      { key: "poGst", label: "PO GST (₹)" },
      { key: "poTotal", label: "PO Total (₹)" },

      // Advances
      { key: "advancePaid", label: "Advance Paid (₹)" },
      { key: "advanceRemaining", label: "Advance Remaining (₹)" },

      // Billed group
      { key: "billBasic", label: "Billed Basic (₹)" },
      { key: "billGst", label: "Billed GST (₹)" },
      { key: "billedTotal", label: "Billed Total (₹)" },

      { key: "remainingSales", label: "Remaining Sales Closure(w/o GST)" },
      { key: "remainingSalesGST", label: "Remaining Sales Closure(inc GST)" },
      { key: "select", label: "Select checkbox" },
    ],
    [],
  );

  const STORAGE_KEY = "client-summary-columns-v1";

  const defaults = useMemo(() => {
    const o = {};
    for (const c of COLUMN_CONFIG) o[c.key] = c.defaultVisible !== false; // default true
    return o;
  }, [COLUMN_CONFIG]);

  const [vis, setVis] = useState(defaults);

  // Load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const merged = { ...defaults };
      for (const k of Object.keys(parsed || {})) {
        if (k in merged) merged[k] = !!parsed[k];
      }
      setVis(merged);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vis));
    } catch {}
  }, [vis]);

  const { data: projectSummary } = useGetProjectByIdQuery(_id);

  const {
    data: balanceSummary,
    isLoading,
    refetch,
    error,
  } = useGetBalanceSummaryByProjectIdQuery({
    project_id: _id,
  });

  // Debounced refetch on filter changes
  useEffect(() => {
    const debounced = debounce(() => refetch(), 400);
    debounced();
    return () => debounced.cancel();
  }, [
    searchClient,
    searchDebit,
    searchAdjustment,
    startDate,
    endDate,
    refetch,
  ]);

  // Actions: print & export
  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Authentication token not found.");
        setIsPrinting(false);
        return;
      }
      const response = await Axios.post(
        "/accounting/customer-payment-summary-pdf",
        { p_id },
        {
          headers: { "x-auth-token": token },
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `customer_payment_summary_${p_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("Failed to download PDF.");
    } finally {
      setIsPrinting(false);
    }
  };

  const [exportCsv] =
  useLazyExportProjectFinanceCsvQuery();

const handleExportAll = async () => {
  try {
    const res = await exportCsv({ project_id: _id }).unwrap();

    const cd = res?.contentDisposition || "";
    const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
    const headerFileName = decodeURIComponent(match?.[1] || match?.[2] || "").trim();

    const fileName =
      headerFileName || `customer_payment_summary_${p_id || "export"}.csv`;

    const url = window.URL.createObjectURL(res.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("CSV export failed:", err);
    toast.error("Failed to download CSV.");
  }
};


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

  function EllipsisTooltipInput({ value, startDecorator, placeholder = "—" }) {
    const inputRef = useRef(null);
    const [overflow, setOverflow] = useState(false);

    const safeVal = isLoading ? "" : (value ?? "—");

    const checkOverflow = () => {
      const el = inputRef.current;
      if (!el) return;
      setOverflow(el.scrollWidth > el.clientWidth);
    };

    useEffect(() => {
      checkOverflow();
    }, [safeVal]);

    useEffect(() => {
      const el = inputRef.current;
      if (!el || typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(checkOverflow);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const field = (
      <Input
        readOnly
        value={safeVal}
        startDecorator={startDecorator}
        placeholder={isLoading ? "Loading..." : placeholder}
        slotProps={{
          input: {
            ref: inputRef,
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
            onMouseEnter: checkOverflow,
          },
        }}
      />
    );

    return overflow ? (
      <Tooltip
        arrow
        placement="top"
        title={
          <Typography level="body-sm" sx={{ whiteSpace: "pre-wrap" }}>
            {value || "—"}
          </Typography>
        }
      >
        {field}
      </Tooltip>
    ) : (
      field
    );
  }

  const RupeeValue = ({ value, showSymbol = true }) => {
    const n = Number(value);
    if (!isFinite(n)) return "—";
    const formatted = n.toLocaleString("en-IN");
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 4,
        }}
      >
        {showSymbol && (
          <CurrencyRupee style={{ fontSize: 16, marginBottom: 1 }} />
        )}
        <span>{formatted}</span>
      </span>
    );
  };

  const Balance_Summary = ({ isLoading = false }) => {
    const safeRound = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.round(n) : "• • •";
    };

    const rows = [
      [
        "1",
        "Total Received",
        safeRound(balanceSummary?.data?.totalCredited),
        "#FFF59D",
      ],
      [
        "2",
        "Total Return",
        safeRound(balanceSummary?.data?.totalReturn),
        "#FFF59D",
      ],
      [
        "3",
        "Net Balance [(1)-(2)]",
        safeRound(balanceSummary?.data?.totalCredited) -
          safeRound(balanceSummary?.data?.totalReturn),
        "#FFE082",
        true,
      ],
      [
        "4",
        "Total Advances Paid to Vendors",
        safeRound(balanceSummary?.data?.totalAmountPaid),
        "#FFF",
      ],
      ["", "Billing Details", "", "#F5F5F5"],
      [
        "5",
        "Invoice issued to customer",
        safeRound(balanceSummary?.data?.totalSalesValue),
        "#FFF",
      ],
      [
        "6",
        "Bills received, yet to be invoiced to customer",
        safeRound(balanceSummary?.data?.totalSalesRemainingWithGST),
        "#FFF",
      ],
      [
        "7",
        "Total Advance Remaining",
        safeRound(balanceSummary?.data?.totalAdvanceRemaining),
        "#FFF",
      ],
      [
        "9",
        "Balance With Slnko [3 - 5 - 6 - 7]",
        safeRound(balanceSummary?.data?.balanceSlnko),
        "#FFECB3",
        true,
      ],
    ];

    const formulaMap = {
      1: "Amount Received from Customer",
      2: "Amount Returned to Customer",
      3: "Net Balance = (1) - (2)",
      4: "Advance lying with vendors",
      5: "Value of material delivered (PO Closed) & Sales Invoice issued (including Sales GST)",
      6: "Value of material delivered (PO Closed) including Purchase GST",
      7: "Sum of (Advance Paid − Total Billed) for POs not Fully Sold (Fully Sold counted as 0)",
      8: "Adjustments (Debit / Credit)",
      9: "",
    };

    const summaryData = [
      ["Total PO Value", safeRound(balanceSummary?.data?.totalPoValue)],
      ["Billed Value", safeRound(balanceSummary?.data?.totalBilledValue)],
      ["Advance Paid", safeRound(balanceSummary?.data?.totalAmountPaid)],
      [
        "Remaining to Pay",
        safeRound(balanceSummary?.data?.balancePayable),
        balanceSummary?.data?.balancePayable >
        balanceSummary?.data?.totalAmountPaid
          ? "success"
          : "warning",
      ],
    ];

    return (
      <Grid container spacing={2}>
        {/* ---------- LEFT: Balance Summary ---------- */}
        <Grid item xs={12} sm={8} md={8}>
          <Sheet
            variant="outlined"
            sx={{
              borderRadius: "8px",
              p: 2,
              backgroundColor: "#fff",
              overflowX: "auto",
              "@media print": { boxShadow: "none", border: "none" },
            }}
          >
            <Typography
              level="h5"
              sx={{ fontWeight: "bold", mb: 1.5, fontSize: 16 }}
            >
              Balance Summary
            </Typography>

            <Table
              aria-label="Balance summary"
              borderAxis="both"
              sx={{
                minWidth: 560,
                tableLayout: "fixed",
                "& th, & td": {
                  px: 1.5,
                  py: 1,
                  fontSize: 14,
                  "@media print": {
                    px: 1,
                    py: 0.75,
                    fontSize: 12,
                    border: "1px solid #ddd",
                  },
                },
                "& th.num, & td.num": {
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                },
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: 64 }}>S.No.</th>
                  <th>Description</th>
                  <th className="num" style={{ width: 180 }}>
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([sno, desc, value, bg, bold]) => {
                  if (sno === "") {
                    return (
                      <tr key={desc}>
                        <td
                          colSpan={3}
                          style={{
                            background: "#F5F5F5",
                            textAlign: "center",
                            fontWeight: 700,
                            color: "#333",
                          }}
                        >
                          {desc}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <Tooltip
                      key={sno + desc}
                      title={formulaMap[sno] || ""}
                      arrow
                      placement="top-start"
                    >
                      <tr
                        style={{
                          background: bg,
                          fontWeight: bold ? 700 : 400,
                        }}
                      >
                        <td>{sno}</td>
                        <td>{desc}</td>
                        <td className="num">
                          {isLoading ? (
                            "• • •"
                          ) : (
                            <RupeeValue
                              value={value}
                              showSymbol={!(sno === "5" || sno === "6")}
                            />
                          )}
                        </td>
                      </tr>
                    </Tooltip>
                  );
                })}
              </tbody>
            </Table>
          </Sheet>
        </Grid>

        {/* ---------- RIGHT: KPIs + PAYABLE ---------- */}
        <Grid item xs={12} sm={4} md={4}>
          {/* KPI chips */}
          <Stack
            direction="row"
            flexWrap="wrap"
            spacing={1}
            useFlexGap
            sx={{ mb: 2 }}
          >
            {/* {responseData?.billing_type && (
              <Chip
                size="md"
                variant="soft"
                color="neutral"
                sx={{ fontWeight: 600 }}
              >
                Billing:&nbsp;
                {responseData?.billing_type === "Composite"
                  ? "Composite (8.9%)"
                  : responseData?.billing_type === "Individual"
                    ? "Individual (18%)"
                    : "N/A"}
              </Chip>
            )} */}
          </Stack>

          {/* Payable to Vendors */}
          <Sheet
            variant="outlined"
            sx={{
              borderRadius: "8px",
              p: 1,
              backgroundColor: "#fff",
              overflowX: "auto",
              width: "100%",
            }}
          >
            <Typography
              level="h6"
              sx={{
                fontWeight: "bold",
                mb: 1,
                fontSize: 15,
                backgroundColor: "#FBC02D",
                px: 1.5,
                py: 0.5,
                borderRadius: "6px",
                textAlign: "center",
              }}
            >
              Payable to Vendors
            </Typography>

            <Table
              aria-label="Payable to Vendors"
              borderAxis="both"
              sx={{
                minWidth: 300,
                "& th, & td": { px: 1.5, py: 1, fontSize: 14 },
                "& th.num, & td.num": { textAlign: "right" },
                "& tbody tr:hover": { backgroundColor: "#FFFDE7" },
              }}
            >
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="num" style={{ width: 180 }}>
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map(([desc, value, tone]) => (
                  <Tooltip
                    key={desc}
                    title={
                      desc === "Remaining to Pay" ? (
                        <Box sx={{ whiteSpace: "pre-line" }}>
                          {[
                            "If Billed > Advance:",
                            "  Remaining to Pay = (PO with GST − Billed − Balance with Slnko)",
                            "",
                            "Else:",
                            "  Remaining to Pay = (PO with GST − Total Advance Paid − Balance with Slnko)",
                          ].join("\n")}
                        </Box>
                      ) : (
                        ""
                      )
                    }
                    arrow
                    placement="top-start"
                  >
                    <tr
                      style={{
                        background:
                          desc === "Remaining to Pay"
                            ? tone === "success"
                              ? "#E8F5E9"
                              : "#FFF9C4"
                            : "#FFFFFF",
                        fontWeight: desc === "Remaining to Pay" ? 700 : 400,
                      }}
                    >
                      <td>{desc}</td>
                      <td className="num">
                        {isLoading ? "• • •" : value?.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </Tooltip>
                ))}
              </tbody>
            </Table>
          </Sheet>
        </Grid>
      </Grid>
    );
  };

  const [searchLedger, setSearchLedger] = React.useState("");
  const [ledgerType, setLedgerType] = React.useState("");
  return (
    <Box
      sx={{
        ml: {
          lg: "var(--Sidebar-width)",
        },
        width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
      }}
    >
      <Card
        variant="outlined"
        sx={{
          borderRadius: "xl",
          p: { xs: 2, md: 3 },
          boxShadow: "lg",
          borderColor: "neutral.outlinedBorder",
        }}
      >
        {/* =================== 1️⃣ PROJECT DETAILS =================== */}
        <Box>
          <Typography level="h4" sx={{ mb: 2, fontWeight: 700 }}>
            Project Detail
          </Typography>
          <Grid container spacing={1.5}>
            <Grid xs={12} sm={6} md={4}>
              <EllipsisTooltipInput
                value={projectSummary?.data?.code}
                startDecorator={<FolderIcon />}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <EllipsisTooltipInput
                value={projectSummary?.data?.name}
                startDecorator={<BusinessIcon />}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Input
                value={projectSummary?.data?.customer || "-"}
                readOnly
                startDecorator={<AccountCircleIcon />}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Input
                value={projectSummary?.data?.p_group || "-"}
                readOnly
                startDecorator={<GroupsIcon />}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <EllipsisTooltipInput
                value={projectSummary?.data?.site_address?.district_name}
                startDecorator={<LocationOnIcon />}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Input
                value={projectSummary?.data?.project_kwp || "-"}
                readOnly
                startDecorator={<BoltIcon />}
              />
            </Grid>
          </Grid>
        </Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            mb: 2,
            "& .MuiTabs-indicator": { display: "none" },
            "& .MuiTabList-indicator": { display: "none" },
          }}
        >
          <TabList
            variant="plain"
            color="neutral"
            sx={{
              gap: 0.5,
              p: 0.5,
              borderRadius: "lg",
              bgcolor: "rgba(255, 255, 255, 0.6)",
              backdropFilter: "blur(12px)",
              boxShadow: "sm",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              overflowX: "auto",
            }}
          >
            {TABS.map((t) => (
              <Tab
                key={t}
                value={t}
                sx={{
                  textTransform: "capitalize",
                  fontWeight: 600,
                  fontSize: 15,
                  px: 2.5,
                  py: 1,
                  borderRadius: "xl",
                  transition: "all 0.25s ease",
                  color: "text.secondary",
                  bgcolor: "transparent",
                  color: "text.primary",

                  transition:
                    "background-color .2s ease, box-shadow .2s ease, transform .2s ease",

                  "&:hover": {
                    bgcolor: "background.level2",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                {t}
              </Tab>
            ))}
          </TabList>

          {/* ====================== CREDIT ====================== */}
          <TabPanel value="credit" sx={{ p: 0 }}>
            <Credit />
          </TabPanel>

          {/* ====================== DEBIT ====================== */}
          <TabPanel value="debit" sx={{ p: 0 }}>
            <Debit />
          </TabPanel>

          {/* ====================== PURCHASE (Client History) ====================== */}
          <TabPanel value="purchase" sx={{ p: 0 }}>
            <PurchaseOrder />
          </TabPanel>

          {/* ====================== SALES ====================== */}
          <TabPanel value="sales" sx={{ p: 0 }}>
            <Sales />
          </TabPanel>

          {/* ====================== ADJUSTMENT ====================== */}
          <TabPanel value="adjustment" sx={{ p: 0 }}>
            <Adjustment />
          </TabPanel>

          <TabPanel value="ledger" sx={{ p: 0 }}>
            <Box mt={2}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: { md: "center", xs: "stretch" },
                  flexDirection: { md: "row", xs: "column" },
                  gap: 2,
                }}
                mb={2}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexDirection: { md: "row", xs: "column" },
                    gap: 2,
                    width: "100%",
                  }}
                >
                  {/* ✅ Search Vendor */}
                  <Input
                    placeholder="Search by vendor..."
                    value={searchLedger}
                    onChange={(e) => setSearchLedger(e.target.value)}
                    startDecorator={<Search size={16} />}
                    sx={{ width: { xs: "100%", md: "50%" } }}
                  />

                  {/* ✅ Type Filter */}
                  <Select
                    value={ledgerType}
                    onChange={(e, val) => setLedgerType(val)}
                    sx={{ width: { xs: "100%", md: 100 } }}
                  >
                    <Option value="">All</Option>
                    <Option value="credit">Credit</Option>
                    <Option value="debit">Debit</Option>
                  </Select>
                </Box>
              </Box>

              {/* ✅ pass both */}
              <Ledger
                project_id={_id}
                search={searchLedger}
                entryType={ledgerType}
              />
            </Box>
          </TabPanel>
        </Tabs>

        {/* ====================== Balance Summary (simple) ====================== */}

        <Typography level="h4" sx={{ mb: 2, fontWeight: 700 }}>
          Balance Summary
        </Typography>
        <Card variant="outlined" sx={{ borderRadius: "lg", p: 2 }}>
          <Balance_Summary />
        </Card>

        {/* Floating actions */}
        <Box
          position="fixed"
          bottom={16}
          right={16}
          zIndex={1300}
          display="flex"
          gap={2}
          sx={{ "@media print": { display: "none" } }}
        >
          <Button
            variant="soft"
            color="primary"
            startDecorator={<ArrowBackIcon />}
            onClick={() => navigate("/project-balance")}
          >
            Back
          </Button>

          <Button
            variant="solid"
            color="danger"
            onClick={handlePrint}
            startDecorator={<PrintIcon />}
            loading={isPrinting}
          >
            Print
          </Button>

          <Button
            variant="solid"
            color="success"
            onClick={handleExportAll}
            startDecorator={<FileDownloadIcon />}
            loading={isExporting}
          >
            CSV
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
