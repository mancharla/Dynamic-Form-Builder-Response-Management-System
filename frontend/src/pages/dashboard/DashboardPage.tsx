import { useEffect, useState, type ReactNode } from "react";

import {
  Alert,
  Box,
  Button,
  ButtonBase,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

import {
  Add,
  ArrowForward,
  AssessmentOutlined,
  DescriptionOutlined,
  PeopleOutlined,
  Refresh,
} from "@mui/icons-material";

import { Link as RouterLink } from "react-router-dom";

import { useAuth } from "../../context";
import {
  getDashboardStatistics,
  type DashboardStatistics,
} from "../../api";

interface StatCard {
  title: string;
  value: number;
  hint: string;
  icon: ReactNode;
  color: string;
  tint: string;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
};

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const err = error as {
    response?: {
      data?: {
        detail?: unknown;
      };
    };
  };

  const detail = err.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (
          typeof item === "object" &&
          item !== null &&
          "msg" in item
        ) {
          return String(
            (item as { msg?: unknown }).msg ?? "",
          );
        }

        return String(item);
      })
      .filter(Boolean)
      .join(", ");
  }

  return fallback;
};

const quickActions = [
  {
    label: "Create a form",
    description:
      "Start a new form and add fields.",
    to: "/forms",
    icon: <Add />,
  },
  {
    label: "Review responses",
    description:
      "See what people have submitted.",
    to: "/responses",
    icon: <DescriptionOutlined />,
  },
  {
    label: "Open analytics",
    description:
      "Check how your forms perform.",
    to: "/analytics",
    icon: <AssessmentOutlined />,
  },
];

const DashboardPage = () => {
  const { user } = useAuth();

  const [statistics, setStatistics] =
    useState<DashboardStatistics | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError("");

      const data =
        await getDashboardStatistics();

      setStatistics(data);
    } catch (err: unknown) {
      setStatistics(null);

      setError(
        getErrorMessage(
          err,
          "Unable to load dashboard statistics.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const totalUsers =
    statistics?.total_users ?? 0;

  const totalForms =
    statistics?.total_forms ?? 0;

  const activeForms =
    statistics?.active_forms ?? 0;

  const disabledForms =
    statistics?.disabled_forms ?? 0;

  const totalResponses =
    statistics?.total_responses ?? 0;

  const activePercent =
    totalForms > 0
      ? Math.round(
          (activeForms / totalForms) * 100,
        )
      : 0;

  const responsesPerForm =
    totalForms > 0
      ? (
          totalResponses / totalForms
        ).toFixed(1)
      : "0";

  const cards: StatCard[] = [
    {
      title: "Total users",
      value: totalUsers,
      hint: "People with an account",
      icon: <PeopleOutlined />,
      color: "#147d73",
      tint: "#e4f3ef",
    },
    {
      title: "Total forms",
      value: totalForms,
      hint: "Created so far",
      icon: <DescriptionOutlined />,
      color: "#7c3aed",
      tint: "#f3ebff",
    },
    {
      title: "Active forms",
      value: activeForms,
      hint: "Accepting submissions",
      icon: <DescriptionOutlined />,
      color: "#2e7d32",
      tint: "#e8f5e9",
    },
    {
      title: "Disabled forms",
      value: disabledForms,
      hint: "Not accepting submissions",
      icon: <DescriptionOutlined />,
      color: "#ed6c02",
      tint: "#fff4e5",
    },
    {
      title: "Total responses",
      value: totalResponses,
      hint: "Across all forms",
      icon: <DescriptionOutlined />,
      color: "#0891b2",
      tint: "#e0f6fa",
    },
  ];

  return (
    <Stack
      spacing={3}
      sx={{
        width: "100%",
        textAlign: "left",
      }}
    >
      {/* =====================================================
          WELCOME BANNER
      ====================================================== */}
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 4,
          px: {
            xs: 3,
            md: 4,
          },
          py: {
            xs: 3,
            md: 4,
          },
          color: "#ffffff",
          background:
            "linear-gradient(120deg, #173d3a 0%, #286158 62%, #4a857a 100%)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            right: -60,
            top: -60,
            width: 240,
            height: 240,
            borderRadius: "50%",
            border:
              "36px solid rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            right: 120,
            bottom: -90,
            width: 180,
            height: 180,
            borderRadius: "50%",
            border:
              "28px solid rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />

        <Stack
          direction={{
            xs: "column",
            md: "row",
          }}
          spacing={3}
          sx={{
            position: "relative",
            zIndex: 1,
            justifyContent: "space-between",
            alignItems: {
              xs: "flex-start",
              md: "center",
            },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: {
                  xs: 24,
                  md: 30,
                },
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {getGreeting()},{" "}
              {user?.name || "there"}.
            </Typography>

            <Typography
              sx={{
                mt: 1,
                opacity: 0.9,
                maxWidth: 520,
                fontSize: 14.5,
              }}
            >
              {isLoading || !statistics
                ? "Here's what's happening with your forms."
                : `You have ${activeForms} active ${
                    activeForms === 1
                      ? "form"
                      : "forms"
                  } and ${totalResponses} ${
                    totalResponses === 1
                      ? "response"
                      : "responses"
                  } so far.`}
            </Typography>
          </Box>

          <Button
            component={RouterLink}
            to="/forms"
            variant="contained"
            disableElevation
            startIcon={
              <DescriptionOutlined />
            }
            sx={{
              height: 44,
              px: 2.5,
              borderRadius: 2.5,
              fontWeight: 700,
              textTransform: "none",
              whiteSpace: "nowrap",
              backgroundColor: "#ffffff",
              color: "#173d3a",
              "&:hover": {
                backgroundColor: "#f5eadb",
              },
            }}
          >
            Manage forms
          </Button>
        </Stack>
      </Paper>

          {/* ======================================================
            ERROR
      ====================================================== */}
      {error && (
        <Alert
          severity="error"
          sx={{
            borderRadius: 2,
            alignItems: "center",
          }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={() => {
                void loadDashboard();
              }}
              disabled={isLoading}
              sx={{
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* =====================================================
          STATISTICS
      ====================================================== */}
      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
            xl: "repeat(5, 1fr)",
          },
        }}
      >
        {isLoading ? (
          Array.from({ length: 5 }).map(
            (_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                height={128}
                sx={{
                  borderRadius: 3,
                }}
              />
            ),
          )
        ) : !error ? (
          cards.map((card) => (
            <Paper
              key={card.title}
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border:
                  "1px solid #e2e8f0",
                backgroundColor:
                  "#ffffff",
                transition:
                  "transform 0.15s ease, box-shadow 0.15s ease",
                "&:hover": {
                  transform:
                    "translateY(-2px)",
                  boxShadow:
                    "0 8px 24px rgba(15, 23, 42, 0.06)",
                },
              }}
            >
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 13.5,
                      color: "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    {card.title}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: 34,
                      lineHeight: 1.1,
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {card.value.toLocaleString()}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: card.color,
                    backgroundColor:
                      card.tint,
                  }}
                >
                  {card.icon}
                </Box>
              </Stack>

              <Typography
                sx={{
                  mt: 1.5,
                  fontSize: 12.5,
                  color: "#94a3b8",
                }}
              >
                {card.hint}
              </Typography>
            </Paper>
          ))
        ) : null}
      </Box>

      {/* =====================================================
          LOWER PANELS
      ====================================================== */}
      {!isLoading && !error && (
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(0, 1.2fr) minmax(0, 1fr)",
            },
            alignItems: "start",
          }}
        >
          {/* =================================================
              FORM STATUS
          ================================================== */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border:
                "1px solid #e2e8f0",
              backgroundColor:
                "#ffffff",
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 17,
                color: "#0f172a",
              }}
            >
              Form status
            </Typography>

            <Typography
              sx={{
                fontSize: 13,
                color: "#64748b",
                mt: 0.3,
              }}
            >
              How many of your forms
              are accepting submissions.
            </Typography>

            {totalForms === 0 ? (
              <Box
                sx={{
                  py: 4,
                  textAlign: "center",
                }}
              >
                <Typography
                  sx={{
                    color: "#64748b",
                    mb: 2,
                  }}
                >
                  You haven't created a
                  form yet.
                </Typography>

                <Button
                  component={RouterLink}
                  to="/forms"
                  variant="contained"
                  disableElevation
                  startIcon={<Add />}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform:
                      "none",
                  }}
                >
                  Create your first form
                </Button>
              </Box>
            ) : (
              <>
                <Stack
                  direction="row"
                  sx={{
                    mt: 3,
                    mb: 1,
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 30,
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {activePercent}%
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "#64748b",
                    }}
                  >
                    {activeForms} of{" "}
                    {totalForms} active
                  </Typography>
                </Stack>

                <LinearProgress
                  variant="determinate"
                  value={activePercent}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor:
                      "#fff1e0",
                    "& .MuiLinearProgress-bar":
                      {
                        borderRadius: 5,
                        backgroundColor:
                          "#2e7d32",
                      },
                  }}
                />

                <Stack
                  direction="row"
                  spacing={3}
                  sx={{
                    mt: 2.5,
                    flexWrap: "wrap",
                    rowGap: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius:
                          "50%",
                        backgroundColor:
                          "#2e7d32",
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#475569",
                      }}
                    >
                      Active:{" "}
                      {activeForms}
                    </Typography>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius:
                          "50%",
                        backgroundColor:
                          "#ed6c02",
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#475569",
                      }}
                    >
                      Disabled:{" "}
                      {disabledForms}
                    </Typography>
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    mt: 3,
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    backgroundColor:
                      "#f8fafc",
                    border:
                      "1px solid #eef2f7",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "#475569",
                    }}
                  >
                    Average of{" "}
                    <strong>
                      {responsesPerForm}
                    </strong>{" "}
                    responses per form.
                  </Typography>
                </Box>
              </>
            )}
          </Paper>

          {/* =================================================
              QUICK ACTIONS
          ================================================== */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border:
                "1px solid #e2e8f0",
              backgroundColor:
                "#ffffff",
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 17,
                color: "#0f172a",
              }}
            >
              Quick actions
            </Typography>

            <Typography
              sx={{
                fontSize: 13,
                color: "#64748b",
                mt: 0.3,
                mb: 2,
              }}
            >
              Jump to the things you
              do most.
            </Typography>

            <Stack spacing={1.2}>
              {quickActions.map(
                (action) => (
                  <ButtonBase
                    key={
                      action.to +
                      action.label
                    }
                    component={RouterLink}
                    to={action.to}
                    sx={{
                      width: "100%",
                      display: "flex",
                      justifyContent:
                        "flex-start",
                      gap: 1.8,
                      p: 1.5,
                      borderRadius: 2.5,
                      border:
                        "1px solid #e2e8f0",
                      textAlign: "left",
                      transition:
                        "border-color 0.15s ease, background-color 0.15s ease",
                      "&:hover": {
                        borderColor:
                          "#b8cec4",
                        backgroundColor:
                          "#f4f8f4",
                      },
                      "&:focus-visible": {
                        outline:
                          "2px solid #e7bd86",
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: 2,
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        color: "#173d3a",
                        backgroundColor:
                          "#e4f3ef",
                      }}
                    >
                      {action.icon}
                    </Box>

                    <Box
                      sx={{
                        flexGrow: 1,
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: 14.5,
                          color: "#0f172a",
                        }}
                      >
                        {action.label}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 12.5,
                          color: "#64748b",
                        }}
                      >
                        {
                          action.description
                        }
                      </Typography>
                    </Box>

                    <ArrowForward
                      sx={{
                        fontSize: 18,
                        color: "#94a3b8",
                        flexShrink: 0,
                      }}
                    />
                  </ButtonBase>
                ),
              )}
            </Stack>
          </Paper>
        </Box>
      )}
    </Stack>
  );
};

export default DashboardPage;