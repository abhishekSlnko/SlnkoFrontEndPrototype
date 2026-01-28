import {
  Card,
  Typography,
  Input,
  Textarea,
  Button,
  Grid,
  FormControl,
  FormLabel,
  Switch,
  Box,
  Tabs,
  TabList,
  Tab,
  RadioGroup,
  Radio,
  Chip,
} from "@mui/joy";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGetProjectDropdownQuery } from "../../redux/projectsSlice";
import {
  useCreateTaskMutation,
  useGetAllDeptQuery,
  useGetAllUserQuery,
  useGetAllowedModuleQuery,
  useLazyNamesearchMaterialCategoriesQuery,
  useLazyGetProjectsTitlesDropdownQuery,
} from "../../redux/globalTaskSlice";
import { toast } from "react-toastify";
import Select, { components } from "react-select";
import SelectRS from "react-select";
import SearchPickerModal from "../../component/SearchPickerModal";

// ---------------- styles ----------------
const joySelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: state.isFocused
      ? "#3366a3"
      : "var(--joy-palette-neutral-outlinedBorder)",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(51, 102, 163, 0.16)" : "none",
    "&:hover": {
      borderColor: state.isFocused
        ? "#3366a3"
        : "var(--joy-palette-neutral-outlinedBorder)",
    },
    fontSize: 14,
  }),
  valueContainer: (b) => ({ ...b, padding: "0 10px" }),
  placeholder: (b) => ({ ...b, color: "var(--joy-palette-text-tertiary)" }),
  menu: (b) => ({ ...b, zIndex: 1301 }),
  menuPortal: (b) => ({ ...b, zIndex: 1301 }),
};

const RS_MORE = { label: "Search more…", value: "__more__" };

const toArray = (res) =>
  Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

const toDateTimeLocal = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const AddTask = () => {
  const [tab, setTab] = useState("project");
  const [priority, setPriority] = useState(0);
  const [assignToTeam, setAssignToTeam] = useState(false);
  const [searchText, setSearchText] = useState("");

  // ✅ project is now single object (not array)
  const [selectedProject, setSelectedProject] = useState(null);

  const [title, setTitle] = useState("");
  const [deadlineDT, setDeadlineDT] = useState(null);
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState([]);
  const [subtype, setSubType] = useState("");

  // Engineering/SCM multi-select
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedScmCats, setSelectedScmCats] = useState([]);

  // ✅ Projects Title dropdown state
  const [selectedProjectTaskTitle, setSelectedProjectTaskTitle] =
    useState(null);
  const [projectMaxTat, setProjectMaxTat] = useState("");
  const [projectsTitleQuickOptions, setProjectsTitleQuickOptions] = useState(
    []
  );

  const [category, setCategory] = useState("Engineering");
  const [openModulePicker, setOpenModulePicker] = useState(false);
  const [openScmPicker, setOpenScmPicker] = useState(false);

  // ✅ NEW: File upload state
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: getProjectDropdown, isLoading } = useGetProjectDropdownQuery();
  const [createTask, { isLoading: isSubmitting }] = useCreateTaskMutation();

  const deptFilter = useMemo(() => {
    if (tab === "internal") return "";

    // ✅ PROJECT TAB: filter based on category
    if (category === "Engineering") return "Engineering";
    if (category === "SCM") return "SCM";
    if (category === "Projects") return "Projects";
    return "Other";
  }, [tab, category]);

  const userQueryArgs = useMemo(() => {
    if (tab === "internal") return {};
    return { department: deptFilter };
  }, [tab, deptFilter]);

  const {
    data: usersResp,
    isFetching: isFetchingUsers,
    isLoading: isLoadingUsers,
  } = useGetAllUserQuery(userQueryArgs);

  const {
    data: deptsResp,
    isFetching: isFetchingDepts,
    isLoading: isLoadingDepts,
  } = useGetAllDeptQuery();

  const usersList = useMemo(() => toArray(usersResp), [usersResp]);
  const deptsList = useMemo(
    () =>
      toArray(deptsResp).filter(
        (d) => typeof d === "string" && d.trim() !== ""
      ),
    [deptsResp]
  );

  // ✅ IMPORTANT: titles depend on real mongo _id
  const projectId = selectedProject?._id || "";

  // ------------------ Engineering: allowed modules ------------------
  const {
    data: allowedModulesResp,
    isLoading: isLoadingModules,
    isFetching: isFetchingModules,
  } = useGetAllowedModuleQuery(projectId, {
    skip: tab !== "project" || category !== "Engineering" || !projectId,
  });

  const allowedModules = useMemo(() => {
    const arr = toArray(allowedModulesResp);
    return arr.map((m) => ({
      _id: m._id,
      name: m.name || m.module_name || "Untitled",
      code: m.code || "",
      description: m.description || "",
    }));
  }, [allowedModulesResp]);

  const moduleQuickOptions = useMemo(() => {
    const quick = allowedModules.slice(0, 7).map((m) => ({
      value: String(m._id),
      label: m.name,
      raw: m,
    }));
    return [...quick, RS_MORE];
  }, [allowedModules]);

  // ------------------ SCM: categories (lazy) ------------------
  const [triggerScmSearch, { isFetching: isFetchingScm }] =
    useLazyNamesearchMaterialCategoriesQuery();

  const [scmQuickOptions, setScmQuickOptions] = useState([]);

  const loadScmQuick = async (q = "") => {
    if (!projectId) return;
    try {
      const res = await triggerScmSearch(
        {
          search: q,
          page: 1,
          limit: 7,
          pr: true,
          project_id: projectId,
          activity: "true",
        },
        true
      ).unwrap();

      const list = toArray(res);

      setScmQuickOptions([
        ...list.slice(0, 7).map((m) => ({
          value: String(m._id),
          label: String(m.name || "Unnamed"),
          raw: m,
        })),
        RS_MORE,
      ]);
    } catch (e) {
      console.log("SCM dropdown error:", e);
      setScmQuickOptions([RS_MORE]);
    }
  };

  // ------------------ ✅ Projects: titles (lazy) ------------------
  const [triggerTitlesDropdown, { isFetching: isFetchingProjectsTitles }] =
    useLazyGetProjectsTitlesDropdownQuery();

  const loadProjectsTitlesQuick = async (q = "") => {
    if (!projectId) return;

    try {
      const res = await triggerTitlesDropdown(
        {
          search: q,
          page: 1,
          limit: 7,
          project_id: projectId,
          activity: "true",
        },
        true
      ).unwrap();

      const list = toArray(res);

      setProjectsTitleQuickOptions([
        ...list.slice(0, 7).map((t) => ({
          value: String(t?._id || ""),
          label: String(t?.title || "Untitled"),
          max_tat: t?.max_tat ?? null,
          raw: t,
        })),
      ]);
    } catch (e) {
      console.log("❌ titlesdropdown error:", e);
      setProjectsTitleQuickOptions([]);
    }
  };

  useEffect(() => {
    if (tab === "project" && category === "Projects" && projectId) {
      loadProjectsTitlesQuick("");
    } else {
      setProjectsTitleQuickOptions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, category, projectId]);

  const updateTitleFromSelections = (mods, cats) => {
    if (category === "Engineering") {
      const labels = (mods || []).map((o) => o?.label).filter(Boolean);
      setTitle(labels.join(", "));
    } else if (category === "SCM") {
      const labels = (cats || []).map((o) => o?.label).filter(Boolean);
      setTitle(labels.join(", "));
    }
  };

  // ------------------ ✅ upload helpers ------------------
  const dedupeFiles = (incoming = []) => {
    const map = new Map();
    for (const f of incoming) {
      if (!f) continue;
      const key = `${f.name}_${f.size}_${f.lastModified}`;
      map.set(key, f);
    }
    return Array.from(map.values());
  };

  const addFiles = (incoming) => {
    const arr = Array.from(incoming || []);
    if (!arr.length) return;
    setFiles((prev) => dedupeFiles([...prev, ...arr]));
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // ------------------ submit ------------------
  const handleSubmit = async () => {
    const isProjectTab = tab === "project";
    const isHelpdeskTab = tab === "helpdesk";

    if (!title || !priority || (isProjectTab && !selectedProject?._id)) {
      return toast.error("Required fields missing (Title, Priority, Project).");
    }

    const payload = {
      title,
      description: note,
      deadline: deadlineDT ? new Date(deadlineDT).toISOString() : null,
      project_id: isProjectTab ? [selectedProject._id] : undefined, // ✅ schema expects array
      assigned_to: isHelpdeskTab
        ? []
        : assignToTeam
        ? []
        : Array.isArray(assignedTo)
        ? assignedTo
        : [],
      priority: String(priority),
      type: tab,
      sub_type: isHelpdeskTab ? subtype : null,
    };

    try {
      await createTask({
        payload,
        team: isHelpdeskTab
          ? "superadmin"
          : assignToTeam
          ? assignedTo
          : undefined,
        files, // ✅ connect upload files here
      }).unwrap();

      toast.success("Task created successfully");

      setPriority(0);
      setAssignToTeam(false);
      setSearchText("");
      setSelectedProject(null);
      setDeadlineDT(null);
      setTitle("");
      setNote("");
      setAssignedTo([]);
      setSubType("");
      setCategory("Engineering");
      setSelectedModules([]);
      setSelectedScmCats([]);
      setSelectedProjectTaskTitle(null);
      setProjectMaxTat("");
      setProjectsTitleQuickOptions([]);
      setFiles([]);
      setIsDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error(error?.data?.error || "Error creating task");
    }
  };

  const userOptions = useMemo(
    () =>
      usersList
        .map((u) => {
          const id = u._id || u.id;
          const name =
            u.name || u.fullName || u.full_name || u.email || "Unnamed";
          return id ? { value: id, label: name } : null;
        })
        .filter(Boolean),
    [usersList]
  );

  const teamOptions = useMemo(() => {
    if (!Array.isArray(deptsList)) return [];

    // ✅ INTERNAL TAB: show ALL departments/teams
    if (tab === "internal") {
      return deptsList.map((d) => ({ value: d, label: d }));
    }

    // ✅ PROJECT TAB: keep your existing behavior
    if (category === "Engineering")
      return [{ value: "Engineering", label: "Engineering" }];
    if (category === "SCM") return [{ value: "SCM", label: "SCM" }];
    if (category === "Projects")
      return [{ value: "Projects", label: "Projects" }];

    return deptsList
      .filter(
        (d) => d && d !== "Engineering" && d !== "SCM" && d !== "Projects"
      )
      .map((d) => ({ value: d, label: d }));
  }, [deptsList, category, tab]);

  const currentOptions = assignToTeam ? teamOptions : userOptions;

  const assignValue = useMemo(() => {
    if (assignToTeam) {
      if (!assignedTo) return null;
      return (
        teamOptions.find((o) => String(o.value) === String(assignedTo)) || null
      );
    }
    if (!Array.isArray(assignedTo) || assignedTo.length === 0) return [];
    const map = new Map(currentOptions.map((o) => [String(o.value), o]));
    return assignedTo.map((id) => map.get(String(id)) || null).filter(Boolean);
  }, [assignToTeam, assignedTo, currentOptions, teamOptions]);

  const priorityMeta = {
    1: { label: "High", bg: "#d32f2f" },
    2: { label: "Medium", bg: "#ed6c02" },
    3: { label: "Low", bg: "#2e7d32" },
  };

  const priorityOptions = [
    { value: 1, label: "High" },
    { value: 2, label: "Medium" },
    { value: 3, label: "Low" },
  ];

  const PrioritySingleValue = (props) => {
    const { data } = props;
    const meta = priorityMeta[data?.value];
    return (
      <components.SingleValue {...props}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            background: meta?.bg ?? "#64748b",
          }}
        >
          {meta?.label || "Select priority"}
        </span>
      </components.SingleValue>
    );
  };

  const PriorityOption = (props) => {
    const { data } = props;
    const meta = priorityMeta[data.value];
    return (
      <components.Option {...props}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: meta?.bg ?? "#64748b",
            }}
          />
          <span>{meta?.label || data.label}</span>
        </div>
      </components.Option>
    );
  };

  const fetchAllowedModulePage = async ({
    page = 1,
    search = "",
    pageSize = 10,
  }) => {
    const norm = search.trim().toLowerCase();
    const filtered = norm
      ? allowedModules.filter(
          (m) =>
            m.name.toLowerCase().includes(norm) ||
            (m.code && m.code.toLowerCase().includes(norm)) ||
            (m.description && m.description.toLowerCase().includes(norm))
        )
      : allowedModules;

    const start = (page - 1) * pageSize;
    const rows = filtered.slice(start, start + pageSize);
    return { rows, total: filtered.length };
  };

  const fetchScmPage = async ({ page = 1, search = "", pageSize = 10 }) => {
    const res = await triggerScmSearch(
      {
        search,
        page,
        limit: pageSize,
        pr: true,
        project_id: projectId,
        activity: "true",
      },
      true
    ).unwrap();

    const rows = toArray(res);
    const total = res?.pagination?.total ?? rows.length;
    return { rows, total };
  };

  const dedupeOptions = (arr) => {
    const map = new Map();
    for (const o of arr || []) {
      if (!o) continue;
      map.set(String(o.value), o);
    }
    return Array.from(map.values());
  };

  return (
    <Card sx={{ maxWidth: 820, mx: "auto", p: 3, borderRadius: "lg" }}>
      <Typography level="h4" mb={2}>
        Add Task
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => {
          setTab(v);
          setSelectedModules([]);
          setSelectedScmCats([]);
          setTitle("");
          setSelectedProjectTaskTitle(null);
          setProjectMaxTat("");
          setProjectsTitleQuickOptions([]);
          setSelectedProject(null);
          setFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        sx={{ mb: 3 }}
      >
        <TabList>
          <Tab value="project">Project</Tab>
          <Tab value="internal">Internal</Tab>
          <Tab value="helpdesk">Helpdesk</Tab>
        </TabList>
      </Tabs>

      <Grid container spacing={2}>
        {tab === "project" && (
          <>
            <Grid xs={12}>
              <FormControl fullWidth>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <FormLabel sx={{ mb: 0 }}>Category</FormLabel>

                  {category === "Projects" &&
                  selectedProjectTaskTitle &&
                  projectMaxTat ? (
                    <Chip
                      variant="soft"
                      color="primary"
                      size="sm"
                      sx={{
                        ml: "auto",
                        borderRadius: "999px",
                        fontWeight: 700,
                        px: 1.2,
                      }}
                    >
                      Max TAT: {projectMaxTat}
                    </Chip>
                  ) : null}
                </Box>

                <RadioGroup
                  orientation="horizontal"
                  name="task-category"
                  value={category}
                  onChange={(e, v) => {
                    const next = v ?? e?.target?.value;
                    setCategory(next);

                    setTitle("");
                    setAssignedTo([]);
                    setSelectedModules([]);
                    setSelectedScmCats([]);
                    setSelectedProjectTaskTitle(null);
                    setProjectMaxTat("");
                    setProjectsTitleQuickOptions([]);
                  }}
                  sx={{ gap: 2, mt: 1 }}
                >
                  <Radio value="Engineering" label="Engineering" />
                  <Radio value="SCM" label="SCM" />
                  <Radio value="Projects" label="Projects" />
                  <Radio value="Other" label="Other" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* ✅ SINGLE PROJECT SELECT */}
            <Grid xs={12}>
              <FormControl fullWidth>
                <FormLabel>Project Id</FormLabel>
                <Select
                  isLoading={isLoading}
                  isClearable
                  isSearchable
                  placeholder="Search project..."
                  value={
                    selectedProject
                      ? {
                          value: selectedProject.code,
                          label: selectedProject.code,
                        }
                      : null
                  }
                  onChange={(opt) => {
                    if (!opt) {
                      setSelectedProject(null);
                    } else {
                      const proj = toArray(getProjectDropdown).find(
                        (p) => p.code === opt.value
                      );
                      setSelectedProject(proj || null);
                    }

                    setSearchText("");
                    setTitle("");
                    setSelectedModules([]);
                    setSelectedScmCats([]);
                    setSelectedProjectTaskTitle(null);
                    setProjectMaxTat("");
                    setDeadlineDT(null);
                    setProjectsTitleQuickOptions([]);
                  }}
                  onInputChange={(inputValue, { action }) => {
                    if (action === "input-change") setSearchText(inputValue);
                  }}
                  options={toArray(getProjectDropdown)
                    .map((p) => ({ value: p.code, label: p.code }))
                    .filter((p) =>
                      p.label.toLowerCase().includes(searchText.toLowerCase())
                    )}
                  styles={joySelectStyles}
                  menuPortalTarget={document.body}
                />
              </FormControl>
            </Grid>
          </>
        )}

        {/* Title block stays same */}
        <Grid xs={12}>
          <FormControl fullWidth>
            <FormLabel>Title</FormLabel>

            {tab === "project" && category === "Engineering" ? (
              <SelectRS
                placeholder={
                  projectId
                    ? isLoadingModules || isFetchingModules
                      ? "Loading modules…"
                      : "Search or pick modules"
                    : "Select a Project first"
                }
                isDisabled={!projectId || isLoadingModules || isFetchingModules}
                isMulti
                value={selectedModules}
                options={moduleQuickOptions}
                isClearable
                isSearchable
                onChange={(opts) => {
                  const arr = Array.isArray(opts) ? opts : [];
                  const hasMore = arr.some((o) => o?.value === "__more__");
                  const cleaned = arr.filter((o) => o?.value !== "__more__");
                  const next = dedupeOptions(cleaned);
                  setSelectedModules(next);
                  updateTitleFromSelections(next, selectedScmCats);
                  if (hasMore) setOpenModulePicker(true);
                }}
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 2000 }),
                  control: (base) => ({ ...base, minHeight: 40 }),
                }}
              />
            ) : tab === "project" && category === "SCM" ? (
              <SelectRS
                placeholder={
                  projectId
                    ? isFetchingScm
                      ? "Loading categories…"
                      : "Search or pick categories"
                    : "Select a Project first"
                }
                isDisabled={!projectId}
                isMulti
                value={selectedScmCats}
                options={scmQuickOptions}
                isClearable
                isSearchable
                onMenuOpen={() => loadScmQuick("")}
                onInputChange={(input, meta) => {
                  if (meta.action === "input-change") loadScmQuick(input || "");
                  return input;
                }}
                onChange={(opts) => {
                  const arr = Array.isArray(opts) ? opts : [];
                  const hasMore = arr.some((o) => o?.value === "__more__");
                  const cleaned = arr.filter((o) => o?.value !== "__more__");
                  const next = dedupeOptions(cleaned);
                  setSelectedScmCats(next);
                  updateTitleFromSelections(selectedModules, next);
                  if (hasMore) setOpenScmPicker(true);
                }}
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 2000 }),
                  control: (base) => ({ ...base, minHeight: 40 }),
                }}
                isLoading={isFetchingScm}
              />
            ) : tab === "project" && category === "Projects" ? (
              <SelectRS
                placeholder={
                  !projectId
                    ? "Select a Project first"
                    : isFetchingProjectsTitles
                    ? "Loading titles…"
                    : "Search / select title"
                }
                isDisabled={!projectId}
                isClearable
                isSearchable
                value={selectedProjectTaskTitle}
                options={projectsTitleQuickOptions}
                isLoading={isFetchingProjectsTitles}
                onMenuOpen={() => loadProjectsTitlesQuick("")}
                onInputChange={(input, meta) => {
                  if (meta.action === "input-change")
                    loadProjectsTitlesQuick(input || "");
                  return input;
                }}
                onChange={(opt) => {
                  setSelectedProjectTaskTitle(opt || null);

                  if (!opt) {
                    setTitle("");
                    setProjectMaxTat("");
                    return;
                  }

                  const pickedTitle = opt?.label ? String(opt.label) : "";
                  const pickedTat =
                    opt?.max_tat !== null && opt?.max_tat !== undefined
                      ? String(opt.max_tat)
                      : "";

                  setTitle(pickedTitle);
                  setProjectMaxTat(pickedTat);

                  if (
                    !deadlineDT &&
                    pickedTat &&
                    !Number.isNaN(Number(pickedTat))
                  ) {
                    const days = Number(pickedTat);
                    if (days > 0) {
                      const d = new Date();
                      d.setDate(d.getDate() + days);
                      setDeadlineDT(toDateTimeLocal(d));
                    }
                  }
                }}
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 2000 }),
                  control: (base) => ({ ...base, minHeight: 40 }),
                }}
              />
            ) : (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter Title of task..."
              />
            )}
          </FormControl>
        </Grid>

        <Grid xs={6}>
          <FormControl fullWidth>
            <FormLabel>Priority</FormLabel>
            <Select
              options={priorityOptions}
              isClearable
              value={
                priorityOptions.find((o) => o.value === Number(priority)) ||
                null
              }
              onChange={(opt) => setPriority(opt?.value ?? 0)}
              components={{
                SingleValue: PrioritySingleValue,
                Option: PriorityOption,
                IndicatorSeparator: () => null,
              }}
              styles={joySelectStyles}
              menuPortalTarget={document.body}
              placeholder="Select priority"
            />
          </FormControl>
        </Grid>

        <Grid xs={6}>
          <FormControl fullWidth>
            <FormLabel>Deadline</FormLabel>
            <Input
              type="datetime-local"
              value={deadlineDT || ""}
              onChange={(e) => setDeadlineDT(e.target.value)}
              placeholder="dd-mm-yyyy hh:mm"
            />
          </FormControl>
        </Grid>

        <Grid xs={12}>
          <FormControl fullWidth>
            <FormLabel>
              Assigned To{" "}
              {tab === "project" && !assignToTeam && category !== "Other"
                ? ` (${category} only)`
                : ""}
            </FormLabel>

            {tab !== "helpdesk" ? (
              <>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography level="body-sm">Assign to Individual</Typography>
                  <Switch
                    checked={assignToTeam}
                    onChange={(e) => {
                      setAssignToTeam(e.target.checked);
                      setAssignedTo(e.target.checked ? null : []);
                    }}
                  />
                  <Typography level="body-sm">Assign to Team</Typography>
                </Box>

                <Select
                  isMulti={!assignToTeam}
                  placeholder={assignToTeam ? "Select a team" : "Select Users"}
                  options={currentOptions}
                  value={assignValue}
                  isLoading={
                    assignToTeam
                      ? isLoadingDepts || isFetchingDepts
                      : isLoadingUsers || isFetchingUsers
                  }
                  onChange={(selected) => {
                    if (assignToTeam) setAssignedTo(selected?.value || null);
                    else {
                      const ids = Array.isArray(selected)
                        ? selected.map((o) => o.value)
                        : [];
                      setAssignedTo(ids);
                    }
                  }}
                  styles={joySelectStyles}
                  menuPortalTarget={document.body}
                />
              </>
            ) : (
              <Input value="IT Team" disabled />
            )}
          </FormControl>
        </Grid>

        <Grid xs={12}>
          <FormControl fullWidth>
            <FormLabel>Note</FormLabel>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Log a note..."
              minRows={3}
            />
          </FormControl>
        </Grid>

        {/* ✅ NEW UPLOAD SECTION (drag & drop) */}
        <Grid xs={12}>
          <FormControl fullWidth>
            <FormLabel>Attachments</FormLabel>

            <Box
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: "2px dashed",
                borderColor: isDragging
                  ? "#3366a3"
                  : "var(--joy-palette-neutral-outlinedBorder)",
                borderRadius: "lg",
                p: 2,
                cursor: "pointer",
                background: isDragging
                  ? "rgba(51, 102, 163, 0.06)"
                  : "transparent",
                transition: "0.2s",
              }}
            >
              <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                Drag & drop files here
              </Typography>
              <Typography
                level="body-xs"
                sx={{ mt: 0.5, color: "text.tertiary" }}
              >
                or click to browse (multiple allowed)
              </Typography>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => addFiles(e.target.files)}
              />
            </Box>

            {files.length > 0 ? (
              <Box sx={{ mt: 1 }}>
                {files.map((f, idx) => (
                  <Box
                    key={`${f.name}_${f.size}_${idx}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      p: 1,
                      borderRadius: "md",
                      border: "1px solid",
                      borderColor: "var(--joy-palette-neutral-outlinedBorder)",
                      mt: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        level="body-sm"
                        sx={{ fontWeight: 600 }}
                        noWrap
                      >
                        {f.name}
                      </Typography>
                      <Typography
                        level="body-xs"
                        sx={{ color: "text.tertiary" }}
                      >
                        {(f.size / 1024).toFixed(1)} KB
                      </Typography>
                    </Box>

                    <Button
                      size="sm"
                      variant="outlined"
                      color="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Box>
            ) : null}
          </FormControl>
        </Grid>

        <Grid xs={12} display="flex" justifyContent="flex-end" gap={1}>
          <Button
            variant="outlined"
            color="danger"
            onClick={() => {
              const confirmDiscard = window.confirm(
                "Are you sure you want to discard the changes?"
              );
              if (confirmDiscard) {
                setPriority(0);
                setAssignToTeam(false);
                setSearchText("");
                setSelectedProject(null);
                setTitle("");
                setDeadlineDT("");
                setNote("");
                setAssignedTo([]);
                setSubType("");
                setCategory("Engineering");
                setSelectedModules([]);
                setSelectedScmCats([]);
                setSelectedProjectTaskTitle(null);
                setProjectMaxTat("");
                setProjectsTitleQuickOptions([]);
                setFiles([]);
                setIsDragging(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }
            }}
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
            Discard
          </Button>

          <Button
            variant="solid"
            color="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            sx={{
              backgroundColor: "#3366a3",
              color: "#fff",
              "&:hover": { backgroundColor: "#285680" },
              height: "8px",
            }}
          >
            Submit
          </Button>
        </Grid>
      </Grid>

      {/* existing modals unchanged */}
      <SearchPickerModal
        open={openModulePicker}
        onClose={() => setOpenModulePicker(false)}
        title="Select Module"
        columns={[
          { key: "name", label: "Module", width: 260 },
          { key: "code", label: "Code", width: 140 },
          { key: "description", label: "Description" },
        ]}
        rowKey="_id"
        pageSize={10}
        searchKey="name or code"
        fetchPage={fetchAllowedModulePage}
        onPick={(row) => {
          if (!row) return;
          const opt = {
            value: String(row._id),
            label: row.name || "Untitled",
            raw: row,
          };
          const next = dedupeOptions([...selectedModules, opt]);
          setSelectedModules(next);
          updateTitleFromSelections(next, selectedScmCats);
          setOpenModulePicker(false);
        }}
      />

      <SearchPickerModal
        open={openScmPicker}
        onClose={() => setOpenScmPicker(false)}
        title="Select Material Category"
        columns={[
          { key: "name", label: "Category", width: 260 },
          { key: "description", label: "Description" },
        ]}
        rowKey="_id"
        pageSize={10}
        searchKey="name"
        fetchPage={fetchScmPage}
        onPick={(row) => {
          if (!row) return;
          const opt = {
            value: String(row._id),
            label: row.name || "Unnamed",
            raw: row,
          };
          const next = dedupeOptions([...selectedScmCats, opt]);
          setSelectedScmCats(next);
          updateTitleFromSelections(selectedModules, next);
          setOpenScmPicker(false);
        }}
      />
    </Card>
  );
};

export default AddTask;
