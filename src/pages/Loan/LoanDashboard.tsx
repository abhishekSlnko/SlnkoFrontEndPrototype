// pages/CAM/LoanDashboard.jsx
import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import { useEffect, useState } from "react";
import Sidebar from "../../component/Partials/Sidebar";
import MainHeader from "../../component/Partials/MainHeader";
import { Button } from "@mui/joy";
import { useNavigate } from "react-router-dom";
import SubHeader from "../../component/Partials/SubHeader";
import LoanDashboard from "../../component/Loan_Dashboard";

function LoanDashboardPage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const getUserData = () => {
    const userData = localStorage.getItem("userDetails");
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  };

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  const cannotSeeLoanDashboard =
    user && user.department === "Loan" && user.name !== "Prachi Singh";

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100dvh", flexDirection: "column" }}>
        <Sidebar />
        <MainHeader title="Loan" sticky>
          <Box display="flex" gap={1}>
            {!cannotSeeLoanDashboard && (
              <Button
                size="sm"
                onClick={() => navigate(`/loan_dashboard`)}
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
            )}

              <Button
              size="sm"
              onClick={() => navigate(`/loan`)}
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
              All Loans
            </Button>
          </Box>
        </MainHeader>

        <SubHeader
          title="Loan Dashboard"
          isBackEnabled={false}
          sticky
          rightSlot={null}
        />

        <Box
          component="main"
          className="MainContent"
          sx={{
            mt: { xs: "116px", sm: "112px", md: "104px" },
            px: { xs: 1.5, sm: 2, md: 1 },
            pb: { xs: 2, sm: 3, md: 3.5 },
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            gap: 2,
            overflow: "auto",
          }}
        >
          <LoanDashboard />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}

export default LoanDashboardPage;