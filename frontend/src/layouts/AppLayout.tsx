import { useState, type MouseEvent } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Divider,
  Drawer,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  AssessmentOutlined,
  ChevronLeft,
  DashboardOutlined,
  DescriptionOutlined,
  HistoryOutlined,
  KeyboardArrowDown,
  Logout,
  Menu as MenuIcon,
  PeopleOutlined,
} from "@mui/icons-material";

import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const drawerWidth = 272;
const topBarHeight = 76;

const navigationItems = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardOutlined /> },
  { label: "Forms", path: "/forms", icon: <DescriptionOutlined /> },
  { label: "Responses", path: "/responses", icon: <PeopleOutlined /> },
  { label: "Analytics", path: "/analytics", icon: <AssessmentOutlined /> },
  { label: "Activity Logs", path: "/activity-logs", icon: <HistoryOutlined /> },
];

const rootPaths = navigationItems.map((item) => item.path);

const capitalize = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "User";

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const isAdministrator = user?.role?.toLowerCase() === "admin";
  const userName = user?.name?.trim() || (isAdministrator ? "System Administrator" : "User");
  const userRole = capitalize(user?.role);
  const userInitial = userName.charAt(0).toUpperCase();

  const isActive = (path: string) => {
    if (path === "/forms") {
      return (
        location.pathname === "/forms" || location.pathname.startsWith("/forms/")
      );
    }
    return location.pathname === path;
  };

  const handleLogout = () => {
    setMenuAnchor(null);
    logout();
    navigate("/login", { replace: true });
  };

  const openProfileDialog = () => {
    setMenuAnchor(null);
    setProfileName(user?.name ?? "");
    setProfileError("");
    setProfileOpen(true);
  };

  const closeProfileDialog = () => {
    if (!isSavingProfile) {
      setProfileOpen(false);
    }
  };

  const saveProfile = async () => {
    const name = profileName.trim();

    if (name.length < 2) {
      setProfileError("Name must contain at least 2 characters.");
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileError("");
      await updateProfile({ name });
      setProfileOpen(false);
    } catch (error: any) {
      setProfileError(
        error?.response?.data?.detail ||
          "Unable to update your username.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getPageInfo = () => {
    const path = location.pathname;

    if (path.includes("/builder")) {
      return { title: "Form builder", subtitle: "Add and arrange form fields" };
    }
    if (path === "/forms") {
      return { title: "Forms", subtitle: "Create and manage your forms" };
    }
    if (path === "/dashboard") {
      return { title: "Dashboard", subtitle: "Your activity at a glance" };
    }
    if (path === "/responses") {
      return { title: "Responses", subtitle: "Review submitted answers" };
    }
    if (path === "/analytics") {
      return { title: "Analytics", subtitle: "See how your forms perform" };
    }
    if (path === "/activity-logs") {
      return { title: "Activity logs", subtitle: "Track recent changes" };
    }

    return { title: "Dynamic Forms", subtitle: "Manage and monitor your application" };
  };

  const pageInfo = getPageInfo();
  const showBackButton = !rootPaths.includes(location.pathname);

  /* ------------------------------------------------------------------ */
  /* SIDEBAR                                                             */
  /* ------------------------------------------------------------------ */

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#173d3a",
        color: "#f4f5ef",
      }}
    >
      {/* BRAND */}
      <Box
        sx={{
          height: topBarHeight,
          display: "flex",
          alignItems: "center",
          px: 2.5,
          flexShrink: 0,
          borderBottom: "1px solid rgba(239, 244, 237, 0.12)",
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#e7bd86",
            color: "#173d3a",
            fontWeight: 800,
            fontFamily: '"Manrope", sans-serif',
            fontSize: 15,
            mr: 1.5,
          }}
        >
          DF
        </Box>

        <Box sx={{ textAlign: "left" }}>
          <Typography
            sx={{ fontSize: 16, fontWeight: 800, color: "#f8f8f2", lineHeight: 1.2, fontFamily: '"Manrope", sans-serif' }}
          >
            Dynamic Forms
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: "#aec2ba", mt: 0.35 }}>
            FORMS WORKSPACE
          </Typography>
        </Box>
      </Box>

      {/* NAVIGATION */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", px: 2, pt: 3, pb: 2 }}>
        <Typography
          sx={{
            px: 1.25,
            mb: 1.4,
            fontSize: 10.5,
            fontWeight: 700,
            color: "#9eb7ad",
            fontFamily: '"Manrope", sans-serif',
          }}
        >
          WORKSPACE
        </Typography>

        <Box component="nav" sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {navigationItems.map((item) => {
            const active = isActive(item.path);

            return (
              <ButtonBase
                key={item.path}
                component={NavLink}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                sx={{
                  position: "relative",
                  width: "100%",
                  height: 50,
                  px: 1.25,
                  borderRadius: 1.5,
                  justifyContent: "flex-start",
                  textAlign: "left",
                  gap: 1.5,
                  color: active ? "#173d3a" : "#cfddd6",
                  backgroundColor: active ? "#edf1e8" : "transparent",
                  transition: "background-color 0.15s ease, color 0.15s ease",

                  "&:hover": {
                    backgroundColor: active ? "#edf1e8" : "rgba(244, 248, 242, 0.08)",
                    color: active ? "#173d3a" : "#ffffff",
                  },

                  "&:focus-visible": {
                    outline: "2px solid #e7bd86",
                    outlineOffset: 2,
                  },

                  /* active indicator bar */
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: 10,
                    bottom: 10,
                    width: 3,
                    borderRadius: "0 3px 3px 0",
                    backgroundColor: "#d49a5f",
                    opacity: active ? 1 : 0,
                    transition: "opacity 0.15s ease",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.25,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? "#dce9dd" : "rgba(255,255,255,0.05)",
                    color: active ? "#173d3a" : "#b1c6bd",
                    "& svg": { fontSize: 20 },
                  }}
                >
                  {item.icon}
                </Box>

                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: active ? 700 : 550,
                    color: "inherit",
                  }}
                >
                  {item.label}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      {/* USER CARD */}
      <Box sx={{ flexShrink: 0, p: 1.5, borderTop: "1px solid rgba(239, 244, 237, 0.12)" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            p: 1.2,
            borderRadius: 1.5,
            backgroundColor: "rgba(245, 248, 241, 0.07)",
            border: "1px solid rgba(239, 244, 237, 0.12)",
          }}
        >
          <Avatar
            sx={{
              width: 38,
              height: 38,
              background: "#e7bd86",
              color: "#173d3a",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {userInitial}
          </Avatar>

          <Box sx={{ minWidth: 0, flexGrow: 1, textAlign: "left" }}>
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "#f7f8f2",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userName}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: "#aec2ba" }}>
              {userRole}
            </Typography>
          </Box>

          <Tooltip title="Log out">
            <IconButton
              onClick={handleLogout}
              aria-label="Log out"
              sx={{
                width: 36,
                height: 36,
                color: "#aec2ba",
                "&:hover": { color: "#ffd2c6", backgroundColor: "rgba(255,255,255,0.08)" },
              }}
            >
              <Logout fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  /* ------------------------------------------------------------------ */
  /* LAYOUT                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#f3f5f0",
      }}
    >
      {/* DESKTOP SIDEBAR */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(239, 244, 237, 0.12)",
            backgroundColor: "#173d3a",
            overflow: "hidden",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* MOBILE SIDEBAR */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(239, 244, 237, 0.12)",
            backgroundColor: "#173d3a",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* MAIN AREA */}
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f3f5f0",
        }}
      >
        {/* TOP BAR */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: "#fffefa",
            color: "#1e293b",
            borderBottom: "1px solid #e4e8df",
            zIndex: 1100,
          }}
        >
          <Toolbar
            sx={{
              minHeight: `${topBarHeight}px !important`,
              px: { xs: 2, sm: 3, md: 4 },
              gap: { xs: 1, sm: 1.5 },
            }}
          >
            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              sx={{
                display: { xs: "inline-flex", md: "none" },
                ml: -1,
                width: 40,
                height: 40,
                borderRadius: 1.5,
                color: "#173d3a",
                bgcolor: "#edf1e8",
                "&:hover": { bgcolor: "#e2e9dd" },
              }}
            >
              <MenuIcon />
            </IconButton>

            {showBackButton && (
              <Tooltip title="Go back">
                <IconButton
                  onClick={() => navigate(-1)}
                  aria-label="Go back"
                  sx={{
                    width: 40,
                    height: 40,
                    border: "1px solid #e2e8df",
                    borderRadius: 1.5,
                    color: "#42605a",
                    backgroundColor: "#ffffff",
                    "&:hover": { backgroundColor: "#f3f6f1" },
                  }}
                >
                  <ChevronLeft />
                </IconButton>
              </Tooltip>
            )}

            {/* PAGE HEADING */}
            <Box sx={{ flexGrow: 1, minWidth: 0, textAlign: "left" }}>
              <Typography
                sx={{
                  display: { xs: "none", sm: "block" },
                  mb: 0.2,
                  color: "#8b9489",
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  fontFamily: '"Manrope", sans-serif',
                }}
              >
                FORMS WORKSPACE
              </Typography>
              <Typography
                noWrap
                sx={{
                  fontSize: { xs: 18, md: 21 },
                  fontWeight: 800,
                  fontFamily: '"Manrope", sans-serif',
                  color: "#172c28",
                  lineHeight: 1.25,
                }}
              >
                {pageInfo.title}
              </Typography>
              <Typography
                noWrap
                sx={{
                  display: { xs: "none", sm: "block" },
                  fontSize: 12,
                  color: "#758079",
                  mt: 0.15,
                }}
              >
                {pageInfo.subtitle}
              </Typography>
            </Box>

            {/* USER MENU */}
            <ButtonBase
              onClick={(event: MouseEvent<HTMLElement>) =>
                setMenuAnchor(event.currentTarget)
              }
              aria-label="Account menu"
              aria-haspopup="true"
              sx={{
                gap: 1,
                pl: 0.5,
                pr: { xs: 0.5, sm: 1.25 },
                py: 0.5,
                borderRadius: 1.5,
                border: "1px solid #e4e8df",
                backgroundColor: "#ffffff",
                transition: "background-color 0.15s ease, border-color 0.15s ease",
                "&:hover": { backgroundColor: "#f7f8f3", borderColor: "#cbd4c8" },
                "&:focus-visible": {
                  outline: "2px solid #c98952",
                  outlineOffset: 2,
                },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: "#173d3a",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {userInitial}
              </Avatar>

              <Box
                sx={{
                  display: "block",
                  minWidth: 0,
                  maxWidth: { xs: 118, sm: 190, md: 230 },
                  textAlign: "left",
                }}
              >
                <Typography
                  noWrap
                  sx={{ fontSize: { xs: 12.5, sm: 13 }, fontWeight: 700, color: "#0f172a", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {userName}
                </Typography>
                <Typography noWrap sx={{ display: { xs: "none", sm: "block" }, fontSize: 11.5, color: "#64748b", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {userRole}
                </Typography>
              </Box>

              <KeyboardArrowDown
                sx={{
                  display: { xs: "none", sm: "block" },
                  fontSize: 20,
                  color: "#94a3b8",
                }}
              />
            </ButtonBase>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    minWidth: 220,
                    borderRadius: 1.5,
                    border: "1px solid #e2e8df",
                    boxShadow: "0 12px 32px rgba(23, 44, 40, 0.12)",
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5, textAlign: "left" }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  {userName}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                  {userRole}
                </Typography>
              </Box>

              <Divider />

              <MenuItem
                onClick={openProfileDialog}
                sx={{ mx: 1, mt: 1, borderRadius: 2 }}
              >
                Edit profile
              </MenuItem>

              <MenuItem
                onClick={handleLogout}
                sx={{ mx: 1, mb: 1, borderRadius: 2, color: "#d32f2f" }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Log out
              </MenuItem>
            </Menu>

            <Dialog
              open={profileOpen}
              onClose={closeProfileDialog}
              fullWidth
              maxWidth="xs"
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: 2,
                  },
                },
              }}
            >
              <DialogTitle>Edit profile</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  label="Username"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  error={Boolean(profileError)}
                  helperText={profileError || "This name appears on your dashboard."}
                  sx={{ mt: 1 }}
                />
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                  onClick={closeProfileDialog}
                  disabled={isSavingProfile}
                  sx={{ textTransform: "none" }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={() => void saveProfile()}
                  disabled={isSavingProfile}
                  sx={{ bgcolor: "#173d3a", textTransform: "none", "&:hover": { bgcolor: "#286158" } }}
                >
                  {isSavingProfile ? "Saving..." : "Save name"}
                </Button>
              </DialogActions>
            </Dialog>
          </Toolbar>
        </AppBar>

        {/* PAGE CONTENT */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            px: { xs: 2, sm: 3, md: 4, lg: 5 },
            py: { xs: 2.5, sm: 3.5, md: 4 },
            textAlign: "left",
          }}
        >
          <Box sx={{ width: "100%", maxWidth: "1600px", mx: "auto" }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;