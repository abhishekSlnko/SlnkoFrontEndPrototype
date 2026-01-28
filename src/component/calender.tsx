// UserActivityCalendar.jsx
import React, { useRef, useState } from "react";
import Box from "@mui/joy/Box";
import Sheet from "@mui/joy/Sheet";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import Chip from "@mui/joy/Chip";
import Button from "@mui/joy/Button";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayjs from "dayjs";

/** 👉 Replace with real events later */
const MOCK_EVENTS = [
  { id: 1, date: "2025-10-01", title: "Brake pad service" },
  { id: 2, date: "2025-10-02", title: "Steering check" },
  { id: 3, date: "2025-10-03", title: "Engine maintenance" },
  { id: 4, date: "2025-10-10", title: "Wheel alignment" },
  { id: 5, date: "2025-10-18", title: "Battery replacement" },
];

const CALENDAR_EVENTS = MOCK_EVENTS.map((e) => ({
  id: String(e.id),
  title: e.title,
  start: e.date,
  allDay: true,
}));

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const STATUS_VIEW = {
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

export default function Calendar() {
  const calendarRef = useRef(null);

  const [viewMode, setViewMode] = useState(STATUS_VIEW.MONTH);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedYear, setSelectedYear] = useState(currentDate.year());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month());

  // small list around the current year
  const yearOptions = [];
  for (let y = selectedYear - 2; y <= selectedYear + 3; y += 1) {
    yearOptions.push(y);
  }

  const syncCalendarDate = (year, month) => {
    const api = calendarRef.current?.getApi?.();
    const target = new Date(year, month, 1);
    if (api) api.gotoDate(target);
    setCurrentDate(dayjs(target));
  };

  const handleYearChange = (_e, value) => {
    if (!value) return;
    const yearNum = Number(value);
    setSelectedYear(yearNum);
    syncCalendarDate(yearNum, selectedMonth);
  };

  const handleMonthChange = (_e, value) => {
    if (value === null || value === undefined) return;
    const monthIndex = Number(value);
    setSelectedMonth(monthIndex);
    syncCalendarDate(selectedYear, monthIndex);
  };

  const handleViewChange = (mode) => {
    setViewMode(mode);
    const api = calendarRef.current?.getApi?.();
    if (!api) return;

    if (mode === STATUS_VIEW.WEEK) {
      api.changeView("dayGridWeek");
    } else {
      // Month + Year both use month grid (year is just a filter)
      api.changeView("dayGridMonth");
    }
  };

  const handleToday = () => {
    const today = dayjs();
    const api = calendarRef.current?.getApi?.();
    if (api) api.today();
    setCurrentDate(today);
    setSelectedYear(today.year());
    setSelectedMonth(today.month());
  };

  const handleDatesSet = (info) => {
    // keep header + filters in sync with the active view
    const center = dayjs(info.view.currentStart).add(10, "day");
    setCurrentDate(center);
    setSelectedYear(center.year());
    setSelectedMonth(center.month());
  };

  return (
    <Sheet
      variant="soft"
      sx={{
        mt: 3,
        borderRadius: "lg",
        p: 2,
        bgcolor: "background.level1",
        display: "flex",
        flexDirection: "column",
        minHeight: 360,
      }}
    >
      {/* HEADER: title + filters + view chips */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5,
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Typography level="h4">{currentDate.format("MMMM, YYYY")}</Typography>

        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ ml: "auto" }}
        >
          {/* Month filter */}
          <Select
            size="sm"
            value={String(selectedMonth)}
            onChange={handleMonthChange}
            sx={{ minWidth: 110 }}
          >
            {MONTH_LABELS.map((label, idx) => (
              <Option key={idx} value={String(idx)}>
                {label}
              </Option>
            ))}
          </Select>

          {/* Year filter */}
          <Select
            size="sm"
            value={String(selectedYear)}
            onChange={handleYearChange}
            sx={{ minWidth: 96 }}
          >
            {yearOptions.map((y) => (
              <Option key={y} value={String(y)}>
                {y}
              </Option>
            ))}
          </Select>

          {/* View chips: week / month / year */}
          <Chip
            size="sm"
            variant={viewMode === STATUS_VIEW.WEEK ? "solid" : "soft"}
            color={viewMode === STATUS_VIEW.WEEK ? "primary" : "neutral"}
            onClick={() => handleViewChange(STATUS_VIEW.WEEK)}
            sx={{ cursor: "pointer" }}
          >
            Week
          </Chip>
          <Chip
            size="sm"
            variant={viewMode === STATUS_VIEW.MONTH ? "solid" : "soft"}
            color={viewMode === STATUS_VIEW.MONTH ? "primary" : "neutral"}
            onClick={() => handleViewChange(STATUS_VIEW.MONTH)}
            sx={{ cursor: "pointer" }}
          >
            Month
          </Chip>
          <Chip
            size="sm"
            variant={viewMode === STATUS_VIEW.YEAR ? "solid" : "soft"}
            color={viewMode === STATUS_VIEW.YEAR ? "primary" : "neutral"}
            onClick={() => handleViewChange(STATUS_VIEW.YEAR)}
            sx={{ cursor: "pointer" }}
          >
            Year
          </Chip>

          <Button size="sm" variant="plain" onClick={handleToday}>
            Today
          </Button>
        </Stack>
      </Box>

      {/* CALENDAR GRID */}
      <Box
        sx={{
          flex: 1,
          minHeight: 300,
          "& .fc": {
            fontFamily: "inherit",
          },
          "& .fc-scrollgrid": {
            border: "none",
          },
          "& .fc-theme-standard td, & .fc-theme-standard th": {
            borderColor: "rgba(148,163,184,0.35)",
          },
          "& .fc-col-header-cell": {
            backgroundColor: "background.body",
            color: "text.secondary",
            paddingBlock: 6,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 0.3,
          },
          // remove dark pattern & make solid background
          "& .fc-daygrid-day": {
            backgroundColor: "#020617", // dark blue
            color: "#e5e7eb",
            position: "relative",
          },
          "& .fc-daygrid-day-frame": {
            padding: 0,
          },
          "& .fc-daygrid-day:hover": {
            backgroundColor: "#0b1120",
          },
          // today cell highlight
          "& .fc-daygrid-day.fc-day-today": {
            backgroundColor: "#fefce8",
            "& .uc-day-number": {
              color: "#1f2937",
              fontWeight: 700,
            },
          },
          // day number styling
          "& .uc-day-number": {
            position: "absolute",
            top: 8,
            left: 10,
            fontSize: 11,
            fontWeight: 500,
            color: "#9ca3af",
          },
          // move events below the number nicely
          "& .fc-daygrid-day-events": {
            marginTop: 26,
            marginInline: 4,
          },
          "& .fc-daygrid-event": {
            borderRadius: 8,
            padding: "2px 4px",
            fontSize: 11,
            border: "none",
          },
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          height="100%"
          events={CALENDAR_EVENTS}
          dayMaxEvents={2}
          dayHeaderFormat={{ weekday: "short" }}
          datesSet={handleDatesSet}
          // ✅ explicit date numbers so they are always visible
          dayCellContent={(arg) => {
            return {
              html: `<div class="uc-day-number">${arg.date.getDate()}</div>`,
            };
          }}
        />
      </Box>
    </Sheet>
  );
}
