import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Box from "@mui/joy/Box";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import Chip from "@mui/joy/Chip";
import IconButton from "@mui/joy/IconButton";
import CircularProgress from "@mui/joy/CircularProgress";
import Button from "@mui/joy/Button";
import Divider from "@mui/joy/Divider";
import Stack from "@mui/joy/Stack";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import DialogTitle from "@mui/joy/DialogTitle";
import DialogContent from "@mui/joy/DialogContent";
import DialogActions from "@mui/joy/DialogActions";
import FormControl from "@mui/joy/FormControl";
import Input from "@mui/joy/Input";
import Tooltip from "@mui/joy/Tooltip";

import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

import { SearchIcon } from "lucide-react";
import { useGetAllEngUploadQuery } from "../redux/engsSlice";

const HEADERS = [
    "Project Name",
    "Project Code",
    "Template Name",
    "No. of Attachments",
    "Time",
    "Uploaded By",
    "View",
];

const safeArr = (v) => (Array.isArray(v) ? v : []);
const pickLast = (arr) => (Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null);

const fmtDT = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
};

const fmtDay = (isoOrYMD) => {
    if (!isoOrYMD) return "-";
    const d = new Date(String(isoOrYMD));
    if (Number.isNaN(d.getTime())) return String(isoOrYMD);
    return new Intl.DateTimeFormat("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(d);
};

const shortText = (text, max = 14) => {
    const s = text ? String(text).trim() : "";
    if (!s) return "-";
    if (s.length <= max) return s;
    return `${s.slice(0, max)}...`;
};

const renderNameWithTooltip = (name, max = 16) => {
    const full = name ? String(name).trim() : "";
    if (!full) return <Typography level="body-sm">-</Typography>;

    const isLong = full.length > max;
    const shown = isLong ? shortText(full, max) : full;

    // Always show tooltip when long (you can set always=true if you want always tooltip)
    return (
        <Tooltip title={full} placement="top" variant="soft" disableHoverListener={!isLong}>
            <Typography
                level="body-sm"
                sx={{
                    maxWidth: 220,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: isLong ? "help" : "default",
                }}
            >
                {shown}
            </Typography>
        </Tooltip>
    );
};

// ------------------- Normal (no group) / project-group uses doc.items -------------------
const buildItemRowsFromDoc = (doc, projectObjFallback) => {
    const projectObj = doc?.project || projectObjFallback || {};
    const items = safeArr(doc?.items);

    return items.map((it, idx) => {
        const history = safeArr(it?.status_history);
        const lastHist = pickLast(history);
        const uploadedAt = lastHist?.updatedAt || it?.current_status?.updatedAt || doc?.updatedAt;

        return {
            key: `${doc?._id || "doc"}-${it?.template_id || "tmp"}-${idx}`,
            projectName: projectObj?.name || "-",
            projectCode: projectObj?.code || "-",
            templateName: it?.templateDetail?.name || "-",
            attachmentCount: Number(it?.attachment_docs_count || 0),
            uploadedAt,
            uploadedBy: lastHist?.user?.name || "-", // ✅ name

            project: projectObj,
            item: it,
            doc,
        };
    });
};

// ------------------- Template group: rows are already flattened (status_history is array) -------------------
const buildItemRowFromTemplateGroupRow = (row, templateObj) => {
    const projectObj = row?.project || {};
    const history = safeArr(row?.status_history);
    const lastHist = pickLast(history);
    const uploadedAt = lastHist?.updatedAt || row?.current_status?.updatedAt;

    const item = {
        template_id: templateObj?._id,
        templateDetail: templateObj,
        current_status: row?.current_status,
        current_attachment: safeArr(row?.current_attachment),
        status_history: history,
        attachment_urls: safeArr(row?.attachment_urls),
        attachment_docs_count: Number(row?.attachment_docs_count || 0),
    };

    return {
        key: `${templateObj?._id || "tmp"}-${row?.project_id || "p"}-${lastHist?._id || "h"}`,
        projectName: projectObj?.name || "-",
        projectCode: projectObj?.code || "-",
        templateName: templateObj?.name || "-",
        attachmentCount: Number(row?.attachment_docs_count || 0),
        uploadedAt,
        uploadedBy: lastHist?.user?.name || "-", // ✅ name

        project: projectObj,
        item,
        doc: row,
    };
};

// ------------------- User group: rows are already flattened (status_history is OBJECT) -------------------
const buildItemRowFromUserGroupRow = (row, userName) => {
    const projectObj = row?.project || {};
    const histObj = row?.status_history || null;
    const uploadedAt = histObj?.updatedAt || row?.current_status?.updatedAt;

    const templateObj = row?.template_detail || row?.templateDetail || row?.template || {};
    const item = {
        template_id: templateObj?._id || row?.template_id,
        templateDetail: templateObj,
        current_status: row?.current_status,
        current_attachment: safeArr(row?.current_attachment),
        status_history: histObj ? [histObj] : [],
        attachment_urls: safeArr(row?.attachment_urls),
        attachment_docs_count: Number(row?.attachment_docs_count || 0),
    };

    return {
        key: `${userName || "user"}-${projectObj?._id || row?.project_id || "p"}-${histObj?._id || "h"}`,
        projectName: projectObj?.name || "-",
        projectCode: projectObj?.code || "-",
        templateName: item?.templateDetail?.name || "-",
        attachmentCount: Number(row?.attachment_docs_count || 0),
        uploadedAt,
        uploadedBy: userName || "-", // ✅ name

        project: projectObj,
        item,
        doc: row,
    };
};

// ✅ Dates group: rows are flattened; template_detail exists; status_history is OBJECT
const buildItemRowFromDatesGroupRow = (row) => {
    const projectObj = row?.project || {};
    const templateObj = row?.template_detail || {};
    const histObj = row?.status_history || null;
    const uploadedAt = histObj?.updatedAt || row?.current_status?.updatedAt;

    const item = {
        template_id: templateObj?._id,
        templateDetail: templateObj,
        current_status: row?.current_status,
        current_attachment: safeArr(row?.current_attachment),
        status_history: histObj ? [histObj] : [],
        attachment_urls: safeArr(row?.attachment_urls),
        attachment_docs_count: Number(row?.attachment_docs_count || 0),
    };

    return {
        key: `${row?.project_id || "p"}-${templateObj?._id || "t"}-${histObj?._id || "h"}`,
        projectName: projectObj?.name || "-",
        projectCode: projectObj?.code || "-",
        templateName: templateObj?.name || "-",
        attachmentCount: safeArr(row?.attachment_urls).length,
        uploadedAt,
        uploadedBy: histObj?.user?.name || "-", // ✅ name

        project: projectObj,
        item,
        doc: row,
    };
};

const isGroupedProjectResponse = (apiData) => {
    const list = safeArr(apiData);
    return list.length > 0 && Array.isArray(list[0]?.rows) && !!list[0]?.project;
};

const isGroupedTemplateResponse = (apiData) => {
    const list = safeArr(apiData);
    return list.length > 0 && Array.isArray(list[0]?.rows) && !!list[0]?.template;
};

const isGroupedUserResponse = (apiData) => {
    const list = safeArr(apiData);
    return list.length > 0 && Array.isArray(list[0]?.rows) && (list[0]?._id || list[0]?.user_id);
};

const isGroupedDatesResponse = (apiData) => {
    const list = safeArr(apiData);
    return list.length > 0 && Array.isArray(list[0]?.rows) && typeof list[0]?._id === "string" && !!list[0]?.date;
};

const Uploads = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState("");

    const groupBy = searchParams.get("group") || "";
    const user = searchParams.get("user") || "";
    const project = searchParams.get("project") || "";
    const template = searchParams.get("template") || "";
    const startDate = searchParams.get("from") || "";
    const endDate = searchParams.get("to") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    const params = useMemo(
        () => ({
            groupBy,
            user,
            project,
            template,
            dateFrom: startDate || new Date().toISOString(),
            dateTo: endDate || new Date().toISOString(),
            page,
            limit,
            search: searchQuery, 
        }),
        [groupBy, user, project, template, startDate, endDate, page, limit, searchQuery]
    );

    const { data, isLoading, isFetching, isError, error } = useGetAllEngUploadQuery(params);
    const apiList = safeArr(data?.data);

    const groupMode = useMemo(() => {
        if (groupBy === "project_id" && isGroupedProjectResponse(apiList)) return "project";
        if (groupBy === "template" && isGroupedTemplateResponse(apiList)) return "template";
        if (groupBy === "user" && isGroupedUserResponse(apiList)) return "user";
        if (groupBy === "dates" && isGroupedDatesResponse(apiList)) return "dates";
        return "";
    }, [groupBy, apiList]);

    const [expandedGroups, setExpandedGroups] = useState({});

    const projectGroups = useMemo(() => {
        if (groupMode !== "project") return [];
        return apiList.map((g) => {
            const groupId = g?._id || "grp";
            const projectObj = g?.project || {};
            const rowsDocs = safeArr(g?.rows);
            const childRows = rowsDocs.flatMap((doc) => buildItemRowsFromDoc(doc, projectObj));

            return {
                groupId,
                title: projectObj?.name || "-",
                pill: projectObj?.code || "-",
                count: Number(g?.total_items || childRows.length || 0),
                childRows,
            };
        });
    }, [apiList, groupMode]);

    const templateGroups = useMemo(() => {
        if (groupMode !== "template") return [];
        return apiList.map((g) => {
            const groupId = g?._id || "tmpgrp";
            const templateObj = g?.template || {};
            const rows = safeArr(g?.rows);
            const childRows = rows.map((r) => buildItemRowFromTemplateGroupRow(r, templateObj));

            return {
                groupId,
                title: templateObj?.name || "-",
                pill: "",
                count: childRows.length,
                childRows,
            };
        });
    }, [apiList, groupMode]);

    const userGroups = useMemo(() => {
        if (groupMode !== "user") return [];
        return apiList.map((g) => {
            const userName = g?.user?.name || String(g?._id || "");
            const rows = safeArr(g?.rows);
            const childRows = rows.map((r) => buildItemRowFromUserGroupRow(r, userName));

            return {
                groupId: String(g?._id || userName),
                title: userName || "User",
                pill: "",
                count: childRows.length,
                childRows,
            };
        });
    }, [apiList, groupMode]);

    const datesGroups = useMemo(() => {
        if (groupMode !== "dates") return [];
        return apiList.map((g) => {
            const groupId = g?._id || "dategrp";
            const rows = safeArr(g?.rows);
            const childRows = rows.map((r) => buildItemRowFromDatesGroupRow(r));

            return {
                groupId,
                title: fmtDay(g?._id || g?.date),
                pill: "",
                count: childRows.length,
                childRows,
            };
        });
    }, [apiList, groupMode]);

    const flatRows = useMemo(() => {
        if (groupMode) return [];
        return apiList.flatMap((doc) => buildItemRowsFromDoc(doc, doc?.project));
    }, [apiList, groupMode]);

    const [open, setOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    const handleView = (row) => {
        setSelectedRow(row);
        setOpen(true);
    };

    const totalPage = Number(data?.totalPage || 1);

    const handlePageChange = (nextPage) => {
        if (nextPage < 1 || nextPage > totalPage) return;
        setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            p.set("page", String(nextPage));
            return p;
        });
    };

    const groupsToRender =
        groupMode === "project"
            ? projectGroups
            : groupMode === "template"
                ? templateGroups
                : groupMode === "user"
                    ? userGroups
                    : groupMode === "dates"
                        ? datesGroups
                        : [];

    return (
        <Box
            sx={{
                ml: { lg: "var(--Sidebar-width)" },
                px: "0px",
                width: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
            }}
        >
            <Box display="flex" justifyContent="flex-end" alignItems="center" pb={0.5} flexWrap="wrap" gap={1}>
                <Box
                    sx={{
                        py: 1,
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 1.5,
                        width: { xs: "100%", md: "50%" },
                    }}
                >
                    <FormControl sx={{ flex: 1 }} size="sm">
                        <Input
                            size="sm"
                            placeholder="Search..."
                            startDecorator={<SearchIcon size={16} />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </FormControl>
                </Box>
            </Box>

            <Sheet
                variant="outlined"
                sx={{
                    width: "100%",
                    borderRadius: "sm",
                    maxHeight: "70vh",
                    overflow: "auto",
                }}
            >
                <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {HEADERS.map((h) => (
                                <th
                                    key={h}
                                    style={{
                                        position: "sticky",
                                        top: 0,
                                        background: "#efefef",
                                        zIndex: 2,
                                        borderBottom: "1px solid #ddd",
                                        padding: "10px 8px",
                                        textAlign: "left",
                                        fontWeight: 700,
                                        fontSize: 13,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {isLoading || isFetching ? (
                            <tr>
                                <td colSpan={HEADERS.length} style={{ padding: 14 }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                                        <CircularProgress size="sm" />
                                        <Typography level="body-sm">Loading...</Typography>
                                    </Box>
                                </td>
                            </tr>
                        ) : isError ? (
                            <tr>
                                <td colSpan={HEADERS.length} style={{ padding: 14 }}>
                                    <Typography color="danger">{error?.data?.message || "Failed to load uploads"}</Typography>
                                </td>
                            </tr>
                        ) : groupMode ? (
                            groupsToRender.length ? (
                                groupsToRender.map((g) => {
                                    const isOpen = !!expandedGroups[g.groupId];

                                    return (
                                        <React.Fragment key={g.groupId}>
                                            {/* GROUP HEADER */}
                                            <tr
                                                onClick={() =>
                                                    setExpandedGroups((prev) => ({
                                                        ...prev,
                                                        [g.groupId]: !prev[g.groupId],
                                                    }))
                                                }
                                                style={{ cursor: "pointer", background: "#f7f7f7" }}
                                            >
                                                <td style={{ borderBottom: "1px solid #e5e5e5", padding: "8px 10px" }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <IconButton size="sm" variant="plain" sx={{ "--IconButton-size": "26px" }}>
                                                            <KeyboardArrowRightIcon
                                                                sx={{
                                                                    fontSize: 18,
                                                                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                                                                    transition: "transform 120ms ease",
                                                                }}
                                                            />
                                                        </IconButton>

                                                        <Tooltip
                                                            title={g.title}
                                                            placement="top"
                                                            variant="soft"
                                                            disableHoverListener={String(g.title || "").length <= 22}
                                                        >
                                                            <Typography
                                                                level="body-sm"
                                                                fontWeight="lg"
                                                                sx={{
                                                                    maxWidth: 420,
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                            >
                                                                {String(g.title || "-")} <span style={{ color: "#666" }}>({g.count})</span>
                                                            </Typography>
                                                        </Tooltip>
                                                    </Box>
                                                </td>

                                                <td style={{ borderBottom: "1px solid #e5e5e5", padding: "8px 10px" }}>
                                                    <Chip variant="outlined" color="primary" size="sm">
                                                        {groupMode === "project" ? g.pill : ""}
                                                    </Chip>
                                                </td>

                                                <td style={{ borderBottom: "1px solid #e5e5e5" }} />
                                                <td style={{ borderBottom: "1px solid #e5e5e5" }} />
                                                <td style={{ borderBottom: "1px solid #e5e5e5" }} />
                                                <td style={{ borderBottom: "1px solid #e5e5e5" }} />
                                                <td style={{ borderBottom: "1px solid #e5e5e5" }} />
                                            </tr>

                                            {/* CHILD ROWS */}
                                            {isOpen &&
                                                g.childRows.map((r) => (
                                                    <tr key={r.key} style={{ background: "#fff" }}>
                                                        <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                                            <Typography level="body-sm">{r.projectName}</Typography>
                                                        </td>

                                                        <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                                            <Chip size="sm" variant="outlined" color="primary">
                                                                {r.projectCode}
                                                            </Chip>
                                                        </td>

                                                        <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                                            <Typography level="body-sm">{r.templateName}</Typography>
                                                        </td>

                                                        <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                                            <Chip size="sm" variant="soft" color={r.attachmentCount ? "success" : "neutral"}>
                                                                {r.attachmentCount}
                                                            </Chip>
                                                        </td>

                                                        <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                                            <Typography level="body-sm">{fmtDT(r.uploadedAt)}</Typography>
                                                        </td>

                                                        {/* ✅ Uploaded By with tooltip */}
                                                        <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                                            {renderNameWithTooltip(r.uploadedBy, 16)}
                                                        </td>

                                                        <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                                            <IconButton
                                                                size="sm"
                                                                variant="outlined"
                                                                color="neutral"
                                                                onClick={() => handleView(r)}
                                                                sx={{ borderRadius: "md" }}
                                                            >
                                                                <VisibilityRoundedIcon />
                                                            </IconButton>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={HEADERS.length} style={{ padding: 14 }}>
                                        <Typography level="body-sm" sx={{ color: "neutral.600" }}>
                                            No uploads found.
                                        </Typography>
                                    </td>
                                </tr>
                            )
                        ) : flatRows.length ? (
                            flatRows.map((r) => (
                                <tr key={r.key} style={{ background: "#fff" }}>
                                    <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                        <Typography level="body-sm">{r.projectName}</Typography>
                                    </td>

                                    <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                        <Chip size="sm" variant="outlined" color="primary">
                                            {r.projectCode}
                                        </Chip>
                                    </td>

                                    <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                        <Typography level="body-sm">{r.templateName}</Typography>
                                    </td>

                                    <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                        <Chip size="sm" variant="soft" color={r.attachmentCount ? "success" : "neutral"}>
                                            {r.attachmentCount}
                                        </Chip>
                                    </td>

                                    <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                        <Typography level="body-sm">{fmtDT(r.uploadedAt)}</Typography>
                                    </td>

                                    {/* ✅ Uploaded By with tooltip */}
                                    <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                        {renderNameWithTooltip(r.uploadedBy, 16)}
                                    </td>

                                    <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                                        <IconButton
                                            size="sm"
                                            variant="outlined"
                                            color="neutral"
                                            onClick={() => handleView(r)}
                                            sx={{ borderRadius: "md" }}
                                        >
                                            <VisibilityRoundedIcon />
                                        </IconButton>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={HEADERS.length} style={{ padding: 14 }}>
                                    <Typography level="body-sm" sx={{ color: "neutral.600" }}>
                                        No uploads found.
                                    </Typography>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Box>
            </Sheet>

            {/* Pagination */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1 }}>
                <Button size="sm" variant="outlined" disabled={page <= 1 || isFetching} onClick={() => handlePageChange(page - 1)}>
                    Prev
                </Button>

                <Typography level="body-sm" sx={{ color: "neutral.700" }}>
                    Page {page} / {Number(data?.totalPage || 1)}
                </Typography>

                <Button
                    size="sm"
                    variant="outlined"
                    disabled={page >= Number(data?.totalPage || 1) || isFetching}
                    onClick={() => handlePageChange(page + 1)}
                >
                    Next
                </Button>
            </Box>

            {/* View Modal */}
            <Modal open={open} onClose={() => setOpen(false)}>
                <ModalDialog sx={{ width: { xs: "95vw", md: 760 } }}>
                    <DialogTitle>Upload Details</DialogTitle>
                    <DialogContent>
                        {selectedRow ? (
                            <Stack spacing={1}>
                                <Typography level="body-sm">
                                    <b>Project:</b> {selectedRow.project?.name || "-"} ({selectedRow.project?.code || "-"})
                                </Typography>

                                <Typography level="body-sm">
                                    <b>Template:</b> {selectedRow.item?.templateDetail?.name || "-"}
                                </Typography>

                                <Typography level="body-sm">
                                    <b>Uploaded At:</b> {fmtDT(selectedRow.uploadedAt)}
                                </Typography>

                                <Box sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
                                    <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                                        Uploaded By:
                                    </Typography>
                                    {/* ✅ Tooltip in modal */}
                                    {renderNameWithTooltip(selectedRow.uploadedBy, 26)}
                                </Box>

                                <Divider />

                                <Typography level="body-sm" fontWeight="lg">
                                    Attachments
                                </Typography>

                                {safeArr(selectedRow.item?.attachment_urls).length ? (
                                    safeArr(selectedRow.item?.attachment_urls).map((arr, idx) => (
                                        <Box key={idx} sx={{ p: 1, border: "1px solid #eee", borderRadius: "sm" }}>
                                            <Typography level="body-xs" sx={{ color: "neutral.600", mb: 0.5 }}>
                                                Entry {idx + 1}
                                            </Typography>

                                            {safeArr(arr).length ? (
                                                safeArr(arr).map((url, uidx) => (
                                                    <Box key={uidx} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                                        <Typography level="body-xs" sx={{ wordBreak: "break-all" }}>
                                                            {url}
                                                        </Typography>
                                                        <IconButton size="sm" variant="plain" onClick={() => window.open(url, "_blank")}>
                                                            <OpenInNewRoundedIcon />
                                                        </IconButton>
                                                    </Box>
                                                ))
                                            ) : (
                                                <Typography level="body-xs">-</Typography>
                                            )}
                                        </Box>
                                    ))
                                ) : (
                                    <Typography level="body-sm">No attachment urls.</Typography>
                                )}

                                <Divider />

                                <Typography level="body-sm" fontWeight="lg">
                                    Status History
                                </Typography>

                                {safeArr(selectedRow.item?.status_history).length ? (
                                    safeArr(selectedRow.item?.status_history).map((h) => (
                                        <Box key={h?._id || `${h?.user_id}-${h?.updatedAt}`} sx={{ p: 1, border: "1px solid #eee", borderRadius: "sm" }}>
                                            <Typography level="body-xs">
                                                <b>Status:</b> {h?.status || "-"} &nbsp; | &nbsp;
                                                <b>User:</b>{" "}
                                                <Tooltip
                                                    title={h?.user?.name || "-"}
                                                    placement="top"
                                                    variant="soft"
                                                    disableHoverListener={String(h?.user?.name || "").length <= 22}
                                                >
                                                    <span style={{ cursor: String(h?.user?.name || "").length > 22 ? "help" : "default" }}>
                                                        {shortText(h?.user?.name || "-", 22)}
                                                    </span>
                                                </Tooltip>{" "}
                                                &nbsp; | &nbsp;
                                                <b>Time:</b> {fmtDT(h?.updatedAt)}
                                            </Typography>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography level="body-sm">No history.</Typography>
                                )}
                            </Stack>
                        ) : (
                            <Typography level="body-sm">No data</Typography>
                        )}
                    </DialogContent>

                    <DialogActions>
                        <Button variant="outlined" color="neutral" onClick={() => setOpen(false)}>
                            Close
                        </Button>
                    </DialogActions>
                </ModalDialog>
            </Modal>
        </Box>
    );
};

export default Uploads;
