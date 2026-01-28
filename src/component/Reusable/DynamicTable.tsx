/**
 * DynamicTable.jsx
 *
 * A fully-featured, globally reusable table component for React (MUI Joy UI).
 * Designed for server-side pagination and filtering (API-driven, like AllLoan).
 *
 * Advanced Features:
 * - Dynamic columns with custom renderers
 * - Sticky columns with draggable divider
 * - Column visibility, ordering, and pinning (with modal UI)
 * - Row selection (single/multi)
 * - Per-column filtering (text, list, multiselect, daterange) with UI
 * - Inline cell editing with custom editors
 * - Drag-and-drop column reordering
 * - Server-side pagination with controls
 * - Loading, empty, and error states
 * - LocalStorage persistence for user preferences
 * - Responsive design
 * - URL sync support (handled by parent)
 * - Search functionality (handled by parent)
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import PropTypes from "prop-types";
import Box from "@mui/joy/Box";
import Checkbox from "@mui/joy/Checkbox";
import CircularProgress from "@mui/joy/CircularProgress";
import Input from "@mui/joy/Input";
import Button from "@mui/joy/Button";
import IconButton from "@mui/joy/IconButton";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Typography from "@mui/joy/Typography";
import Sheet from "@mui/joy/Sheet";
import Stack from "@mui/joy/Stack";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Chip from "@mui/joy/Chip";
import Tabs from "@mui/joy/Tabs";
import TabList from "@mui/joy/TabList";
import Tab from "@mui/joy/Tab";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { ColumnFilterPopover } from "../ColumnFilterPopover";

/**
 * DynamicTable Component
 *
 * A comprehensive, production-ready table with server-side pagination & filtering.
 * Parent component handles all API calls and URL param management.
 */
const DynamicTable = forwardRef(
  (
    {
      // Core data (pre-filtered, pre-paginated from API)
      columns = [],
      data = [],
      rowKey = "id",

      // Selection
      selectable = false,
      selectedRows: controlledSelectedRows,
      onSelectionChange,

      // Search (controlled by parent, synced with URL)
      searchable = false,
      searchPlaceholder = "Search...",
      searchQuery = "",
      onSearchChange,

      // Pagination (controlled by parent, synced with URL)
      pagination = null,
      // Expected format:
      // {
      //   currentPage: 1,
      //   rowsPerPage: 10,
      //   totalPages: 10,
      //   totalResults: 100,
      //   onPageChange: (page) => {},
      //   onPageSizeChange: (size) => {}
      // }

      // Filtering (controlled by parent, synced with URL)
      enableFiltering = false,
      filters = {}, // Current filter values from URL
      onFilterChange, // (colId, value) => update URL params
      filterConfig = {},

      // Inline Editing
      enableInlineEdit = false,
      onSave,
      nonEditableColumns = [],

      // Sticky Columns
      enableStickyDivider = false,
      defaultStickyWidth = 450,
      minStickyWidth = 80,
      maxStickyWidth = 5000,

      // Column Customization
      enableColumnCustomization = false,
      columnPresets = {},

      // Row Actions
      onRowDoubleClick,

      //Tab Selection
      tab = "",
      tabLabels = [],
      onTabChange,

      // UI States
      loading = false,
      emptyContent,
      error = null,

      // Storage
      storageKey = "dynamicTable",
      enableLocalStorage = true,

      // Styling
      className = "",
      style = {},
      maxHeight = "66vh",

      // Z-index configuration
      zIndex = {
        editorSticky: 25,
        editor: 100,
        headerSticky: 20,
        header: 15,
        checkboxSticky: 12,
        bodySticky: 10,
        body: 1,
      },

      ...rest
    },
    ref
  ) => {
    const STORAGE_KEY = `${storageKey}.settings.v1`;

    // ========== STATE MANAGEMENT ==========
    // Selection state (controlled or uncontrolled)
    const [internalSelectedRows, setInternalSelectedRows] = useState([]);
    const selectedRows =
      controlledSelectedRows !== undefined
        ? controlledSelectedRows
        : internalSelectedRows;
    const setSelectedRows = onSelectionChange || setInternalSelectedRows;

    // NOTE: Search, pagination, and filters are controlled by parent via URL params
    // No internal state for these - parent manages everything via API calls

    // Inline editing state
    const [editingCell, setEditingCell] = useState(null);
    const [cellOverrides, setCellOverrides] = useState({});
    const blurTimeoutRef = useRef(null);

    const defaultColumnIds = columns.map((c) => c.id);
    const defaultStickyIds = columns.slice(0, 2).map((c) => c.id);
    const loadSettings = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            visibleColumns:
              Array.isArray(parsed.visibleColumns) &&
              parsed.visibleColumns.length
                ? parsed.visibleColumns
                : defaultColumnIds,
            stickyColumns:
              Array.isArray(parsed.stickyColumns) && parsed.stickyColumns.length
                ? parsed.stickyColumns
                : defaultStickyIds,
            stickyAreaWidth:
              typeof parsed.stickyAreaWidth === "number"
                ? parsed.stickyAreaWidth
                : defaultStickyWidth,
          };
        }
      } catch {}
      // Save defaults if nothing in storage
      const defaults = {
        visibleColumns: defaultColumnIds,
        stickyColumns: defaultStickyIds,
        stickyAreaWidth: defaultStickyWidth,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    };

    const [settings, setSettings] = useState(loadSettings);
    const [visibleColumns, setVisibleColumns] = useState(
      settings.visibleColumns
    );

    const [stickyColumns, setStickyColumns] = useState(settings.stickyColumns);
    const [columnOrder, setColumnOrder] = useState(settings.visibleColumns);

    const [stickyAreaWidth, setStickyAreaWidth] = useState(
      settings.stickyAreaWidth
    );

    const [isDraggingDivider, setIsDraggingDivider] = useState(false);
    const [tableScrollLeft, setTableScrollLeft] = useState(0);
    const dividerDragStartRef = useRef(null);
    const tableContainerRef = useRef(null);
    const [containerRect, setContainerRect] = useState({
      left: 0,
      top: 0,
      height: 0,
    });

    // Column customization modal state
    const [colModalOpen, setColModalOpen] = useState(false);
    const [columnSearchQuery, setColumnSearchQuery] = useState("");
    const tabRefs = useRef({});
    const [activeTabWidth, setActiveTabWidth] = useState(0);
    const [activeTabLeft, setActiveTabLeft] = useState(0);

    // Drag-and-drop column reordering state
    const [dragState, setDragState] = useState({
      activeId: null,
      overId: null,
      position: null,
    });

    // Ensure column order includes any new columns
    useEffect(() => {
      setColumnOrder((prev) => {
        const known = new Set(prev);
        const missing = defaultColumnIds.filter((id) => !known.has(id));
        return missing.length ? [...prev, ...missing] : prev;
      });
    }, [defaultColumnIds]);

    useEffect(() => {
      // Calculate widths and positions when tabs change
      if (tabRefs.current[tab]) {
        const activeTab = tabRefs.current[tab];
        const parent = activeTab.parentElement;
        setActiveTabWidth(activeTab.offsetWidth);
        setActiveTabLeft(activeTab.offsetLeft - parent.offsetLeft);
      }
    }, [tab, tabLabels]);

    useEffect(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          visibleColumns,
          stickyColumns,
          stickyAreaWidth,
        })
      );
    }, [visibleColumns, stickyColumns, stickyAreaWidth]);

    // ========== DATA PROCESSING ==========
    // NO client-side filtering or pagination - data comes pre-processed from API
    // Parent is responsible for:
    // 1. Calling API with current page, pageSize, search, filters
    // 2. Passing the API response data directly to this component
    // 3. Managing URL params for all state (page, pageSize, search, filters)

    // Use data directly (already filtered and paginated by backend)
    const displayData = data;

    // Extract pagination info from parent-controlled pagination prop
    const currentPage = pagination?.currentPage || 1;
    const rowsPerPage = pagination?.rowsPerPage || 10;
    const totalPages = pagination?.totalPages || 1;
    const totalResults = pagination?.totalResults || data.length;

    // ========== COLUMN CALCULATIONS ==========
    const CHECKBOX_WIDTH = 40;

    // Calculate which columns are sticky based on divider position
    const {
      orderedColumns,
      stickyColumnDefs,
      nonStickyColumnDefs,
      stickyLeftPositions,
      totalVisibleStickyWidth,
    } = useMemo(() => {
      const orderedIds = columnOrder.filter((id) =>
        visibleColumns.includes(id)
      );

      let accumulatedWidth = CHECKBOX_WIDTH;
      const stickyIds = [];
      const nonStickyIds = [];

      if (enableStickyDivider) {
        for (const id of orderedIds) {
          const col = columns.find((c) => c.id === id);
          if (!col) continue;
          const colWidth = col.width || 150;
          if (accumulatedWidth + colWidth <= stickyAreaWidth) {
            stickyIds.push(id);
            accumulatedWidth += colWidth;
          } else {
            nonStickyIds.push(id);
          }
        }
      } else {
        // Use manual sticky configuration
        stickyIds.push(
          ...orderedIds.filter((id) => stickyColumns.includes(id))
        );
        nonStickyIds.push(
          ...orderedIds.filter((id) => !stickyColumns.includes(id))
        );
      }

      const orderedCols = orderedIds
        .map((id) => {
          const base = columns.find((c) => c.id === id);
          if (!base) return null;
          return { ...base, isSticky: stickyIds.includes(id) };
        })
        .filter(Boolean);

      const stickyCols = orderedCols.filter((c) => c.isSticky);
      const nonStickyCols = orderedCols.filter((c) => !c.isSticky);

      // Calculate left positions for sticky columns
      const leftPositions = [0]; // checkbox
      let currentLeft = CHECKBOX_WIDTH;
      stickyCols.forEach((col) => {
        const effectiveWidth = col.width || 150;
        leftPositions.push(currentLeft);
        currentLeft += effectiveWidth;
      });

      return {
        orderedColumns: [...stickyCols, ...nonStickyCols],
        stickyColumnDefs: stickyCols,
        nonStickyColumnDefs: nonStickyCols,
        stickyLeftPositions: leftPositions,
        totalVisibleStickyWidth: currentLeft,
      };
    }, [
      columnOrder,
      visibleColumns,
      columns,
      stickyColumns,
      enableStickyDivider,
      stickyAreaWidth,
      CHECKBOX_WIDTH,
    ]);

    const lastStickyIndex = orderedColumns.reduce(
      (lastIdx, col, idx) => (col.isSticky ? idx : lastIdx),
      -1
    );

    // ========== SELECTION HANDLERS ==========
    const handleSelectAll = (event) => {
      if (event.target.checked) {
        setSelectedRows(displayData.map((row) => row[rowKey]));
      } else {
        setSelectedRows([]);
      }
    };

    const handleRowSelect = (id) => {
      setSelectedRows((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    };

    // ========== SEARCH HANDLER ==========
    // Search is controlled by parent - just emit the change
    const handleSearch = (query) => {
      onSearchChange?.(query);
    };

    // ========== FILTER HANDLERS ==========
    // Filters are controlled by parent - just emit the change
    const handleFilterChange = (colId, value) => {
      onFilterChange?.(colId, value);
    };

    // ========== INLINE EDITING HANDLERS ==========
    const cellKey = (rowId, colId) => `${rowId}:${colId}`;

    const startInlineEdit = (row, colId) => {
      const rowId = row[rowKey];
      if (!rowId) return;

      // Clear any pending blur timeout
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }

      // Get initial value
      const key = cellKey(rowId, colId);
      const override = cellOverrides[key];
      const initial = override !== undefined ? override : row[colId] || "";

      setEditingCell({ rowId, colId, value: String(initial) });
    };

    const cancelInlineEdit = () => {
      setEditingCell(null);
    };

    const saveInlineEdit = async (row) => {
      if (!editingCell || editingCell.rowId !== row[rowKey]) return;

      const { rowId, colId, value } = editingCell;

      // Optimistic update
      setCellOverrides((prev) => ({ ...prev, [cellKey(rowId, colId)]: value }));

      try {
        // Call parent save handler
        if (onSave) {
          await onSave(rowId, colId, value, row);
        }
        cancelInlineEdit();
      } catch (err) {
        // Revert optimistic update on error
        setCellOverrides((prev) => {
          const next = { ...prev };
          delete next[cellKey(rowId, colId)];
          return next;
        });
        console.error("Failed to save cell edit:", err);
      }
    };

    // ========== PAGINATION HANDLERS ==========
    // Pagination is controlled by parent - just emit the change
    const handlePageChange = (page) => {
      const clampedPage = Math.max(1, Math.min(page, totalPages));
      pagination?.onPageChange?.(clampedPage);
    };

    const handleRowsPerPageChange = (newPageSize) => {
      if (newPageSize > 0) {
        pagination?.onPageSizeChange?.(newPageSize);
      }
    };

    const getPaginationRange = () => {
      const siblings = 1;
      const pages = [];
      if (totalPages <= 5 + siblings * 2) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        const left = Math.max(currentPage - siblings, 2);
        const right = Math.min(currentPage + siblings, totalPages - 1);
        pages.push(1);
        if (left > 2) pages.push("...");
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
      return pages;
    };

    // ========== STICKY DIVIDER HANDLERS ==========
    const handleTableScroll = useCallback((e) => {
      setTableScrollLeft(e.currentTarget.scrollLeft);
    }, []);

    const updateContainerRect = useCallback(() => {
      const el = tableContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setContainerRect({ left: rect.left, top: rect.top, height: rect.height });
    }, []);

    useEffect(() => {
      if (!enableStickyDivider) return;
      updateContainerRect();
      window.addEventListener("resize", updateContainerRect);
      window.addEventListener("scroll", updateContainerRect, true);
      return () => {
        window.removeEventListener("resize", updateContainerRect);
        window.removeEventListener("scroll", updateContainerRect, true);
      };
    }, [updateContainerRect, enableStickyDivider]);

    const handleDividerMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingDivider(true);
      dividerDragStartRef.current = {
        startX: e.clientX,
        startWidth: stickyAreaWidth,
      };
    };

    const handleDividerMouseMove = useCallback(
      (e) => {
        if (!isDraggingDivider || !dividerDragStartRef.current) return;

        const { startX, startWidth } = dividerDragStartRef.current;
        const deltaX = e.clientX - startX;
        const newWidth = startWidth + deltaX;

        const constrainedWidth = Math.min(
          Math.max(newWidth, minStickyWidth),
          maxStickyWidth
        );
        setStickyAreaWidth(constrainedWidth);
      },
      [isDraggingDivider, minStickyWidth, maxStickyWidth]
    );

    const handleDividerMouseUp = useCallback(() => {
      if (isDraggingDivider) {
        setIsDraggingDivider(false);
        dividerDragStartRef.current = null;
      }
    }, [isDraggingDivider]);

    useEffect(() => {
      if (isDraggingDivider) {
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";

        document.addEventListener("mousemove", handleDividerMouseMove);
        document.addEventListener("mouseup", handleDividerMouseUp);

        return () => {
          document.body.style.userSelect = "";
          document.body.style.cursor = "";
          document.removeEventListener("mousemove", handleDividerMouseMove);
          document.removeEventListener("mouseup", handleDividerMouseUp);
        };
      }
    }, [isDraggingDivider, handleDividerMouseMove, handleDividerMouseUp]);

    // ========== COLUMN REORDERING HANDLERS ==========
    const clearDragState = () =>
      setDragState({ activeId: null, overId: null, position: null });

    const reorderColumns = (dragId, targetId, position) => {
      if (!dragId || !targetId || dragId === targetId) return;

      setColumnOrder((prev) => {
        const next = [...prev];
        const from = next.indexOf(dragId);
        const to = next.indexOf(targetId);
        if (from === -1 || to === -1) return prev;
        next.splice(from, 1);
        const insertAt =
          position === "before"
            ? next.indexOf(targetId)
            : next.indexOf(targetId) + 1;
        next.splice(insertAt, 0, dragId);
        return next;
      });
      clearDragState();
    };

    const handleDragStart = (colId) => (e) => {
      e.dataTransfer.effectAllowed = "move";
      setDragState({ activeId: colId, overId: null, position: null });
    };

    const handleDragOver = (colId) => (e) => {
      if (!dragState.activeId) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const position =
        e.clientX - rect.left < rect.width / 2 ? "before" : "after";
      setDragState((prev) => ({ ...prev, overId: colId, position }));
    };

    const handleDragLeave = () => {
      setDragState((prev) => ({ ...prev, overId: null, position: null }));
    };

    const handleDrop = (colId) => (e) => {
      e.preventDefault();
      if (!dragState.activeId) return clearDragState();
      reorderColumns(dragState.activeId, colId, dragState.position || "after");
    };

    const handleDragEnd = () => clearDragState();

    // ========== COLUMN CUSTOMIZATION HANDLERS ==========
    const applyPreset = (ids) => setVisibleColumns(ids);

    const toggleSticky = (colId) => {
      if (enableStickyDivider) return; // Don't allow manual toggle when divider is enabled
      setStickyColumns((prev) =>
        prev.includes(colId)
          ? prev.filter((id) => id !== colId)
          : [...prev, colId]
      );
    };

    // ========== IMPERATIVE HANDLE ==========
    useImperativeHandle(ref, () => ({
      openColumnModal: () => setColModalOpen(true),
      getSelectedRows: () => selectedRows,
      clearSelection: () => setSelectedRows([]),
    }));

    // ========== RENDER ==========
    const totalCols = orderedColumns.length + (selectable ? 1 : 0);

    return (
      <Box
        className={className}
        style={style}
        sx={{
          minWidth: { xs: "100%", lg: "calc(100% - var(--Sidebar-width))" },
          overflow: "hidden",
          ...rest.sx,
        }}
      >
        <Box
          sx={{
            mb: 1,
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            width: { xs: "100%", lg: "100% " },
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="center">
            <Tabs
              value={tab}
              onChange={(_, newValue) => onTabChange(newValue)}
              sx={{
                bgcolor: "transparent",
                borderRadius: "lg",
                width: "fit-content",
                minHeight: "32px",
              }}
            >
              <TabList
                disableUnderline
                sx={{
                  p: 0.5,
                  m: 0,
                  gap: 0.5,
                  borderRadius: 999,
                  bgcolor: "#f4f4f5",
                  "--List-divider-gap": "0px",
                  borderBottom: "none",
                  textAlign: "center",
                  position: "relative",
                  "&::before": {
                    display: "none",
                  },
                  "&::after": {
                    display: "none",
                  },
                }}
              >
                {/* Animated background slider */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 4,
                    left: activeTabLeft,
                    height: "calc(100% - 8px)",
                    width: activeTabWidth,
                    bgcolor: "#ffffff",
                    borderRadius: 999,
                    boxShadow:
                      "0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(15,23,42,0.18)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    zIndex: 0,
                    pointerEvents: "none",
                  }}
                />

                {tabLabels.map((label) => (
                  <Tab
                    key={label}
                    value={label}
                    disableIndicator
                    ref={(el) => (tabRefs.current[label] = el)}
                    sx={{
                      px: 1.8,
                      py: 0.7,
                      borderRadius: 999,
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      transition: "color 1s ease-in-out, font-weight 0.3s ease",
                      bgcolor: "transparent",
                      textAlign: "center",
                      color: "text.secondary",
                      position: "relative",
                      zIndex: 1,
                      "&.Mui-selected": {
                        color: "text.primary",
                        fontWeight: 600,
                        bgcolor: "transparent",
                      },
                      "&:hover": {
                        bgcolor:
                          tab === label ? "transparent" : "rgba(0,0,0,0.04)",
                      },
                    }}
                  >
                    {label}
                  </Tab>
                ))}
              </TabList>
            </Tabs>
          </Box>
          {/* Search Bar */}
          {searchable && (
            <Box pb={0.5}>
              <Box
                sx={{
                  borderRadius: "sm",
                  py: 1,
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <Input
                  size="sm"
                  placeholder={searchPlaceholder}
                  startDecorator={<SearchIcon />}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  sx={{ flex: 1, width: "700px" }}
                />
              </Box>
            </Box>
          )}
        </Box>

        {/* Table Container */}
        <Sheet
          ref={tableContainerRef}
          variant="outlined"
          onScroll={handleTableScroll}
          sx={{
            display: "block",
            width: "100%",
            borderRadius: "sm",
            maxHeight: maxHeight,
            overflow: "auto",
            position: "relative",
          }}
        >
          {/* Sticky Divider */}
          {enableStickyDivider && containerRect.height > 0 && (
            <Box
              onMouseDown={handleDividerMouseDown}
              sx={{
                position: "fixed",
                left: containerRect.left + totalVisibleStickyWidth + "px",
                top: containerRect.top + "px",
                height: containerRect.height + "px",
                width: "18px",
                marginLeft: "-9px",
                cursor: "col-resize",
                zIndex: 1000,
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "none",
              }}
            >
              <DragIndicatorIcon
                sx={{
                  fontSize: "14px",
                  color: isDraggingDivider ? "#000000ff" : "#1f1f1fff",
                  opacity: isDraggingDivider ? 1 : 0.6,
                  transition: "color 0.2s ease, opacity 0.2s ease",
                  pointerEvents: "none",
                  ml: "2px",
                }}
              />
            </Box>
          )}

          {/* Table */}
          <Box
            component="table"
            sx={{
              width: "100%",
              minWidth: "1200px",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: "14px",
            }}
          >
            {/* Table Head */}
            <thead>
              <tr style={{ backgroundColor: "neutral.softBg" }}>
                {/* Checkbox column header */}
                {selectable && (
                  <th
                    style={{
                      position: "sticky",
                      left: 0,
                      top: 0,
                      background: "#e0e0e0",
                      zIndex: zIndex.headerSticky,
                      borderBottom: "1px solid #ddd",
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: "bold",
                      width: `${CHECKBOX_WIDTH}px`,
                      minWidth: `${CHECKBOX_WIDTH}px`,
                      maxWidth: `${CHECKBOX_WIDTH}px`,
                    }}
                  >
                    <Checkbox
                      size="sm"
                      checked={
                        selectedRows.length === displayData.length &&
                        displayData.length > 0
                      }
                      onChange={handleSelectAll}
                      indeterminate={
                        selectedRows.length > 0 &&
                        selectedRows.length < displayData.length
                      }
                    />
                  </th>
                )}

                {/* Dynamic column headers */}
                {orderedColumns.map((colDef, index) => {
                  const stickyIndex = orderedColumns
                    .slice(0, index + 1)
                    .filter((c) => c.isSticky).length;
                  const isSticky = colDef.isSticky;
                  const colWidth = colDef.width || 150;
                  const leftPos = isSticky
                    ? stickyLeftPositions[stickyIndex]
                    : undefined;
                  const isLastSticky = index === lastStickyIndex;
                  const isDragActive = dragState.activeId === colDef.id;
                  const isDragOver = dragState.overId === colDef.id;
                  const dragShadow = isDragOver
                    ? dragState.position === "before"
                      ? "inset 3px 0 0 #3366a3"
                      : "inset -3px 0 0 #3366a3"
                    : undefined;

                  const currentFilterValue = filters[colDef.id];
                  const isFilterActive =
                    currentFilterValue !== undefined &&
                    currentFilterValue !== null &&
                    currentFilterValue !== "";

                  return (
                    <th
                      key={colDef.id}
                      style={{
                        position: "sticky",
                        left: leftPos,
                        top: 0,
                        background: "#e0e0e0",
                        zIndex: isSticky ? zIndex.headerSticky : zIndex.header,
                        borderBottom: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "left",
                        fontWeight: "bold",
                        width: `${colWidth}px`,
                        minWidth: `${colWidth}px`,
                        maxWidth: `${colWidth}px`,
                        whiteSpace: "nowrap",
                        boxShadow:
                          dragShadow ||
                          (isLastSticky
                            ? "3px 0 5px -2px rgba(0,0,0,0.15)"
                            : undefined),
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <span
                          draggable={enableColumnCustomization}
                          onDragStart={
                            enableColumnCustomization
                              ? handleDragStart(colDef.id)
                              : undefined
                          }
                          onDragOver={
                            enableColumnCustomization
                              ? handleDragOver(colDef.id)
                              : undefined
                          }
                          onDragLeave={
                            enableColumnCustomization
                              ? handleDragLeave
                              : undefined
                          }
                          onDrop={
                            enableColumnCustomization
                              ? handleDrop(colDef.id)
                              : undefined
                          }
                          onDragEnd={
                            enableColumnCustomization
                              ? handleDragEnd
                              : undefined
                          }
                          style={{
                            cursor: enableColumnCustomization
                              ? "grab"
                              : "default",
                            opacity: dragState.activeId === colDef.id ? 0.6 : 1,
                            padding: "0px 4px",
                            borderRadius: "4px",
                            userSelect: "none",
                            backgroundColor:
                              dragState.activeId === colDef.id
                                ? "rgba(0,0,0,0.1)"
                                : "transparent",
                          }}
                        >
                          {colDef.label}
                        </span>
                        {enableFiltering && colDef.filterType && (
                          <ColumnFilterPopover
                            columnId={colDef.id}
                            columnLabel={colDef.label}
                            value={currentFilterValue}
                            filterType={colDef.filterType}
                            options={colDef.filterOptions}
                            onChange={(value) =>
                              handleFilterChange(colDef.id, value)
                            }
                            isActive={isFilterActive}
                            placeholder={colDef.filterPlaceholder}
                            {...(colDef.filterType === "list" &&
                            colDef.listConfig
                              ? {
                                  fetchPage: async ({
                                    page,
                                    search,
                                    pageSize,
                                  }) => {
                                    const ft =
                                      colDef.listConfig?.filterTypeParam;
                                    try {
                                      const res =
                                        await filterConfig?.triggerLogisticsFilterOptions(
                                          {
                                            search: search || "",
                                            page,
                                            limit: pageSize,
                                            filterType: ft,
                                          },
                                          true
                                        );
                                      const payload = res?.data || {};
                                      const rows = payload?.data ?? [];
                                      const total =
                                        payload?.pagination?.total ??
                                        rows.length;
                                      return { rows, total };
                                    } catch (e) {
                                      return { rows: [], total: 0 };
                                    }
                                  },
                                  pageSize: colDef.listConfig?.pageSize ?? 7,
                                  getItemLabel: colDef.listConfig?.getItemLabel,
                                }
                              : {})}
                          />
                        )}
                      </Box>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={totalCols}
                    style={{ padding: "8px", textAlign: "center" }}
                  >
                    <Box
                      sx={{
                        fontStyle: "italic",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CircularProgress
                        size="sm"
                        sx={{ marginBottom: "8px" }}
                      />
                      <Typography fontStyle="italic">Loading...</Typography>
                    </Box>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={totalCols}
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      color: "red",
                    }}
                  >
                    {typeof error === "string" ? error : "Error loading data"}
                  </td>
                </tr>
              ) : displayData.length > 0 ? (
                displayData.map((row, rowIdx) => {
                  const rowId = row[rowKey] ?? rowIdx;
                  const isSelected = selectedRows.includes(rowId);

                  return (
                    <tr
                      key={rowId}
                      style={{
                        cursor: onRowDoubleClick ? "pointer" : "default",
                      }}
                      onDoubleClick={() => onRowDoubleClick?.(row)}
                    >
                      {/* Checkbox cell */}
                      {selectable && (
                        <td
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "sticky",
                            left: 0,
                            borderBottom: "1px solid #ddd",
                            padding: "8px",
                            textAlign: "left",
                            background: "#fff",
                            zIndex: zIndex.checkboxSticky,
                            width: `${CHECKBOX_WIDTH}px`,
                            minWidth: `${CHECKBOX_WIDTH}px`,
                            maxWidth: `${CHECKBOX_WIDTH}px`,
                          }}
                        >
                          <Checkbox
                            size="sm"
                            checked={isSelected}
                            onChange={() => handleRowSelect(rowId)}
                          />
                        </td>
                      )}

                      {/* Dynamic cells */}
                      {orderedColumns.map((colDef, index) => {
                        const stickyIndex = orderedColumns
                          .slice(0, index + 1)
                          .filter((c) => c.isSticky).length;
                        const isSticky = colDef.isSticky;
                        const colWidth = colDef.width || 150;
                        const leftPos = isSticky
                          ? stickyLeftPositions[stickyIndex]
                          : undefined;
                        const isLastSticky = index === lastStickyIndex;
                        const isEditing =
                          editingCell?.rowId === rowId &&
                          editingCell?.colId === colDef.id;
                        const isEditable =
                          enableInlineEdit &&
                          !nonEditableColumns.includes(colDef.id) &&
                          colDef.editable !== false;

                        const key = cellKey(rowId, colDef.id);
                        const override = cellOverrides[key];

                        return (
                          <td
                            key={colDef.id}
                            onClick={(e) => {
                              if (!isEditing && isEditable) {
                                e.preventDefault();
                                e.stopPropagation();
                                startInlineEdit(row, colDef.id);
                              }
                            }}
                            style={{
                              position: isSticky ? "sticky" : "static",
                              left: leftPos,
                              background: "#fff",
                              borderBottom: "1px solid #ddd",
                              padding: "10px 8px",
                              zIndex:
                                isEditing && isSticky
                                  ? zIndex.editorSticky
                                  : isSticky
                                  ? zIndex.bodySticky
                                  : zIndex.body,
                              width: `${colWidth}px`,
                              minWidth: `${colWidth}px`,
                              maxWidth: `${colWidth}px`,
                              overflow: isEditing ? "visible" : "hidden",
                              cursor: isEditable ? "text" : "default",
                              boxShadow: isLastSticky
                                ? "3px 0 5px -2px rgba(0,0,0,0.15)"
                                : undefined,
                            }}
                          >
                            {isEditing ? (
                              <Input
                                size="sm"
                                variant="plain"
                                autoFocus
                                value={editingCell.value}
                                type={colDef.inputType || "text"}
                                onChange={(e) =>
                                  setEditingCell({
                                    ...editingCell,
                                    value: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    saveInlineEdit(row);
                                  } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    cancelInlineEdit();
                                  }
                                }}
                                onBlur={() => {
                                  blurTimeoutRef.current = setTimeout(() => {
                                    blurTimeoutRef.current = null;
                                    if (
                                      editingCell?.rowId === rowId &&
                                      editingCell?.colId === colDef.id
                                    ) {
                                      cancelInlineEdit();
                                    }
                                  }, 100);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                  width: "100%",
                                  backgroundColor: "#f5f7fa",
                                  borderRadius: "3px",
                                  "--Input-minHeight": "1.5rem",
                                  "& input": {
                                    padding: "4px 6px !important",
                                    fontSize: "0.875rem",
                                    height: "1.5rem",
                                  },
                                  boxShadow: "inset 0 0 0 1px #cbd5e0",
                                  "&:focus-within": {
                                    backgroundColor: "#fff",
                                    boxShadow: "inset 0 0 0 2px #4299e1",
                                  },
                                }}
                              />
                            ) : (
                              <>
                                {override !== undefined ? (
                                  <Typography level="body-sm">
                                    {String(override || "-")}
                                  </Typography>
                                ) : colDef.render ? (
                                  colDef.render(row, { rowIdx, colDef })
                                ) : (
                                  <Typography level="body-sm">
                                    {row[colDef.id] || "-"}
                                  </Typography>
                                )}
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={totalCols}
                    style={{ padding: "40px 8px", textAlign: "center" }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        py: 4,
                      }}
                    >
                      {emptyContent || (
                        <Typography fontStyle="italic">
                          No data available
                        </Typography>
                      )}
                    </Box>
                  </td>
                </tr>
              )}
            </tbody>
          </Box>
        </Sheet>

        {/* Pagination */}
        {pagination && (
          <Box
            sx={{
              pt: 0.5,
              gap: 1,
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
              disabled={currentPage === 1}
              sx={{
                minHeight: 36,
                fontWeight: 600,
                transition: "all 0.2s ease",
                "&:hover:not(:disabled)": {
                  bgcolor: "primary.softBg",
                  borderColor: "primary.outlinedBorder",
                  color: "primary.solidColor",
                  transform: "translateX(-2px)",
                  boxShadow: "sm",
                },
              }}
            >
              Previous
            </Button>

            <Box
              sx={{
                fontSize: "14px",
                fontWeight: 500,
                color: "text.secondary",
                px: 2,
              }}
            >
              Showing {displayData.length} results
            </Box>

            <Box
              sx={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                gap: 1,
              }}
            >
              {getPaginationRange().map((page, idx) =>
                page === "..." ? (
                  <Box key={`ellipsis-${idx}`} sx={{ px: 1 }}>
                    ...
                  </Box>
                ) : (
                  <IconButton
                    key={page}
                    size="sm"
                    variant={page === currentPage ? "contained" : "outlined"}
                    color="neutral"
                    onClick={() => handlePageChange(page)}
                    sx={{ borderRadius: "50px" }}
                  >
                    {page}
                  </IconButton>
                )
              )}
            </Box>

            <Box
              display="flex"
              alignItems="center"
              gap={1}
              sx={{ padding: "8px 16px" }}
            >
              <Select
                value={rowsPerPage}
                onChange={(e, newValue) => handleRowsPerPageChange(newValue)}
                size="sm"
                variant="outlined"
                sx={{
                  minWidth: 80,
                  borderRadius: "md",
                  boxShadow: "sm",
                  fontWeight: 600,
                }}
              >
                {[10, 25, 50, 100].map((value) => (
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
              disabled={currentPage >= totalPages}
              sx={{
                minHeight: 36,
                fontWeight: 600,
                transition: "all 0.2s ease",
                "&:hover:not(:disabled)": {
                  bgcolor: "primary.softBg",
                  borderColor: "primary.outlinedBorder",
                  color: "primary.solidColor",
                  transform: "translateX(2px)",
                  boxShadow: "sm",
                },
              }}
            >
              Next
            </Button>
          </Box>
        )}

        {/* Column Customization Modal */}
        {enableColumnCustomization && (
          <Modal
            open={colModalOpen}
            onClose={() => setColModalOpen(false)}
            sx={{ zIndex: 10000 }}
          >
            <ModalDialog
              sx={{
                width: 640,
                maxWidth: "90vw",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                zIndex: 10001,
              }}
            >
              <ModalClose />
              <Typography level="title-lg" sx={{ mb: 2, fontWeight: 600 }}>
                Customize Columns
              </Typography>

              {/* Presets */}
              {Object.keys(columnPresets).length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    level="body-sm"
                    sx={{ mb: 1, fontWeight: 600, color: "text.secondary" }}
                  >
                    Quick Presets
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ flexWrap: "wrap", gap: 1 }}
                  >
                    {Object.entries(columnPresets).map(([name, ids]) => (
                      <Chip
                        key={name}
                        onClick={() => applyPreset(ids)}
                        variant="soft"
                        color="primary"
                        sx={{
                          cursor: "pointer",
                          "&:hover": { bgcolor: "primary.softHoverBg" },
                        }}
                      >
                        {name}
                      </Chip>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Search */}
              <Box sx={{ mb: 2 }}>
                <Input
                  size="sm"
                  placeholder="Search columns..."
                  value={columnSearchQuery}
                  onChange={(e) => setColumnSearchQuery(e.target.value)}
                  sx={{ width: "100%" }}
                />
              </Box>

              {/* Column List */}
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={2} sx={{ mb: 1, px: 1 }}>
                  <Typography
                    level="body-xs"
                    sx={{ fontWeight: 600, color: "text.secondary", flex: 1 }}
                  >
                    COLUMN NAME
                  </Typography>
                  <Typography
                    level="body-xs"
                    sx={{
                      fontWeight: 600,
                      color: "text.secondary",
                      width: 80,
                      textAlign: "center",
                    }}
                  >
                    VISIBLE
                  </Typography>
                  {!enableStickyDivider && (
                    <Typography
                      level="body-xs"
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        width: 80,
                        textAlign: "center",
                      }}
                    >
                      PINNED
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Sheet
                variant="outlined"
                sx={{
                  borderRadius: "md",
                  overflow: "auto",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                <Stack spacing={0}>
                  {columns
                    .filter(
                      (col) =>
                        columnSearchQuery.trim() === "" ||
                        col.label
                          .toLowerCase()
                          .includes(columnSearchQuery.toLowerCase())
                    )
                    .map((col) => {
                      const isVisible = visibleColumns.includes(col.id);
                      const isSticky = stickyColumns.includes(col.id);
                      return (
                        <Box
                          key={col.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            px: 2,
                            py: 1.5,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            "&:last-child": { borderBottom: "none" },
                            "&:hover": { bgcolor: "background.level1" },
                          }}
                        >
                          <Typography
                            level="body-sm"
                            sx={{ flex: 1, fontWeight: isSticky ? 600 : 400 }}
                          >
                            {col.label}
                            {isSticky && !enableStickyDivider && (
                              <Chip
                                size="sm"
                                variant="soft"
                                color="primary"
                                sx={{ ml: 1, fontSize: "0.7rem", height: 20 }}
                              >
                                Pinned
                              </Chip>
                            )}
                          </Typography>
                          <Box
                            sx={{
                              width: 80,
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <Checkbox
                              size="sm"
                              checked={isVisible}
                              onChange={(e) => {
                                setVisibleColumns((prev) =>
                                  e.target.checked
                                    ? [...prev, col.id]
                                    : prev.filter((x) => x !== col.id)
                                );
                                if (!e.target.checked && isSticky) {
                                  setStickyColumns((prev) =>
                                    prev.filter((x) => x !== col.id)
                                  );
                                }
                              }}
                            />
                          </Box>
                          {!enableStickyDivider && (
                            <Box
                              sx={{
                                width: 80,
                                display: "flex",
                                justifyContent: "center",
                              }}
                            >
                              <Checkbox
                                size="sm"
                                checked={isSticky}
                                disabled={!isVisible}
                                onChange={() => toggleSticky(col.id)}
                                color="primary"
                                variant="soft"
                              />
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                </Stack>
              </Sheet>

              {/* Info Footer */}
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: "background.level1",
                  borderRadius: "sm",
                }}
              >
                <Typography level="body-xs" sx={{ color: "text.secondary" }}>
                  💡 <strong>Tip:</strong>{" "}
                  {enableStickyDivider
                    ? "Use the draggable divider to adjust which columns are pinned."
                    : "Pinned columns will always appear on the left and remain visible while scrolling."}
                </Typography>
              </Box>

              {/* Action Buttons */}
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
                sx={{ mt: 2 }}
              >
                <Typography level="body-sm" sx={{ color: "text.secondary" }}>
                  {visibleColumns.length} of {columns.length} columns visible
                  {!enableStickyDivider &&
                    stickyColumns.length > 0 &&
                    ` • ${stickyColumns.length} pinned`}
                </Typography>
                <Button
                  size="sm"
                  variant="solid"
                  onClick={() => setColModalOpen(false)}
                  sx={{ minWidth: 100 }}
                >
                  Done
                </Button>
              </Stack>
            </ModalDialog>
          </Modal>
        )}
      </Box>
    );
  }
);

DynamicTable.displayName = "DynamicTable";

DynamicTable.propTypes = {
  // Core data (pre-filtered, pre-paginated from API)
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.node.isRequired,
      width: PropTypes.number,
      sticky: PropTypes.bool,
      editable: PropTypes.bool,
      render: PropTypes.func,
      filterType: PropTypes.oneOf(["text", "list", "multiselect", "daterange"]),
      filterParam: PropTypes.string, // URL param name for this filter
      filterOptions: PropTypes.array,
      filterPlaceholder: PropTypes.string,
      listConfig: PropTypes.shape({
        fetchPage: PropTypes.func,
        pageSize: PropTypes.number,
        getItemLabel: PropTypes.func,
      }),
      inputType: PropTypes.string,
    })
  ).isRequired,
  data: PropTypes.array.isRequired, // Already filtered/paginated data from API
  rowKey: PropTypes.string,

  // Selection
  selectable: PropTypes.bool,
  selectedRows: PropTypes.array,
  onSelectionChange: PropTypes.func,

  // Search (controlled by parent)
  searchable: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  searchQuery: PropTypes.string, // Current search from URL
  onSearchChange: PropTypes.func, // (query) => update URL and call API

  // Pagination (controlled by parent)
  pagination: PropTypes.shape({
    currentPage: PropTypes.number.isRequired,
    rowsPerPage: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    totalResults: PropTypes.number.isRequired,
    onPageChange: PropTypes.func.isRequired, // (page) => update URL and call API
    onPageSizeChange: PropTypes.func.isRequired, // (size) => update URL and call API
  }),

  // Filtering (controlled by parent)
  enableFiltering: PropTypes.bool,
  filters: PropTypes.object, // Current filter values from URL
  onFilterChange: PropTypes.func, // (colId, value) => update URL and call API

  // Inline Editing
  enableInlineEdit: PropTypes.bool,
  onSave: PropTypes.func,
  nonEditableColumns: PropTypes.arrayOf(PropTypes.string),

  // Sticky Columns
  enableStickyDivider: PropTypes.bool,
  defaultStickyWidth: PropTypes.number,
  minStickyWidth: PropTypes.number,
  maxStickyWidth: PropTypes.number,

  // Column Customization
  enableColumnCustomization: PropTypes.bool,
  columnPresets: PropTypes.object,

  // Row Actions
  onRowDoubleClick: PropTypes.func,

  // UI States
  loading: PropTypes.bool,
  emptyContent: PropTypes.node,
  error: PropTypes.node,

  // Storage
  storageKey: PropTypes.string,
  enableLocalStorage: PropTypes.bool,

  // Styling
  className: PropTypes.string,
  style: PropTypes.object,
  maxHeight: PropTypes.string,
  zIndex: PropTypes.object,
};

export default DynamicTable;
