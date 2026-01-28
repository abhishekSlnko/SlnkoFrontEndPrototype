import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  Input,
  Sheet,
  Typography,
  IconButton,
  Chip,
  Modal,
  ModalDialog,
  ModalClose,
  Textarea,
  CircularProgress,
  Tooltip,
} from "@mui/joy";
import { useNavigate, useSearchParams } from "react-router-dom";
import Select from "react-select";
import { toast } from "react-toastify";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  useWebSearchPOQuery,
  useLazyWebSearchPOQuery,
} from "../../redux/purchasesSlice";
import {
  useLazyGetPayRequestbyPoQuery,
  useCreateAdjustmentMutation,
  useGetAdjustmentbyIdQuery,
  useUpdateAdjustmentStatusMutation,
  useUpdateAdjustmentMutation,
} from "../../redux/Accounts";

import SearchPickerModal from "../SearchPickerModal";

const REL_TYPES = [
  { label: "Many to One", value: "many_to_one" },
  { label: "One to Many", value: "one_to_many" },
];

const PO_DROPDOWN_LIMIT = 7;
const SEARCH_MORE_VALUE = "__SEARCH_MORE__";

const isValidObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || "").trim());

const toNum = (v) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

const money = (v) => {
  const n = toNum(v);
  return `₹ ${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const statusText = (doc) => {
  const s = doc?.current_status?.status;
  const v = Array.isArray(s) ? s[0] : s;
  return String(v || "pending").toLowerCase();
};
const statusColor = (s) => {
  if (s === "approved") return "success";
  if (s === "rejected") return "danger";
  return "warning";
};

const fmtDT = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
};

const getLatestStatusMeta = (doc) => {
  const hist = Array.isArray(doc?.status_history) ? doc.status_history : [];
  const last = hist.length ? hist[hist.length - 1] : null;

  const src = last || doc?.current_status || {};
  const s = src?.status;
  const status = Array.isArray(s) ? s[0] : s;

  const remarks = src?.remarks ?? null;

  const u = src?.user_id;
  const userName =
    typeof u === "object" && u
      ? u?.name || u?.user_name || u?.email || u?._id || ""
      : u
        ? String(u)
        : "";

  const updatedAt = src?.updatedAt || doc?.updatedAt || doc?.createdAt || null;

  return {
    status: String(status || "").toLowerCase(),
    remarks: remarks ? String(remarks) : "",
    userName: userName ? String(userName) : "",
    updatedAt,
  };
};

const makeBlankLegRow = () => ({
  po_id: "",
  po_number: "",
  pay_req_id: "",
  pay_id: "",
  project: "",
  utr: "",
  amount_paid: "",
  po_value: "",
  total_paid: "",
  move_amount: "",
  adjust_amount: "",
});

export default function AdjustmentPaymentForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = (searchParams.get("mode") || "").toLowerCase();
  const id = searchParams.get("id") || "";
  const isViewMode = mode === "view";

  // ✅ detail fetch (only in view)
  const {
    data: byIdResp,
    isLoading: isLoadingById,
    isFetching: isFetchingById,
    isError: isByIdError,
    error: byIdError,
    refetch: refetchById,
  } = useGetAdjustmentbyIdQuery(id, { skip: !isViewMode || !id });

  const doc = byIdResp?.data || null;

  const status = isViewMode ? statusText(doc) : "draft";

  const [updateAdjustment, { isLoading: isUpdatingAdjustment }] =
    useUpdateAdjustmentMutation();

  const canEdit = !isViewMode || status === "rejected";
  const isReadOnly = !canEdit;

  const [triggerPayRequestByPo] = useLazyGetPayRequestbyPoQuery();
  const [createAdjustment, { isLoading: isSaving }] =
    useCreateAdjustmentMutation();

  const [updateAdjustmentStatus, { isLoading: isUpdatingStatus }] =
    useUpdateAdjustmentStatusMutation();

  const [relationType, setRelationType] = useState("many_to_one");

  // PO dropdown
  const [poInput, setPoInput] = useState("");
  const [poSearch, setPoSearch] = useState("");

  // PO picker modal
  const [poPickerOpen, setPoPickerOpen] = useState(false);
  const [poPickerSearch, setPoPickerSearch] = useState("");
  const [poPickerCtx, setPoPickerCtx] = useState({ leg: "from", idx: 0 });

  // rows
  const [fromRows, setFromRows] = useState([makeBlankLegRow()]);
  const [toRows, setToRows] = useState([makeBlankLegRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // caches
  const adjustPoCacheRef = useRef(new Map()); // po_number -> getPayRequestByPo response
  const poMetaRef = useRef(new Map()); // po_number -> {po_id, project_id,...}
  const discoveredProjectsRef = useRef(new Map()); // project_id -> {code,name}

  const menuPortalTarget =
    typeof document !== "undefined" ? document.body : null;

  // ✅ Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState("rejected"); // rejected | pending
  const [statusRemarks, setStatusRemarks] = useState("");

  const openStatusModal = (nextStatus) => {
    if (String(status || "").toLowerCase() === "approved") return; // ✅ do not open
    setStatusAction(nextStatus);
    setStatusRemarks("");
    setStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    setStatusModalOpen(false);
    setStatusRemarks("");
  };

  const submitStatusUpdate = async () => {
    if (!id) return toast.error("Missing adjustment id");
    try {
      const res = await updateAdjustmentStatus({
        status: statusAction,
        remarks: statusRemarks?.trim() || "",
        ids: [id],
      }).unwrap();

      toast.success(res?.message || "Status updated");
      closeStatusModal();
      refetchById?.();
    } catch (e) {
      toast.error(e?.data?.message || "Failed to update status");
      if (Array.isArray(e?.data?.errors) && e.data.errors.length) {
        toast.error(e.data.errors[0]);
      }
    }
  };

  // styles
  const selectStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: "40px",
      borderRadius: 10,
      borderColor: state.isFocused ? "#2563eb" : "#D0D5DD",
      fontSize: 14,
      boxShadow: "none",
      "&:hover": { borderColor: "#B8BCC4" },
    }),
    menu: (provided) => ({ ...provided, borderRadius: 10, overflow: "hidden" }),
    menuPortal: (base) => ({ ...base, zIndex: 13000 }),
    menuList: (provided) => ({ ...provided, maxHeight: 240 }),
    option: (provided, state) => ({
      ...provided,
      fontSize: 14,
      backgroundColor: state.isFocused ? "#F2F4F7" : "#FFFFFF",
      color: "#111827",
    }),
    singleValue: (provided) => ({ ...provided, fontSize: 14 }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: 14,
      color: "#9CA3AF",
    }),
  };
  const labelStyle = { fontWeight: 700, mb: 0.6, color: "#111827" };

  const allowFromAdd = relationType === "many_to_one";
  const allowToAdd = relationType === "one_to_many";

  // ✅ map view doc -> rows
  useEffect(() => {
    if (!isViewMode) return;
    if (!doc?._id) return;

    const rel = String(doc.relation || "").toLowerCase();
    setRelationType(rel === "onetomany" ? "one_to_many" : "many_to_one");

    const mappedFrom = (Array.isArray(doc.from) ? doc.from : []).map((x) => ({
      ...makeBlankLegRow(),
      po_id: String(x?.po_id?._id || ""),
      po_number: String(x?.po_id?.po_number || ""),
      project: String(x?.project_id?._id || ""),
      pay_req_id: String(x?.pay_id?._id || ""),
      pay_id: String(x?.pay_id?.pay_id || ""),
      utr: String(x?.pay_id?.utr || ""),
      amount_paid: String(x?.pay_id?.amount_paid ?? ""),
      po_value: String(x?.po_id?.po_value ?? ""),
      total_paid: String(x?.po_id?.total_advance_paid ?? ""),
      move_amount: String(x?.adjustment_amount ?? ""),
      adjust_amount: "",
    }));

    const mappedTo = (Array.isArray(doc.to) ? doc.to : []).map((x) => ({
      ...makeBlankLegRow(),
      po_id: String(x?.po_id?._id || ""),
      po_number: String(x?.po_id?.po_number || ""),
      project: String(x?.project_id?._id || ""),
      po_value: String(x?.po_id?.po_value ?? ""),
      total_paid: String(x?.po_id?.total_advance_paid ?? ""),
      adjust_amount: String(x?.adjustment_amount ?? ""),
      move_amount: "",
    }));

    setFromRows(mappedFrom.length ? mappedFrom : [makeBlankLegRow()]);
    setToRows(mappedTo.length ? mappedTo : [makeBlankLegRow()]);

    // remember projects for label
    const allProjects = [
      ...(Array.isArray(doc.from) ? doc.from : []),
      ...(Array.isArray(doc.to) ? doc.to : []),
    ]
      .map((l) => l?.project_id)
      .filter(Boolean);

    allProjects.forEach((p) => {
      const pid = p?._id ? String(p._id) : "";
      if (!isValidObjectId(pid)) return;
      discoveredProjectsRef.current.set(pid, {
        _id: pid,
        code: p?.code || "",
        name: p?.name || "",
        p_group: p?.p_group || "",
      });
    });
  }, [isViewMode, doc]);

  // enforce row counts by relation (only when editable)
  useEffect(() => {
    if (isViewMode) return;
    if (isReadOnly) return;

    if (relationType === "many_to_one") {
      setFromRows((prev) => (prev?.length ? prev : [makeBlankLegRow()]));
      setToRows([makeBlankLegRow()]);
      return;
    }

    if (relationType === "one_to_many") {
      setFromRows([makeBlankLegRow()]);
      setToRows((prev) => (prev?.length ? prev : [makeBlankLegRow()]));
    }
  }, [relationType, isReadOnly, isViewMode]);

  // debounce PO input (only when editable)
  useEffect(() => {
    if (isReadOnly) return;
    const t = setTimeout(() => setPoSearch(poInput.trim()), 350);
    return () => clearTimeout(t);
  }, [poInput, isReadOnly]);

  // PO search API (skip when read-only)
  const {
    data: poData,
    isFetching: isPoFetching,
    isLoading: isPoLoading,
    isError: isPoError,
  } = useWebSearchPOQuery(
    { page: 1, limit: PO_DROPDOWN_LIMIT, search: poSearch },
    { refetchOnMountOrArgChange: true, skip: isReadOnly },
  );

  const [fetchPO] = useLazyWebSearchPOQuery();
  const poRecords = poData?.records || [];

  const fetchPOPage = async ({ page, search }) => {
    const limit = 10;
    const res = await fetchPO({ page, limit, search }).unwrap();
    return { rows: res?.records || [], total: res?.total || 0 };
  };

  const poOptions = useMemo(() => {
    const base = (poRecords || [])
      .map((po) => {
        const num = po?.po_number || po?.poNumber || "";
        return num ? { value: String(num), label: String(num) } : null;
      })
      .filter(Boolean);

    const totalFromApi =
      poData?.total || poData?.totalRecords || poData?.count || null;

    const shouldShowSearchMore =
      (typeof totalFromApi === "number" && totalFromApi > base.length) ||
      base.length >= PO_DROPDOWN_LIMIT;

    return shouldShowSearchMore
      ? [...base, { value: SEARCH_MORE_VALUE, label: "🔎 Search more…" }]
      : base;
  }, [poRecords, poData]);

  const poWebCacheRef = useRef(new Map()); // po_number -> webSearchPO record

  const fetchPoFromWebSearch = async (poNum) => {
    const key = String(poNum || "").trim();
    if (!key) return null;

    if (poWebCacheRef.current.has(key)) {
      return poWebCacheRef.current.get(key);
    }

    const res = await fetchPO({ page: 1, limit: 10, search: key }).unwrap();
    const recs = res?.records || [];

    const exact =
      recs.find(
        (r) => String(r?.po_number || r?.poNumber || "").trim() === key,
      ) ||
      recs[0] ||
      null;

    console.log("webSearchPO exact:", key, exact);

    poWebCacheRef.current.set(key, exact);
    return exact;
  };

  const getAdvancePaidFromWeb = (poRec) =>
    poRec?.total_advance_paid ?? poRec?.amount_paid ?? ""; // supports both shapes

  const getPoValueFromWeb = (poRec) =>
    poRec?.po_value ?? poRec?.po_basic ?? poRec?.total_po_value ?? "";

  // cache PO meta including po_id
  useEffect(() => {
    if (isReadOnly) return;

    for (const po of poRecords || []) {
      const poNum = String(po?.po_number || po?.poNumber || "").trim();
      if (!poNum) continue;

      const poId = po?._id ? String(po._id) : "";
      const pr = po?.project_id;
      const projId = pr?._id ? String(pr._id) : "";

      poMetaRef.current.set(poNum, {
        po_id: poId,
        po_number: poNum,
        project_id: projId,
        project_code: pr?.code || "",
        vendor_name: po?.vendorName || po?.vendor?.name || "",
        project_obj: pr || null,
      });

      if (pr?._id && isValidObjectId(String(pr._id))) {
        discoveredProjectsRef.current.set(String(pr._id), {
          _id: String(pr._id),
          code: pr?.code || "",
          name: pr?.name || "",
          p_group: pr?.p_group || "",
        });
      }
    }
  }, [poRecords, isReadOnly]);

  const rememberProject = (proj) => {
    const id = proj?._id ? String(proj._id) : "";
    if (!isValidObjectId(id)) return;
    discoveredProjectsRef.current.set(id, {
      _id: id,
      code: proj?.code || "",
      name: proj?.name || "",
      p_group: proj?.p_group || "",
    });
  };

  const fetchAdjustPoData = async (poNum) => {
    const key = String(poNum || "").trim();
    if (!key) return null;

    if (adjustPoCacheRef.current.has(key))
      return adjustPoCacheRef.current.get(key);

    const data = await triggerPayRequestByPo({ po_number: key }).unwrap();
    if (data?.project_id && typeof data.project_id === "object") {
      rememberProject(data.project_id);
    }
    adjustPoCacheRef.current.set(key, data);
    return data;
  };

  const resolvePoRecord = async (poNum) => {
    const key = String(poNum || "").trim();
    if (!key) return null;

    const meta = poMetaRef.current.get(key);
    if (meta?.po_id || meta?.project_id || meta?.project_code) return meta;

    const found = (poRecords || []).find(
      (x) => String(x?.po_number || x?.poNumber || "").trim() === key,
    );
    if (found) {
      const poId = found?._id ? String(found._id) : "";
      const pr = found?.project_id;
      const projId = pr?._id ? String(pr._id) : "";
      const m = {
        po_id: poId,
        po_number: key,
        project_id: projId,
        project_code: pr?.code || "",
        vendor_name: found?.vendorName || found?.vendor?.name || "",
        project_obj: pr || null,
      };
      poMetaRef.current.set(key, m);
      if (pr?._id) rememberProject(pr);
      return m;
    }

    try {
      const res = await fetchPO({ page: 1, limit: 10, search: key }).unwrap();
      const recs = res?.records || [];
      const po =
        recs.find(
          (x) => String(x?.po_number || x?.poNumber || "").trim() === key,
        ) || recs[0];
      if (!po) return null;

      const poId = po?._id ? String(po._id) : "";
      const pr = po?.project_id;
      const projId = pr?._id ? String(pr._id) : "";
      const m = {
        po_id: poId,
        po_number: key,
        project_id: projId,
        project_code: pr?.code || "",
        vendor_name: po?.vendorName || po?.vendor?.name || "",
        project_obj: pr || null,
      };
      poMetaRef.current.set(key, m);
      if (pr?._id) rememberProject(pr);
      return m;
    } catch (e) {
      console.error("resolvePoRecord failed:", e);
      return null;
    }
  };

  const buildPayIdOptionsFromApi = (data) => {
    const prs = Array.isArray(data?.pay_requests) ? data.pay_requests : [];
    return prs
      .map((p) => {
        const id = String(p?._id || "").trim();
        if (!isValidObjectId(id)) return null;
        const code = String(p?.pay_id || "").trim();
        const amt = toNum(p?.amount_paid);
        return { value: id, label: `${code || id}  |  ${money(amt)}`, raw: p };
      })
      .filter(Boolean);
  };

  const getPayIdOptionsForPo = (poNum) => {
    const key = String(poNum || "").trim();
    if (!key) return [];
    const data = adjustPoCacheRef.current.get(key);
    return buildPayIdOptionsFromApi(data);
  };

  const calcPoTotalPaid = (data) => {
    const prs = Array.isArray(data?.pay_requests) ? data.pay_requests : [];
    return prs.reduce((acc, x) => acc + toNum(x?.amount_paid), 0);
  };

  const getPoValue = (data) => {
    const v =
      data?.po_value ??
      data?.total_po_value ??
      data?.total_po_amount ??
      data?.po_basic ??
      "";
    return v === null || v === undefined ? "" : String(v);
  };

  const updateFromRow = (idx, patch) => {
    setFromRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  };
  const updateToRow = (idx, patch) => {
    setToRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  };

  const addFromRow = () => setFromRows((prev) => [...prev, makeBlankLegRow()]);
  const removeFromRow = (idx) =>
    setFromRows((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx),
    );

  const addToRow = () => setToRows((prev) => [...prev, makeBlankLegRow()]);
  const removeToRow = (idx) =>
    setToRows((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx),
    );

  const openPoPicker = (leg, idx) => {
    setPoPickerCtx({ leg, idx });
    setPoPickerOpen(true);
    setPoPickerSearch(poSearch || poInput || "");
  };

  const applyPoSelection = async (po) => {
    if (!po) return;
    const poNum = String(po?.po_number || po?.poNumber || "").trim();
    if (!poNum) return;

    const poId = po?._id ? String(po._id) : "";
    const pr = po?.project_id;
    const projId = pr?._id ? String(pr._id) : "";

    poMetaRef.current.set(poNum, {
      po_id: poId,
      po_number: poNum,
      project_id: projId,
      project_code: pr?.code || "",
      vendor_name: po?.vendorName || po?.vendor?.name || "",
      project_obj: pr || null,
    });

    if (pr?._id) rememberProject(pr);

    const opt = { value: poNum, label: poNum };
    if (poPickerCtx.leg === "from")
      await handleFromPoChange(poPickerCtx.idx, opt);
    else await handleToPoChange(poPickerCtx.idx, opt);

    setPoPickerOpen(false);
  };

  const getProjectLabelById = (projectId) => {
    const id = String(projectId || "").trim();
    if (!isValidObjectId(id)) return "";
    const p = discoveredProjectsRef.current.get(id);
    if (p) return `${p.code || "-"}${p.name ? " - " + p.name : ""}`;
    return id;
  };

  const handleFromPoChange = async (idx, opt) => {
    const poNum = opt?.value || "";
    if (!poNum) {
      updateFromRow(idx, makeBlankLegRow());
      return;
    }

    updateFromRow(idx, { ...makeBlankLegRow(), po_number: poNum });

    try {
      // 1) Resolve PO meta (po_id + project_id)
      const meta = await resolvePoRecord(poNum);

      if (meta?.po_id && isValidObjectId(meta.po_id))
        updateFromRow(idx, { po_id: meta.po_id });

      if (meta?.project_id && isValidObjectId(meta.project_id))
        updateFromRow(idx, { project: meta.project_id });

      // 2) ✅ WebSearchPO → set PO value + Advance Paid
      const webPo = await fetchPoFromWebSearch(poNum);

      updateFromRow(idx, {
        po_value: String(getPoValueFromWeb(webPo) || ""),
        total_paid: String(getAdvancePaidFromWeb(webPo) || ""),
      });

      // 3) ✅ get-po-for-adjust ONLY for Pay IDs (do not use it for total_paid)
      const data = await fetchAdjustPoData(poNum);

      // also ensure project from API if returned
      const apiProjId =
        data?.project_id && typeof data.project_id === "object"
          ? String(data.project_id?._id || "")
          : String(data?.project_id || "");

      if (isValidObjectId(apiProjId))
        updateFromRow(idx, { project: apiProjId });
    } catch (e) {
      console.error("FROM PO load failed:", e);
      toast.error("Could not load FROM PO details");
    }
  };

  const handleFromPayIdChange = async (idx, opt) => {
    const payReqId = opt?.value?.trim() || "";
    const poNum = String(fromRows[idx]?.po_number || "").trim();

    if (!payReqId) {
      updateFromRow(idx, {
        pay_req_id: "",
        pay_id: "",
        utr: "",
        amount_paid: "",
        move_amount: "",
      });
      return;
    }
    if (!poNum) return toast.error("Select FROM PO first");
    if (!isValidObjectId(payReqId)) return toast.error("Invalid PayRequest id");

    try {
      const data =
        adjustPoCacheRef.current.get(poNum) || (await fetchAdjustPoData(poNum));

      let pr = opt?.raw || null;
      if (!pr) {
        const prs = Array.isArray(data?.pay_requests) ? data.pay_requests : [];
        pr = prs.find((x) => String(x?._id) === String(payReqId)) || null;
      }
      if (!pr) return toast.error("PayRequest not found for this PO");

      updateFromRow(idx, {
        pay_req_id: String(pr._id),
        pay_id: String(pr?.pay_id || ""),
        project: isValidObjectId(pr?.project_id)
          ? String(pr.project_id)
          : String(fromRows[idx]?.project || ""),
        utr: String(pr?.utr || ""),
        amount_paid: String(pr?.amount_paid ?? ""),
        move_amount: String(
          fromRows[idx]?.move_amount || pr?.amount_paid || "",
        ),
      });
    } catch (e) {
      console.error("FROM Pay load error:", e);
      toast.error("Could not load PayRequest details");
    }
  };

  const handleToPoChange = async (idx, opt) => {
    const poNum = opt?.value || "";
    if (!poNum) {
      updateToRow(idx, makeBlankLegRow());
      return;
    }

    updateToRow(idx, { ...makeBlankLegRow(), po_number: poNum });

    try {
      // 1) Resolve PO meta (po_id + project_id)
      const meta = await resolvePoRecord(poNum);

      if (meta?.po_id && isValidObjectId(meta.po_id))
        updateToRow(idx, { po_id: meta.po_id });

      if (meta?.project_id && isValidObjectId(meta.project_id))
        updateToRow(idx, { project: meta.project_id });

      // 2) ✅ WebSearchPO only (NO get-po-for-adjust here)
      const webPo = await fetchPoFromWebSearch(poNum);

      // project id fallback from web record if needed
      const webProjId =
        webPo?.project_id && typeof webPo.project_id === "object"
          ? String(webPo.project_id?._id || "")
          : String(webPo?.project_id || "");

      updateToRow(idx, {
        project: isValidObjectId(webProjId)
          ? webProjId
          : meta?.project_id || "",
        po_value: String(getPoValueFromWeb(webPo) || ""),
        total_paid: String(getAdvancePaidFromWeb(webPo) || ""),
      });
    } catch (e) {
      console.error("TO PO load failed:", e);
      toast.error("Could not load TO PO details");
    }
  };

  const totals = useMemo(() => {
    const fromTotal = fromRows.reduce((a, r) => a + toNum(r.move_amount), 0);
    const toTotal = toRows.reduce((a, r) => a + toNum(r.adjust_amount), 0);
    return { fromTotal, toTotal, diff: fromTotal - toTotal };
  }, [fromRows, toRows]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    // ✅ build payload ONLY with schema fields
    const payload = {
      relation: relationType === "many_to_one" ? "manytoone" : "onetomany",
      from: fromRows.map((r) => ({
        po_id: String(r.po_id),
        project_id: String(r.project),
        pay_id: String(r.pay_req_id),
        adjustment_amount: toNum(r.move_amount),
      })),
      to: toRows.map((r) => ({
        po_id: String(r.po_id),
        project_id: String(r.project),
        adjustment_amount: toNum(r.adjust_amount),
      })),
    };

    if (isSaving || isSubmitting || isUpdatingAdjustment) return;

    setIsSubmitting(true);
    try {
      if (isRejectedEdit) {
        // ✅ UPDATE existing adjustment
        const res = await updateAdjustment({ id, payload }).unwrap();
        toast.success(res?.message || "Updated");
        refetchById?.(); // refresh view data
        navigate("/adjustment-dashboard");
      } else {
        // ✅ CREATE new adjustment
        const res = await createAdjustment(payload).unwrap();
        toast.success(res?.message || "Created");
        navigate("/adjustment-dashboard");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed");
      if (Array.isArray(err?.data?.errors) && err.data.errors.length) {
        toast.error(err.data.errors[0]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const latestMeta = isViewMode ? getLatestStatusMeta(doc) : null;
  const isRejectedEdit = isViewMode && status === "rejected" && id;

  const StatusHover = (
    <Box sx={{ maxWidth: 360 }}>
      <Typography level="title-sm" sx={{ mb: 0.5 }}>
        Latest Remark
      </Typography>

      <Typography level="body-sm" sx={{ mb: 0.5 }}>
        <b>Status:</b>{" "}
        {latestMeta?.status ? (
          <span style={{ textTransform: "capitalize" }}>
            {latestMeta.status}
          </span>
        ) : (
          "-"
        )}
      </Typography>

      <Typography level="body-sm" sx={{ mb: 0.5 }}>
        <b>Remark:</b> {latestMeta?.remarks ? latestMeta.remarks : "-"}
      </Typography>

      <Typography level="body-sm" sx={{ mb: 0.5 }}>
        <b>By:</b> {latestMeta?.userName ? latestMeta.userName : "-"}
      </Typography>

      <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
        {latestMeta?.updatedAt ? fmtDT(latestMeta.updatedAt) : ""}
      </Typography>
    </Box>
  );

  const STATUS_OPTIONS = [
    { label: "Reject", value: "rejected" },
    { label: "Pending", value: "pending" },
    { label: "Approve", value: "approved" },
  ];

  return (
    <Box sx={{ ml: { lg: "var(--Sidebar-width)" } }}>
      <Container maxWidth="lg" sx={{ py: 1 }}>
        <Sheet
          variant="soft"
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: "lg",
            boxShadow: "lg",
            bgcolor: "background.surface",
          }}
        >
          {/* ✅ VIEW HEADER */}
          {isViewMode ? (
            <Sheet
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: "lg",
                bgcolor: "background.surface",
                boxShadow: "sm",
                mb: 3,
              }}
            >
              {isLoadingById || isFetchingById ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size="sm" />
                  <Typography>Loading…</Typography>
                </Box>
              ) : isByIdError ? (
                <Typography color="danger">
                  {String(
                    byIdError?.data?.message || byIdError?.error || "Error",
                  )}
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box>
                    <Typography level="title-md" fontWeight="xl">
                      Adjustment
                    </Typography>
                    <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                      Created by: {doc?.created_by?.name || "-"} •{" "}
                      {doc?.createdAt ? fmtDT(doc.createdAt) : "-"}
                    </Typography>
                  </Box>

                  <Tooltip
                    placement="bottom-end"
                    variant="soft"
                    title={StatusHover}
                  >
                    <Chip
                      variant="soft"
                      color={statusColor(status)}
                      sx={{
                        textTransform: "capitalize",
                        fontWeight: 800,
                        cursor: status === "approved" ? "default" : "pointer",
                      }}
                      onClick={() => {
                        if (status === "approved") return; // ✅ no modal on approved
                        // open modal (toggle action default)
                        const next =
                          status === "rejected" ? "pending" : "rejected";
                        openStatusModal(next);
                      }}
                    >
                      {status}
                    </Chip>
                  </Tooltip>
                </Box>
              )}
            </Sheet>
          ) : null}

          {/* RELATION TYPE */}
          <Sheet
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: "lg",
              bgcolor: "background.surface",
              boxShadow: "sm",
              mb: 3,
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid xs={12} md={6}>
                <FormControl>
                  <FormLabel sx={labelStyle}>Relation Type *</FormLabel>
                  <Select
                    styles={selectStyles}
                    options={REL_TYPES}
                    value={REL_TYPES.find((o) => o.value === relationType)}
                    onChange={(opt) =>
                      setRelationType(opt?.value || "many_to_one")
                    }
                    isClearable={false}
                    menuPortalTarget={menuPortalTarget}
                    isDisabled={isReadOnly}
                  />
                </FormControl>
              </Grid>

              <Grid xs={12} md={12}>
                <Box
                  sx={{
                    mt: 1.5,
                    display: "flex",
                    gap: 1,
                    flexWrap: "wrap",
                    justifyContent: { xs: "flex-start", md: "flex-end" },
                  }}
                >
                  <Chip variant="soft">From: {money(totals.fromTotal)}</Chip>
                  <Chip variant="soft">To: {money(totals.toTotal)}</Chip>
                  <Chip
                    variant="soft"
                    color={
                      totals.diff === 0
                        ? "success"
                        : totals.diff > 0
                          ? "warning"
                          : "danger"
                    }
                  >
                    Diff: {money(totals.diff)}
                  </Chip>
                </Box>
              </Grid>
            </Grid>
          </Sheet>

          <Box component="form" onSubmit={handleSubmit}>
            {/* ===================== FROM ===================== */}
            <Box
              sx={{
                mt: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography level="h4" fontWeight="xl">
                  From {allowFromAdd ? "(Multiple Allowed)" : "(Single)"}
                </Typography>
              </Box>

              {!isReadOnly && allowFromAdd ? (
                <Button
                  variant="solid"
                  startDecorator={<AddRoundedIcon />}
                  onClick={addFromRow}
                >
                  Add Row
                </Button>
              ) : null}
            </Box>

            <Divider sx={{ mt: 2, mb: 3 }} />

            <Grid container spacing={2}>
              {fromRows.map((row, idx) => {
                const payIdOptions = getPayIdOptionsForPo(row.po_number);

                return (
                  <Grid xs={12} key={`from-${idx}`}>
                    <Sheet
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: "lg",
                        bgcolor: "background.surface",
                        boxShadow: "sm",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography level="title-md" fontWeight="xl">
                          FROM Row #{idx + 1}
                        </Typography>

                        {!isReadOnly && allowFromAdd ? (
                          <IconButton
                            variant="soft"
                            color="danger"
                            onClick={() => removeFromRow(idx)}
                            disabled={fromRows.length === 1}
                          >
                            <DeleteOutlineRoundedIcon />
                          </IconButton>
                        ) : null}
                      </Box>

                      <Grid container spacing={2}>
                        <Grid xs={12} sm={4}>
                          <FormControl>
                            <FormLabel sx={labelStyle}>PO Number *</FormLabel>
                            <Select
                              styles={selectStyles}
                              value={
                                row.po_number
                                  ? {
                                      label: row.po_number,
                                      value: row.po_number,
                                    }
                                  : null
                              }
                              options={poOptions}
                              onChange={(opt) => {
                                if (opt?.value === SEARCH_MORE_VALUE) {
                                  openPoPicker("from", idx);
                                  return;
                                }
                                handleFromPoChange(idx, opt);
                              }}
                              isClearable
                              isSearchable
                              onInputChange={(val, meta) => {
                                if (meta.action === "input-change")
                                  setPoInput(val);
                              }}
                              filterOption={() => true}
                              menuPortalTarget={menuPortalTarget}
                              isDisabled={isReadOnly}
                              placeholder={
                                isPoLoading || isPoFetching
                                  ? "Loading..."
                                  : "Type to search PO"
                              }
                              isLoading={isPoLoading || isPoFetching}
                              noOptionsMessage={() =>
                                isPoError
                                  ? "Error loading POs"
                                  : isPoLoading || isPoFetching
                                    ? "Fetching..."
                                    : "No matches"
                              }
                            />
                          </FormControl>
                        </Grid>

                        <Grid xs={12} sm={4}>
                          <FormControl>
                            <FormLabel sx={labelStyle}>Pay ID *</FormLabel>
                            <Select
                              styles={selectStyles}
                              options={payIdOptions}
                              value={
                                row.pay_req_id
                                  ? payIdOptions.find(
                                      (o) =>
                                        String(o.value) ===
                                        String(row.pay_req_id),
                                    ) || {
                                      value: row.pay_req_id,
                                      label: row.pay_id || row.pay_req_id,
                                    }
                                  : null
                              }
                              onChange={(opt) =>
                                handleFromPayIdChange(idx, opt)
                              }
                              isDisabled={isReadOnly || !row.po_number}
                              isClearable
                              isSearchable
                              menuPortalTarget={menuPortalTarget}
                              placeholder={
                                row.po_number
                                  ? "Select Pay ID"
                                  : "Select PO first"
                              }
                            />
                          </FormControl>
                        </Grid>

                        <Grid xs={12} sm={4}>
                          <FormControl>
                            <FormLabel sx={labelStyle}>
                              Project (From PO) *
                            </FormLabel>
                            <Input
                              value={
                                row.project
                                  ? getProjectLabelById(row.project)
                                  : ""
                              }
                              disabled
                            />
                          </FormControl>
                        </Grid>

                        <Grid xs={12} sm={4}>
                          <FormControl>
                            <FormLabel sx={labelStyle}>UTR</FormLabel>
                            <Input value={row.utr || ""} disabled />
                          </FormControl>
                        </Grid>

                        <Grid xs={12} sm={4}>
                          <FormControl>
                            <FormLabel sx={labelStyle}>
                              Original Amount (₹)
                            </FormLabel>
                            <Input value={row.amount_paid || ""} disabled />
                          </FormControl>
                        </Grid>

                        <Grid xs={12} sm={4}>
                          <FormControl>
                            <FormLabel sx={labelStyle}>
                              Total PO Value (₹)
                            </FormLabel>
                            <Input value={row.po_value || ""} disabled />
                          </FormControl>
                        </Grid>

                        <Grid xs={12} sm={4}>
                          <FormControl>
                            <FormLabel sx={labelStyle}>
                              Advance Paid (₹)
                            </FormLabel>
                            <Input value={row.total_paid || ""} disabled />
                          </FormControl>
                        </Grid>

                        <Grid xs={12} sm={4}>
                          <FormControl>
                            <FormLabel sx={labelStyle}>
                              Move Amount (₹) *
                            </FormLabel>
                            <Input
                              type="number"
                              value={row.move_amount || ""}
                              onChange={(e) =>
                                updateFromRow(idx, {
                                  move_amount: e.target.value,
                                })
                              }
                              disabled={isReadOnly || !row.pay_req_id}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Sheet>
                  </Grid>
                );
              })}
            </Grid>

            {/* ===================== TO ===================== */}
            <Box
              sx={{
                mt: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography level="h4" fontWeight="xl">
                  To {allowToAdd ? "(Multiple Allowed)" : "(Single)"}
                </Typography>
              </Box>

              {!isReadOnly && allowToAdd ? (
                <Button
                  variant="solid"
                  startDecorator={<AddRoundedIcon />}
                  onClick={addToRow}
                >
                  Add Row
                </Button>
              ) : null}
            </Box>

            <Divider sx={{ mt: 2, mb: 3 }} />

            <Grid container spacing={2}>
              {toRows.map((row, idx) => (
                <Grid xs={12} key={`to-${idx}`}>
                  <Sheet
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: "lg",
                      bgcolor: "background.surface",
                      boxShadow: "sm",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography level="title-md" fontWeight="xl">
                        TO Row #{idx + 1}
                      </Typography>

                      {!isReadOnly && allowToAdd ? (
                        <IconButton
                          variant="soft"
                          color="danger"
                          onClick={() => removeToRow(idx)}
                          disabled={toRows.length === 1}
                        >
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      ) : null}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid xs={12} sm={4}>
                        <FormControl>
                          <FormLabel sx={labelStyle}>PO Number *</FormLabel>
                          <Select
                            styles={selectStyles}
                            value={
                              row.po_number
                                ? { label: row.po_number, value: row.po_number }
                                : null
                            }
                            options={poOptions}
                            onChange={(opt) => {
                              if (opt?.value === SEARCH_MORE_VALUE) {
                                openPoPicker("to", idx);
                                return;
                              }
                              handleToPoChange(idx, opt);
                            }}
                            isClearable
                            isSearchable
                            onInputChange={(val, meta) => {
                              if (meta.action === "input-change")
                                setPoInput(val);
                            }}
                            filterOption={() => true}
                            menuPortalTarget={menuPortalTarget}
                            isDisabled={isReadOnly}
                            placeholder={
                              isPoLoading || isPoFetching
                                ? "Loading..."
                                : "Type to search PO"
                            }
                            isLoading={isPoLoading || isPoFetching}
                            noOptionsMessage={() =>
                              isPoError
                                ? "Error loading POs"
                                : isPoLoading || isPoFetching
                                  ? "Fetching..."
                                  : "No matches"
                            }
                          />
                        </FormControl>
                      </Grid>

                      <Grid xs={12} sm={4}>
                        <FormControl>
                          <FormLabel sx={labelStyle}>
                            Project (From PO) *
                          </FormLabel>
                          <Input
                            value={
                              row.project
                                ? getProjectLabelById(row.project)
                                : ""
                            }
                            disabled
                          />
                        </FormControl>
                      </Grid>

                      <Grid xs={12} sm={4}>
                        <FormControl>
                          <FormLabel sx={labelStyle}>
                            Total PO Value (₹)
                          </FormLabel>
                          <Input value={row.po_value || ""} disabled />
                        </FormControl>
                      </Grid>

                      <Grid xs={12} sm={4}>
                        <FormControl>
                          <FormLabel sx={labelStyle}>
                            Advance Paid (₹)
                          </FormLabel>
                          <Input value={row.total_paid || ""} disabled />
                        </FormControl>
                      </Grid>

                      <Grid xs={12} sm={4}>
                        <FormControl>
                          <FormLabel sx={labelStyle}>
                            Adjustment Amount (₹) *
                          </FormLabel>
                          <Input
                            type="number"
                            value={row.adjust_amount || ""}
                            onChange={(e) =>
                              updateToRow(idx, {
                                adjust_amount: e.target.value,
                              })
                            }
                            disabled={isReadOnly || !row.po_number}
                          />
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Sheet>
                </Grid>
              ))}
            </Grid>

            {/* ACTIONS */}
            <Grid container spacing={2} justifyContent="center" sx={{ mt: 4 }}>
              <Grid>
                <Button
                  type="submit"
                  variant="solid"
                  color="primary"
                  size="lg"
                  loading={isSubmitting || isSaving || isUpdatingAdjustment}
                  disabled={
                    isReadOnly ||
                    isSubmitting ||
                    isSaving ||
                    isUpdatingAdjustment
                  }
                >
                  {isRejectedEdit ? "Edit" : "Submit"}
                </Button>
              </Grid>

              <Grid>
                <Button
                  variant="outlined"
                  color="neutral"
                  size="lg"
                  onClick={() => navigate("/adjustment-dashboard")}
                >
                  Back
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Sheet>

        {/* ✅ STATUS UPDATE MODAL (NOT FOR APPROVED) */}
        <Modal open={statusModalOpen} onClose={closeStatusModal}>
          <ModalDialog size="md" sx={{ borderRadius: "lg" }}>
            <ModalClose />

            <Typography level="h4" fontWeight="xl">
              Update Status
            </Typography>

            <Typography
              level="body-sm"
              sx={{ color: "text.tertiary", mt: 0.5 }}
            >
              Current: <b style={{ textTransform: "capitalize" }}>{status}</b>
            </Typography>

            <Divider sx={{ my: 2 }} />

            <FormControl>
              <FormLabel>Status</FormLabel>

              <Select
                styles={selectStyles}
                options={STATUS_OPTIONS}
                value={
                  STATUS_OPTIONS.find((o) => o.value === statusAction) || null
                }
                onChange={(opt) => setStatusAction(opt?.value || "pending")}
                menuPortalTarget={menuPortalTarget}
              />
            </FormControl>

            <FormControl sx={{ mt: 2 }}>
              <FormLabel>Remarks</FormLabel>
              <Textarea
                minRows={3}
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                placeholder="Write remarks (optional)"
              />
            </FormControl>

            <Box
              sx={{
                display: "flex",
                gap: 1,
                justifyContent: "flex-end",
                mt: 2,
              }}
            >
              <Button
                variant="outlined"
                color="neutral"
                onClick={closeStatusModal}
              >
                Cancel
              </Button>

              <Button
                variant="solid"
                color={statusAction === "rejected" ? "danger" : "primary"}
                loading={isUpdatingStatus}
                onClick={submitStatusUpdate}
              >
                Update
              </Button>
            </Box>
          </ModalDialog>
        </Modal>

        {/* PO Search More Modal (only when editable) */}
        {!isReadOnly && poPickerOpen && (
          <Sheet
            variant="outlined"
            sx={{
              mt: 2,
              p: 2,
              borderRadius: "lg",
              boxShadow: "sm",
              bgcolor: "background.level1",
            }}
          >
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
              <Typography level="title-md" sx={{ flex: 1 }}>
                Search more POs
              </Typography>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => setPoPickerOpen(false)}
              >
                Close
              </Button>
            </Box>

            <SearchPickerModal
              open={true}
              onClose={() => setPoPickerOpen(false)}
              onPick={applyPoSelection}
              title="Select PO"
              columns={[
                { key: "po_number", label: "PO Number", width: 180 },
                { key: "project_code", label: "Project Code", width: 220 },
                { key: "vendor_name", label: "Vendor", width: 260 },
              ]}
              fetchPage={async ({ page, search }) => {
                const { rows, total } = await fetchPOPage({ page, search });
                const normalized = rows.map((po) => ({
                  ...po,
                  po_number: po?.po_number || "",
                  project_code: po?.project_id?.code || "",
                  vendor_name: po?.vendorName || po?.vendor?.name || "",
                }));
                return { rows: normalized, total };
              }}
              searchKey="po_number"
              pageSize={10}
              rowKey="_id"
              defaultSearch={poPickerSearch}
            />
          </Sheet>
        )}
      </Container>
    </Box>
  );
}
