import { useEffect, useState, type ReactNode } from "react";

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
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  Add,
  AlternateEmail,
  ArrowBack,
  ArrowDropDownCircleOutlined,
  CalendarMonthOutlined,
  CheckBoxOutlined,
  Close,
  ContentCopyOutlined,
  Delete,
  EditOutlined,
  LockOutlined,
  PublicOutlined,
  RadioButtonCheckedOutlined,
  StarBorder,
  Tag,
  TextFields,
  UploadFileOutlined,
} from "@mui/icons-material";

import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import {
  createFormField,
  deleteFormField,
  getFormById,
  getFormFields,
  updateFormField,
  type CreateFieldRequest,
  type FieldType,
  type Form,
  type FormField,
} from "../../api";

interface FieldFormData {
  label: string;
  field_type: FieldType;
  name: string;
  placeholder: string;
  description: string;
  is_required: boolean;
  field_order: number;
}

interface FieldOptionDraft {
  label: string;
  value: string;
}

const OPTION_FIELD_TYPES: FieldType[] = [
  "dropdown",
  "checkbox",
  "radio",
];

const fieldTypeOptions: {
  value: FieldType;
  label: string;
  icon: ReactNode;
}[] = [
  {
    value: "text",
    label: "Text",
    icon: <TextFields />,
  },
  {
    value: "number",
    label: "Number",
    icon: <Tag />,
  },
  {
    value: "email",
    label: "Email",
    icon: <AlternateEmail />,
  },
  {
    value: "date",
    label: "Date",
    icon: <CalendarMonthOutlined />,
  },
  {
    value: "dropdown",
    label: "Dropdown",
    icon: <ArrowDropDownCircleOutlined />,
  },
  {
    value: "checkbox",
    label: "Checkbox",
    icon: <CheckBoxOutlined />,
  },
  {
    value: "radio",
    label: "Radio",
    icon: <RadioButtonCheckedOutlined />,
  },
  {
    value: "file",
    label: "File upload",
    icon: <UploadFileOutlined />,
  },
  {
    value: "rating",
    label: "Rating",
    icon: <StarBorder />,
  },
];

const normalizeFieldType = (value: string): FieldType => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "email_address" || normalized === "e_mail") {
    return "email";
  }

  if (
    fieldTypeOptions.some(
      (option) => option.value === normalized,
    )
  ) {
    return normalized as FieldType;
  }

  return "text";
};

const getTypeOption = (type?: string) =>
  fieldTypeOptions.find(
    (option) => option.value === normalizeFieldType(type ?? ""),
  );

const toFieldName = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "field_$1");

const getErrorMessage = (
  err: any,
  fallback: string,
) => {
  const detail = err?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => item.msg)
      .join(", ");
  }

  return detail || fallback;
};

const EMPTY_FIELD: FieldFormData = {
  label: "",
  field_type: "text",
  name: "",
  placeholder: "",
  description: "",
  is_required: false,
  field_order: 1,
};

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <Box>
    <Typography
      sx={{
        fontSize: 12,
        color: "#94a3b8",
        fontWeight: 600,
        mb: 0.4,
      }}
    >
      {label}
    </Typography>

    <Box
      sx={{
        fontSize: 14,
        color: "#0f172a",
      }}
    >
      {children}
    </Box>
  </Box>
);

const FormBuilderPage = () => {
  const navigate = useNavigate();
  const { formId } = useParams();

  const [form, setForm] =
    useState<Form | null>(null);

  const [fields, setFields] = useState<
    FormField[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [isDialogOpen, setIsDialogOpen] =
    useState(false);

  const [editingField, setEditingField] =
    useState<FormField | null>(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [dialogError, setDialogError] =
    useState("");

  const [nameTouched, setNameTouched] =
    useState(false);

  const [optionDrafts, setOptionDrafts] = useState<
    FieldOptionDraft[]
  >([]);

  const [deletingField, setDeletingField] =
    useState<FormField | null>(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    watch,
    formState: { errors },
  } = useForm<FieldFormData>({
    defaultValues: EMPTY_FIELD,
  });

  const selectedFieldType = watch("field_type");
  const needsOptions = OPTION_FIELD_TYPES.includes(
    selectedFieldType,
  );

  /* ================================================================
     LOAD
  ================================================================= */

  const loadBuilder = async () => {
    if (!formId) {
      setError("Form ID is missing.");
      setIsLoading(false);
      return;
    }

    try {
      setError("");

      const id = Number(formId);

      const [formData, fieldData] =
        await Promise.all([
          getFormById(id),
          getFormFields(id),
        ]);

      setForm(formData);

      setFields(
        [...fieldData].sort(
          (a, b) =>
            a.field_order - b.field_order,
        ),
      );
    } catch (err: any) {
      setError(
        getErrorMessage(
          err,
          "Unable to load form builder.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBuilder();
  }, [formId]);

  /* ================================================================
     DIALOG
  ================================================================= */

  const openCreateDialog = () => {
    setEditingField(null);
    setDialogError("");
    setNameTouched(false);

    reset({
      ...EMPTY_FIELD,
      field_order: fields.length + 1,
    });

    setOptionDrafts([
      { label: "", value: "" },
    ]);

    setIsDialogOpen(true);
  };

  const openEditDialog = (
    field: FormField,
  ) => {
    setEditingField(field);
    setDialogError("");
    setNameTouched(true);

    reset({
      label: field.label,
      field_type: normalizeFieldType(field.field_type),
      name: field.name,
      placeholder: field.placeholder ?? "",
      description: field.description ?? "",
      is_required: field.is_required,
      field_order: field.field_order,
    });

    setOptionDrafts(
      (field.options ?? [])
        .sort(
          (a, b) =>
            a.option_order - b.option_order,
        )
        .map((option) => ({
          label: option.label,
          value: option.value,
        })),
    );

    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSaving) {
      return;
    }

    setIsDialogOpen(false);
    setEditingField(null);
    setDialogError("");

    setOptionDrafts([]);
  };

  /* ================================================================
     SAVE
  ================================================================= */

  const onSubmit = async (
    data: FieldFormData,
  ) => {
    if (!formId) {
      return;
    }

    setDialogError("");
    setIsSaving(true);

    try {
      const payload: CreateFieldRequest = {
        label: data.label.trim(),
        field_type: data.field_type,
        name: data.name.trim(),
        placeholder:
          data.placeholder.trim() ||
          undefined,
        description:
          data.description.trim() ||
          undefined,
        is_required: data.is_required,
        field_order: Number(
          data.field_order,
        ),
      };

      if (
        OPTION_FIELD_TYPES.includes(
          data.field_type,
        )
      ) {
        const options = optionDrafts.map(
          (option, index) => ({
            label: option.label.trim(),
            value: option.value.trim(),
            option_order: index,
          }),
        );

        if (
          options.length === 0 ||
          options.some(
            (option) =>
              !option.label || !option.value,
          )
        ) {
          setDialogError(
            "Add at least one option with a label and value.",
          );
          setIsSaving(false);
          return;
        }

        payload.options = options;
      }

      if (editingField) {
        await updateFormField(
          Number(formId),
          editingField.id,
          payload,
        );

        setNotice("Field updated.");
      } else {
        await createFormField(
          Number(formId),
          payload,
        );

        setNotice("Field added.");
      }

      setIsDialogOpen(false);
      setEditingField(null);

      await loadBuilder();
    } catch (err: any) {
      setDialogError(
        getErrorMessage(
          err,
          "Unable to save the field. Please try again.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* ================================================================
     DELETE
  ================================================================= */

  const confirmDelete = async () => {
    if (!formId || !deletingField) {
      return;
    }

    try {
      setIsDeleting(true);
      setError("");

      await deleteFormField(
        Number(formId),
        deletingField.id,
      );

      setNotice("Field deleted.");
      setDeletingField(null);

      await loadBuilder();
    } catch (err: any) {
      setError(
        getErrorMessage(
          err,
          "Unable to delete the field.",
        ),
      );

      setDeletingField(null);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ================================================================
     COPY SLUG
  ================================================================= */

  const copySlug = async (
    slug: string,
  ) => {
    try {
      await navigator.clipboard.writeText(
        slug,
      );

      setNotice("Slug copied.");
    } catch {
      setError(
        "Unable to copy the slug.",
      );
    }
  };

  /* ================================================================
     EARLY STATES
  ================================================================= */

  if (isLoading) {
    return (
      <Stack spacing={3}>
        <Skeleton
          variant="rounded"
          height={90}
          sx={{
            borderRadius: 3,
          }}
        />

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(0, 1fr) 320px",
            },
          }}
        >
          <Skeleton
            variant="rounded"
            height={320}
            sx={{
              borderRadius: 3,
            }}
          />

          <Skeleton
            variant="rounded"
            height={240}
            sx={{
              borderRadius: 3,
            }}
          />
        </Box>
      </Stack>
    );
  }

  if (error && !form) {
    return (
      <Stack
        spacing={2}
        sx={{
          alignItems: "flex-start",
        }}
      >
        <Alert
          severity="error"
          sx={{
            width: "100%",
            borderRadius: 2,
          }}
        >
          {error}
        </Alert>

        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() =>
            navigate("/forms")
          }
          sx={{
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 2,
          }}
        >
          Back to forms
        </Button>
      </Stack>
    );
  }

  if (!form) {
    return (
      <Alert
        severity="warning"
        sx={{
          borderRadius: 2,
        }}
      >
        Form not found.
      </Alert>
    );
  }

  /* ================================================================
     RENDER
  ================================================================= */

  return (
    <Stack
      spacing={3}
      sx={{
        width: "100%",
        textAlign: "left",
      }}
    >
      {/* ============================================================
          HEADER
      ============================================================ */}

      <Stack
        direction={{
          xs: "column",
          md: "row",
        }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            md: "flex-end",
          },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Button
            size="small"
            startIcon={<ArrowBack />}
            onClick={() =>
              navigate("/forms")
            }
            sx={{
              mb: 1,
              ml: -1,
              textTransform: "none",
              fontWeight: 600,
              color: "#64748b",
            }}
          >
            Back to forms
          </Button>

          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
            }}
          >
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
              mt: 0.5,
            }}
          >
            Add and arrange the fields
            people will fill in.
          </Typography>
        </Box>

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
          Add field
        </Button>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{
            borderRadius: 2,
          }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* ============================================================
          BODY
      ============================================================ */}

      <Box
        sx={{
          display: "grid",
          gap: 3,
          alignItems: "start",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1fr) 320px",
          },
        }}
      >
        {/* ==========================================================
            FIELDS
        ========================================================== */}

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border:
              "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            overflow: "hidden",
          }}
        >
          <Stack
            direction="row"
            sx={{
              px: 3,
              py: 2.2,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: 17,
                  color: "#0f172a",
                }}
              >
                Form fields
              </Typography>

              <Typography
                sx={{
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                {fields.length} field
                {fields.length !== 1
                  ? "s"
                  : ""}
              </Typography>
            </Box>
          </Stack>

          <Divider />

          {fields.length === 0 ? (
            <Box
              sx={{
                py: 9,
                px: 3,
                textAlign: "center",
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
                  justifyContent:
                    "center",
                  backgroundColor:
                    "#e8f1ff",
                  color: "#1976d2",
                }}
              >
                <TextFields
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
                No fields yet
              </Typography>

              <Typography
                sx={{
                  color: "#64748b",
                  mt: 1,
                  mb: 3,
                }}
              >
                Add your first field to
                start building this form.
              </Typography>

              <Button
                variant="contained"
                disableElevation
                startIcon={<Add />}
                onClick={
                  openCreateDialog
                }
                sx={{
                  borderRadius: 2,
                  px: 3,
                  fontWeight: 600,
                  textTransform:
                    "none",
                }}
              >
                Add first field
              </Button>
            </Box>
          ) : (
            <Stack
              sx={{
                p: 2,
                gap: 1.5,
                backgroundColor:
                  "#f8fafc",
              }}
            >
              {fields.map(
                (field, index) => {
                  const typeOption =
                    getTypeOption(
                      field.field_type,
                    );

                  return (
                    <Paper
                      key={field.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border:
                          "1px solid #e2e8f0",
                        backgroundColor:
                          "#ffffff",
                        transition:
                          "border-color 0.15s ease, box-shadow 0.15s ease",

                        "&:hover": {
                          borderColor:
                            "#bfdbfe",
                          boxShadow:
                            "0 4px 14px rgba(15, 23, 42, 0.06)",
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{ alignItems: "center" }}
                      >
                        {/* NUMBER */}

                        <Box
                          sx={{
                            width: 28,
                            flexShrink: 0,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#94a3b8",
                          }}
                        >
                          {index + 1}
                        </Box>

                        {/* ICON */}

                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            borderRadius: 2,
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            backgroundColor:
                              "#e8f1ff",
                            color: "#1976d2",
                          }}
                        >
                          {typeOption?.icon ??
                            (
                              <TextFields />
                            )}
                        </Box>

                        {/* FIELD INFORMATION */}

                        <Box
                          sx={{
                            flex: 1,
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
                                fontWeight: 700,
                                color:
                                  "#0f172a",
                                fontSize:
                                  15.5,
                              }}
                            >
                              {field.label}
                            </Typography>

                            <Chip
                              size="small"
                              label={
                                typeOption?.label ??
                                field.field_type
                              }
                              sx={{
                                fontWeight: 600,
                                backgroundColor:
                                  "#f1f5f9",
                                color:
                                  "#475569",
                              }}
                            />

                            {field.is_required && (
                              <Chip
                                size="small"
                                label="Required"
                                sx={{
                                  fontWeight: 600,
                                  backgroundColor:
                                    "#fef2f2",
                                  color:
                                    "#dc2626",
                                }}
                              />
                            )}
                          </Stack>

                          <Box
                            sx={{
                              display:
                                "inline-block",
                              mt: 0.8,
                              px: 1,
                              py: 0.2,
                              borderRadius: 1,
                              backgroundColor:
                                "#f1f5f9",
                              color:
                                "#334155",
                              fontFamily:
                                "monospace",
                              fontSize: 12.5,
                            }}
                          >
                            {field.name}
                          </Box>

                          {field.description && (
                            <Typography
                              sx={{
                                color:
                                  "#64748b",
                                fontSize: 13,
                                mt: 0.8,
                                display:
                                  "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient:
                                  "vertical",
                                overflow:
                                  "hidden",
                              }}
                            >
                              {
                                field.description
                              }
                            </Typography>
                          )}
                        </Box>

                        {/* ACTIONS */}

                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{
                            flexShrink: 0,
                          }}
                        >
                          <Tooltip title="Edit field">
                            <IconButton
                              color="primary"
                              onClick={() =>
                                openEditDialog(
                                  field,
                                )
                              }
                            >
                              <EditOutlined />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete field">
                            <IconButton
                              color="error"
                              onClick={() =>
                                setDeletingField(
                                  field,
                                )
                              }
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                },
              )}

              <Button
                onClick={
                  openCreateDialog
                }
                startIcon={<Add />}
                sx={{
                  py: 1.4,
                  borderRadius: 2.5,
                  border:
                    "1px dashed #cbd5e1",
                  color: "#64748b",
                  textTransform:
                    "none",
                  fontWeight: 600,

                  "&:hover": {
                    borderColor:
                      "#1976d2",
                    color: "#1976d2",
                  },
                }}
              >
                Add another field
              </Button>
            </Stack>
          )}
        </Paper>

        {/* ==========================================================
            FORM INFORMATION SIDEBAR
        ========================================================== */}

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border:
              "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            p: 3,

            position: {
              lg: "sticky",
            },

            top: {
              lg: 92,
            },
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 17,
              color: "#0f172a",
            }}
          >
            Form details
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            <InfoRow label="Title">
              {form.title}
            </InfoRow>

            <InfoRow label="Slug">
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "center" }}
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
            </InfoRow>

            <InfoRow label="Visibility">
              {form.is_public
                ? "Public: no login needed"
                : "Private: login required"}
            </InfoRow>

            <InfoRow label="Status">
              {form.is_enabled
                ? "Accepting submissions"
                : "Not accepting submissions"}
            </InfoRow>

            {form.description && (
              <InfoRow label="Description">
                <Typography
                  sx={{
                    fontSize: 14,
                    color: "#475569",
                  }}
                >
                  {form.description}
                </Typography>
              </InfoRow>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* ================================================================
          ADD / EDIT FIELD DIALOG
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
              justifyContent: "space-between",
              alignItems: "flex-start",
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
                {editingField
                  ? "Edit field"
                  : "Add field"}
              </Typography>

              <Typography
                component="div"
                variant="body2"
                sx={{
                  color: "#64748b",
                  mt: 0.5,
                }}
              >
                {editingField
                  ? "Update how this field appears and behaves."
                  : "Choose a type and label. The field name fills in for you."}
              </Typography>
            </Box>

            <IconButton
              onClick={closeDialog}
              disabled={isSaving}
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
              {dialogError && (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  {dialogError}
                </Alert>
              )}

              {/* FIELD LABEL */}

              <TextField
                fullWidth
                autoFocus
                label="Field label"
                placeholder="Full name"
                {...register("label", {
                  required:
                    "Field label is required",

                  minLength: {
                    value: 2,
                    message:
                      "Label must be at least 2 characters",
                  },

                  maxLength: {
                    value: 255,
                    message:
                      "Label cannot exceed 255 characters",
                  },

                  onChange: (e) => {
                    if (
                      !editingField &&
                      !nameTouched
                    ) {
                      setValue(
                        "name",
                        toFieldName(
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
                  errors.label,
                )}
                helperText={
                  errors.label?.message
                }
              />

              {/* FIELD TYPE */}

              <Controller
                name="field_type"
                control={control}
                render={({ field }) => (
                  <FormControl
                    fullWidth
                    error={Boolean(
                      errors.field_type,
                    )}
                  >
                    <InputLabel id="field-type-label">
                      Field type
                    </InputLabel>

                    <Select
                      labelId="field-type-label"
                      label="Field type"
                      value={field.value}
                      onChange={
                        (event) => {
                          const nextType = event.target.value as FieldType;
                          field.onChange(nextType);

                          if (
                            OPTION_FIELD_TYPES.includes(nextType) &&
                            optionDrafts.length === 0
                          ) {
                            setOptionDrafts([
                              { label: "", value: "" },
                            ]);
                          }

                          if (
                            !OPTION_FIELD_TYPES.includes(nextType)
                          ) {
                            setOptionDrafts([]);
                          }
                        }
                      }
                      onBlur={
                        field.onBlur
                      }
                      renderValue={(
                        value,
                      ) => {
                        const option =
                          getTypeOption(
                            value as FieldType,
                          );

                        return (
                          <Stack
                            direction="row"
                            spacing={1.2}
                            sx={{ alignItems: "center" }}
                          >
                            <Box
                              sx={{
                                display:
                                  "flex",
                                color:
                                  "#1976d2",
                              }}
                            >
                              {
                                option?.icon
                              }
                            </Box>

                            <span>
                              {
                                option?.label
                              }
                            </span>
                          </Stack>
                        );
                      }}
                    >
                      {fieldTypeOptions.map(
                        (option) => (
                          <MenuItem
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            <Stack
                              direction="row"
                              spacing={1.2}
                              sx={{ alignItems: "center" }}
                            >
                              <Box
                                sx={{
                                  display:
                                    "flex",
                                  color:
                                    "#64748b",
                                }}
                              >
                                {
                                  option.icon
                                }
                              </Box>

                              <span>
                                {
                                  option.label
                                }
                              </span>
                            </Stack>
                          </MenuItem>
                        ),
                      )}
                    </Select>

                    {errors.field_type && (
                      <FormHelperText>
                        {
                          errors
                            .field_type
                            .message
                        }
                      </FormHelperText>
                    )}
                  </FormControl>
                )}
              />

              {needsOptions && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                          Field options
                        </Typography>
                        <Typography sx={{ color: "#64748b", fontSize: 12.5 }}>
                          Add the choices people can select.
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        startIcon={<Add />}
                        onClick={() =>
                          setOptionDrafts((current) => [
                            ...current,
                            { label: "", value: "" },
                          ])
                        }
                        sx={{ textTransform: "none" }}
                      >
                        Add option
                      </Button>
                    </Stack>

                    {optionDrafts.map((option, index) => (
                      <Stack
                        key={`option-${index}`}
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ alignItems: { xs: "stretch", sm: "center" } }}
                      >
                        <TextField
                          fullWidth
                          size="small"
                          label={`Option ${index + 1} label`}
                          value={option.label}
                          onChange={(event) =>
                            setOptionDrafts((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, label: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Value"
                          value={option.value}
                          onChange={(event) =>
                            setOptionDrafts((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, value: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          slotProps={{
                            htmlInput: {
                              style: { fontFamily: "monospace" },
                            },
                          }}
                        />
                        <IconButton
                          aria-label={`Remove option ${index + 1}`}
                          disabled={optionDrafts.length === 1}
                          onClick={() =>
                            setOptionDrafts((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* FIELD NAME */}

              <TextField
                fullWidth
                label="Field name"
                placeholder="full_name"
                {...register("name", {
                  required:
                    "Field name is required",

                  pattern: {
                    value:
                      /^[a-zA-Z][a-zA-Z0-9_]*$/,
                    message:
                      "Use letters, numbers and underscores only",
                  },

                  maxLength: {
                    value: 100,
                    message:
                      "Field name cannot exceed 100 characters",
                  },

                  onChange: () =>
                    setNameTouched(
                      true,
                    ),
                })}
                error={Boolean(
                  errors.name,
                )}
                helperText={
                  errors.name?.message ||
                  "Identifies this field in saved responses."
                }
                slotProps={{
                  htmlInput: {
                    style: {
                      fontFamily:
                        "monospace",
                    },
                  },
                }}
              />

              {/* PLACEHOLDER */}

              <TextField
                fullWidth
                label="Placeholder"
                placeholder="Shown inside the empty field"
                {...register(
                  "placeholder",
                  {
                    maxLength: {
                      value: 255,
                      message:
                        "Placeholder cannot exceed 255 characters",
                    },
                  },
                )}
                error={Boolean(
                  errors.placeholder,
                )}
                helperText={
                  errors.placeholder?.message
                }
              />

              {/* DESCRIPTION */}

              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Description"
                placeholder="Help text shown under the field (optional)"
                {...register(
                  "description",
                )}
              />

              {/* POSITION */}

              <TextField
                fullWidth
                label="Position in form"
                type="number"
                {...register(
                  "field_order",
                  {
                    required:
                      "Position is required",

                    valueAsNumber: true,

                    min: {
                      value: 1,
                      message:
                        "Position must be at least 1",
                    },
                  },
                )}
                error={Boolean(
                  errors.field_order,
                )}
                helperText={
                  errors.field_order
                    ?.message ||
                  "1 shows this field first."
                }
              />

              {/* REQUIRED */}

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
                <Controller
                  name="is_required"
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
                          Required field
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 12.5,
                            color:
                              "#64748b",
                          }}
                        >
                          People must fill
                          this in before
                          they can submit.
                        </Typography>
                      </Box>

                      <Switch
                        checked={
                          field.value
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target
                              .checked,
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
              disabled={isSaving}
              color="inherit"
              sx={{
                textTransform:
                  "none",
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={isSaving}
              startIcon={
                isSaving ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                ) : editingField ? (
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
              {isSaving
                ? "Saving..."
                : editingField
                  ? "Save changes"
                  : "Add field"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ================================================================
          DELETE CONFIRMATION
      ================================================================= */}

      <Dialog
        open={Boolean(
          deletingField,
        )}
        onClose={() =>
          !isDeleting &&
          setDeletingField(null)
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
          Delete this field?
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: "#475569",
            }}
          >
            <strong>
              {deletingField?.label}
            </strong>{" "}
            will be removed from the
            form. This can't be undone.
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
              setDeletingField(null)
            }
            sx={{
              textTransform:
                "none",
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
              textTransform:
                "none",
              fontWeight: 600,
            }}
          >
            {isDeleting
              ? "Deleting..."
              : "Delete field"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================
          SUCCESS NOTICE
      ================================================================= */}

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2500}
        onClose={() =>
          setNotice("")
        }
        message={notice}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      />
    </Stack>
  );
};

export default FormBuilderPage;