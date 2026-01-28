import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  DialogTitle,
  IconButton,
  Input,
  Modal,
  ModalDialog,
  Sheet,
  Textarea,
  Typography,
} from "@mui/joy";
import CloseRounded from "@mui/icons-material/CloseRounded";
import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { toast } from "react-toastify";

import {
  useCreateDocumentTemplateMutation,
  useGetDocumentTemplateByIdQuery,
  useUpdateDocumentTemplateMutation,
} from "../../redux/documentSlice";

const safeText = (v) => String(v ?? "").trim();

const DocumentTemplateForm = ({ open, onClose, templateId, onSuccess }) => {
  const isEdit = Boolean(templateId);
  const fileRef = useRef(null);

  const { data: byIdData, isFetching: loadingById } =
    useGetDocumentTemplateByIdQuery(
      { id: templateId },
      { skip: !isEdit || !open }
    );

  const template = useMemo(() => byIdData?.data || null, [byIdData]);

  const [createTemplate, { isLoading: creating }] =
    useCreateDocumentTemplateMutation();

  const [updateTemplate, { isLoading: updating }] =
    useUpdateDocumentTemplateMutation();

  const saving = creating || updating;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      setName(safeText(template?.name));
      setDescription(safeText(template?.description));
      setFile(null);
      setPreviewUrl(safeText(template?.icon_image));
    } else {
      setName("");
      setDescription("");
      setFile(null);
      setPreviewUrl("");
    }
  }, [open, isEdit, templateId, template?._id]);

  // ✅ create preview for selected file
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = () => fileRef.current?.click();

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type?.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setFile(f);
  };

  const removeImage = () => {
    setFile(null);
    setPreviewUrl(isEdit ? safeText(template?.icon_image) : "");
    if (fileRef.current) fileRef.current.value = "";
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append(
      "data",
      JSON.stringify({
        name: safeText(name),
        description: safeText(description),
      })
    );
    if (file) fd.append("file", file);
    return fd;
  };

  const handleSubmit = async () => {
    const cleanName = safeText(name);
    if (!cleanName) return toast.error("Name is required");

    try {
      const formData = buildFormData();

      if (isEdit) {
        await updateTemplate({ id: templateId, formData }).unwrap();
        toast.success("Template updated");
      } else {
        await createTemplate(formData).unwrap();
        toast.success("Template created");
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.log("template save err:", err);
      toast.error(err?.data?.message || "Something went wrong");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        variant="outlined"
        sx={{
          width: "96vw",
          maxWidth: 850,
          p: 0,
          borderRadius: "lg",
        }}
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
            {isEdit ? "Edit Document Folder" : "Create Document Folder"}
          </Typography>

          <IconButton size="sm" variant="plain" onClick={onClose}>
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <Box sx={{ p: 2 }}>
          <Card
            variant="soft"
            sx={{
              p: 2,
              borderRadius: "lg",
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "180px 1fr" },
              alignItems: "start",
            }}
          >
            {/* ✅ Upload Area (left) */}
            <Box>
              <Sheet
                variant="outlined"
                onClick={pickFile}
                sx={{
                  height: 165,
                  borderRadius: "lg",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  gap: 1,
                  position: "relative",
                  overflow: "hidden",
                  borderStyle: "dashed",
                }}
              >
                {previewUrl ? (
                  <Box
                    sx={{ width: "100%", height: "100%", position: "relative" }}
                  >
                    <Box
                      component="img"
                      src={previewUrl}
                      alt="icon"
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />

                    <IconButton
                      size="sm"
                      variant="plain"
                      color="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                      disabled={saving}
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        borderRadius: "999px",
                        boxShadow: "md",
                      }}
                    >
                      <DeleteOutlineRounded />
                    </IconButton>
                  </Box>
                ) : (
                  <>
                    <CloudUploadRounded fontSize="large" />
                    <Typography level="body-sm">Upload Photo</Typography>
                  </>
                )}
              </Sheet>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onFileChange}
              />
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              <Input
                size="lg"
                variant="plain"
                placeholder="e.g. ABC Pvt Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving || (isEdit && loadingById)}
                sx={{
                  mt: 1.5,
                  fontSize: 36,
                  fontWeight: 600,
                  width: "100%",
                  borderRadius: 0,
                  borderBottom: "2px solid #002B5B",
                  "--Input-focusedThickness": "0px",
                  px: 0,
                  backgroundColor: "transparent",
                  "&:hover": { borderBottomColor: "#004080" },
                  "& input": { paddingBottom: "4px" },
                }}
              />

              <Textarea
                minRows={3}
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving || (isEdit && loadingById)}
              />

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                  mt: 1,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={onClose}
                  disabled={saving}
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
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  loading={saving}
                  sx={{
                    backgroundColor: "#3366a3",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#285680" },
                    height: "8px",
                  }}
                >
                  {isEdit ? "Update" : "Create"}
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      </ModalDialog>
    </Modal>
  );
};

export default DocumentTemplateForm;
