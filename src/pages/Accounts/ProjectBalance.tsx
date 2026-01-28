import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import { useRef } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../component/Partials/Sidebar";
import ProjectBalances from "../../component/ProjectBalance";
import MainHeader from "../../component/Partials/MainHeader";
import SubHeader from "../../component/Partials/SubHeader";

function ProjectBalance() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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

  const projectBalancesRef = useRef();

  // ✅ block list for Payment Approval + Approved Payment
  const blockedEmpIds = ["SE-398", "SE-203", "SE-212"];
  const canSeePaymentButtons = !blockedEmpIds.includes(
    String(user?.emp_id || "").trim(),
  );

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100dvh" }}>
        <Sidebar />
        <MainHeader title="Accounting" sticky>
          <Box display="flex" gap={1}>
            {(user?.department === "admin" ||
              user?.department === "superadmin" ||
              user?.department === "Accounts" ||
              user?.department === "CAM" ||
              (user?.department === "SCM" && user?.role === "manager") ||
              user?.name === "Prachi Singh" ||
              (user?.department === "SCM" && user?.name === "Shubham Gupta") ||
              user?.role === "visitor" ||
              user?.emp_id === "SE-203" ||
              user?.emp_id === "SE-398") && (
              <Button
                size="sm"
                onClick={() => navigate(`/project-balance?status=ongoing`)}
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
                Project Balances
              </Button>
            )}

            {(user?.department === "Accounts" ||
              user?.department === "admin" ||
              user?.department === "superadmin" ||
              user?.department === "SCM" ||
              user?.department === "CAM" ||
              user?.emp_id === "SE-203" || user?.emp_id === "SE-398" ||
              user?.role === "visitor" ||
              user?.name === "Prachi Singh") && (
              <Button
                size="sm"
                onClick={() => navigate(`/daily-payment-request?tab=instant`)}
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
                Payment Request
              </Button>
            )}

            {(user?.department === "Accounts" ||
              user?.department === "superadmin" ||
              user?.department === "admin" ||
              (user?.department === "SCM" && user?.role === "manager") ||
              user?.name === "Prachi Singh") && (
              <Button
                size="sm"
                onClick={() => navigate(`/adjustment-dashboard`)}
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
                Adjustments
              </Button>
            )}

            {((user?.department === "Accounts" && user?.role === "manager") ||
              user?.role === "visitor" ||
              (user?.department === "SCM" && user?.role === "manager") ||
              user?.department === "superadmin" ||
              user?.department === "admin") && (
              <Button
                size="sm"
                onClick={() => navigate(`/payment-approval`)}
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
                Payment Approval
              </Button>
            )}

             {((user?.department === "Accounts" ||
              user?.department === "superadmin") ||
              user?.department === "admin" ||
              (user?.department === "SCM" && user?.role === "manager") ||
              user?.name === "Prachi Singh") && (
              <Button
                size="sm"
                onClick={() => navigate(`/payment-approved`)}
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
                Approved Payment
              </Button>
            )}
          </Box>
        </MainHeader>

        <SubHeader
          title="Project Balances"
          isBackEnabled={false}
          sticky
          rightSlot={
            <>
              {(user?.name === "IT Team" ||
                user?.name === "Guddu Rani Dubey" ||
                user?.name === "Naresh Kumar" ||
                user?.name === "Prachi Singh" ||
                user?.department === "admin" ||
                user?.name === "Sachin Raghav") && (
                <Button
                  variant="outlined"
                  onClick={() => navigate("/adjust_request")}
                  size="sm"
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
                  Adjustment Form
                </Button>
              )}

              {(user?.name === "Gagan Tayal" ||
                user?.name === "Chandan Singh" ||
                user?.name === "Sujan Maharjan" ||
                user?.department === "admin" ||
                user?.name === "Prachi Singh" ||
                user?.name === "IT Team" ||
                user?.name === "Ajay Singh") && (
                <Button
                  variant="outlined"
                  onClick={() => navigate("/eng_dash")}
                  size="sm"
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
                  HandOver Dashboard
                </Button>
              )}
            </>
          }
        ></SubHeader>

        <Box
          component="main"
          className="MainContent"
          sx={{
            pt: {
              xs: "calc(12px + var(--Header-height))",
              sm: "calc(12px + var(--Header-height))",
              md: 3,
            },
            mt: "108px",
            p: "16px",
            px: "12px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "88dvh",
            overflow: "auto",
            gap: 1,
            "@media print": { px: 1, pt: 0, pb: 0, minWidth: "1000px" },
          }}
        >
          <ProjectBalances ref={projectBalancesRef} />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}

export default ProjectBalance;
