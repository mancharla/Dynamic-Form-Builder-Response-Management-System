import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  Add,
  BuildOutlined,
  CalendarTodayOutlined,
  Close,
  ContentCopyOutlined,
  Delete,
  DescriptionOutlined,
  EditOutlined,
  LockOutlined,
  OpenInNewOutlined,
  PublicOutlined,
  Refresh,
  Search,
  ShareOutlined,
  UpdateOutlined,
} from "@mui/icons-material";

import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import {
  createForm,
  deleteForm,
  getForms,
  updateForm,
  type Form,
} from "../../api";
import { parseApiDate } from "../../utils/date";

interface FormData {
  title: string;
  description: string;
  slug: string;
  is_public: boolean;
  is_enabled: boolean;
}

type StatusFilter = "all" | "enabled" | "disabled";

const EMPTY_FORM: FormData = {
  title: "",
  description: "",
  slug: "",
  is_public: false,
  is_enabled: true,
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatDate = (value: string) =>
  parseApiDate(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getErrorMessage = (err: any, fallback: string) => {
  const detail = err?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item: any) => item.msg).join(", ");
  }

  return detail || fallback;
};

/* ================================================================
   STAT TILE
================================================================ */

const StatTile = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <Paper
    elevation={0}
    sx={{
      flex: 1,
      minWidth: 140,
      px: 2.5,
      py: 2,
      borderRadius: 3,
      border: "1px solid #e2e8f0",
      backgroundColor: "#ffffff",
      borderLeft: `4px solid ${color}`,
    }}
  >
    <Typography
      sx={{
        fontSize: 26,
        fontWeight: 700,
        color: "#0f172a",
        lineHeight: 1.1,
      }}
    >
      {value}
    </Typography>

    <Typography
      sx={{
        fontSize: 13,
        color: "#64748b",
        mt: 0.5,
      }}
    >
      {label}
    </Typography>
  </Paper>
);

/* ================================================================
   META ITEM
================================================================ */

const MetaItem = ({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Stack
    direction="row"
    spacing={0.8}
    sx={{
      alignItems: "center",
      color: "#64748b",
      "& svg": {
        fontSize: 16,
      },
    }}
  >
    {icon}

    <Typography
      sx={{
        fontSize: 12.5,
        color: "inherit",
      }}
    >
      {children}
    </Typography>
  </Stack>
);

/* ================================================================
   FORMS PAGE
================================================================ */

const FormsPage = () => {
  const navigate = useNavigate();

  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const [deletingForm, setDeletingForm] = useState<Form | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: EMPTY_FORM,
  });

  /* ================================================================
     LOAD FORMS
  ================================================================= */

  const loadForms = async () => {
    try {
      setIsLoading(true);
      setError("");

      const data = await getForms();

      setForms(data);
    } catch (err: any) {
      setError(
        getErrorMessage(
          err,
          "Unable to load forms.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  /* ================================================================
     DERIVED DATA
  ================================================================= */

  const stats = useMemo(
    () => ({
      total: forms.length,
      enabled: forms.filter(
        (form) => form.is_enabled,
      ).length,
      pub: forms.filter(
        (form) => form.is_public,
      ).length,
    }),
    [forms],
  );

  const visibleForms = useMemo(() => {
    const query = search.trim().toLowerCase();

    return forms.filter((form) => {
      if (
        statusFilter === "enabled" &&
        !form.is_enabled
      ) {
        return false;
      }

      if (
        statusFilter === "disabled" &&
        form.is_enabled
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        form.title
          .toLowerCase()
          .includes(query) ||
        form.slug
          .toLowerCase()
          .includes(query) ||
        (form.description || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [forms, search, statusFilter]);

  /* ================================================================
     DIALOG HANDLERS
  ================================================================= */

  const openCreateDialog = () => {
    setEditingForm(null);
    setSlugTouched(false);

    reset(EMPTY_FORM);

    setError("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (form: Form) => {
    setEditingForm(form);
    setSlugTouched(true);

    reset({
      title: form.title,
      description: form.description || "",
      slug: form.slug,
      is_public: form.is_public,
      is_enabled: form.is_enabled,
    });

    setError("");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSubmitting) {
      return;
    }

    setIsDialogOpen(false);
    setEditingForm(null);
    reset(EMPTY_FORM);
  };

  const openFormBuilder = (formId: number) => {
    navigate(`/forms/${formId}/builder`);
  };

  /* ================================================================
     CREATE / UPDATE
  ================================================================= */

  const onSubmit = async (data: FormData) => {
    const payload = {
      title: data.title.trim(),
      description:
        data.description.trim() || undefined,
      slug: data.slug.trim(),
      is_public: data.is_public,
      is_enabled: data.is_enabled,
    };

    try {
      setIsSubmitting(true);
      setError("");

      if (editingForm) {
        const updatedForm = await updateForm(
          editingForm.id,
          payload,
        );

        setForms((current) =>
          current.map((form) =>
            form.id === editingForm.id
              ? updatedForm
              : form,
          ),
        );

        setNotice("Form updated.");
      } else {
        const newForm = await createForm(payload);

        setForms((current) => [
          newForm,
          ...current,
        ]);

        setNotice("Form created.");
      }

      setIsDialogOpen(false);
      setEditingForm(null);
      reset(EMPTY_FORM);
    } catch (err: any) {
      setError(
        getErrorMessage(
          err,
          `Unable to ${
            editingForm ? "update" : "create"
          } form.`,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================================================================
     DELETE
  ================================================================= */

  const confirmDelete = async () => {
    if (!deletingForm) {
      return;
    }

    try {
      setIsDeleting(true);
      setError("");

      await deleteForm(deletingForm.id);

      setForms((current) =>
        current.filter(
          (form) =>
            form.id !== deletingForm.id,
        ),
      );

      setNotice("Form deleted.");
      setDeletingForm(null);
    } catch (err: any) {
      setError(
        getErrorMessage(
          err,
          "Unable to delete form.",
        ),
      );

      setDeletingForm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ================================================================
     ENABLE / DISABLE
  ================================================================= */

  const handleToggleStatus = async (
    form: Form,
  ) => {
    try {
      setTogglingId(form.id);
      setError("");

      const updatedForm = await updateForm(
        form.id,
        {
          is_enabled: !form.is_enabled,
        },
      );

      setForms((current) =>
        current.map((item) =>
          item.id === form.id
            ? updatedForm
            : item,
        ),
      );
    } catch (err: any) {
      setError(
        getErrorMessage(
          err,
          "Unable to update form status.",
        ),
      );
    } finally {
      setTogglingId(null);
    }
  };

  /* ================================================================
     COPY SLUG
  ================================================================= */

  const copySlug = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(slug);

      setNotice("Slug copied.");
    } catch {
      setError("Unable to copy the slug.");
    }
  };

  const copyPublicLink = async (slug: string) => {
    try {
      const publicUrl = `${window.location.origin}/f/${encodeURIComponent(slug)}`;
      await navigator.clipboard.writeText(publicUrl);
      setNotice("Public link copied.");
    } catch {
      setError("Unable to copy the public link.");
    }
  };

  /* ================================================================
     RENDER
  ================================================================= */

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1600px",
        mx: "auto",
        textAlign: "left",
      }}
    >
      {/* ============================================================
          PAGE HEADER
      ============================================================ */}

      <Stack
        direction={{
          xs: "column",
          sm: "row",
        }}
        spacing={2}
        sx={{
          mb: 3,
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#0f172a",
              fontSize: {
                xs: 24,
                md: 28,
              },
            }}
          >
            Forms
          </Typography>

          <Typography
            sx={{
              color: "#64748b",
              mt: 0.5,
              fontSize: 14,
            }}
          >
            Create and manage your dynamic forms.
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center" }}
        >
          <Tooltip title="Refresh">
            <span>
              <IconButton
                onClick={loadForms}
                disabled={isLoading}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  border:
                    "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",

                  "&:hover": {
                    backgroundColor: "#f8fafc",
                  },
                }}
              >
                <Refresh />
              </IconButton>
            </span>
          </Tooltip>

          <Button
            variant="contained"
            disableElevation
            startIcon={<Add />}
            onClick={openCreateDialog}
            sx={{
              height: 42,
              px: 2.5,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              whiteSpace: "nowrap",
            }}
          >
            Create form
          </Button>
        </Stack>
      </Stack>

      {/* ============================================================
          ERROR
      ============================================================ */}

      {error && !isDialogOpen && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 2,
          }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* ============================================================
          STATISTICS
      ============================================================ */}

      {!isLoading && forms.length > 0 && (
        <Stack
          direction="row"
          spacing={2}
          sx={{
            mb: 3,
            flexWrap: "wrap",
            rowGap: 2,
          }}
        >
          <StatTile
            label="Total forms"
            value={stats.total}
            color="#1976d2"
          />

          <StatTile
            label="Enabled"
            value={stats.enabled}
            color="#2e7d32"
          />

          <StatTile
            label="Public"
            value={stats.pub}
            color="#ed6c02"
          />
        </Stack>
      )}

      {/* ============================================================
          SEARCH / FILTER
      ============================================================ */}

      {!isLoading && forms.length > 0 && (
        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={2}
          sx={{
            mb: 2.5,
            justifyContent: "space-between",
            alignItems: {
              xs: "stretch",
              sm: "center",
            },
          }}
        >
          <TextField
            size="small"
            placeholder="Search by title, slug or description"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            sx={{
              width: {
                xs: "100%",
                sm: 360,
              },

              "& .MuiOutlinedInput-root": {
                backgroundColor: "#ffffff",
                borderRadius: 2,
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <ToggleButtonGroup
            exclusive
            size="small"
            value={statusFilter}
            onChange={(
              _,
              value: StatusFilter | null,
            ) => {
              if (value) {
                setStatusFilter(value);
              }
            }}
            sx={{
              backgroundColor: "#ffffff",

              "& .MuiToggleButton-root": {
                textTransform: "none",
                px: 2,
                fontWeight: 600,
                color: "#64748b",
              },

              "& .Mui-selected": {
                color:
                  "#1976d2 !important",
                backgroundColor:
                  "#e8f1ff !important",
              },
            }}
          >
            <ToggleButton value="all">
              All
            </ToggleButton>

            <ToggleButton value="enabled">
              Enabled
            </ToggleButton>

            <ToggleButton value="disabled">
              Disabled
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      )}

      {/* ============================================================
          CONTENT
      ============================================================ */}

      {isLoading ? (
        <Stack spacing={2}>
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={150}
              sx={{
                borderRadius: 3,
              }}
            />
          ))}
        </Stack>
      ) : forms.length === 0 ? (
        /* ============================================================
           EMPTY STATE
        ============================================================ */

        <Paper
          elevation={0}
          sx={{
            py: 9,
            px: 3,
            textAlign: "center",
            borderRadius: 3,
            border:
              "1px dashed #cbd5e1",
            backgroundColor: "#ffffff",
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              mx: "auto",
              mb: 2,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#e8f1ff",
              color: "#1976d2",
            }}
          >
            <DescriptionOutlined
              sx={{
                fontSize: 32,
              }}
            />
          </Box>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            No forms yet
          </Typography>

          <Typography
            sx={{
              color: "#64748b",
              mt: 1,
              mb: 3,
            }}
          >
            Create your first form, then add
            fields in the builder.
          </Typography>

          <Button
            variant="contained"
            disableElevation
            startIcon={<Add />}
            onClick={openCreateDialog}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              px: 3,
            }}
          >
            Create form
          </Button>
        </Paper>
      ) : visibleForms.length === 0 ? (
        /* ============================================================
           NO SEARCH RESULTS
        ============================================================ */

        <Paper
          elevation={0}
          sx={{
            py: 6,
            textAlign: "center",
            borderRadius: 3,
            border:
              "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
            }}
          >
            No matching forms
          </Typography>

          <Typography
            sx={{
              color: "#64748b",
              mt: 0.5,
              mb: 2,
            }}
          >
            Try a different search or filter.
          </Typography>

          <Button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            sx={{
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Clear filters
          </Button>
        </Paper>
      ) : (
        /* ============================================================
           FORMS LIST
        ============================================================ */

        <Stack spacing={2}>
          {visibleForms.map((form) => (
            <Paper
              key={form.id}
              elevation={0}
              sx={{
                p: {
                  xs: 2,
                  md: 3,
                },

                borderRadius: 3,
                border:
                  "1px solid #e2e8f0",
                backgroundColor: "#ffffff",

                transition:
                  "border-color 0.15s ease, box-shadow 0.15s ease",

                "&:hover": {
                  borderColor: "#bfdbfe",
                  boxShadow:
                    "0 4px 16px rgba(15, 23, 42, 0.06)",
                },
              }}
            >
              <Stack
                direction={{
                  xs: "column",
                  md: "row",
                }}
                spacing={{
                  xs: 2,
                  md: 3,
                }}
                sx={{
                  justifyContent: "space-between",
                  alignItems: {
                    xs: "flex-start",
                    md: "center",
                  },
                }}
              >
                {/* ==================================================
                   FORM INFORMATION
                ================================================== */}

                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      flexShrink: 0,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",

                      backgroundColor:
                        form.is_enabled
                          ? "#e8f1ff"
                          : "#f1f5f9",

                      color:
                        form.is_enabled
                          ? "#1976d2"
                          : "#94a3b8",
                    }}
                  >
                    <DescriptionOutlined />
                  </Box>

                  <Box
                    sx={{
                      minWidth: 0,
                    }}
                  >
                    <Stack
                      direction="row"
                      sx={{
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {form.title}
                      </Typography>

                      <Chip
                        size="small"
                        label={
                          form.is_enabled
                            ? "Enabled"
                            : "Disabled"
                        }
                        sx={{
                          fontWeight: 600,

                          backgroundColor:
                            form.is_enabled
                              ? "#e8f5e9"
                              : "#f1f5f9",

                          color:
                            form.is_enabled
                              ? "#2e7d32"
                              : "#64748b",
                        }}
                      />

                      <Chip
                        size="small"
                        variant="outlined"
                        icon={
                          form.is_public ? (
                            <PublicOutlined />
                          ) : (
                            <LockOutlined />
                          )
                        }
                        label={
                          form.is_public
                            ? "Public"
                            : "Private"
                        }
                        sx={{
                          fontWeight: 600,
                          color: "#475569",
                        }}
                      />
                    </Stack>

                    <Typography
                      sx={{
                        color: "#64748b",
                        fontSize: 14,
                        mt: 0.8,

                        display:
                          "-webkit-box",

                        WebkitLineClamp: 2,
                        WebkitBoxOrient:
                          "vertical",

                        overflow: "hidden",
                      }}
                    >
                      {form.description ||
                        "No description provided."}
                    </Typography>

                    {/* Slug */}
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{
                        mt: 1.2,
                        alignItems: "center",
                      }}
                    >
                      <Box
                        sx={{
                          px: 1,
                          py: 0.3,
                          borderRadius: 1,
                          backgroundColor:
                            "#f1f5f9",
                          color: "#334155",
                          fontFamily:
                            "monospace",
                          fontSize: 12.5,
                        }}
                      >
                        /{form.slug}
                      </Box>

                      <Tooltip title="Copy slug">
                        <IconButton
                          size="small"
                          onClick={() =>
                            copySlug(
                              form.slug,
                            )
                          }
                        >
                          <ContentCopyOutlined
                            sx={{
                              fontSize: 16,
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Stack>

                {/* ==================================================
                   ACTIONS
                ================================================== */}

                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    flexShrink: 0,
                    alignItems: "center",
                  }}
                >
                  {/* Build */}
                  <Button
                    variant="contained"
                    disableElevation
                    startIcon={
                      <BuildOutlined />
                    }
                    onClick={() =>
                      openFormBuilder(
                        form.id,
                      )
                    }
                    sx={{
                      height: 38,
                      mr: 1,
                      borderRadius: 2,
                      fontWeight: 600,
                      textTransform:
                        "none",
                    }}
                  >
                    Build
                  </Button>

                  {form.is_public && (
                    <>
                      <Tooltip title={form.is_enabled ? "Open public form" : "Enable this form to preview it"}>
                        <span>
                          <IconButton
                            aria-label="Open public form"
                            disabled={!form.is_enabled}
                            onClick={() => navigate(`/f/${encodeURIComponent(form.slug)}`)}
                            sx={{ color: "#147d73" }}
                          >
                            <OpenInNewOutlined />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={form.is_enabled ? "Copy public link" : "Enable this form to share it"}>
                        <span>
                          <IconButton
                            aria-label="Copy public link"
                            disabled={!form.is_enabled}
                            onClick={() => void copyPublicLink(form.slug)}
                            sx={{ color: "#147d73" }}
                          >
                            <ShareOutlined />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}

                  {/* Edit */}
                  <Tooltip title="Edit details">
                    <IconButton
                      color="primary"
                      onClick={() =>
                        openEditDialog(
                          form,
                        )
                      }
                    >
                      <EditOutlined />
                    </IconButton>
                  </Tooltip>

                  {/* Enable / Disable */}
                  <Tooltip
                    title={
                      form.is_enabled
                        ? "Disable form"
                        : "Enable form"
                    }
                  >
                    <span>
                      <Switch
                        color="success"
                        checked={
                          form.is_enabled
                        }
                        disabled={
                          togglingId ===
                          form.id
                        }
                        onChange={() =>
                          handleToggleStatus(
                            form,
                          )
                        }
                      />
                    </span>
                  </Tooltip>

                  {/* Delete */}
                  <Tooltip title="Delete form">
                    <IconButton
                      color="error"
                      onClick={() =>
                        setDeletingForm(
                          form,
                        )
                      }
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              <Divider
                sx={{
                  my: 2,
                }}
              />

              {/* ====================================================
                 FOOTER
              ==================================================== */}

              <Stack
                direction="row"
                sx={{
                  flexWrap: "wrap",
                  columnGap: 3,
                  rowGap: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12.5,
                    color: "#64748b",
                  }}
                >
                  ID{" "}
                  <strong>
                    #{form.id}
                  </strong>
                </Typography>

                <MetaItem
                  icon={
                    <CalendarTodayOutlined />
                  }
                >
                  Created{" "}
                  {formatDate(
                    form.created_at,
                  )}
                </MetaItem>

                <MetaItem
                  icon={
                    <UpdateOutlined />
                  }
                >
                  Updated{" "}
                  {formatDate(
                    form.updated_at,
                  )}
                </MetaItem>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* ================================================================
          CREATE / EDIT DIALOG
      ================================================================= */}

      <Dialog
        open={isDialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
            },
          },
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            pb: 2,
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                component="div"
                variant="h6"
                sx={{
                  fontWeight: 700,
                }}
              >
                {editingForm
                  ? "Edit form"
                  : "Create form"}
              </Typography>

              <Typography
                component="div"
                variant="body2"
                sx={{
                  color: "#64748b",
                  mt: 0.5,
                }}
              >
                {editingForm
                  ? "Update the form details."
                  : "Set the basics now. You can add fields in the builder next."}
              </Typography>
            </Box>

            <IconButton
              onClick={closeDialog}
              disabled={isSubmitting}
              size="small"
            >
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <Divider />

        <Box
          component="form"
          onSubmit={handleSubmit(
            onSubmit,
          )}
          noValidate
        >
          <DialogContent
            sx={{
              pt: 3,
            }}
          >
            <Stack spacing={2.5}>
              {error && isDialogOpen && (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  {error}
                </Alert>
              )}

              {/* Title */}
              <TextField
                fullWidth
                autoFocus
                label="Form title"
                placeholder="Customer Feedback Form"
                {...register("title", {
                  required:
                    "Form title is required",

                  minLength: {
                    value: 2,
                    message:
                      "Title must be at least 2 characters.",
                  },

                  maxLength: {
                    value: 255,
                    message:
                      "Title cannot exceed 255 characters.",
                  },

                  onChange: (e) => {
                    if (
                      !editingForm &&
                      !slugTouched
                    ) {
                      setValue(
                        "slug",
                        slugify(
                          e.target.value,
                        ),
                        {
                          shouldValidate:
                            true,
                        },
                      );
                    }
                  },
                })}
                error={Boolean(
                  errors.title,
                )}
                helperText={
                  errors.title?.message
                }
              />

              {/* Description */}
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Description"
                placeholder="Enter a short description for this form."
                {...register(
                  "description",
                )}
              />

              {/* Slug */}
              <TextField
                fullWidth
                label="Slug"
                placeholder="customer-feedback"
                {...register("slug", {
                  required:
                    "Slug is required",

                  pattern: {
                    value:
                      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                    message:
                      "Use lowercase letters, numbers, and hyphens only.",
                  },

                  maxLength: {
                    value: 255,
                    message:
                      "Slug cannot exceed 255 characters.",
                  },

                  onChange: () =>
                    setSlugTouched(true),
                })}
                error={Boolean(
                  errors.slug,
                )}
                helperText={
                  errors.slug?.message ||
                  "Used in the form link. Filled in from the title until you edit it."
                }
              />

              {/* Public / Enabled */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border:
                    "1px solid #e2e8f0",
                  backgroundColor:
                    "#f8fafc",
                }}
              >
                {/* Public */}
                <Controller
                  name="is_public"
                  control={control}
                  render={({ field }) => (
                    <Stack
                      direction="row"
                      sx={{
                        px: 2,
                        py: 1.5,
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: 14.5,
                          }}
                        >
                          Public form
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 12.5,
                            color: "#64748b",
                          }}
                        >
                          Anyone with the link
                          can fill it in
                          without logging in.
                        </Typography>
                      </Box>

                      <Switch
                        checked={field.value}
                        onChange={(e) =>
                          field.onChange(
                            e.target.checked,
                          )
                        }
                      />
                    </Stack>
                  )}
                />

                <Divider />

                {/* Enabled */}
                <Controller
                  name="is_enabled"
                  control={control}
                  render={({ field }) => (
                    <Stack
                      direction="row"
                      sx={{
                        px: 2,
                        py: 1.5,
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: 14.5,
                          }}
                        >
                          Accept submissions
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 12.5,
                            color: "#64748b",
                          }}
                        >
                          Turn this off to stop
                          collecting new
                          responses.
                        </Typography>
                      </Box>

                      <Switch
                        color="success"
                        checked={field.value}
                        onChange={(e) =>
                          field.onChange(
                            e.target.checked,
                          )
                        }
                      />
                    </Stack>
                  )}
                />
              </Paper>
            </Stack>
          </DialogContent>

          <Divider />

          <DialogActions
            sx={{
              p: 2.5,
            }}
          >
            <Button
              onClick={closeDialog}
              disabled={isSubmitting}
              color="inherit"
              sx={{
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                ) : editingForm ? (
                  <EditOutlined />
                ) : (
                  <Add />
                )
              }
              sx={{
                borderRadius: 2,
                px: 2.5,
                textTransform:
                  "none",
                fontWeight: 600,
              }}
            >
              {isSubmitting
                ? editingForm
                  ? "Saving..."
                  : "Creating..."
                : editingForm
                  ? "Save changes"
                  : "Create form"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ================================================================
          DELETE CONFIRMATION
      ================================================================= */}

      <Dialog
        open={Boolean(deletingForm)}
        onClose={() =>
          !isDeleting &&
          setDeletingForm(null)
        }
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
          }}
        >
          Delete this form?
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: "#475569",
            }}
          >
            <strong>
              {deletingForm?.title}
            </strong>{" "}
            will be permanently deleted.
            This can't be undone.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            p: 2.5,
            pt: 1,
          }}
        >
          <Button
            color="inherit"
            disabled={isDeleting}
            onClick={() =>
              setDeletingForm(null)
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            disableElevation
            disabled={isDeleting}
            onClick={confirmDelete}
            startIcon={
              isDeleting ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <Delete />
              )
            }
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            {isDeleting
              ? "Deleting..."
              : "Delete form"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================
          SUCCESS MESSAGE
      ================================================================= */}

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2500}
        onClose={() => setNotice("")}
        message={notice}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      />
    </Box>
  );
};

export default FormsPage;