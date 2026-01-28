/**
 * DateRangeFilter Component - Lightweight date range filter for chart dashboards
 */

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Button,
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

/**
 * useClickOutside Hook - Close popover when clicking outside
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

/* Utility Functions */
const fmt = (d) =>
  d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : '';

const parseLocal = (s) => {
  if (!s) return undefined;
  const parts = s.split('-');
  if (parts.length !== 3) return undefined;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return isNaN(d) ? undefined : d;
};

/**
 * DateRangeFilter Component
 * 
 * Props:
 * - label: string (e.g., "Sanction Date", "Disbursal Date")
 * - value: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } or null
 * - onChange: function(dateRangeObject) - called when user changes date range
 * - isActive: boolean - indicates if a filter is currently applied
 * - columnId: string (for identification purposes)
 * 
 * Exposed Methods (via ref):
 * - toggleOpen(): Opens/closes the popover
 */
const DateRangeFilter = forwardRef(({ label, value, onChange, isActive = false, columnId }, ref) => {
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({});

  // Expose toggle method via ref
  useImperativeHandle(ref, () => ({
    toggleOpen: () => setIsOpen(prev => !prev),
  }), []);

  // Close popover when clicking outside
  useClickOutside(() => {
    setIsOpen(false);
  }, !isOpen);

  // Adjust popover position to stay within viewport - close on scroll
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const calculatePosition = () => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = 520;
      const padding = 16;

      let top = containerRect.bottom + 8;
      let left = containerRect.left;

      // Check if popover goes below viewport - show above instead
      if (top + popoverHeight > window.innerHeight - padding) {
        top = containerRect.top - popoverHeight - 8;
      }

      // Check if popover goes right of viewport
      if (left + popoverWidth > window.innerWidth - padding) {
        left = window.innerWidth - popoverWidth - padding;
      }

      // Check if popover goes left of viewport
      if (left < padding) {
        left = padding;
      }

      setPopoverStyle({
        top: `${Math.max(padding, top)}px`,
        left: `${left}px`,
      });
    };

    // Calculate position immediately when opened
    calculatePosition();

    // Close popover on scroll
    const handleScroll = () => {
      setIsOpen(false);
    };

    // Recalculate position on resize
    const handleResize = () => {
      calculatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const handleIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const hasValue = value?.from || value?.to;

  const handleDateRangeChange = (ranges) => {
    const sel = ranges.selection || ranges?.ranges?.selection;
    if (!sel) return;
    onChange({
      from: fmt(sel.startDate),
      to: fmt(sel.endDate),
    });
  };

  const from = value?.from ? parseLocal(value.from) : undefined;
  const to = value?.to ? parseLocal(value.to) : undefined;
  const selection = {
    startDate: from || new Date(),
    endDate: to || new Date(),
    key: 'selection',
  };

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
          padding: '4px 6px',
          borderRadius: '6px',
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
        {/* Filter Icon */}
        <FilterAltIcon 
          sx={{ 
            fontSize: 16,
            fontWeight: hasValue ? 700 : 500,
            transition: 'all 0.2s ease',
          }} 
        />
        
        {/* Active Indicator Badge */}
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

      {/* Popover Container - Simple absolute positioning that stays within viewport */}
      {isOpen && (
        <Box
          ref={popoverRef}
          sx={{
            position: 'fixed',
            top: popoverStyle.top || 'auto',
            left: popoverStyle.left || 'auto',
            width: '320px',
            maxHeight: '520px',
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 4px 28px rgba(0,0,0,0.12)',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.15s ease-in-out',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'scale(0.95)' },
              to: { opacity: 1, transform: 'scale(1)' },
            },
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              pt: 1.5,
              pb: 1,
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <Typography level="body-sm" sx={{ fontWeight: 600, color: '#666' }}>
              Filter: {label}
            </Typography>
          </Box>

          {/* Date Range Content */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              px: 2,
              py: 1.5,
              maxHeight: '380px',
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
            {/* Quick Preset Buttons */}
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                <Button
                  size="sm"
                  variant="outlined"
                  onClick={() =>
                    handleDateRangeChange({ 
                      selection: { 
                        startDate: new Date(), 
                        endDate: new Date() 
                      } 
                    })
                  }
                  sx={{ fontSize: '0.75rem' }}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant="outlined"
                  onClick={() => {
                    const end = new Date();
                    const start = addDays(end, -6);
                    handleDateRangeChange({ 
                      selection: { 
                        startDate: start, 
                        endDate: end 
                      } 
                    });
                  }}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Last Week
                </Button>
                <Button
                  size="sm"
                  variant="outlined"
                  onClick={() => {
                    const now = new Date();
                    handleDateRangeChange({ 
                      selection: { 
                        startDate: startOfMonth(now), 
                        endDate: endOfMonth(now) 
                      } 
                    });
                  }}
                  sx={{ fontSize: '0.75rem' }}
                >
                  This Month
                </Button>
              </Stack>

              {/* Calendar */}
              <Suspense fallback={<Box sx={{ p: 1, textAlign: 'center', fontSize: '0.75rem' }}>Loading calendar…</Box>}>
                <DateRange
                  locale={enIN}
                  ranges={[selection]}
                  onChange={handleDateRangeChange}
                  moveRangeOnFirstSelection={false}
                  months={1}
                  direction="horizontal"
                  rangeColors={['#3366a3']}
                />
              </Suspense>
            </Stack>
          </Box>

          {/* Footer - Action Buttons */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              gap: 1,
              justifyContent: 'flex-end',
            }}
          >
            <Button
              size="sm"
              variant="plain"
              onClick={() => {
                onChange(null);
                handleClose();
              }}
              sx={{ fontSize: '0.75rem' }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="solid"
              onClick={handleClose}
              sx={{ fontSize: '0.75rem' }}
            >
              Apply
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
});

DateRangeFilter.displayName = 'DateRangeFilter';

export default DateRangeFilter;
