import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import Sidebar from "../../component/Partials/Sidebar";
import Eng_Inspection from "../../component/Eng_Inspection";
import SubHeader from "../../component/Partials/SubHeader";
import MainHeader from "../../component/Partials/MainHeader";
import { Button } from "@mui/joy";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Filter from "../../component/Partials/Filter";

function Inspection() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(
    searchParams.get("status") || ""
  );

  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    if (status) sp.set("status", status);
    else sp.delete("status");

    sp.set("page", 1);
    setSearchParams(sp);
  }, [status])

  const statuses = [
    { label: "Approved", value: "approved" },
    { label: "Requested", value: "requested" },
    { label: "Failed", value: "failed" }
  ]

  const fields = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: statuses,
    }
  ]
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

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100dvh" }}>
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


            {(user?.name !== "Sujoy Mahata" || user?.name !== "Sarthak Sharma") ? (<Button
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
            </Button>) : null}

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
          title="Inspection"
          isBackEnabled={false}
          sticky
        >

          <Filter
            open={open}
            onOpenChange={setOpen}
            title="Filters"
            fields={fields}
            onApply={(values) => {
              setStatus(values?.status || "");
              setOpen(false);
            }}
            onReset={() => {
              setStatus("");
              setOpen(false)
            }}
          />
        </SubHeader>
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
          <Eng_Inspection />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}
export default Inspection;
