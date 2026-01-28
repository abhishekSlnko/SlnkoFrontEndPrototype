import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Sheet,
  Modal,
  ModalDialog,
  DialogTitle,
  IconButton,
  Input,
  Button,
  Select,
  Option,
  Switch,
  FormControl,
  FormLabel,
  Divider,
  Chip,
  Textarea,
  Tooltip,
} from "@mui/joy";
import CloseRounded from "@mui/icons-material/CloseRounded";
import InsertDriveFileRounded from "@mui/icons-material/InsertDriveFileRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"; // cross icon
import { toast } from "react-toastify";

import {
  useGetProjectDocumentsQuery,
  useCreateProjectDocumentsMutation,
  useUpdateDocumentItemFileMutation,
  useUpdateDocumentStatusMutation, // ✅ make sure exported from documentSlice
} from "../redux/documentSlice";

const safeText = (v) => String(v ?? "").trim();

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

const Documents = ({ open, onClose, project_id, template }) => {
  const templateId = template?._id;

  // ✅ Create modal open state
  const [openCreate, setOpenCreate] = useState(false);

  // ✅ Upload modal open state
  const [openUpload, setOpenUpload] = useState(false);
  const [uploadDocListId, setUploadDocListId] = useState("");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [remarks, setRemarks] = useState("");
  const uploadFileRef = useRef(null);

  // ✅ drag state
  const [isDragging, setIsDragging] = useState(false);

  // ✅ status modal (approve/reject)
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [statusDocListId, setStatusDocListId] = useState("");
  const [statusDocName, setStatusDocName] = useState("");
  const [statusAction, setStatusAction] = useState(""); // "approved" | "rejected"
  const [statusRemarks, setStatusRemarks] = useState("");

  // -------- create form state ----------
  const [global, setGlobal] = useState(false);
  const [name, setName] = useState("");
  const [fileType, setFileType] = useState("");

  const fileTypeOptions = ["pdf", "image", "excel", "word", "zip", "any"];

  // -------- queries ----------
  const { data, isFetching, isError, refetch } = useGetProjectDocumentsQuery(
    { project_id, template_id: templateId },
    { skip: !open || !project_id || !templateId }
  );

  const [createDoc, { isLoading: creating }] =
    useCreateProjectDocumentsMutation();

  const [updateFile, { isLoading: uploading }] =
    useUpdateDocumentItemFileMutation();

  const [updateStatus, { isLoading: updatingStatus }] =
    useUpdateDocumentStatusMutation();

  // reset create modal form
  useEffect(() => {
    if (!openCreate) return;
    setGlobal(false);
    setName("");
    setFileType("");
  }, [openCreate]);

  // reset upload modal form
  useEffect(() => {
    if (!openUpload) return;
    setUploadFile(null);
    setRemarks("");
    setIsDragging(false);
    if (uploadFileRef.current) uploadFileRef.current.value = "";
  }, [openUpload]);

  // reset status modal
  useEffect(() => {
    if (!openStatusModal) return;
    setStatusRemarks("");
  }, [openStatusModal]);

  const docs = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, [data]);

  const items = useMemo(() => {
    if (!docs?.length) return [];
    if (Array.isArray(docs[0]?.items)) return docs[0].items;
    if (docs[0]?.documentList_id) return docs;
    return [];
  }, [docs]);

  const handleCreate = async () => {
    const cleanName = safeText(name);
    const cleanType = safeText(fileType);

    if (!project_id) return toast.error("project_id missing");
    if (!templateId) return toast.error("template_id missing");
    if (!cleanName) return toast.error("Name is required");
    if (!cleanType) return toast.error("File Type is required");

    try {
      await createDoc({
        global,
        name: cleanName,
        fileType: cleanType,
        project_id,
        template_id: templateId,
      }).unwrap();

      toast.success("Document list created");
      refetch?.();
      setOpenCreate(false);
    } catch (err) {
      console.log("createDoc err:", err);
      toast.error(err?.data?.message || "Failed to create");
    }
  };

  const openUploadModal = (it) => {
    const docListId = safeText(it?.documentList_id?._id || it?.documentList_id);
    const listName =
      safeText(it?.documentList?.name) ||
      safeText(it?.documentList_id?.name) ||
      "Document";

    if (!docListId) return toast.error("documentList_id missing");

    setUploadDocListId(docListId);
    setUploadDocName(listName);
    setOpenUpload(true);
  };

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
    if (!uploadDocListId) return toast.error("documentListId missing");
    if (!uploadFile) return toast.error("Please select a file");

    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("data", JSON.stringify({ remarks: safeText(remarks) }));

      await updateFile({
        formData: fd,
        project_id,
        documentListId: uploadDocListId,
      }).unwrap();

      toast.success("File uploaded");
      refetch?.();
      setOpenUpload(false);
    } catch (err) {
      console.log("updateFile err:", err);
      toast.error(err?.data?.message || "Upload failed");
    }
  };

  const openStatusAction = (it, action) => {
    const docListId = safeText(it?.documentList_id?._id || it?.documentList_id);
    const listName =
      safeText(it?.documentList?.name) ||
      safeText(it?.documentList_id?.name) ||
      "Document";

    if (!docListId) return toast.error("documentList_id missing");

    setStatusDocListId(docListId);
    setStatusDocName(listName);
    setStatusAction(action); // "approved" | "rejected"
    setOpenStatusModal(true);
  };

  const submitStatus = async () => {
    if (!project_id) return toast.error("project_id missing");
    if (!statusDocListId) return toast.error("documentListId missing");
    if (!statusAction) return toast.error("status missing");

    try {
      await updateStatus({
        project_id,
        documentListId: statusDocListId,
        status: statusAction,
        remarks: safeText(statusRemarks),
      }).unwrap();

      toast.success("Status updated");
      refetch?.();
      setOpenStatusModal(false);
    } catch (err) {
      console.log("updateStatus err:", err);
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  const getLastRemarks = (it) => {
    const hs = Array.isArray(it?.status_history) ? it.status_history : [];
    if (!hs.length) return "";
    const last = hs[hs.length - 1];
    return safeText(last?.remarks || "");
  };

  return (
    <>
      {/* ✅ Main Documents List Modal */}
      <Modal open={open} onClose={onClose}>
        <ModalDialog
          variant="outlined"
          sx={{ width: "96vw", maxWidth: 1100, p: 0 }}
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
              {safeText(template?.name) || "Folder"}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                size="sm"
                variant="solid"
                startDecorator={<AddRounded />}
                onClick={() => setOpenCreate(true)}
                sx={{
                  backgroundColor: "#3366a3",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#285680" },
                }}
              >
                New
              </Button>

              <IconButton size="sm" variant="plain" onClick={onClose}>
                <CloseRounded />
              </IconButton>
            </Box>
          </DialogTitle>

          <Box sx={{ p: { xs: 1, md: 2 } }}>
            {isFetching && (
              <Sheet variant="soft" sx={{ p: 2, borderRadius: "lg" }}>
                Loading documents...
              </Sheet>
            )}

            {!isFetching && isError && (
              <Sheet
                variant="soft"
                color="danger"
                sx={{ p: 2, borderRadius: "lg" }}
              >
                Failed to load documents.
              </Sheet>
            )}

            {!isFetching && !isError && items.length === 0 && (
              <Sheet variant="soft" sx={{ p: 2, borderRadius: "lg" }}>
                No documents found for this template.
              </Sheet>
            )}

            {!isFetching && items.length > 0 && (
              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: {
                    xs: "repeat(1, 1fr)",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                  },
                }}
              >
                {items.map((it, idx) => {
                  const listName =
                    safeText(it?.documentList?.name) ||
                    safeText(it?.documentList_id?.name) ||
                    "Document";

                  const url = safeText(it?.fileurl);
                  const status = safeText(
                    it?.current_status?.status || "draft"
                  );
                  const bgIsImg = url && isImageUrl(url);
                  const remarksText = getLastRemarks(it);

                  const canDecision =
                    url &&
                    ["uploaded", "approval pending"].includes(
                      String(status).toLowerCase()
                    );
                  const canUpload =
                    url && ["approved"].includes(String(status).toLowerCase());

                  return (
                    <Card
                      key={it?._id || idx}
                      variant="outlined"
                      sx={{ p: 1.25, borderRadius: "lg" }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <InsertDriveFileRounded />

                        <Box
                          sx={{
                            minWidth: 0,
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                          }}
                        >
                          <Typography level="title-sm" noWrap>
                            {listName}
                          </Typography>

                          <Tooltip
                            placement="bottom-end"
                            variant="outlined"
                            title={
                              remarksText ? (
                                <Typography
                                  level="body-sm"
                                  sx={{
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    maxWidth: 320,
                                  }}
                                >
                                  {remarksText}
                                </Typography>
                              ) : (
                                <Typography
                                  level="body-sm"
                                  sx={{ maxWidth: 320 }}
                                >
                                  No remarks
                                </Typography>
                              )
                            }
                          >
                            <Chip
                              size="sm"
                              variant="soft"
                              color={statusColor(status)}
                              sx={{ textTransform: "none", cursor: "help" }}
                            >
                              {cap(status)}
                            </Chip>
                          </Tooltip>
                        </Box>
                      </Box>

                      {/* preview background (click to download) */}
                      <Sheet
                        variant="soft"
                        onClick={() => url && triggerDownload(url, listName)}
                        sx={{
                          mt: 1,
                          borderRadius: "lg",
                          height: 92,
                          cursor: url ? "pointer" : "default",
                          overflow: "hidden",
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid",
                          borderColor: "divider",
                          ...(bgIsImg
                            ? {
                                backgroundImage: `url(${url})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : {
                                background:
                                  "linear-gradient(135deg, rgba(51,102,163,0.08), rgba(0,0,0,0.04))",
                              }),
                        }}
                      >
                        {!bgIsImg && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              color: "text.tertiary",
                            }}
                          >
                            <InsertDriveFileRounded />
                            <Typography
                              level="body-xs"
                              sx={{ fontWeight: 600 }}
                            >
                              {url
                                ? "File attached (click to download)"
                                : "No file uploaded"}
                            </Typography>
                          </Box>
                        )}
                        {url && (
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

                      {/* actions */}
                      <Box
                        sx={{
                          mt: 1,
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 1,
                        }}
                      >
                        {!canUpload && (
                          <IconButton
                            size="sm"
                            variant="outlined"
                            onClick={() => openUploadModal(it)}
                            sx={{
                              borderColor: "#3366a3",
                              color: "#3366a3",
                              "& svg": { color: "#3366a3" },
                              "&:hover": {
                                borderColor: "#285680",
                                backgroundColor: "rgba(51,102,163,0.08)",
                              },
                            }}
                          >
                            <CloudUploadRounded />
                          </IconButton>
                        )}

                        {/* ✅ Approve / Reject (tick & cross) */}
                        {!!canDecision && (
                          <>
                            <Tooltip title="Approve" placement="top">
                              <span>
                                <IconButton
                                  size="sm"
                                  variant="outlined"
                                  onClick={() =>
                                    openStatusAction(it, "approved")
                                  }
                                  sx={{
                                    borderColor: "success.outlinedBorder",
                                    "& svg": { color: "success.solidBg" },
                                  }}
                                >
                                  <CheckRounded />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="Reject" placement="top">
                              <span>
                                <IconButton
                                  size="sm"
                                  variant="outlined"
                                  disabled={!canDecision}
                                  onClick={() =>
                                    openStatusAction(it, "rejected")
                                  }
                                  sx={{
                                    borderColor: "danger.outlinedBorder",
                                    "& svg": { color: "danger.solidBg" },
                                  }}
                                >
                                  <CloseRoundedIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        </ModalDialog>
      </Modal>

      {/* ✅ Create Document List Modal */}
      <Modal open={openCreate} onClose={() => setOpenCreate(false)}>
        <ModalDialog
          variant="outlined"
          sx={{ width: "96vw", maxWidth: 650, p: 0, borderRadius: "lg" }}
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
            <Typography level="title-md">Create Document List</Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography level="body-sm" sx={{ fontWeight: 600 }}>
                Global
              </Typography>
              <Switch
                checked={global}
                onChange={(e) => setGlobal(e.target.checked)}
                disabled={creating}
              />
            </Box>

            <IconButton
              size="sm"
              variant="plain"
              onClick={() => setOpenCreate(false)}
            >
              <CloseRounded />
            </IconButton>
          </DialogTitle>

          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: { xs: "1fr", sm: "1.2fr 1fr" },
                alignItems: "end",
              }}
            >
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  size="sm"
                  placeholder="e.g. Invoice Copy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={creating}
                />
              </FormControl>

              <FormControl>
                <FormLabel>File Type</FormLabel>
                <Select
                  size="sm"
                  value={fileType || null}
                  placeholder="Select"
                  onChange={(e, nv) => setFileType(nv || "")}
                  disabled={creating}
                >
                  {fileTypeOptions.map((t) => (
                    <Option key={t} value={t}>
                      {t}
                    </Option>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setOpenCreate(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={creating}>
                Create
              </Button>
            </Box>
          </Box>
        </ModalDialog>
      </Modal>

      {/* ✅ Upload / Replace File Modal (Drag & Drop) */}
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
              Upload File: {uploadDocName || "Document"}
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
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
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

      {/* ✅ Approve/Reject Status Modal (remarks) */}
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
              {cap(statusAction)}: {statusDocName || "Document"}
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

export default Documents;
