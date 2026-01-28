/**
 * ColumnFilterPopover Component - Completely Redesigned
 * 
 * Features:
 * - Smart viewport positioning (never goes off-screen)
 * - Always-visible sticky footer with buttons
 * - Type-aware filters (text, select, daterange, multiselect)
 * - Consistent UI across all filter types
 * - Better UX with local state batching for multiselect
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Input,
  Option,
  Select,
  Stack,
  Typography,
} from '@mui/joy';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { addDays, startOfMonth, endOfMonth } from 'date-fns';
import enIN from 'date-fns/locale/en-IN';
import { Suspense, lazy } from 'react';

const DateRange = lazy(() =>
  import('react-date-range').then((m) => ({ default: m.DateRange }))
);

/* ============================================================================
   EMBEDDED HOOKS - useClickOutside and useDebounce (NO SEPARATE FILES)
   ============================================================================ */

/**
 * useClickOutside Hook
 */
function useClickOutside(callback, disabled = false) {
  const ref = useRef(null);

  useEffect(() => {
    if (disabled) return;

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback(event);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [callback, disabled]);

  return ref;
}

/**
 * useDebounce Hook
 */
function useDebounce(callback, delay = 300) {
  const timeoutRef = useRef(null);

  const debounced = useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debounced;
}

/* ============================================================================
   UTILITY FUNCTIONS
   ============================================================================ */

const fmt = (d) =>
  d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : '';

const parseLocal = (s) => {
  if (!s) return undefined;
  const d = new Date(s);
  return !isNaN(d) ? d : undefined;
};

function normalizeOptions(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .filter((x) => x !== undefined && x !== null)
    .map((x) => {
      if (typeof x === 'string' || typeof x === 'number')
        return { label: String(x), value: String(x) };
      if (typeof x === 'object') {
        const label = x.label ?? x.name ?? x.title ?? x.value ?? x.id;
        const value = x.value ?? x.id ?? x.code ?? label;
        return {
          label: String(label ?? 'Unknown'),
          value: String(value ?? 'Unknown'),
        };
      }
      return { label: String(x), value: String(x) };
    });
}

/**
 * Default item label extractor for remote list
 */
function defaultItemLabel(item) {
  if (!item || typeof item !== 'object') return String(item ?? '');
  return (
    item.label ||
    item.name ||
    item.title ||
    item.code ||
    item.customer ||
    item.value ||
    item._id ||
    ''
  );
}

/* ============================================================================
   FILTER CONTENT COMPONENTS
   ============================================================================ */

/**
 * Text Filter Content
 */
function TextFilterContent({ value, onChange, placeholder = 'Filter...' }) {
  const [input, setInput] = useState(value || '');
  const debouncedChange = useDebounce((text) => {
    onChange(text || undefined);
  }, 300);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInput(text);
    debouncedChange(text);
  };

  return (
    <Box>
      <Input
        size="sm"
        placeholder={placeholder}
        value={input}
        onChange={handleInputChange}
        autoFocus
        slotProps={{
          input: {
            style: { fontSize: '0.875rem' },
          },
        }}
      />
    </Box>
  );
}

/**
 * Date Range Filter Content
 */
function DateRangeFilterContent({ value, onChange }) {
  const from = value?.from ? parseLocal(value.from) : undefined;
  const to = value?.to ? parseLocal(value.to) : undefined;
  const selection = {
    startDate: from || new Date(),
    endDate: to || new Date(),
    key: 'selection',
  };

  return (
    <Stack spacing={1.5}>
      {/* Quick Preset Buttons */}
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        <Button
          size="sm"
          variant="outlined"
          onClick={() =>
            onChange({ from: fmt(new Date()), to: fmt(new Date()) })
          }
          sx={{ fontSize: '0.75rem' }}
        >
          Today
        </Button>
        <Button
          size="sm"
          variant="outlined"
          onClick={() =>
            onChange({
              from: fmt(addDays(new Date(), -6)),
              to: fmt(new Date()),
            })
          }
          sx={{ fontSize: '0.75rem' }}
        >
          Last Week
        </Button>
        <Button
          size="sm"
          variant="outlined"
          onClick={() =>
            onChange({
              from: fmt(startOfMonth(new Date())),
              to: fmt(endOfMonth(new Date())),
            })
          }
          sx={{ fontSize: '0.75rem' }}
        >
          This Month
        </Button>
      </Stack>

      {/* Calendar */}
      <Suspense fallback={<Box sx={{ p: 1, textAlign: 'center', fontSize: '0.75rem' }}>Loading…</Box>}>
        <DateRange
          locale={enIN}
          ranges={[selection]}
          onChange={(r) => {
            const sel = r.selection || r?.ranges?.selection;
            if (!sel) return;
            onChange({
              from: fmt(sel.startDate),
              to: fmt(sel.endDate),
            });
          }}
          moveRangeOnFirstSelection={false}
          months={1}
          direction="horizontal"
          rangeColors={['#3366a3']}
        />
      </Suspense>
    </Stack>
  );
}

/**
 * MultiSelect Filter Content - Checkbox list with local state
 */
function MultiSelectFilterContent({ value, options, onApply, onClear }) {
  const opts = normalizeOptions(options);
  
  // Local state for selections
  const [localSelection, setLocalSelection] = useState(() => {
    return new Set(Array.isArray(value) ? value : []);
  });
  
  const allSelected = opts.length > 0 && opts.every((o) => localSelection.has(o.value));
  const anySelected = opts.some((o) => localSelection.has(o.value));

  const handleToggle = (optValue) => {
    const next = new Set(localSelection);
    if (next.has(optValue)) {
      next.delete(optValue);
    } else {
      next.add(optValue);
    }
    setLocalSelection(next);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setLocalSelection(new Set());
    } else {
      setLocalSelection(new Set(opts.map((o) => o.value)));
    }
  };

  // Expose functions to parent via ref
  useEffect(() => {
    onApply.current = () => {
      const selectedArray = Array.from(localSelection);
      return selectedArray.length > 0 ? selectedArray : undefined;
    };
    
    onClear.current = () => {
      setLocalSelection(new Set());
    };
  }, [localSelection, onApply, onClear]);

  return (
    <Stack spacing={0.5}>
      {/* Select All / Deselect All */}
      <Box sx={{ pb: 1, borderBottom: '1px solid #e0e0e0' }}>
        <Checkbox
          label={allSelected ? 'Deselect All' : 'Select All'}
          checked={allSelected}
          indeterminate={anySelected && !allSelected}
          onChange={handleSelectAll}
          size="sm"
          slotProps={{
            label: { style: { fontSize: '0.875rem', fontWeight: 500 } },
          }}
        />
      </Box>

      {/* Checkbox List */}
      {opts.map((opt) => (
        <Checkbox
          key={opt.value}
          label={opt.label}
          checked={localSelection.has(opt.value)}
          onChange={() => handleToggle(opt.value)}
          size="sm"
          slotProps={{
            label: { style: { fontSize: '0.8125rem' } },
          }}
        />
      ))}
    </Stack>
  );
}

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

/**
 * Main ColumnFilterPopover Component
 */
export function ColumnFilterPopover({
  columnId,
  columnLabel,
  filterType = 'text',
  value,
  options = [],
  onChange,
  isActive = false,
  // Remote list configuration (used when filterType === 'list')
  fetchPage,
  pageSize = 7,
  getItemLabel = defaultItemLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const popoverRef = useClickOutside(() => setIsOpen(false), !isOpen);
  const containerRef = useRef(null);
  
  // Refs for multiselect functions
  const multiSelectApplyRef = useRef(null);
  const multiSelectClearRef = useRef(null);
  
  // Refs for list filter functions
  const listApplyRef = useRef(null);
  const listClearRef = useRef(null);

  // Smart positioning calculation
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Adjust height based on filter type - multiselect with many options needs less height
      const popoverHeight = filterType === 'daterange' ? 450 : filterType === 'multiselect' ? 380 : 320;
      const popoverWidth = 320; // Fixed width
      const padding = 8;
      
      let top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX;
      
      // Check bottom boundary
      if (top + popoverHeight > window.innerHeight + window.scrollY) {
        top = Math.max(padding, rect.top + window.scrollY - popoverHeight - 8);
      }
      
      // Check right boundary
      if (left + popoverWidth > window.innerWidth) {
        left = Math.max(padding, window.innerWidth - popoverWidth - padding);
      }
      
      // Check left boundary
      if (left < padding) {
        left = padding;
      }
      
      setPopoverPos({ top, left });
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleIconClick = (e) => {
    console.log("Filter icon clicked");
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
    console.log("isOpen state:", !isOpen);
  };

  const handleApply = () => {
    if (filterType === 'multiselect' && multiSelectApplyRef.current) {
      const result = multiSelectApplyRef.current();
      onChange(result);
    } else if (filterType === 'list' && listApplyRef.current) {
      const result = listApplyRef.current();
      onChange(result);
    }
    handleClose();
  };

  const handleClear = () => {
    if (filterType === 'multiselect' && multiSelectClearRef.current) {
      multiSelectClearRef.current();
      onChange(undefined);
    } else if (filterType === 'list' && listClearRef.current) {
      listClearRef.current();
      onChange(undefined);
    } else {
      onChange(undefined);
    }
    handleClose();
  };

  const hasValue =
    value !== undefined &&
    value !== null &&
    !(Array.isArray(value) && value.length === 0) &&
    !(
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value || {}).length === 0
    );

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      {/* Filter Icon Button */}
      <Box
        onClick={handleIconClick}
        sx={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: 28,
          height: 28,
          borderRadius: '8px',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          color: hasValue ? '#1976d2' : isActive ? '#1976d2' : '#9e9e9e',
          backgroundColor: hasValue 
            ? 'rgba(25, 118, 210, 0.12)' 
            : isActive 
              ? 'rgba(25, 118, 210, 0.08)' 
              : 'transparent',
          border: hasValue ? '1.5px solid rgba(25, 118, 210, 0.3)' : '1.5px solid transparent',
          boxShadow: hasValue ? '0 2px 8px rgba(25, 118, 210, 0.15)' : 'none',
          '&:hover': {
            backgroundColor: hasValue 
              ? 'rgba(25, 118, 210, 0.18)' 
              : 'rgba(25, 118, 210, 0.12)',
            color: '#1976d2',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
            border: '1.5px solid rgba(25, 118, 210, 0.4)',
          },
          '&:active': {
            transform: 'translateY(0px)',
            boxShadow: hasValue ? '0 2px 6px rgba(25, 118, 210, 0.15)' : 'none',
          },
        }}
      >
        {/* Always use filled FilterAltIcon */}
        <FilterAltIcon 
          sx={{ 
            fontSize: 18,
            fontWeight: hasValue ? 700 : 500,
            transition: 'all 0.2s ease',
          }} 
        />
        
        {/* Active filter indicator badge - small dot */}
        {hasValue && (
          <Box
            sx={{
              position: 'absolute',
              top: '3px',
              right: '3px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#1976d2',
              border: '2px solid #fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.7 },
              },
            }}
          />
        )}
      </Box>

      {/* Popover Container */}
      {isOpen && (
        <Box
          ref={popoverRef}
          sx={{
            position: 'fixed',
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            width: '320px',
            maxHeight: '520px',
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 4px 28px rgba(0,0,0,0.12)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.15s ease-in-out',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'scale(0.95)' },
              to: { opacity: 1, transform: 'scale(1)' },
            },
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header - Optional Title */}
          {filterType !== 'select' && (
            <Box
              sx={{
                px: 2,
                pt: 1.5,
                pb: 1,
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <Typography level="body-sm" sx={{ fontWeight: 600, color: '#666' }}>
                Filter: {columnLabel}
              </Typography>
            </Box>
          )}

          {/* Content Area - Scrollable */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              px: 2,
              py: 1.5,
              maxHeight: filterType === 'multiselect' ? '280px' : filterType === 'daterange' ? '380px' : filterType === 'list' ? '360px' : '240px',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#ccc',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#999',
              },
            }}
          >
            {filterType === 'text' && (
              <TextFilterContent
                value={value}
                onChange={onChange}
                placeholder={`Filter ${columnLabel}...`}
              />
            )}

            {filterType === 'daterange' && (
              <DateRangeFilterContent
                value={value}
                onChange={onChange}
              />
            )}

            {filterType === 'multiselect' && (
              <MultiSelectFilterContent
                value={value}
                options={options}
                onApply={multiSelectApplyRef}
                onClear={multiSelectClearRef}
              />
            )}

            {filterType === 'select' && (
              <Select
                size="sm"
                value={value || ''}
                onChange={(_, newValue) => {
                  onChange(newValue || undefined);
                  handleClose();
                }}
                slotProps={{
                  button: {
                    sx: { fontSize: '0.875rem' },
                  },
                }}
              >
                <Option value="">— Clear Filter —</Option>
                {normalizeOptions(options).map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            )}

            {filterType === 'list' && (
              <RemoteListContent
                value={value}
                fetchPage={fetchPage}
                pageSize={pageSize}
                getItemLabel={getItemLabel}
                columnLabel={columnLabel}
                onApply={listApplyRef}
                onClear={listClearRef}
              />
            )}
          </Box>

          {/* Footer - Always Visible Buttons (except for select which auto-closes) */}
          {filterType !== 'select' && (
            <Box
              sx={{
                borderTop: '1px solid #e0e0e0',
                px: 2,
                py: 1.25,
                display: 'flex',
                gap: 0.75,
                justifyContent: 'flex-end',
                backgroundColor: '#fafafa',
                flexShrink: 0,
              }}
            >
              <Button
                size="sm"
                variant="plain"
                color="danger"
                onClick={handleClear}
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  px: 1.5,
                  '&:hover': {
                    backgroundColor: '#ffebee',
                  },
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="plain"
                onClick={handleClose}
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  px: 1.5,
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                Close
              </Button>
              <Button
                size="sm"
                variant="solid"
                onClick={handleApply}
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  px: 2,
                  backgroundColor: '#3366a3',
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: '#254d7f',
                  },
                }}
              >
                Done
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export default ColumnFilterPopover;

/**
 * RemoteListContent - list with search + pagination for remote options
 */
function RemoteListContent({ value, fetchPage, pageSize = 7, getItemLabel = defaultItemLabel, columnLabel, onApply, onClear }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Local selection state
  const [localSelection, setLocalSelection] = useState(value || '');

  // Sync local selection when value prop changes
  useEffect(() => {
    setLocalSelection(value || '');
  }, [value]);
  
  // Expose apply/clear functions to parent via refs
  useEffect(() => {
    if (onApply && typeof onApply === 'object') {
      onApply.current = () => localSelection;
    }
    if (onClear && typeof onClear === 'object') {
      onClear.current = () => {
        setLocalSelection('');
      };
    }
  }, [localSelection, onApply, onClear]);

  const debouncedFetch = useDebounce(async (params) => {
    if (typeof fetchPage !== 'function') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPage(params);
      const rows = Array.isArray(res?.rows) ? res.rows : Array.isArray(res?.data) ? res.data : [];
      const t = Number(res?.total ?? res?.pagination?.total ?? rows.length ?? 0);
      setItems(rows);
      setTotal(t);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setError(e?.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    debouncedFetch({ page, search, pageSize });
  }, [page, search]);

  useEffect(() => {
    // initial load
    debouncedFetch({ page: 1, search: '', pageSize });
  }, []);

  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));

  return (
    <Box>
      <Input
        size="sm"
        placeholder={`Search ${columnLabel}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            style: { fontSize: '0.875rem' },
          },
        }}
        sx={{ mb: 1 }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minHeight: 160 }}>
        {loading ? (
          <Typography level="body-sm" sx={{ fontStyle: 'italic' }}>Loading…</Typography>
        ) : error ? (
          <Typography level="body-sm" color="danger">{String(error)}</Typography>
        ) : items.length === 0 ? (
          <Typography level="body-sm" sx={{ fontStyle: 'italic' }}>No results</Typography>
        ) : (
          items.map((it, idx) => {
            // Handle both string and object items
            let label = getItemLabel(it);
            // If getItemLabel returns empty and item is a string, use the string directly
            if (!label && typeof it === 'string') {
              label = it;
            }
            const isSelected = localSelection && String(localSelection).toLowerCase() === String(label).toLowerCase();
            return (
              <Box
                key={String(it?._id ?? label ?? idx)}
                onClick={() => setLocalSelection(label)}
                sx={{
                  px: 1.25,
                  py: 0.75,
                  cursor: 'pointer',
                  borderRadius: '6px',
                  bgcolor: isSelected ? 'primary.softBg' : 'transparent',
                  color: isSelected ? 'primary.solidColor' : 'inherit',
                  '&:hover': { bgcolor: 'primary.softBg' },
                }}
              >
                <Typography level="body-sm">{label}</Typography>
              </Box>
            );
          })
        )}
      </Box>

      {/* Pagination controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Button size="sm" variant="outlined" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
        <Typography level="body-xs">Page {page} of {totalPages}</Typography>
        <Button size="sm" variant="outlined" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
      </Box>
    </Box>
  );
}
