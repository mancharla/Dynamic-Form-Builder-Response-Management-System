import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { DescriptionOutlined } from "@mui/icons-material";

interface AuthShellProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

const AuthShell = ({
  children,
  eyebrow,
  title,
  description,
}: AuthShellProps) => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.05fr) minmax(430px, 0.95fr)" },
      bgcolor: "#fffefa",
    }}
  >
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        minHeight: "100vh",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        position: "relative",
        px: { md: 6, lg: 9 },
        py: 5,
        color: "#f7f8f2",
        bgcolor: "#173d3a",
        "&::after": {
          content: '""',
          position: "absolute",
          width: 440,
          height: 440,
          right: -210,
          bottom: -190,
          border: "1px solid rgba(231, 189, 134, 0.24)",
          borderRadius: "50%",
          boxShadow: "0 0 0 48px rgba(231, 189, 134, 0.035), 0 0 0 96px rgba(231, 189, 134, 0.025)",
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.4, position: "relative", zIndex: 1 }}>
        <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: "#e7bd86", color: "#173d3a" }}>
          <DescriptionOutlined />
        </Box>
        <Box>
          <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>
            Dynamic Forms
          </Typography>
          <Typography sx={{ mt: 0.25, color: "#aec2ba", fontSize: 10.5, letterSpacing: "0.12em", fontWeight: 700 }}>
            FORMS WORKSPACE
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 590, position: "relative", zIndex: 1, py: 5 }}>
        <Typography sx={{ color: "#e7bd86", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Create · Collect · Understand
        </Typography>
        <Typography component="h1" sx={{ mt: 2, maxWidth: 540, color: "#f7f8f2", fontFamily: '"Manrope", sans-serif', fontSize: { md: 42, lg: 54 }, fontWeight: 800, lineHeight: 1.08 }}>
          Forms that make every answer count.
        </Typography>
        <Typography sx={{ mt: 2, maxWidth: 440, color: "#c5d3cc", fontSize: 15, lineHeight: 1.8 }}>
          A focused workspace for building forms, reviewing responses, and seeing what matters.
        </Typography>

        <Box sx={{ mt: 5, maxWidth: 430, borderTop: "1px solid rgba(239, 244, 237, 0.18)", borderBottom: "1px solid rgba(239, 244, 237, 0.18)", py: 2.2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12, color: "#d7e1d9", fontWeight: 700 }}>Customer feedback</Typography>
            <Typography sx={{ fontSize: 10, color: "#aec2ba" }}>01 / 04</Typography>
          </Box>
          <Box sx={{ mt: 1.8, height: 8, width: "76%", borderRadius: 1, bgcolor: "rgba(247,248,242,0.72)" }} />
          <Box sx={{ mt: 1, height: 8, width: "52%", borderRadius: 1, bgcolor: "rgba(247,248,242,0.28)" }} />
          <Box sx={{ display: "flex", gap: 1, mt: 2.2 }}>
            {[0, 1, 2, 3, 4].map((item) => (
              <Box key={item} sx={{ width: 24, height: 24, border: "1px solid rgba(231,189,134,0.55)", borderRadius: "50%", bgcolor: item < 3 ? "#e7bd86" : "transparent" }} />
            ))}
          </Box>
        </Box>
      </Box>

      <Typography sx={{ position: "relative", zIndex: 1, color: "#aec2ba", fontSize: 11.5 }}>
        A clearer view of every submission.
      </Typography>
    </Box>

    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", px: { xs: 2.5, sm: 5, lg: 8 }, py: { xs: 4, md: 6 }, bgcolor: "#fffefa" }}>
      <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1.1, mb: 5 }}>
        <Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 1.25, bgcolor: "#173d3a", color: "#e7bd86" }}>
          <DescriptionOutlined fontSize="small" />
        </Box>
        <Typography sx={{ color: "#173d3a", fontFamily: '"Manrope", sans-serif', fontWeight: 800, fontSize: 15 }}>
          Dynamic Forms
        </Typography>
      </Box>

      <Box sx={{ width: "100%", maxWidth: 430, mx: "auto" }}>
        <Typography sx={{ color: "#a16e3b", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          {eyebrow}
        </Typography>
        <Typography component="h2" sx={{ mt: 1, color: "#172c28", fontFamily: '"Manrope", sans-serif', fontSize: { xs: 29, sm: 34 }, lineHeight: 1.2, fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 1, mb: 3.5, color: "#68756f", fontSize: 14, lineHeight: 1.65 }}>
          {description}
        </Typography>
        {children}
      </Box>
      <Typography sx={{ mt: 5, textAlign: "center", color: "#9aa39b", fontSize: 11 }}>
        Secure access to your forms workspace
      </Typography>
    </Box>
  </Box>
);

export default AuthShell;
