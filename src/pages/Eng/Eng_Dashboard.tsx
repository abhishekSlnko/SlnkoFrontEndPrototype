import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import Button from "@mui/joy/Button";
import Sidebar from "../../component/Partials/Sidebar";
import SubHeader from "../../component/Partials/SubHeader";
import Dash_eng from "../../component/EngDashboard";
import MainHeader from "../../component/Partials/MainHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Filter from "../../component/Partials/Filter";
import EngineeringDashboard from "../../component/Eng_Dashboard";

function Eng_Dashboard() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [open, setOpen] = useState(false);
    const [dateFrom, setDateForm] = useState(
        searchParams.get("from" || "")
    );
    const [dateTo, setDateTo] = useState(
        searchParams.get("to" || "")
    );
    const fields = [
        {
            key: "date",
            label: "Date Filter",
            type: "daterange",
        },
    ];

    useEffect(() => {
        const sp = new URLSearchParams(searchParams);

        if (dateFrom) sp.set("from", dateFrom);
        else sp.delete("from");

        if (dateTo) sp.set("to", dateTo);
        else sp.delete("to");

        setSearchParams(sp);
    }, [searchParams, dateFrom, dateTo])

    return (
        <CssVarsProvider disableTransitionOnChange>
            <CssBaseline />
            <Box
                sx={{ display: "flex", minHeight: "100dvh", flexDirection: "column" }}
            >
                <Sidebar />
                <MainHeader title="Engineering" sticky>
                    <Box display="flex" gap={1}>

                        <Button
                            size="sm"
                            onClick={() => navigate(`/eng_dashboard`)}
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
                            Dashboard
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => navigate(`/eng_dash`)}
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
                            All Projects
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => navigate(`/inspection`)}
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
                            Inspection
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => navigate(`/eng_upload`)}
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
                            Uploads
                        </Button>

                    </Box>
                </MainHeader>

                <SubHeader
                    title="All Projects"
                    isBackEnabled={false}
                    sticky
                    rightSlot={
                        <>
                            <Filter
                                open={open}
                                onOpenChange={setOpen}
                                fields={fields}
                                title="Filters"
                                onApply={(values) => {
                                    setDateForm(values?.date?.from || "");
                                    setDateTo(values?.date?.to);
                                    setOpen(false);
                                }}
                                onReset={() => {
                                    setDateForm("");
                                    setDateTo("");
                                    setOpen(false);
                                }}
                            />
                        </>
                    }
                ></SubHeader>
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
                    <EngineeringDashboard />
                </Box>
            </Box>
        </CssVarsProvider>
    );
}
export default Eng_Dashboard;
