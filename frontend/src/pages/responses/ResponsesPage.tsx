import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Rating,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  AssessmentOutlined,
  Close,
  Delete,
  DescriptionOutlined,
  EditOutlined,
  HistoryOutlined,
  Refresh,
  Search,
  VisibilityOutlined,
} from "@mui/icons-material";

import {
  deleteResponse,
  getFormFields,
  getFormResponses,
  getResponseById,
  getResponseHistory,
  updateResponse,
  getForms,
  type Form,
  type FormField,
  type FormResponse,
  type ResponseHistoryItem,
} from "../../api";
import { parseApiDate } from "../../utils/date";

/* =========================================================
   HELPERS
========================================================= */

const getErrorMessage = (
  error: any,
  fallback: string,
): string => {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => item?.msg)
      .filter(Boolean)
      .join(", ");
  }

  return detail || fallback;
};

const formatDateTime = (
  value: string,
): string => {
  if (!value) {
    return "-";
  }

  const date = parseApiDate(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAnswerDisplayValue = (
  value: string | null,
  structuredValue:
    | Record<string, unknown>
    | unknown[]
    | null,
): string => {
  if (
    structuredValue !== null &&
    structuredValue !== undefined
  ) {
    try {
      return JSON.stringify(
        structuredValue,
      );
    } catch {
      return String(structuredValue);
    }
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  return value;
};

/* =========================================================
   RESPONSE VALUE NORMALIZATION
========================================================= */

const getInitialFieldValue = (
  field: FormField,
  response: FormResponse,
): unknown => {
  const detail =
    response.details.find(
      (item) =>
        item.field_id === field.id,
    );

  if (!detail) {
    if (
      field.field_type ===
      "checkbox"
    ) {
      return [];
    }

    if (
      field.field_type ===
      "rating"
    ) {
      return 0;
    }

    return "";
  }

  if (
    detail.structured_value !==
      null &&
    detail.structured_value !==
      undefined
  ) {
    return detail.structured_value;
  }

  if (
    field.field_type ===
    "checkbox"
  ) {
    if (!detail.value) {
      return [];
    }

    try {
      const parsed = JSON.parse(
        detail.value,
      );

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return [detail.value];
    }

    return [];
  }

  if (
    field.field_type ===
    "number"
  ) {
    if (
      detail.value === null ||
      detail.value === ""
    ) {
      return "";
    }

    const numberValue =
      Number(detail.value);

    return Number.isNaN(
      numberValue,
    )
      ? ""
      : numberValue;
  }

  if (
    field.field_type ===
    "rating"
  ) {
    const ratingValue =
      Number(detail.value);

    return Number.isNaN(
      ratingValue,
    )
      ? 0
      : ratingValue;
  }

  return detail.value ?? "";
};

/* =========================================================
   PAGE
========================================================= */

const ResponsesPage = () => {
  /* =======================================================
     RESPONSE LIST
  ======================================================== */

  const [forms, setForms] =
    useState<Form[]>([]);

  const [responses, setResponses] =
    useState<FormResponse[]>([]);

  const [
    selectedFormId,
    setSelectedFormId,
  ] = useState<string>("all");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isLoadingResponses,
    setIsLoadingResponses,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  /* =======================================================
     VIEW STATE
  ======================================================== */

  const [
    selectedResponse,
    setSelectedResponse,
  ] =
    useState<FormResponse | null>(
      null,
    );

  const [
    isDetailsOpen,
    setIsDetailsOpen,
  ] = useState(false);

  const [
    isLoadingDetails,
    setIsLoadingDetails,
  ] = useState(false);

  /* =======================================================
     HISTORY STATE
  ======================================================== */

  const [history, setHistory] =
    useState<ResponseHistoryItem[]>(
      [],
    );

  const [
    isHistoryOpen,
    setIsHistoryOpen,
  ] = useState(false);

  const [
    isLoadingHistory,
    setIsLoadingHistory,
  ] = useState(false);

  /* =======================================================
     DELETE STATE
  ======================================================== */

  const [
    deletingResponse,
    setDeletingResponse,
  ] =
    useState<FormResponse | null>(
      null,
    );

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  /* =======================================================
     EDIT STATE
  ======================================================== */

  const [
    isEditOpen,
    setIsEditOpen,
  ] = useState(false);

  const [
    editingResponse,
    setEditingResponse,
  ] =
    useState<FormResponse | null>(
      null,
    );

  const [
    editingFields,
    setEditingFields,
  ] = useState<FormField[]>([]);

  const [
    editingValues,
    setEditingValues,
  ] = useState<
    Record<number, unknown>
  >({});

  const [
    editErrors,
    setEditErrors,
  ] = useState<
    Record<number, string>
  >({});

  const [
    editError,
    setEditError,
  ] = useState("");

  const [
    isLoadingEdit,
    setIsLoadingEdit,
  ] = useState(false);

  const [
    isSavingEdit,
    setIsSavingEdit,
  ] = useState(false);

  /* =======================================================
     LOAD ALL FORMS + RESPONSES
  ======================================================== */

  const loadFormsAndResponses =
    async () => {
      try {
        setError("");
        setIsLoading(true);

        const formData =
          await getForms();

        setForms(formData);

        const responseGroups =
          await Promise.all(
            formData.map(
              async (form) => {
                try {
                  return await getFormResponses(
                    form.id,
                  );
                } catch {
                  return [];
                }
              },
            ),
          );

        const allResponses =
          responseGroups
            .flat()
            .sort(
              (a, b) =>
                parseApiDate(
                  b.submitted_at,
                ).getTime() -
                parseApiDate(
                  a.submitted_at,
                ).getTime(),
            );

        setResponses(
          allResponses,
        );
      } catch (err: any) {
        setError(
          getErrorMessage(
            err,
            "Unable to load responses.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    };

  /* =======================================================
     LOAD RESPONSES FOR FORM
  ======================================================== */

  const loadResponsesForForm =
    async (
      formId: number,
    ) => {
      try {
        setIsLoadingResponses(
          true,
        );
        setError("");

        const formResponses =
          await getFormResponses(
            formId,
          );

        setResponses(
          [...formResponses].sort(
            (a, b) =>
              parseApiDate(
                b.submitted_at,
              ).getTime() -
              parseApiDate(
                a.submitted_at,
              ).getTime(),
          ),
        );
      } catch (err: any) {
        setError(
          getErrorMessage(
            err,
            "Unable to load form responses.",
          ),
        );
      } finally {
        setIsLoadingResponses(
          false,
        );
      }
    };

  useEffect(() => {
    loadFormsAndResponses();
  }, []);

  /* =======================================================
     FORM FILTER
  ======================================================== */

  const handleFormChange =
    async (
      value: string,
    ) => {
      setSelectedFormId(value);

      if (value === "all") {
        await loadFormsAndResponses();
        return;
      }

      await loadResponsesForForm(
        Number(value),
      );
    };

  /* =======================================================
     FORM TITLE
  ======================================================== */

  const getFormTitle = (
    formId: number,
  ): string => {
    return (
      forms.find(
        (form) =>
          form.id === formId,
      )?.title ||
      `Form #${formId}`
    );
  };

  /* =======================================================
     SEARCH
  ======================================================== */

  const filteredResponses =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return responses;
      }

      return responses.filter(
        (response) => {
          const formTitle =
            getFormTitle(
              response.form_id,
            ).toLowerCase();

          const responseId =
            String(
              response.id,
            ).toLowerCase();

          const userId =
            response.user_id !==
            null
              ? String(
                  response.user_id,
                ).toLowerCase()
              : "";

          const status =
            response.status.toLowerCase();

          return (
            formTitle.includes(
              query,
            ) ||
            responseId.includes(
              query,
            ) ||
            userId.includes(
              query,
            ) ||
            status.includes(query)
          );
        },
      );
    }, [
      responses,
      forms,
      searchTerm,
    ]);

  /* =======================================================
     STATISTICS
  ======================================================== */

  const totalResponses =
    responses.length;

  const submittedResponses =
    responses.filter(
      (response) =>
        response.status ===
        "submitted",
    ).length;

  const otherResponses =
    responses.filter(
      (response) =>
        response.status !==
        "submitted",
    ).length;

  const uniqueForms =
    new Set(
      responses.map(
        (response) =>
          response.form_id,
      ),
    ).size;

  /* =======================================================
     VIEW RESPONSE
  ======================================================== */

  const openDetails =
    async (
      responseId: number,
    ) => {
      try {
        setIsLoadingDetails(
          true,
        );
        setError("");

        const response =
          await getResponseById(
            responseId,
          );

        setSelectedResponse(
          response,
        );

        setIsDetailsOpen(true);
      } catch (err: any) {
        setError(
          getErrorMessage(
            err,
            "Unable to load response details.",
          ),
        );
      } finally {
        setIsLoadingDetails(
          false,
        );
      }
    };

  /* =======================================================
     HISTORY
  ======================================================== */

  const openHistory =
    async (
      responseId: number,
    ) => {
      try {
        setIsLoadingHistory(
          true,
        );
        setError("");

        const response =
          await getResponseById(
            responseId,
          );

        const historyData =
          await getResponseHistory(
            responseId,
          );

        setSelectedResponse(
          response,
        );

        setHistory(
          historyData,
        );

        setIsHistoryOpen(true);
      } catch (err: any) {
        setError(
          getErrorMessage(
            err,
            "Unable to load response history.",
          ),
        );
      } finally {
        setIsLoadingHistory(
          false,
        );
      }
    };

  /* =======================================================
     OPEN EDITOR
  ======================================================== */

  const openEdit =
    async (
      responseId: number,
    ) => {
      try {
        setIsLoadingEdit(
          true,
        );

        setEditError("");
        setEditErrors({});

        const response =
          await getResponseById(
            responseId,
          );

        const fields =
          await getFormFields(
            response.form_id,
          );

        const sortedFields =
          [...fields].sort(
            (a, b) =>
              a.field_order -
              b.field_order,
          );

        const initialValues: Record<
          number,
          unknown
        > = {};

        sortedFields.forEach(
          (field) => {
            initialValues[
              field.id
            ] =
              getInitialFieldValue(
                field,
                response,
              );
          },
        );

        setEditingResponse(
          response,
        );

        setEditingFields(
          sortedFields,
        );

        setEditingValues(
          initialValues,
        );

        setIsEditOpen(true);
      } catch (err: any) {
        setError(
          getErrorMessage(
            err,
            "Unable to open response editor.",
          ),
        );
      } finally {
        setIsLoadingEdit(
          false,
        );
      }
    };

  /* =======================================================
     CLOSE EDITOR
  ======================================================== */

  const closeEdit = () => {
    if (isSavingEdit) {
      return;
    }

    setIsEditOpen(false);
    setEditingResponse(null);
    setEditingFields([]);
    setEditingValues({});
    setEditErrors({});
    setEditError("");
  };

  /* =======================================================
     UPDATE EDIT VALUE
  ======================================================== */

  const updateEditorValue = (
    fieldId: number,
    value: unknown,
  ) => {
    setEditingValues(
      (current) => ({
        ...current,
        [fieldId]: value,
      }),
    );

    setEditErrors(
      (current) => {
        const next = {
          ...current,
        };

        delete next[fieldId];

        return next;
      },
    );
  };

  /* =======================================================
     VALIDATE EDITOR
  ======================================================== */

  const validateEditor =
    (): boolean => {
      const errors: Record<
        number,
        string
      > = {};

      editingFields.forEach(
        (field) => {
          if (!field.is_required) {
            return;
          }

          const value =
            editingValues[
              field.id
            ];

          if (
            value === null ||
            value === undefined ||
            value === ""
          ) {
            errors[field.id] =
              "This field is required.";

            return;
          }

          if (
            Array.isArray(value) &&
            value.length === 0
          ) {
            errors[field.id] =
              "This field is required.";
          }
        },
      );

      setEditErrors(errors);

      return (
        Object.keys(errors)
          .length === 0
      );
    };

  /* =======================================================
     BUILD BACKEND ANSWERS
  ======================================================== */

  const buildAnswers =
    () => {
      return editingFields.map(
        (field) => {
          let value =
            editingValues[
              field.id
            ];

          if (
            field.field_type ===
            "checkbox"
          ) {
            if (
              !Array.isArray(value)
            ) {
              value = [];
            }
          }

          if (
            field.field_type ===
            "number"
          ) {
            if (
              value === "" ||
              value === null ||
              value === undefined
            ) {
              value = null;
            } else {
              value = Number(value);
            }
          }

          if (
            field.field_type ===
            "rating"
          ) {
            value =
              value === null ||
              value === undefined
                ? 0
                : Number(value);
          }

          return {
            field_id: field.id,
            value,
          };
        },
      );
    };

  /* =======================================================
     SAVE EDITED RESPONSE
  ======================================================== */

  const saveResponse =
    async () => {
      if (!editingResponse) {
        return;
      }

      const valid =
        validateEditor();

      if (!valid) {
        setEditError(
          "Please complete all required fields.",
        );

        return;
      }

      try {
        setIsSavingEdit(true);
        setEditError("");

        const updatedResponse =
          await updateResponse(
            editingResponse.id,
            {
              answers:
                buildAnswers(),
            },
          );

        setResponses(
          (current) =>
            current.map(
              (response) =>
                response.id ===
                updatedResponse.id
                  ? updatedResponse
                  : response,
            ),
        );

        setNotice(
          "Response updated successfully.",
        );

        closeEdit();
      } catch (err: any) {
        setEditError(
          getErrorMessage(
            err,
            "Unable to update response.",
          ),
        );
      } finally {
        setIsSavingEdit(
          false,
        );
      }
    };

  /* =======================================================
     DELETE
  ======================================================== */

  const confirmDelete =
    async () => {
      if (!deletingResponse) {
        return;
      }

      try {
        setIsDeleting(true);
        setError("");

        await deleteResponse(
          deletingResponse.id,
        );

        setResponses(
          (current) =>
            current.filter(
              (response) =>
                response.id !==
                deletingResponse.id,
            ),
        );

        setDeletingResponse(
          null,
        );

        setNotice(
          "Response deleted successfully.",
        );
      } catch (err: any) {
        setError(
          getErrorMessage(
            err,
            "Unable to delete response.",
          ),
        );
      } finally {
        setIsDeleting(false);
      }
    };

  /* =======================================================
     CLOSE VIEW
  ======================================================== */

  const closeDetails = () => {
    if (isLoadingDetails) {
      return;
    }

    setIsDetailsOpen(false);
    setSelectedResponse(null);
  };

  /* =======================================================
     CLOSE HISTORY
  ======================================================== */

  const closeHistory = () => {
    if (isLoadingHistory) {
      return;
    }

    setIsHistoryOpen(false);
    setSelectedResponse(null);
    setHistory([]);
  };

  /* =======================================================
     DYNAMIC EDIT FIELD
  ======================================================== */

  const renderEditField = (
    field: FormField,
  ) => {
    const value =
      editingValues[field.id];

    const fieldError =
      editErrors[field.id];

    const options =
      field.options ?? [];

    /* -----------------------------------------------------
       TEXT
    ------------------------------------------------------ */

    if (
      field.field_type ===
      "text"
    ) {
      return (
        <TextField
          fullWidth
          size="small"
          label={field.label}
          placeholder={
            field.placeholder ??
            undefined
          }
          value={
            typeof value ===
            "string"
              ? value
              : ""
          }
          onChange={(event) =>
            updateEditorValue(
              field.id,
              event.target.value,
            )
          }
          error={Boolean(
            fieldError,
          )}
          helperText={
            fieldError ||
            field.description ||
            " "
          }
        />
      );
    }

    /* -----------------------------------------------------
       EMAIL
    ------------------------------------------------------ */

    if (
      field.field_type ===
      "email"
    ) {
      return (
        <TextField
          fullWidth
          size="small"
          type="email"
          label={field.label}
          placeholder={
            field.placeholder ??
            undefined
          }
          value={
            typeof value ===
            "string"
              ? value
              : ""
          }
          onChange={(event) =>
            updateEditorValue(
              field.id,
              event.target.value,
            )
          }
          error={Boolean(
            fieldError,
          )}
          helperText={
            fieldError ||
            field.description ||
            " "
          }
        />
      );
    }

    /* -----------------------------------------------------
       NUMBER
    ------------------------------------------------------ */

    if (
      field.field_type ===
      "number"
    ) {
      return (
        <TextField
          fullWidth
          size="small"
          type="number"
          label={field.label}
          placeholder={
            field.placeholder ??
            undefined
          }
          value={
            value === null ||
            value === undefined
              ? ""
              : String(value)
          }
          onChange={(event) =>
            updateEditorValue(
              field.id,
              event.target.value ===
                ""
                ? ""
                : Number(
                    event.target
                      .value,
                  ),
            )
          }
          error={Boolean(
            fieldError,
          )}
          helperText={
            fieldError ||
            field.description ||
            " "
          }
        />
      );
    }

    /* -----------------------------------------------------
       DATE
    ------------------------------------------------------ */

    if (
      field.field_type ===
      "date"
    ) {
      return (
        <TextField
          fullWidth
          size="small"
          type="date"
          label={field.label}
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
          value={
            typeof value ===
            "string"
              ? value
              : ""
          }
          onChange={(event) =>
            updateEditorValue(
              field.id,
              event.target.value,
            )
          }
          error={Boolean(
            fieldError,
          )}
          helperText={
            fieldError ||
            field.description ||
            " "
          }
        />
      );
    }

    /* -----------------------------------------------------
       DROPDOWN
    ------------------------------------------------------ */

    if (
      field.field_type ===
      "dropdown"
    ) {
      return (
        <FormControl
          fullWidth
          size="small"
          error={Boolean(
            fieldError,
          )}
        >
          <InputLabel>
            {field.label}
          </InputLabel>

          <Select
            value={
              typeof value ===
              "string"
                ? value
                : ""
            }
            label={
              field.label
            }
            onChange={(event) =>
              updateEditorValue(
                field.id,
                event.target.value,
              )
            }
          >
            <MenuItem value="">
              <em>
                Select an option
              </em>
            </MenuItem>

            {options.map(
              (option) => (
                <MenuItem
                  key={
                    option.id
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </MenuItem>
              ),
            )}
          </Select>

          <FormHelperText>
            {fieldError ||
              field.description ||
              " "}
          </FormHelperText>
        </FormControl>
      );
    }

    /* -----------------------------------------------------
       RADIO
    ------------------------------------------------------ */

    if (
      field.field_type ===
      "radio"
    ) {
      return (
        <FormControl
          error={Boolean(
            fieldError,
          )}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: "#334155",
              mb: 0.5,
            }}
          >
            {field.label}

            {field.is_required && (
              <Box
                component="span"
                sx={{
                  color:
                    "#dc2626",
                  ml: 0.3,
                }}
              >
                *
              </Box>
            )}
          </Typography>

          <RadioGroup
            value={
              typeof value ===
              "string"
                ? value
                : ""
            }
            onChange={(event) =>
              updateEditorValue(
                field.id,
                event.target.value,
              )
            }
          >
            {options.map(
              (option) => (
                <FormControlLabel
                  key={
                    option.id
                  }
                  value={
                    option.value
                  }
                  control={
                    <Radio />
                  }
                  label={
                    option.label
                  }
                />
              ),
            )}
          </RadioGroup>

          <FormHelperText>
            {fieldError ||
              field.description ||
              " "}
          </FormHelperText>
        </FormControl>
      );
    }

    /* -----------------------------------------------------
       CHECKBOX
    ------------------------------------------------------ */

    if (
      field.field_type ===
      "checkbox"
    ) {
      const selectedValues =
        Array.isArray(value)
          ? value
          : [];

      return (
        <FormControl
          error={Boolean(
            fieldError,
          )}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: "#334155",
              mb: 0.5,
            }}
          >
            {field.label}

            {field.is_required && (
              <Box
                component="span"
                sx={{
                  color:
                    "#dc2626",
                  ml: 0.3,
                }}
              >
                *
              </Box>
            )}
          </Typography>

          <Stack spacing={0.2}>
            {options.map(
              (option) => {
                const checked =
                  selectedValues.includes(
                    option.value,
                  );

                return (
                  <FormControlLabel
                    key={
                      option.id
                    }
                    control={
                      <Checkbox
                        checked={
                          checked
                        }
                        onChange={(
                          event,
                        ) => {
                          const nextValues =
                            event
                              .target
                              .checked
                              ? [
                                  ...selectedValues,
                                  option.value,
                                ]
                              : selectedValues.filter(
                                  (
                                    selected,
                                  ) =>
                                    selected !==
                                    option.value,
                                );

                          updateEditorValue(
                            field.id,
                            nextValues,
                          );
                        }}
                      />
                    }
                    label={
                      option.label
                    }
                  />
                );
              },
            )}
          </Stack>

          <FormHelperText>
            {fieldError ||
              field.description ||
              " "}
          </FormHelperText>
        </FormControl>
      );
    }

    /* -----------------------------------------------------
       RATING
    ------------------------------------------------------ */

    if (
      field.field_type ===
      "rating"
    ) {
      return (
        <Box>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: "#334155",
              mb: 0.8,
            }}
          >
            {field.label}

            {field.is_required && (
              <Box
                component="span"
                sx={{
                  color:
                    "#dc2626",
                  ml: 0.3,
                }}
              >
                *
              </Box>
            )}
          </Typography>

          <Rating
            value={
              typeof value ===
              "number"
                ? value
                : Number(value) ||
                  0
            }
            onChange={(
              _event,
              newValue,
            ) =>
              updateEditorValue(
                field.id,
                newValue ?? 0,
              )
            }
          />

          <Typography
            sx={{
              fontSize: 12,
              color: fieldError
                ? "#dc2626"
                : "#64748b",
              mt: 0.5,
            }}
          >
            {fieldError ||
              field.description ||
              " "}
          </Typography>
        </Box>
      );
    }

    /* -----------------------------------------------------
       FILE
    ------------------------------------------------------ */

    if (
      field.field_type ===
      "file"
    ) {
      return (
        <TextField
          fullWidth
          size="small"
          label={`${field.label} - File`}
          value={
            typeof value ===
            "string"
              ? value
              : ""
          }
          onChange={(event) =>
            updateEditorValue(
              field.id,
              event.target.value,
            )
          }
          error={Boolean(
            fieldError,
          )}
          helperText={
            fieldError ||
            "Enter file metadata or existing file reference."
          }
        />
      );
    }

    /* -----------------------------------------------------
       FALLBACK
    ------------------------------------------------------ */

    return (
      <TextField
        fullWidth
        size="small"
        label={field.label}
        value={
          typeof value ===
          "string"
            ? value
            : ""
        }
        onChange={(event) =>
          updateEditorValue(
            field.id,
            event.target.value,
          )
        }
        error={Boolean(
          fieldError,
        )}
        helperText={
          fieldError ||
          field.description ||
          " "
        }
      />
    );
  };

  /* =======================================================
     JSX
  ======================================================== */

  return (
    <Box sx={{ width: "100%" }}>
      {/* =====================================================
          HEADER
      ====================================================== */}

      <Box
        sx={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: {
            xs: "flex-start",
            md: "center",
          },
          gap: 2,
          mb: 3,
          flexDirection: {
            xs: "column",
            md: "row",
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
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.2,
            }}
          >
            Responses
          </Typography>

          <Typography
            sx={{
              mt: 0.7,
              color: "#64748b",
              fontSize: 14,
            }}
          >
            Review, manage and
            track submitted
            form responses.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={
            loadFormsAndResponses
          }
          disabled={isLoading}
          sx={{
            minWidth: 110,
            height: 42,
            borderRadius: 2,
            textTransform:
              "none",
            fontWeight: 700,
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 2,
          }}
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={() =>
                setError("")
              }
            >
              <Close fontSize="small" />
            </IconButton>
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
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            label:
              "Total Responses",
            value:
              totalResponses,
            icon: (
              <DescriptionOutlined />
            ),
          },
          {
            label: "Submitted",
            value:
              submittedResponses,
            icon: (
              <AssessmentOutlined />
            ),
          },
          {
            label: "Other Status",
            value:
              otherResponses,
            icon: (
              <HistoryOutlined />
            ),
          },
          {
            label:
              "Forms With Responses",
            value: uniqueForms,
            icon: (
              <DescriptionOutlined />
            ),
          },
        ].map((stat) => (
          <Paper
            key={stat.label}
            elevation={0}
            sx={{
              p: 2.2,
              border:
                "1px solid #e2e8f0",
              borderRadius: 3,
              backgroundColor:
                "#ffffff",
            }}
          >
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748b",
                    mb: 0.7,
                  }}
                >
                  {stat.label}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {isLoading
                    ? "—"
                    : stat.value}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  backgroundColor:
                    "#eff6ff",
                  color: "#2563eb",
                }}
              >
                {stat.icon}
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      {/* =====================================================
          FILTERS
      ====================================================== */}

      <Paper
        elevation={0}
        sx={{
          border:
            "1px solid #e2e8f0",
          borderRadius: 3,
          p: 2,
          mb: 3,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "1.5fr 1fr",
            },
            gap: 2,
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search by response ID, form, user or status..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
            slotProps={{
              input: {
                startAdornment: (
                  <Search
                    sx={{
                      mr: 1,
                      color:
                        "#94a3b8",
                    }}
                  />
                ),
              },
            }}
          />

          <FormControl
            fullWidth
            size="small"
          >
            <InputLabel>
              Filter by form
            </InputLabel>

            <Select
              value={
                selectedFormId
              }
              label="Filter by form"
              onChange={(event) =>
                handleFormChange(
                  event.target.value,
                )
              }
              disabled={isLoading}
            >
              <MenuItem value="all">
                All forms
              </MenuItem>

              {forms.map(
                (form) => (
                  <MenuItem
                    key={
                      form.id
                    }
                    value={String(
                      form.id,
                    )}
                  >
                    {form.title}
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* =====================================================
          TABLE
      ====================================================== */}

      <Paper
        elevation={0}
        sx={{
          border:
            "1px solid #e2e8f0",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor:
            "#ffffff",
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom:
              "1px solid #e2e8f0",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                color: "#0f172a",
                fontSize: 16,
              }}
            >
              Submitted
              Responses
            </Typography>

            <Typography
              sx={{
                color: "#64748b",
                fontSize: 12,
                mt: 0.4,
              }}
            >
              {
                filteredResponses.length
              }{" "}
              response
              {filteredResponses.length !==
              1
                ? "s"
                : ""}{" "}
              found
            </Typography>
          </Box>

          {isLoadingResponses && (
            <CircularProgress
              size={22}
            />
          )}
        </Box>

        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {[
              1, 2, 3, 4, 5,
            ].map((item) => (
              <Skeleton
                key={item}
                variant="rounded"
                height={64}
                sx={{
                  mb: 1,
                }}
              />
            ))}
          </Box>
        ) : filteredResponses.length ===
          0 ? (
          <Box
            sx={{
              py: 9,
              px: 3,
              textAlign:
                "center",
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius:
                  "50%",
                backgroundColor:
                  "#f1f5f9",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                mx: "auto",
                mb: 2,
              }}
            >
              <DescriptionOutlined
                sx={{
                  fontSize: 28,
                  color:
                    "#94a3b8",
                }}
              />
            </Box>

            <Typography
              sx={{
                fontWeight: 800,
                color:
                  "#334155",
                mb: 0.7,
              }}
            >
              No responses
              found
            </Typography>

            <Typography
              sx={{
                color:
                  "#64748b",
                fontSize: 13,
              }}
            >
              Try changing
              the search or
              form filter.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              width: "100%",
              overflowX:
                "auto",
            }}
          >
            <Box
              component="table"
              sx={{
                width: "100%",
                minWidth: 850,
                borderCollapse:
                  "collapse",

                "& th": {
                  textAlign:
                    "left",
                  px: 2,
                  py: 1.7,
                  backgroundColor:
                    "#f8fafc",
                  color:
                    "#64748b",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.04em",
                  borderBottom:
                    "1px solid #e2e8f0",
                },

                "& td": {
                  px: 2,
                  py: 1.8,
                  borderBottom:
                    "1px solid #f1f5f9",
                  color:
                    "#334155",
                  fontSize: 13,
                },

                "& tbody tr:hover":
                  {
                    backgroundColor:
                      "#f8fafc",
                  },
              }}
            >
              <thead>
                <tr>
                  <th>
                    Response
                  </th>
                  <th>Form</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>
                    Submitted
                  </th>
                  <th>
                    Updated
                  </th>
                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredResponses.map(
                  (
                    response,
                  ) => (
                    <tr
                      key={
                        response.id
                      }
                    >
                      <td>
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 800,
                            color:
                              "#0f172a",
                          }}
                        >
                          #
                          {
                            response.id
                          }
                        </Typography>
                      </td>

                      <td>
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color:
                              "#334155",
                          }}
                        >
                          {getFormTitle(
                            response.form_id,
                          )}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 11,
                            color:
                              "#94a3b8",
                            mt: 0.3,
                          }}
                        >
                          Form #
                          {
                            response.form_id
                          }
                        </Typography>
                      </td>

                      <td>
                        {response.user_id !==
                        null
                          ? `User #${response.user_id}`
                          : "Public user"}
                      </td>

                      <td>
                        <Chip
                          label={
                            response.status
                          }
                          size="small"
                          sx={{
                            fontWeight: 700,
                            textTransform:
                              "capitalize",
                            backgroundColor:
                              response.status ===
                              "submitted"
                                ? "#dcfce7"
                                : "#f1f5f9",
                            color:
                              response.status ===
                              "submitted"
                                ? "#166534"
                                : "#475569",
                          }}
                        />
                      </td>

                      <td>
                        {formatDateTime(
                          response.submitted_at,
                        )}
                      </td>

                      <td>
                        {formatDateTime(
                          response.updated_at,
                        )}
                      </td>

                      <td>
                        <Stack
                          direction="row"
                          spacing={
                            0.5
                          }
                        >
                          {/* VIEW */}
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              onClick={() =>
                                openDetails(
                                  response.id,
                                )
                              }
                            >
                              <VisibilityOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* EDIT */}
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() =>
                                openEdit(
                                  response.id,
                                )
                              }
                            >
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* HISTORY */}
                          <Tooltip title="History">
                            <IconButton
                              size="small"
                              onClick={() =>
                                openHistory(
                                  response.id,
                                )
                              }
                            >
                              <HistoryOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* DELETE */}
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                setDeletingResponse(
                                  response,
                                )
                              }
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </Box>
          </Box>
        )}
      </Paper>

      {/* =====================================================
          VIEW RESPONSE DIALOG
      ====================================================== */}

      <Dialog
        open={isDetailsOpen}
        onClose={
          closeDetails
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Response
          Details
        </DialogTitle>

        <DialogContent
          dividers
        >
          {isLoadingDetails ? (
            <Box
              sx={{
                py: 5,
                display: "flex",
                justifyContent:
                  "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : selectedResponse ? (
            <Stack
              spacing={2.5}
            >
              <Box
                sx={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                    },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color:
                        "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    RESPONSE ID
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 800,
                      mt: 0.4,
                    }}
                  >
                    #
                    {
                      selectedResponse.id
                    }
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color:
                        "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    FORM
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 700,
                      mt: 0.4,
                    }}
                  >
                    {getFormTitle(
                      selectedResponse.form_id,
                    )}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color:
                        "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    USER
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 600,
                      mt: 0.4,
                    }}
                  >
                    {selectedResponse.user_id !==
                    null
                      ? `User #${selectedResponse.user_id}`
                      : "Public user"}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color:
                        "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    SUBMITTED
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 600,
                      mt: 0.4,
                    }}
                  >
                    {formatDateTime(
                      selectedResponse.submitted_at,
                    )}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 800,
                    mb: 1.5,
                  }}
                >
                  Answers
                </Typography>

                <Stack spacing={1}>
                  {selectedResponse
                    .details
                    .length ===
                  0 ? (
                    <Typography
                      sx={{
                        color:
                          "#64748b",
                        fontSize: 13,
                      }}
                    >
                      No answer
                      details
                      available.
                    </Typography>
                  ) : (
                    selectedResponse.details.map(
                      (
                        detail,
                      ) => (
                        <Paper
                          key={
                            detail.id
                          }
                          elevation={
                            0
                          }
                          sx={{
                            p: 1.8,
                            border:
                              "1px solid #e2e8f0",
                            borderRadius: 2,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 11,
                              color:
                                "#64748b",
                              fontWeight: 700,
                              mb: 0.5,
                            }}
                          >
                            FIELD #
                            {
                              detail.field_id
                            }
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 14,
                              color:
                                "#0f172a",
                              fontWeight: 600,
                              wordBreak:
                                "break-word",
                            }}
                          >
                            {getAnswerDisplayValue(
                              detail.value,
                              detail.structured_value,
                            )}
                          </Typography>
                        </Paper>
                      ),
                    )
                  )}
                </Stack>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={
              closeDetails
            }
            sx={{
              textTransform:
                "none",
              fontWeight: 700,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* =====================================================
          EDIT RESPONSE DIALOG
      ====================================================== */}

      <Dialog
        open={isEditOpen}
        onClose={closeEdit}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Edit Response
        </DialogTitle>

        <DialogContent
          dividers
        >
          {isLoadingEdit ? (
            <Box
              sx={{
                py: 7,
                display: "flex",
                justifyContent:
                  "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2.5}>
              {/* RESPONSE INFO */}

              {editingResponse && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: 2,
                    backgroundColor:
                      "#f8fafc",
                  }}
                >
                  <Box
                    sx={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        {
                          xs: "1fr",
                          sm: "repeat(2, 1fr)",
                        },
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color:
                            "#64748b",
                        }}
                      >
                        RESPONSE
                      </Typography>

                      <Typography
                        sx={{
                          fontWeight: 800,
                          mt: 0.4,
                        }}
                      >
                        #
                        {
                          editingResponse.id
                        }
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color:
                            "#64748b",
                        }}
                      >
                        FORM
                      </Typography>

                      <Typography
                        sx={{
                          fontWeight: 700,
                          mt: 0.4,
                        }}
                      >
                        {getFormTitle(
                          editingResponse.form_id,
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}

              {/* ERROR */}

              {editError && (
                <Alert
                  severity="error"
                  onClose={() =>
                    setEditError(
                      "",
                    )
                  }
                >
                  {editError}
                </Alert>
              )}

              {/* FIELDS */}

              {editingFields.length ===
              0 ? (
                <Box
                  sx={{
                    py: 5,
                    textAlign:
                      "center",
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        "#64748b",
                    }}
                  >
                    No fields are
                    available
                    for this
                    response.
                  </Typography>
                </Box>
              ) : (
                editingFields.map(
                  (field) => (
                    <Paper
                      key={
                        field.id
                      }
                      elevation={
                        0
                      }
                      sx={{
                        p: 2,
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 2,
                      }}
                    >
                      {renderEditField(
                        field,
                      )}
                    </Paper>
                  ),
                )
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
          }}
        >
          <Button
            onClick={closeEdit}
            disabled={
              isSavingEdit
            }
            sx={{
              textTransform:
                "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={
              saveResponse
            }
            disabled={
              isLoadingEdit ||
              isSavingEdit ||
              editingFields.length ===
                0
            }
            startIcon={
              isSavingEdit ? (
                <CircularProgress
                  size={16}
                  color="inherit"
                />
              ) : (
                <EditOutlined />
              )
            }
            sx={{
              textTransform:
                "none",
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            {isSavingEdit
              ? "Saving..."
              : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =====================================================
          HISTORY DIALOG
      ====================================================== */}

      <Dialog
        open={isHistoryOpen}
        onClose={
          closeHistory
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
          }}
        >
          Response
          History
        </DialogTitle>

        <DialogContent
          dividers
        >
          {isLoadingHistory ? (
            <Box
              sx={{
                py: 5,
                display: "flex",
                justifyContent:
                  "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : history.length ===
            0 ? (
            <Box
              sx={{
                py: 5,
                textAlign:
                  "center",
              }}
            >
              <Typography
                sx={{
                  color:
                    "#64748b",
                  fontSize: 14,
                }}
              >
                No history
                available for
                this response.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {history.map(
                (item) => (
                  <Paper
                    key={
                      item.id
                    }
                    elevation={
                      0
                    }
                    sx={{
                      p: 2,
                      border:
                        "1px solid #e2e8f0",
                      borderRadius: 2,
                    }}
                  >
                    <Stack
                      direction={{
                        xs: "column",
                        sm: "row",
                      }}
                      sx={{
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            color:
                              "#0f172a",
                          }}
                        >
                          {
                            item.action
                          }
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 13,
                            color:
                              "#64748b",
                            mt: 0.5,
                          }}
                        >
                          {
                            item.description
                          }
                        </Typography>
                      </Box>

                      <Typography
                        sx={{
                          fontSize: 12,
                          color:
                            "#94a3b8",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {formatDateTime(
                          item.created_at,
                        )}
                      </Typography>
                    </Stack>
                  </Paper>
                ),
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={
              closeHistory
            }
            sx={{
              textTransform:
                "none",
              fontWeight: 700,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* =====================================================
          DELETE DIALOG
      ====================================================== */}

      <Dialog
        open={Boolean(
          deletingResponse,
        )}
        onClose={() =>
          !isDeleting &&
          setDeletingResponse(
            null,
          )
        }
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
          }}
        >
          Delete Response?
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color:
                "#64748b",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Are you sure you
            want to delete
            response #
            {
              deletingResponse?.id
            }
            ? This action
            cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setDeletingResponse(
                null,
              )
            }
            disabled={isDeleting}
            sx={{
              textTransform:
                "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={
              confirmDelete
            }
            disabled={isDeleting}
            startIcon={
              isDeleting ? (
                <CircularProgress
                  size={16}
                  color="inherit"
                />
              ) : (
                <Delete />
              )
            }
            sx={{
              textTransform:
                "none",
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            {isDeleting
              ? "Deleting..."
              : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =====================================================
          SUCCESS SNACKBAR
      ====================================================== */}

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3000}
        onClose={() =>
          setNotice("")
        }
        message={notice}
      />
    </Box>
  );
};

export default ResponsesPage;