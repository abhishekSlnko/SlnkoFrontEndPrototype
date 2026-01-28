import { Box, Button, CssBaseline, CssVarsProvider } from "@mui/joy";
import Sidebar from "../../component/Partials/Sidebar";
import MainHeader from "../../component/Partials/MainHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import SubHeader from "../../component/Partials/SubHeader";
import Dash_project from "../../component/DashboardProject";
import Filter from "../../component/Partials/Filter";
import { useState, useEffect } from "react";
import { useGetProjectDropdownForDashboardQuery } from "../../redux/projectsSlice";

function DashboardProjects() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: projectResponse } = useGetProjectDropdownForDashboardQuery({});

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

  const projects = Array.isArray(projectResponse)
    ? projectResponse
    : (projectResponse?.data ?? []);

  const fields = [
    {
      key: "projects",
      label: "Project By Name",
      type: "multiselect",
      options: projects.map((d) => ({ label: d.name, value: d._id })),
    },
  ];

  const [selectedIds, setSelectedIds] = useState(
    searchParams.get("projects")?.split(",") || [],
  );

  useEffect(() => {
    if (selectedIds.length > 0) {
      setSearchParams({ projects: selectedIds.join(",") });
    } else {
      setSearchParams({});
    }
  }, [selectedIds, setSearchParams]);

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box
        sx={{ display: "flex", minHeight: "100dvh", flexDirection: "column" }}
      >
        <Sidebar />
        <MainHeader title="Dashboard" sticky>
          <Box display="flex" gap={1}>
            <Button
              size="sm"
              onClick={() => navigate(`/dashboard-projects`)}
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
              Projects
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/dashboard-loan`)}
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
              Loan
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/dashboard-task`)}
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
              Task
            </Button>
          </Box>
        </MainHeader>
        <SubHeader title="Projects" isBackEnabled={false} sticky>
          <Filter
            open={open}
            onOpenChange={setOpen}
            fields={fields}
            title="Filters"
            values={{ projects: selectedIds }}
            onApply={(values) => {
              setSelectedIds(values?.projects || []);
              setOpen(false);
            }}
            onReset={() => {
              setSelectedIds([]);
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
          <Dash_project projectIds={selectedIds} />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}

export default DashboardProjects;
