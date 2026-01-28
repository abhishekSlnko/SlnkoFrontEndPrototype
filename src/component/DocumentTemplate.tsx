// DocumentTemplate.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  Typography,
  Input,
  IconButton,
  Sheet,
  Button,
  Select,
  Option,
  iconButtonClasses,
  Chip,
  Tooltip,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Table,
  Modal,
  ModalDialog,
  DialogTitle,
  Textarea,
  FormControl,
  FormLabel,
  Divider,
} from "@mui/joy";
import EditRounded from "@mui/icons-material/EditRounded";
import InsertDriveFileRounded from "@mui/icons-material/InsertDriveFileRounded";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SearchIcon from "@mui/icons-material/Search";
import PreviewIcon from "@mui/icons-material/Preview";
import CloseRounded from "@mui/icons-material/CloseRounded";
import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import {
  useGetDocumentTemplatesQuery,
  useGetDocumentsByProjectIdQuery,
  useUpdateDocumentItemFileMutation,
  useUpdateDocumentStatusMutation,
} from "../redux/documentSlice";
import DocumentTemplateForm from "./Forms/Add_Document_Template";
import Documents from "./Documents"; // ✅ NEW MODAL
import { EditNoteRounded, EditRoadRounded } from "@mui/icons-material";

const safeText = (v) => String(v ?? "").trim();
const toNum = (v) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const cap = (s = "") =>
  String(s)
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const statusColor = (s = "") => {
  const v = String(s).trim().toLowerCase();
  if (v === "draft") return "neutral";
  if (v === "uploaded") return "primary";
  if (v === "approval pending") return "warning";
  if (v === "approved") return "success";
  if (v === "rejected") return "danger";
  return "neutral";
};

const isImageUrl = (url = "") => {
  const u = String(url || "").toLowerCase();
  return (
    u.endsWith(".png") ||
    u.endsWith(".jpg") ||
    u.endsWith(".jpeg") ||
    u.endsWith(".webp") ||
    u.endsWith(".gif") ||
    u.includes("image/")
  );
};

const triggerDownload = (url, filename = "download") => {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const DocumentTemplate = ({ projectId, onOpenAddDoc }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ create/edit modal
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState(null);

  // ✅ documents modal (opens on folder click)
  const [openDocsModal, setOpenDocsModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // ✅ single document preview (opens from list tab) - NEW APPROACH
  const [openSinglePreview, setOpenSinglePreview] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);

  // ✅ Upload modal state
  const [openUpload, setOpenUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadRemarks, setUploadRemarks] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const uploadFileRef = useRef(null);

  // ✅ Status modal state
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState(""); // "approved" | "rejected"
  const [statusRemarks, setStatusRemarks] = useState("");

  const initialPage = Math.max(1, Number(searchParams.get("page") || 1));
  const initialPageSize = Math.max(
    1,
    Number(searchParams.get("pageSize") || 8)
  );
  const initialSearch = searchParams.get("search") || "";

  const location = useLocation();

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize);
  const [search, setSearch] = useState(initialSearch);
  const [isFromLoan, setIsFromLoan] = useState(false);

  const project_id = searchParams.get("project_id");
  const options = [8, 12, 16, 24, 32];

  // ✅ Query for templates (folder view)
  const { data, isFetching } = useGetDocumentTemplatesQuery({
    page: currentPage,
    limit: rowsPerPage,
    search,
    project_id,
  });

  // ✅ Query for documents by project (list view in loan)
 const {
  data: projectDocsData,
  isFetching: isProjectDocsFetching,
  refetch: refetchProjectDocs,
} = useGetDocumentsByProjectIdQuery(
  isFromLoan && project_id
    ? { projectId: project_id, page: currentPage, pageSize: rowsPerPage }
    : null
);

  // ✅ Mutations for upload and status
  const [updateFile, { isLoading: uploading }] =
    useUpdateDocumentItemFileMutation();
  const [updateStatus, { isLoading: updatingStatus }] =
    useUpdateDocumentStatusMutation();

  const templates = useMemo(() => data?.data || [], [data]);
  const totalPages = Number(data?.totalPages || 1);
  const total = Number(data?.total || 0);

  // ✅ Project documents for list view
  const projectDocuments = useMemo(() => {
    if (!projectDocsData?.success || !projectDocsData?.data) return [];
    return projectDocsData.data;
  }, [projectDocsData]);

  const hasPrev =
    data?.pagination?.hasPrevPage ?? (currentPage > 1 ? true : false);
  const hasNext =
    data?.pagination?.hasNextPage ?? (currentPage < totalPages ? true : false);

  const syncParams = ({ page, pageSize, searchText }) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("search", searchText || "");
      return params;
    });
  };

  const handlePageChange = (nextPage) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages || 1);
    setCurrentPage(clamped);
    syncParams({ page: clamped, pageSize: rowsPerPage, searchText: search });
  };

  useEffect(() => {
    syncParams({
      page: currentPage,
      pageSize: rowsPerPage,
      searchText: search,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const fullPath = location.pathname;
    console.log("Full Path :", fullPath);
    if (fullPath.includes("view_loan")) {
      setIsFromLoan(true);
    } else {
      setIsFromLoan(false);
    }
  }, [searchParams]);

  const getPaginationRange = () => {
    const totalPageNumbersToShow = 7;

    if (totalPages <= totalPageNumbersToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - 1, 1);
    const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

    const showLeftDots = leftSiblingIndex > 2;
    const showRightDots = rightSiblingIndex < totalPages - 1;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!showLeftDots && showRightDots) {
      return [1, 2, 3, 4, 5, "...", lastPageIndex];
    }

    if (showLeftDots && !showRightDots) {
      return [
        firstPageIndex,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    if (showLeftDots && showRightDots) {
      return [
        firstPageIndex,
        "...",
        leftSiblingIndex,
        currentPage,
        rightSiblingIndex,
        "...",
        lastPageIndex,
      ];
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  };

  const openCreate = () => {
    setEditId(null);
    setOpenForm(true);
  };

  const openEdit = (t) => {
    setEditId(t?._id);
    setOpenForm(true);
  };

  // ✅ Folder click => open docs modal (full folder view)
  const openFolder = (t) => {
    setSelectedFolder(t);
    setOpenDocsModal(true);
  };

  // ✅ Single document preview (from list tab in loan view)
  const openDocPreview = (doc) => {
    setSelectedDocForPreview(doc);
    setOpenSinglePreview(true);
  };

  // ✅ Upload handlers
  const onPickUploadFile = () => uploadFileRef.current?.click();

  const onUploadFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadFile(f);
  };

  const onDropFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) setUploadFile(f);
  };

  const handleUpload = async () => {
    if (!project_id) return toast.error("project_id missing");
    if (!selectedDocForPreview?.documentList_id)
      return toast.error("documentList_id missing");
    if (!uploadFile) return toast.error("Please select a file");

    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("data", JSON.stringify({ remarks: safeText(uploadRemarks) }));

      await updateFile({
        formData: fd,
        project_id,
        documentListId: selectedDocForPreview.documentList_id,
      }).unwrap();

      toast.success("File uploaded");
      refetchProjectDocs?.();
      setOpenUpload(false);
      setOpenSinglePreview(false);
    } catch (err) {
      console.log("updateFile err:", err);
      toast.error(err?.data?.message || "Upload failed");
    }
  };

  // ✅ Status handlers
  const openStatusAction = (action) => {
    setStatusAction(action); // "approved" | "rejected"
    setOpenStatusModal(true);
  };

  const submitStatus = async () => {
    if (!project_id) return toast.error("project_id missing");
    if (!selectedDocForPreview?.documentList_id)
      return toast.error("documentList_id missing");
    if (!statusAction) return toast.error("status missing");

    try {
      await updateStatus({
        project_id,
        documentListId: selectedDocForPreview.documentList_id,
        status: statusAction,
        remarks: safeText(statusRemarks),
      }).unwrap();

      toast.success("Status updated");
      refetchProjectDocs?.();
      setOpenStatusModal(false);
      setOpenSinglePreview(false);
    } catch (err) {
      console.log("updateStatus err:", err);
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  // Reset upload modal
  useEffect(() => {
    if (!openUpload) {
      setUploadFile(null);
      setUploadRemarks("");
      setIsDragging(false);
      if (uploadFileRef.current) uploadFileRef.current.value = "";
    }
  }, [openUpload]);

  // Reset status modal
  useEffect(() => {
    if (!openStatusModal) {
      setStatusRemarks("");
    }
  }, [openStatusModal]);

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          p: { xs: 1, md: 2 },
          borderRadius: "lg",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            gap: 1,
            alignItems: "center",
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          {isFromLoan ? (
            <Box sx={{ display: "flex" }}>
              <Tabs defaultValue="list" aria-label="Document Tabs">
                <TabList>
                  <Tab value="list">List</Tab>
                  <Tab value="folder">Folder</Tab>
                </TabList>
                <TabPanel value="list" sx={{ p: 0, pt: 1, width: "100%" }}>
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    }}
                  >
                    <Typography level="h5">Document List</Typography>

                    {/* Table Container */}
                    <Sheet
                      sx={{
                        borderRadius: "lg",
                        overflow: "auto",
                        boxShadow: "sm",
                      }}
                    >
                      <Table
                        stripe="even"
                        hoverRow
                        sx={{
                          "--TableCell-headBackground":
                            "var(--joy-palette-background-level1)",
                          "--Table-headerUnderlineThickness": "1px",
                          "& thead th:nth-child(n)": {
                            textAlign: "left",
                            fontSize: "sm",
                            fontWeight: "600",
                          },
                          "& tbody tr": {
                            cursor: "pointer",
                            transition: "0.15s ease",
                            "&:hover": {
                              backgroundColor:
                                "var(--joy-palette-background-level1)",
                            },
                          },
                          "& tbody td": {
                            verticalAlign: "middle",
                            padding: "12px 16px",
                          },
                        }}
                      >
                        <thead>
                          <tr>
                            <th style={{ width: "40%" }}>Name</th>
                            <th style={{ width: "30%" }}>Template</th>
                            <th style={{ width: "20%" }}>Preview</th>
                            <th style={{ width: "10%", textAlign: "center" }}>
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectDocuments.map((doc) => {
                            const docName =
                              safeText(doc?.filename) || "Document";
                            const templateName =
                              safeText(doc?.filetype) || "N/A";
                            const fileUrl = safeText(doc?.fileurl);

                            return (
                              <tr
                                key={doc?.documentList_id}
                                onClick={() => openDocPreview(doc)}
                                style={{ cursor: "pointer" }}
                              >
                                <td>
                                  <Typography
                                    level="body-sm"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {docName}
                                  </Typography>
                                </td>
                                <td>
                                  <Typography level="body-sm">
                                    {templateName}
                                  </Typography>
                                </td>
                                <td>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: 40,
                                      height: 40,
                                      borderRadius: "md",
                                      bgcolor: "neutral.softBg",
                                      border: "1px solid",
                                      borderColor: "divider",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {fileUrl && isImageUrl(fileUrl) ? (
                                      <Box
                                        component="img"
                                        src={fileUrl}
                                        alt={docName}
                                        loading="lazy"
                                        onError={(e) => {
                                          e.currentTarget.style.display =
                                            "none";
                                        }}
                                        sx={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      <InsertDriveFileRounded
                                        sx={{
                                          fontSize: "sm",
                                          color: "text.tertiary",
                                        }}
                                      />
                                    )}
                                  </Box>
                                </td>
                                <td sx={{ textAlign: "center" }}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      gap: 0.5,
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Tooltip
                                      title="View Details"
                                      placement="top"
                                      variant="solid"
                                    >
                                      <IconButton
                                        size="sm"
                                        variant="soft"
                                        color="primary"
                                        sx={{ borderRadius: "md" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDocPreview(doc);
                                        }}
                                      >
                                        <EditNoteRounded fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </Sheet>

                    {!isProjectDocsFetching &&
                      projectDocuments.length === 0 && (
                        <Sheet
                          variant="soft"
                          sx={{
                            p: 3,
                            borderRadius: "lg",
                            textAlign: "center",
                            color: "text.tertiary",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Typography level="body-sm">
                              No documents found.
                            </Typography>
                            {onOpenAddDoc && (
                              <Button
                                size="sm"
                                variant="solid"
                                onClick={onOpenAddDoc}
                                sx={{
                                  backgroundColor: "#3366a3",
                                  color: "#fff",
                                  "&:hover": { backgroundColor: "#285680" },
                                }}
                              >
                                Add Document
                              </Button>
                            )}
                          </Box>
                        </Sheet>
                      )}
                  </Box>
                </TabPanel>
                <TabPanel value="folder" sx={{ p: 0, pt: 1 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.25,
                      gridTemplateColumns: {
                        xs: "repeat(1, 1fr)",
                        sm: "repeat(2, 1fr)",
                        md: "repeat(4, 1fr)",
                      },
                    }}
                  >
                    {templates.map((t) => {
                      const title = safeText(t?.name) || "Folder";
                      const subtitle =
                        safeText(t?.description) || `${title} folder`;
                      const img = safeText(t?.icon_image);

                      // ✅ counts
                      const stats = t?.docStatusByTemplate || {};
                      const rejected = toNum(stats.rejected);
                      const pending = toNum(stats.approval_pending);
                      const approved = toNum(stats.approved);

                      return (
                        <Card
                          key={t?._id}
                          variant="outlined"
                          onClick={() => openFolder(t)} // ✅ open docs modal
                          sx={{
                            p: 0,
                            borderRadius: "lg",
                            overflow: "hidden",
                            cursor: "pointer",
                            minHeight: 170,
                            transition: "0.15s ease",
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: "md",
                            },
                          }}
                        >
                          {/* top row */}
                          <Box
                            sx={{
                              px: 1,
                              py: 0.75,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 1,
                            }}
                          >
                            <Typography
                              level="body-sm"
                              sx={{ fontWeight: 700 }}
                              noWrap
                            >
                              {title}
                            </Typography>

                            <IconButton
                              size="sm"
                              variant="soft"
                              sx={{ borderRadius: "xl" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(t);
                              }}
                            >
                              <EditRounded fontSize="small" />
                            </IconButton>
                          </Box>

                          {/* image area */}
                          <Box
                            sx={{
                              height: 92,
                              bgcolor: "neutral.softBg",
                              position: "relative",
                              borderTop: "1px solid",
                              borderBottom: "1px solid",
                              borderColor: "divider",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {img ? (
                              <Box
                                component="img"
                                src={img}
                                alt={title}
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <InsertDriveFileRounded />
                            )}
                          </Box>

                          {/* bottom area */}
                          <Box
                            sx={{
                              p: 1.25,
                              textAlign: "center",
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.75,
                            }}
                          >
                            {/* ✅ status chips row */}
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                gap: 0.75,
                                flexWrap: "wrap",
                              }}
                            >
                              <Tooltip
                                title="Rejected documents count"
                                placement="top"
                                variant="solid"
                              >
                                <Chip
                                  size="sm"
                                  variant="soft"
                                  color="danger"
                                  sx={{
                                    minWidth: 34,
                                    justifyContent: "center",
                                    fontWeight: 700,
                                  }}
                                >
                                  {rejected}
                                </Chip>
                              </Tooltip>

                              <Tooltip
                                title="Approval pending documents count"
                                placement="top"
                                variant="solid"
                              >
                                <Chip
                                  size="sm"
                                  variant="soft"
                                  color="warning"
                                  sx={{
                                    minWidth: 34,
                                    justifyContent: "center",
                                    fontWeight: 700,
                                  }}
                                >
                                  {pending}
                                </Chip>
                              </Tooltip>

                              <Tooltip
                                title="Approved documents count"
                                placement="top"
                                variant="solid"
                              >
                                <Chip
                                  size="sm"
                                  variant="soft"
                                  color="success"
                                  sx={{
                                    minWidth: 34,
                                    justifyContent: "center",
                                    fontWeight: 700,
                                  }}
                                >
                                  {approved}
                                </Chip>
                              </Tooltip>
                            </Box>

                            <Typography
                              level="body-xs"
                              sx={{ color: "text.tertiary" }}
                              noWrap
                            >
                              {subtitle}
                            </Typography>
                          </Box>
                        </Card>
                      );
                    })}

                    {!isFetching && templates.length === 0 && (
                      <Sheet
                        variant="soft"
                        sx={{
                          gridColumn: "1 / -1",
                          p: 2,
                          borderRadius: "lg",
                          textAlign: "center",
                          color: "text.tertiary",
                        }}
                      >
                        No templates found.
                      </Sheet>
                    )}
                  </Box>
                </TabPanel>
              </Tabs>
            </Box>
          ) : (
            <>
              <Typography level="h5">Documents Folder</Typography>
              <Box display={"flex"} gap={1}>
                <Input
                  size="sm"
                  placeholder="Search folder..."
                  value={search}
                  startDecorator={<SearchIcon />}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearch(v);
                    setCurrentPage(1);
                    syncParams({
                      page: 1,
                      pageSize: rowsPerPage,
                      searchText: v,
                    });
                  }}
                  sx={{
                    width: { xs: "100%", sm: 320, md: 380 },
                  }}
                />
                <Button
                  size="sm"
                  variant="solid"
                  onClick={openCreate}
                  sx={{
                    backgroundColor: "#3366a3",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#285680" },
                    minHeight: 36,
                    px: 2,
                  }}
                >
                  New
                </Button>
              </Box>
            </>
          )}
        </Box>
        {!isFromLoan && (
          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: {
                xs: "repeat(1, 1fr)",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
            }}
          >
            {templates.map((t) => {
              const title = safeText(t?.name) || "Folder";
              const subtitle = safeText(t?.description) || `${title} folder`;
              const img = safeText(t?.icon_image);

              // ✅ counts
              const stats = t?.docStatusByTemplate || {};
              const rejected = toNum(stats.rejected);
              const pending = toNum(stats.approval_pending);
              const approved = toNum(stats.approved);

              return (
                <Card
                  key={t?._id}
                  variant="outlined"
                  onClick={() => openFolder(t)} // ✅ open docs modal
                  sx={{
                    p: 0,
                    borderRadius: "lg",
                    overflow: "hidden",
                    cursor: "pointer",
                    minHeight: 170,
                    transition: "0.15s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "md",
                    },
                  }}
                >
                  {/* top row */}
                  <Box
                    sx={{
                      px: 1,
                      py: 0.75,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography level="body-sm" sx={{ fontWeight: 700 }} noWrap>
                      {title}
                    </Typography>

                    <IconButton
                      size="sm"
                      variant="soft"
                      sx={{ borderRadius: "xl" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(t);
                      }}
                    >
                      <EditRounded fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* image area */}
                  <Box
                    sx={{
                      height: 92,
                      bgcolor: "neutral.softBg",
                      position: "relative",
                      borderTop: "1px solid",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {img ? (
                      <Box
                        component="img"
                        src={img}
                        alt={title}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <InsertDriveFileRounded />
                    )}
                  </Box>

                  {/* bottom area */}
                  <Box
                    sx={{
                      p: 1.25,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.75,
                    }}
                  >
                    {/* ✅ status chips row */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 0.75,
                        flexWrap: "wrap",
                      }}
                    >
                      <Tooltip
                        title="Rejected documents count"
                        placement="top"
                        variant="solid"
                      >
                        <Chip
                          size="sm"
                          variant="soft"
                          color="danger"
                          sx={{
                            minWidth: 34,
                            justifyContent: "center",
                            fontWeight: 700,
                          }}
                        >
                          {rejected}
                        </Chip>
                      </Tooltip>

                      <Tooltip
                        title="Approval pending documents count"
                        placement="top"
                        variant="solid"
                      >
                        <Chip
                          size="sm"
                          variant="soft"
                          color="warning"
                          sx={{
                            minWidth: 34,
                            justifyContent: "center",
                            fontWeight: 700,
                          }}
                        >
                          {pending}
                        </Chip>
                      </Tooltip>

                      <Tooltip
                        title="Approved documents count"
                        placement="top"
                        variant="solid"
                      >
                        <Chip
                          size="sm"
                          variant="soft"
                          color="success"
                          sx={{
                            minWidth: 34,
                            justifyContent: "center",
                            fontWeight: 700,
                          }}
                        >
                          {approved}
                        </Chip>
                      </Tooltip>
                    </Box>

                    <Typography
                      level="body-xs"
                      sx={{ color: "text.tertiary" }}
                      noWrap
                    >
                      {subtitle}
                    </Typography>
                  </Box>
                </Card>
              );
            })}

            {!isFetching && templates.length === 0 && (
              <Sheet
                variant="soft"
                sx={{
                  gridColumn: "1 / -1",
                  p: 2,
                  borderRadius: "lg",
                  textAlign: "center",
                  color: "text.tertiary",
                }}
              >
                No templates found.
              </Sheet>
            )}
          </Box>
        )}

        {/* Pagination */}
        <Box
          className="Pagination-laptopUp"
          sx={{
            pt: 0.5,
            gap: 1,
            [`& .${iconButtonClasses.root}`]: { borderRadius: "50%" },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
          }}
        >
          <Button
            size="sm"
            variant="outlined"
            color="neutral"
            startDecorator={<KeyboardArrowLeftIcon />}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!hasPrev || isFetching}
          >
            Previous
          </Button>

          <Box>
            {isFromLoan ? (
              <>
                Showing {projectDocuments.length}
                {Number.isFinite(projectDocsData?.total) && projectDocsData?.total > 0
                  ? ` of ${projectDocsData.total}`
                  : ""} results
              </>
            ) : (
              <>
                Showing {templates.length}
                {Number.isFinite(total) && total > 0 ? ` of ${total}` : ""} results
              </>
            )}
          </Box>
          <Box
            sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 1 }}
          >
            {getPaginationRange().map((pg, idx) =>
              pg === "..." ? (
                <Box key={`ellipsis-${idx}`} sx={{ px: 1 }}>
                  ...
                </Box>
              ) : (
                <IconButton
                  key={pg}
                  size="sm"
                  variant={pg === currentPage ? "contained" : "outlined"}
                  color="neutral"
                  onClick={() => handlePageChange(pg)}
                  disabled={isFetching}
                >
                  {pg}
                </IconButton>
              )
            )}
          </Box>

          <Box
            display="flex"
            alignItems="center"
            gap={1}
            sx={{ p: "8px 16px" }}
          >
            <Select
              value={rowsPerPage}
              onChange={(e, newValue) => {
                if (newValue !== null) {
                  setRowsPerPage(newValue);
                  setCurrentPage(1);
                  syncParams({
                    page: 1,
                    pageSize: newValue,
                    searchText: search,
                  });
                }
              }}
              size="sm"
              variant="outlined"
              sx={{ minWidth: 80, borderRadius: "md", boxShadow: "sm" }}
            >
              {options.map((value) => (
                <Option key={value} value={value}>
                  {value}
                </Option>
              ))}
            </Select>
          </Box>

          <Button
            size="sm"
            variant="outlined"
            color="neutral"
            endDecorator={<KeyboardArrowRightIcon />}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasNext || isFetching}
          >
            Next
          </Button>
        </Box>
      </Card>

      {/* ✅ Create/Edit Template Form */}
      <DocumentTemplateForm
        open={openForm}
        templateId={editId}
        onClose={() => setOpenForm(false)}
        onSuccess={() => {
          setOpenForm(false);
        }}
      />

      {/* ✅ Open documents for selected template */}
      <Documents
        open={openDocsModal}
        onClose={() => {
          setOpenDocsModal(false);
          setSelectedFolder(null);
        }}
        project_id={projectId}
        template={selectedFolder}
        isFromLoan={isFromLoan}
      />

      {/* ✅ Single Document Preview Modal (for List tab in Loan view) */}
      <Modal
        open={openSinglePreview}
        onClose={() => setOpenSinglePreview(false)}
      >
        <ModalDialog
          variant="outlined"
          sx={{ width: "96vw", maxWidth: 600, p: 0 }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.25,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography level="title-md">
              {safeText(selectedDocForPreview?.filename) || "Document Preview"}
            </Typography>

            <IconButton
              size="sm"
              variant="plain"
              onClick={() => setOpenSinglePreview(false)}
            >
              <CloseRounded />
            </IconButton>
          </DialogTitle>

          <Box sx={{ p: { xs: 1.5, md: 2 } }}>
            <Card variant="outlined" sx={{ p: 1.5, borderRadius: "lg" }}>
              {/* Document Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 40,
                    width: 40,
                    height: 40,
                    borderRadius: "md",
                    bgcolor: "neutral.softBg",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <InsertDriveFileRounded sx={{ fontSize: "sm" }} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography level="title-sm" noWrap>
                    {safeText(selectedDocForPreview?.filename) || "Document"}
                  </Typography>
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Template:{" "}
                    {safeText(selectedDocForPreview?.filetype) || "N/A"}
                  </Typography>
                </Box>
              </Box>

              {/* Preview Area */}
              <Sheet
                variant="soft"
                onClick={() => {
                  const url = safeText(selectedDocForPreview?.fileurl);
                  if (url)
                    triggerDownload(
                      url,
                      safeText(selectedDocForPreview?.filename) || "document"
                    );
                }}
                sx={{
                  borderRadius: "lg",
                  height: 200,
                  cursor: selectedDocForPreview?.fileurl
                    ? "pointer"
                    : "default",
                  overflow: "hidden",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid",
                  borderColor: "divider",
                  mb: 1.5,
                  ...(selectedDocForPreview?.fileurl &&
                  isImageUrl(selectedDocForPreview?.fileurl)
                    ? {
                        backgroundImage: `url(${selectedDocForPreview?.fileurl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : {
                        background:
                          "linear-gradient(135deg, rgba(51,102,163,0.08), rgba(0,0,0,0.04))",
                      }),
                }}
              >
                {!selectedDocForPreview?.fileurl ||
                !isImageUrl(selectedDocForPreview?.fileurl) ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                      color: "text.tertiary",
                      textAlign: "center",
                    }}
                  >
                    <InsertDriveFileRounded sx={{ fontSize: 32 }} />
                    <Typography level="body-xs" sx={{ fontWeight: 600 }}>
                      {selectedDocForPreview?.fileurl
                        ? "File attached (click to download)"
                        : "No file uploaded"}
                    </Typography>
                  </Box>
                ) : null}
                {selectedDocForPreview?.fileurl && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.00), rgba(0,0,0,0.08))",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </Sheet>

              {/* Action Buttons */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  size="sm"
                  variant="outlined"
                  startDecorator={<CloudUploadRounded />}
                  onClick={() => setOpenUpload(true)}
                  sx={{
                    borderColor: "#3366a3",
                    color: "#3366a3",
                    "&:hover": {
                      borderColor: "#285680",
                      backgroundColor: "rgba(51,102,163,0.08)",
                    },
                  }}
                >
                  {selectedDocForPreview?.fileurl ? "Replace" : "Upload"}
                </Button>

                <Button
                  size="sm"
                  variant="outlined"
                  startDecorator={<CheckRounded />}
                  onClick={() => openStatusAction("approved")}
                  sx={{
                    borderColor: "success.outlinedBorder",
                    color: "success.solidBg",
                  }}
                >
                  Approve
                </Button>

                <Button
                  size="sm"
                  variant="outlined"
                  startDecorator={<CloseRoundedIcon />}
                  onClick={() => openStatusAction("rejected")}
                  sx={{
                    borderColor: "danger.outlinedBorder",
                    color: "danger.solidBg",
                  }}
                >
                  Reject
                </Button>
              </Box>
            </Card>
          </Box>
        </ModalDialog>
      </Modal>

      {/* ✅ Upload File Modal */}
      <Modal open={openUpload} onClose={() => setOpenUpload(false)}>
        <ModalDialog
          variant="outlined"
          sx={{ width: "96vw", maxWidth: 720, p: 0, borderRadius: "lg" }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.25,
              borderBottom: "1px solid",
              borderColor: "divider",
              gap: 2,
            }}
          >
            <Typography level="title-md" noWrap>
              Upload File: {selectedDocForPreview?.filename || "Document"}
            </Typography>

            <IconButton
              size="sm"
              variant="plain"
              onClick={() => setOpenUpload(false)}
            >
              <CloseRounded />
            </IconButton>
          </DialogTitle>

          <Box
            sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}
          >
            <Sheet
              variant="outlined"
              onClick={onPickUploadFile}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={onDropFile}
              sx={{
                p: 2,
                borderRadius: "lg",
                cursor: uploading ? "not-allowed" : "pointer",
                borderStyle: "dashed",
                borderWidth: 2,
                borderColor: isDragging ? "#3366a3" : "divider",
                bgcolor: isDragging
                  ? "rgba(51,102,163,0.06)"
                  : "background.body",
                transition: "0.12s ease",
                minHeight: 92,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                userSelect: "none",
                opacity: uploading ? 0.7 : 1,
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                  Drag & drop a file here, or click to browse
                </Typography>
                <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                  {uploadFile ? uploadFile.name : "No file selected"}
                </Typography>
              </Box>

              <input
                ref={uploadFileRef}
                type="file"
                hidden
                onChange={onUploadFileChange}
                disabled={uploading}
              />
            </Sheet>

            <FormControl>
              <FormLabel>Remarks (optional)</FormLabel>
              <Textarea
                minRows={2}
                value={uploadRemarks}
                onChange={(e) => setUploadRemarks(e.target.value)}
                disabled={uploading}
              />
            </FormControl>

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setOpenUpload(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} loading={uploading}>
                Upload
              </Button>
            </Box>
          </Box>
        </ModalDialog>
      </Modal>

      {/* ✅ Status Modal (Approve/Reject) */}
      <Modal open={openStatusModal} onClose={() => setOpenStatusModal(false)}>
        <ModalDialog
          variant="outlined"
          sx={{ width: "96vw", maxWidth: 620, p: 0, borderRadius: "lg" }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.25,
              borderBottom: "1px solid",
              borderColor: "divider",
              gap: 2,
            }}
          >
            <Typography level="title-md" noWrap>
              {cap(statusAction)}:{" "}
              {selectedDocForPreview?.filename || "Document"}
            </Typography>

            <IconButton
              size="sm"
              variant="plain"
              onClick={() => setOpenStatusModal(false)}
            >
              <CloseRounded />
            </IconButton>
          </DialogTitle>

          <Box
            sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}
          >
            <FormControl>
              <FormLabel>Remarks (optional)</FormLabel>
              <Textarea
                minRows={3}
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                disabled={updatingStatus}
              />
            </FormControl>

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setOpenStatusModal(false)}
                disabled={updatingStatus}
              >
                Cancel
              </Button>
              <Button
                onClick={submitStatus}
                loading={updatingStatus}
                color={statusAction === "rejected" ? "danger" : "success"}
              >
                {cap(statusAction)}
              </Button>
            </Box>
          </Box>
        </ModalDialog>
      </Modal>
    </>
  );
};

export default DocumentTemplate;
