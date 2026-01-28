// pages/DprManagement.jsx
import { useState, useEffect } from "react";
import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import Button from "@mui/joy/Button";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../component/Partials/Sidebar";
import SubHeader from "../../component/Partials/SubHeader";
import MainHeader from "../../component/Partials/MainHeader";
import ViewDprInfo from "../../component/ViewDpr";

function ViewDpr() {
  const navigate = useNavigate();
  const [user, setUser] = useState();
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

  const cannotSeeDetailsDashboard =
    user?.department === "Projects" &&
    user?.emp_id !== "SE-235" &&
    user?.emp_id !== "SE-353" &&
    user?.emp_id !== "SE-255" &&
    user?.emp_id !== "SE-203" &&
    user?.emp_id !== "SE-398"&&
    user?.emp_id !== "SE-284";

  const cannotSeeDetails =
    user?.department === "Projects" &&
    user?.emp_id !== "SE-235" &&
    user?.emp_id !== "SE-353" &&
    user?.emp_id !== "SE-255" &&
    user?.emp_id !== "SE-284" &&
    user?.emp_id !== "SE-203" &&
    user?.emp_id !== "SE-398"&&
    user?.emp_id !== "SE-011";

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box
        sx={{ display: "flex", minHeight: "100dvh", flexDirection: "column" }}
      >
        <Sidebar />

        <MainHeader title="Projects" sticky>
          <Box display="flex" gap={1}>
            {!cannotSeeDetailsDashboard && (
              <>
                <Button
                  size="sm"
                  onClick={() => navigate(`/project_dash`)}
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
                  Dashboard
                </Button>
              </>
            )}
            {!cannotSeeDetails && (
              <>
                <Button
                  size="sm"
                  onClick={() => navigate(`/project_management`)}
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
                  All Projects
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(`/project_template`)}
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
                  Templates
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={() => navigate(`/dpr_management`)}
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
              Site DPR
            </Button>
          </Box>
        </MainHeader>

        <SubHeader title="View DPR" isBackEnabled={true} sticky />

        <Box
          component="main"
          className="MainContent"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            mt: "108px",
            p: {xs:"8px", sm:'16px'},
            px: "24px",
          }}
        >
          <ViewDprInfo />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}

export default ViewDpr;
