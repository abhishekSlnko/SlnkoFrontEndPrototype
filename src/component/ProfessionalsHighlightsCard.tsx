// ProfessionalsHighlightsCard.jsx
import React, { useState, useMemo } from "react";
import {
  Avatar,
  AvatarGroup,
  Box,
  Card,
  Divider,
  Input,
  Stack,
  Typography,
  Tooltip,
} from "@mui/joy";
import { useNavigate } from "react-router-dom";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import SearchIcon from "@mui/icons-material/Search";

function HighlightRow({ label, value, trend = "neutral", note }) {
  const isUp = trend === "up";
  const isDown = trend === "down";
  const color = isUp ? "success.600" : isDown ? "danger.600" : "text.secondary";

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ py: 0.6 }}
    >
      <Typography level="body-sm" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>

      <Stack direction="row" spacing={0.5} alignItems="center">
        {trend !== "neutral" && (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "999px",
              px: 0.6,
              py: 0.1,
              fontSize: "0.7rem",
              color,
            }}
          >
            {isUp ? (
              <ArrowUpwardRoundedIcon sx={{ fontSize: "0.95rem", mr: 0.2 }} />
            ) : (
              <ArrowDownwardRoundedIcon sx={{ fontSize: "0.95rem", mr: 0.2 }} />
            )}
          </Box>
        )}
        <Typography level="body-sm" sx={{ fontWeight: 600 }}>
          {value}
          {note ? ` ${note}` : ""}
        </Typography>
      </Stack>
    </Stack>
  );
}

const getInitials = (name = "") => {
  if (!name) return "NA";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// helper to normalize hero objects from API
const normalizeHero = (h) => ({
  user_id: h.user_id,
  name: h.name || "Unknown",
  attachment_url: h.attachment_url || "",
  totalPoints: Number(h.totalPoints ?? 0),
  activitiesCompleted: Number(h.activitiesCompleted ?? 0),
});

function ProfessionalsHighlightsCard({
  totalProfessionals = 0,
  heroes = [], // full list from API (data.users)
  topHeroes = [], // top 5 from API (data.top_heroes)
  idleCount = 0,
  loading = false,
}) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // full heroes list = for "Highlights"
  const allHeroes = useMemo(() => {
    if (!Array.isArray(heroes)) return [];
    return heroes.filter((h) => h && (h.name || h.user_id)).map(normalizeHero);
  }, [heroes]);

  // TOP heroes list = strictly from topHeroes prop
  const allTopHeroes = useMemo(() => {
    if (!Array.isArray(topHeroes)) return [];
    return topHeroes
      .filter((h) => h && (h.name || h.user_id))
      .map(normalizeHero);
  }, [topHeroes]);

  const effectiveTotal = totalProfessionals || allHeroes.length;
  const searchTerm = search.trim().toLowerCase();

  // filter full list for Highlights
  const filteredHeroes = useMemo(() => {
    if (!searchTerm) return allHeroes;
    return allHeroes.filter((h) => h.name.toLowerCase().includes(searchTerm));
  }, [allHeroes, searchTerm]);

  // filter TOP heroes for "Today's Heroes"
  const filteredTopHeroes = useMemo(() => {
    if (!searchTerm) return allTopHeroes;
    return allTopHeroes.filter((h) =>
      h.name.toLowerCase().includes(searchTerm)
    );
  }, [allTopHeroes, searchTerm]);

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
        boxShadow:
          "0 2px 6px rgba(15,23,42,0.06), 0 18px 32px rgba(15,23,42,0.06)",
        transition: "transform .16s ease, box-shadow .16s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow:
            "0 6px 16px rgba(15,23,42,0.10), 0 20px 36px rgba(15,23,42,0.08)",
        },
        height: 430,
        maxHeight: 430,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top section (no scrolling) */}
      <Box sx={{ flexShrink: 0 }}>
        {/* Top Row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box>
            <Typography level="body-xs" sx={{ color: "text.secondary" }}>
              Professionals
            </Typography>
            <Typography
              level="h2"
              sx={{ mt: 0.5, fontSize: "2.4rem", fontWeight: 600 }}
            >
              {loading ? "-" : effectiveTotal}
            </Typography>
          </Box>

          <Box
            sx={{
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 0.25,
            }}
          >
            <Typography
              level="title-sm"
              sx={{
                whiteSpace: "nowrap",
                fontWeight: 800,
                mt: 0.2,
                fontSize: "1.05rem",
              }}
            >
              Leaderboard Site Engineers
            </Typography>
            <Typography
              level="body-xs"
              sx={{
                color: "text.secondary",
                cursor: "pointer",
                textDecoration: "underline",
                "&:hover": { color: "primary.600" },
              }}
              onClick={() =>
                navigate("/site_users?status=idle")
              }
            >
              Idle site engineers: {loading ? "-" : idleCount}
            </Typography>
          </Box>
        </Box>

        {/* Search Input */}
        <Input
          startDecorator={<SearchIcon />}
          placeholder="Search heroes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            mt: 2,
            borderRadius: "lg",
            "--Input-focusedThickness": "1px",
          }}
          size="sm"
        />

        {/* Today's Heroes */}
        <Box sx={{ mt: 2 }}>
          <Typography level="body-xs" sx={{ color: "text.secondary", mb: 0.5 }}>
            Today&apos;s Heroes
          </Typography>

          <Box
            sx={{
              maxHeight: 64,
              overflowX: "auto",
              overflowY: "hidden",
              pr: 0.5,
              display: "flex",
              alignItems: "center",
            }}
          >
            {loading ? (
              <Typography level="body-sm">Loading…</Typography>
            ) : filteredTopHeroes.length === 0 ? (
              <Typography level="body-sm">No results found</Typography>
            ) : (
              <AvatarGroup
                sx={{
                  "--Avatar-size": "32px",
                  "& .MuiAvatar-root": {
                    border: "2px solid #fff",
                    boxShadow: "0 0 0 1px rgba(15,23,42,0.06)",
                  },
                  flexWrap: "nowrap",
                  gap: 0.5,
                }}
              >
                {filteredTopHeroes.map((h) => (
                  <Tooltip key={h.user_id} title={h.name}>
                    <Avatar
                      src={h.attachment_url || undefined}
                      variant="soft"
                      sx={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/user_profile?user_id=${h.user_id}`)
                      }
                    >
                      {!h.attachment_url && getInitials(h.name)}
                    </Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>
            )}
          </Box>
        </Box>
      </Box>

      {/* Highlights = scrollable list */}
      <Box
        sx={{
          mt: 3,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Typography level="body-xs" sx={{ color: "text.secondary", mb: 1 }}>
          Highlights
        </Typography>

        <Divider />

        <Box
          sx={{
            mt: 0.5,
            flex: 1,
            overflowY: "auto",
            pr: 0.5,
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#c1c1c1",
              borderRadius: "999px",
            },
          }}
        >
          {loading ? (
            <Typography level="body-sm" sx={{ mt: 1 }}>
              Loading site engineers…
            </Typography>
          ) : filteredHeroes.length === 0 ? (
            <Typography level="body-sm" sx={{ mt: 1 }}>
              No site engineers found
            </Typography>
          ) : (
            filteredHeroes.map((h, idx) => (
              <React.Fragment key={h.user_id ?? idx}>
                <HighlightRow
                  label={h.name}
                  value={h.totalPoints}
                  trend="neutral"
                  note="pts"
                />
                {idx < filteredHeroes.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </Box>
      </Box>
    </Card>
  );
}

export default ProfessionalsHighlightsCard;
