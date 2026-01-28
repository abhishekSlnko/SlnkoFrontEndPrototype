// ProjectsCompletedByYearCard.jsx
import React, { useMemo } from "react";
import { Box, Card, Sheet, Typography } from "@mui/joy";

const defaultData = [
  { year: 2024, projects: 57 },
  { year: 2023, projects: 29 },
  { year: 2022, projects: 35 },
];

function ProjectsCompletedByYearCard({
  title = "Achievement by Year",
  subtitle = "You completed more projects per day on average this year than last year.",
  data = defaultData,
}) {
  const rows = useMemo(
    () =>
      [...data].sort((a, b) => Number(b.year) - Number(a.year)), // newest first
    [data]
  );

  const maxProjects = useMemo(
    () => Math.max(...rows.map((r) => r.projects || 0), 1),
    [rows]
  );

  const barColors = ["#020617", "#4b5563", "#111827"]; // you can tweak

  return (
    <Card
      variant="outlined"
      sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 28,
                p: { xs: 1, sm: 0.5, md: 1.5 },
                bgcolor: "#fff",
                border: "1px solid",
                borderColor: "rgba(15,23,42,0.08)",
                boxShadow: "0 2px 6px rgba(15,23,42,0.06), 0 18px 32px rgba(15,23,42,0.06)",
                transition: "transform .16s ease, box-shadow .16s ease",
                "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 16px rgba(15,23,42,0.10), 0 20px 36px rgba(15,23,42,0.08)",
                },
                height:"100%",
            }}
    >
      {/* Card heading */}
      <Box>
        <Typography level="title-md">{title}</Typography>
        <Typography
          level="body-xs"
          sx={{ mt: 0.5, color: "text.secondary", maxWidth: 360 }}
        >
          {subtitle}
        </Typography>
      </Box>

      {/* Year rows */}
      <Box sx={{ mt: 2 }}>
        {rows.map((row, idx) => {
          const ratio = row.projects / maxProjects;
          const width = `${20 + ratio * 80}%`; // keep minimum visible width
          const barColor = barColors[idx] || "#374151";

          return (
            <Box key={row.year} sx={{ mb: 2.5 }}>
              {/* Number + label */}
              <Typography
                level="h3"
                sx={{ lineHeight: 1.1, fontSize: "2rem", fontWeight: 600 }}
              >
                {row.projects}
              </Typography>
              <Typography
                level="body-xs"
                sx={{ color: "text.secondary", mb: 0.75 }}
              >
                projects
              </Typography>

              {/* Bar */}
              <Box
                sx={{
                  position: "relative",
                  width,
                  height: 32,
                  borderRadius: "999px",
                  backgroundColor: barColor,
                  display: "flex",
                  alignItems: "center",
                  px: 1.5,
                  boxShadow: "0 2px 6px rgba(15,23,42,0.25)",
                }}
              >
                <Typography
                  level="body-sm"
                  sx={{ color: "#fff", fontWeight: 600 }}
                >
                  {row.year}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}

export default ProjectsCompletedByYearCard;
