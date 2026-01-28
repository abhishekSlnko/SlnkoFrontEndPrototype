import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../component/Partials/Sidebar";
import PaymentRequest from "../../component/PaymentRequest";
import MainHeader from "../../component/Partials/MainHeader";
import { Button } from "@mui/joy";
import SubHeader from "../../component/Partials/SubHeader";

function ProjectBalance() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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
          title="Payment Request"
          isBackEnabled={false}
          sticky
          rightSlot={
            <>
              <Box sx={{ display: "flex", gap: 1 }}>
                {" "}
                {(user?.name === "IT Team" ||
                  user?.name === "Guddu Rani Dubey" ||
                  user?.name === "Naresh Kumar" ||
                  user?.name === "Prachi Singh" ||
                  user?.department === "admin" ||
                  user?.name === "Shubham Gupta" ||
                  user?.name === "Gagan Tayal" ||
                  user?.name === "Ajay Singh" ||
                  user?.name === "Pawan Singh") && (
                  <Button
                    sx={{
                      backgroundColor: "#3366a3",
                      color: "#fff",
                      "&:hover": { backgroundColor: "#285680" },
                      height: "8px",
                    }}
                    size="sm"
                    onClick={() => navigate("/pay_Request")}
                  >
                    Add New Payment +
                  </Button>
                )}
                {(user?.name === "IT Team" ||
                  user?.name === "Guddu Rani Dubey" ||
                  user?.name === "Naresh Kumar" ||
                  user?.name === "Prachi Singh" ||
                  user?.department === "admin" ||
                  user?.name === "Ajay Singh" ||
                  user?.name === "Aryan Maheshwari" ||
                  user?.name === "Sarthak Sharma" ||
                  user?.name === "Naresh Kumar" ||
                  user?.name === "Shubham Gupta" ||
                  user?.name === "Saurabh Suman" ||
                  user?.name === "Sandeep Yadav" ||
                  user?.name === "Som Narayan Jha" ||
                  user?.name === "Gagan Tayal" ||
                  user?.name === "Saresh" ||
                  user?.name === "Pawan Singh") && (
                  <Button
                    color="danger"
                    size="sm"
                    onClick={() => navigate("/standby_records")}
                  >
                    Trash
                  </Button>
                )}
              </Box>
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
            mt: "90px",
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
          <PaymentRequest />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}
export default ProjectBalance;
