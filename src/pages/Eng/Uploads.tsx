import Box from "@mui/joy/Box";
import CssBaseline from "@mui/joy/CssBaseline";
import { CssVarsProvider } from "@mui/joy/styles";
import Button from "@mui/joy/Button";
import Sidebar from "../../component/Partials/Sidebar";
import SubHeader from "../../component/Partials/SubHeader";
import MainHeader from "../../component/Partials/MainHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Filter from "../../component/Partials/Filter";
import Uploads from "../../component/Uploads";
import { useGetProjectDropdownForDashboardQuery } from "../../redux/projectsSlice";
import { useGetAllUserQuery } from "../../redux/globalTaskSlice";
import { useGetAllTemplateQuery } from "../../redux/engsSlice";

function Eng_Upload() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { data: projectResponse } = useGetProjectDropdownForDashboardQuery({});
    const { data: projectUsers = [], isFetching: isFetchingUsers } =
        useGetAllUserQuery({ department: "Engineering" });
    const { data: templateData } = useGetAllTemplateQuery({})
    console.log(templateData)
    const assignOptions = Array.isArray(projectUsers?.data)
        ? projectUsers.data.map((u) => ({ label: u.name, value: u._id }))
        : [];

    const projects = Array.isArray(projectResponse)
        ? projectResponse
        : projectResponse?.data ?? [];


    const templateOptions = Array.isArray(templateData?.data)
        ? templateData.data.map((u) => ({ label: u.name, value: u._id }))
        : [];

    const [open, setOpen] = useState(false);

    // ✅ FIX: remove ("x" || "")
    const [groupBy, setGroupBy] = useState(searchParams.get("group") || "");
    const [user, setUser] = useState(searchParams.get("user") || "");
    const [project, setProject] = useState(searchParams.get("project") || "");
    const [templates, setTemplates] = useState(searchParams.get("template") || "");
    const [dateFrom, setDateForm] = useState(searchParams.get("from") || "");
    const [dateTo, setDateTo] = useState(searchParams.get("to") || "");

    const fields = [
        {
            key: "group",
            label: "Group By",
            type: "select",
            options: [
                { label: "Project", value: "project_id" },
                { label: "Template", value: "template" },
                { label: "Date", value: "dates" },
                { label: "User", value: "user" },
            ],
        },
        {
            key: "project_id",
            label: "Project",
            type: "select",
            options: projects.map((d) => ({ label: d.name, value: d._id })),
        },
        {
            key: "template",
            label: "Templates",
            type: "select",
            options: templateOptions
        },
        {
            key: "date",
            label: "Date",
            type: "daterange",
        },
        {
            key: "user",
            label: "Users",
            type: "select",
            options: assignOptions,
        },
    ];

    useEffect(() => {
        const sp = new URLSearchParams(searchParams);

        if (groupBy) sp.set("group", groupBy);
        else sp.delete("group");

        if (user) sp.set("user", user);
        else sp.delete("user");

        if (project) sp.set("project", project);
        else sp.delete("project");

        if (templates) sp.set("template", templates);
        else sp.delete("template");

        if (dateFrom) sp.set("from", dateFrom);
        else sp.delete("from");

        if (dateTo) sp.set("to", dateTo);
        else sp.delete("to");

        sp.set("page", "1");
        setSearchParams(sp);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupBy, user, project, templates, dateFrom, dateTo]);

    return (
        <CssVarsProvider disableTransitionOnChange>
            <CssBaseline />
            <Box sx={{ display: "flex", minHeight: "100dvh", flexDirection: "column" }}>
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
                                "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
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
                                "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
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
                                "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
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
                    title="Uploads"
                    isBackEnabled={true}
                    sticky
                    rightSlot={
                        <Filter
                            open={open}
                            onOpenChange={setOpen}
                            fields={fields}
                            title="Filters"
                            onApply={(values) => {
                                setGroupBy(values?.group || "");
                                setUser(values?.user || "");

                                // ✅ FIX: your field key is project_id
                                setProject(values?.project_id || "");

                                setTemplates(values?.template || "");
                                setDateForm(values?.date?.from || "");
                                setDateTo(values?.date?.to || "");

                                setOpen(false);
                            }}
                            onReset={() => {
                                setGroupBy("");
                                setUser("");
                                setProject("");
                                setTemplates("");
                                setDateForm("");
                                setDateTo("");
                                setOpen(false);
                            }}
                        />
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
                    <Uploads />
                </Box>
            </Box>
        </CssVarsProvider>
    );
}

export default Eng_Upload;
