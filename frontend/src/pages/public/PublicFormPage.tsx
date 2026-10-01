import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Rating,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DescriptionOutlined,
  SendOutlined,
} from "@mui/icons-material";
import { useParams } from "react-router-dom";

import {
  getPublicForm,
  submitPublicForm,
  type PublicForm,
} from "../../api";
import type { FormField } from "../../api/formFieldsApi";

interface FieldCondition {
  field?: string;
  operator?: string;
  value?: unknown;
}

interface ConditionalLogic {
  logic?: string;
  conditions?: FieldCondition[];
}

type Answers = Record<number, unknown>;

const createEmptyAnswers = (fields: FormField[]): Answers =>
  fields.reduce<Answers>((answers, field) => {
    answers[field.id] = field.field_type === "checkbox"
      ? []
      : field.field_type === "rating"
        ? null
        : "";
    return answers;
  }, {});

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const detail = (
    error as { response?: { data?: { detail?: unknown } } }
  ).response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "object" && item !== null && "msg" in item
          ? String((item as { msg?: unknown }).msg ?? "")
          : String(item),
      )
      .filter(Boolean)
      .join(", ");
  }

  return fallback;
};

const getRuleNumber = (
  field: FormField,
  key: string,
  fallback?: number,
): number | undefined => {
  const value = field.validation_rules?.[key];
  const number = typeof value === "number" ? value : Number(value);

  return value === undefined || value === null || value === "" || Number.isNaN(number)
    ? fallback
    : number;
};

const getRuleString = (
  field: FormField,
  key: string,
): string | undefined => {
  const value = field.validation_rules?.[key];
  return typeof value === "string" ? value : undefined;
};

const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

const validateField = (
  field: FormField,
  value: unknown,
): string => {
  if (field.is_required && isEmpty(value)) {
    return `${field.label} is required.`;
  }

  if (isEmpty(value)) return "";

  if (field.field_type === "text" && typeof value === "string") {
    const minLength = getRuleNumber(field, "min_length");
    const maxLength = getRuleNumber(field, "max_length");
    if (minLength !== undefined && value.trim().length < minLength) {
      return `Use at least ${minLength} characters.`;
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return `Use no more than ${maxLength} characters.`;
    }
  }

  if (field.field_type === "email" && typeof value === "string") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Enter a valid email address.";
    }
  }

  if (field.field_type === "number") {
    const number = Number(value);
    const min = getRuleNumber(field, "min");
    const max = getRuleNumber(field, "max");
    if (Number.isNaN(number)) return "Enter a valid number.";
    if (min !== undefined && number < min) return `Enter a value of at least ${min}.`;
    if (max !== undefined && number > max) return `Enter a value no greater than ${max}.`;
  }

  if (field.field_type === "date" && typeof value === "string") {
    const minDate = getRuleString(field, "min_date");
    const maxDate = getRuleString(field, "max_date");
    if (minDate && value < minDate) return `Choose ${minDate} or later.`;
    if (maxDate && value > maxDate) return `Choose ${maxDate} or earlier.`;
  }

  if (field.field_type === "rating") {
    const number = Number(value);
    const min = getRuleNumber(field, "min", 1) ?? 1;
    const max = getRuleNumber(field, "max", 5) ?? 5;
    if (number < min || number > max) {
      return `Choose a rating from ${min} to ${max}.`;
    }
  }

  return "";
};

const evaluateCondition = (
  condition: FieldCondition,
  values: Answers,
  fieldsByName: Map<string, FormField>,
): boolean => {
  if (!condition.field) return false;

  const referencedField = fieldsByName.get(condition.field);
  if (!referencedField) return false;

  const actual = values[referencedField.id];
  const expected = condition.value;

  switch (condition.operator) {
    case "equals":
      return actual === expected || String(actual ?? "") === String(expected ?? "");
    case "not_equals":
      return actual !== expected && String(actual ?? "") !== String(expected ?? "");
    case "contains":
      return Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual ?? "").includes(String(expected ?? ""));
    case "not_contains":
      return Array.isArray(actual)
        ? !actual.includes(expected)
        : !String(actual ?? "").includes(String(expected ?? ""));
    case "greater_than":
      return Number(actual) > Number(expected);
    case "less_than":
      return Number(actual) < Number(expected);
    default:
      return false;
  }
};

const fieldIsVisible = (
  field: FormField,
  values: Answers,
  fieldsByName: Map<string, FormField>,
): boolean => {
  if (!field.conditional_logic) return true;

  const logic = field.conditional_logic as ConditionalLogic;
  const conditions = logic.conditions ?? [];
  if (conditions.length === 0) return true;

  const results = conditions.map((condition) =>
    evaluateCondition(condition, values, fieldsByName),
  );

  return logic.logic === "OR" ? results.some(Boolean) : results.every(Boolean);
};

const PublicFormPage = () => {
  const { slug = "" } = useParams();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedResponseId, setSubmittedResponseId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setForm(null);
    setSubmitError("");

    void getPublicForm(slug)
      .then((result) => {
        if (!active) return;
        setForm(result);
        setAnswers(createEmptyAnswers(result.fields));
      })
      .catch((error: unknown) => {
        if (active) {
          setSubmitError(getErrorMessage(error, "This public form is unavailable."));
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const sortedFields = useMemo(
    () => [...(form?.fields ?? [])].sort((left, right) => left.field_order - right.field_order || left.id - right.id),
    [form],
  );

  const fieldsByName = useMemo(
    () => new Map(sortedFields.map((field) => [field.name, field])),
    [sortedFields],
  );

  const visibleFields = useMemo(() => {
    const currentValues = { ...answers };
    const visible: FormField[] = [];

    for (const field of sortedFields) {
      if (fieldIsVisible(field, currentValues, fieldsByName)) {
        visible.push(field);
      } else {
        currentValues[field.id] = undefined;
      }
    }

    return visible;
  }, [answers, fieldsByName, sortedFields]);

  const updateAnswer = (fieldId: number, value: unknown) => {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
    setSubmitError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    const nextErrors: Record<number, string> = {};
    for (const field of visibleFields) {
      const message = validateField(field, answers[field.id]);
      if (message) nextErrors[field.id] = message;
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmitError("Review the highlighted questions before submitting.");
      return;
    }

    const answersToSubmit = visibleFields.map((field) => ({
      field_id: field.id,
      value: answers[field.id] === undefined ? null : answers[field.id],
    }));

    if (answersToSubmit.length === 0 && sortedFields[0]) {
      answersToSubmit.push({ field_id: sortedFields[0].id, value: null });
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await submitPublicForm(slug, { answers: answersToSubmit });
      setSubmittedResponseId(response.id);
    } catch (error: unknown) {
      setSubmitError(getErrorMessage(error, "Your response could not be submitted. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetResponse = () => {
    if (!form) return;
    setAnswers(createEmptyAnswers(form.fields));
    setFieldErrors({});
    setSubmitError("");
    setSubmittedResponseId(null);
  };

  const renderField = (field: FormField) => {
    const value = answers[field.id];
    const error = fieldErrors[field.id] ?? "";
    const options = [...(field.options ?? [])].sort((left, right) => left.option_order - right.option_order);
    const min = getRuleNumber(field, "min");
    const max = getRuleNumber(field, "max");
    const minLength = getRuleNumber(field, "min_length");
    const maxLength = getRuleNumber(field, "max_length");
    const minDate = getRuleString(field, "min_date");
    const maxDate = getRuleString(field, "max_date");

    if (["text", "number", "email", "date"].includes(field.field_type)) {
      return (
        <TextField
          id={`field-${field.id}`}
          fullWidth
          size="small"
          type={field.field_type}
          label={field.placeholder || "Your answer"}
          value={typeof value === "string" || typeof value === "number" ? value : ""}
          onChange={(event) => updateAnswer(field.id, event.target.value)}
          error={Boolean(error)}
          helperText={error || field.description || " "}
          slotProps={{
            htmlInput: {
              min: field.field_type === "number" ? min : field.field_type === "date" ? minDate : undefined,
              max: field.field_type === "number" ? max : field.field_type === "date" ? maxDate : undefined,
              minLength: field.field_type === "text" ? minLength : undefined,
              maxLength: field.field_type === "text" ? maxLength : undefined,
              step: field.field_type === "number" ? "any" : undefined,
            },
          }}
        />
      );
    }

    if (field.field_type === "dropdown") {
      return (
        <TextField
          id={`field-${field.id}`}
          select
          fullWidth
          size="small"
          label={field.placeholder || "Select an option"}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => updateAnswer(field.id, event.target.value)}
          error={Boolean(error)}
          helperText={error || field.description || " "}
        >
          <MenuItem value=""><em>Select an option</em></MenuItem>
          {options.map((option) => (
            <MenuItem key={option.id} value={option.value}>{option.label}</MenuItem>
          ))}
        </TextField>
      );
    }

    if (field.field_type === "radio") {
      return (
        <FormControl error={Boolean(error)} required={field.is_required}>
          <RadioGroup
            aria-labelledby={`field-label-${field.id}`}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => updateAnswer(field.id, event.target.value)}
          >
            {options.map((option) => (
              <FormControlLabel
                key={option.id}
                value={option.value}
                control={<Radio size="small" />}
                label={option.label}
                sx={{ minHeight: 38, mr: 0, color: "#334155" }}
              />
            ))}
          </RadioGroup>
          {(error || field.description) && <FormHelperText>{error || field.description}</FormHelperText>}
        </FormControl>
      );
    }

    if (field.field_type === "checkbox") {
      const selectedValues = Array.isArray(value) ? value as string[] : [];
      return (
        <FormControl error={Boolean(error)} required={field.is_required}>
          <FormGroup>
            {options.map((option) => (
              <FormControlLabel
                key={option.id}
                control={(
                  <Checkbox
                    size="small"
                    checked={selectedValues.includes(option.value)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...selectedValues, option.value]
                        : selectedValues.filter((item) => item !== option.value);
                      updateAnswer(field.id, next);
                    }}
                  />
                )}
                label={option.label}
                sx={{ minHeight: 38, mr: 0, color: "#334155" }}
              />
            ))}
          </FormGroup>
          {(error || field.description) && <FormHelperText>{error || field.description}</FormHelperText>}
        </FormControl>
      );
    }

    if (field.field_type === "rating") {
      const ratingMin = Math.max(1, getRuleNumber(field, "min", 1) ?? 1);
      const ratingMax = Math.max(ratingMin, getRuleNumber(field, "max", 5) ?? 5);
      return (
        <Stack spacing={0.5}>
          <Rating
            name={`field-${field.id}`}
            max={ratingMax}
            value={typeof value === "number" ? value : null}
            onChange={(_, nextValue) => updateAnswer(field.id, nextValue)}
            aria-label={field.label}
          />
          <Typography sx={{ color: error ? "#d32f2f" : "#64748b", fontSize: 12.5 }}>
            {error || field.description || `Choose a rating from ${ratingMin} to ${ratingMax}.`}
          </Typography>
        </Stack>
      );
    }

    if (field.field_type === "file") {
      const fileInfo = typeof value === "object" && value !== null
        ? value as { name?: string; size?: number }
        : null;
      return (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadOutlined />}
            sx={{ width: "fit-content", textTransform: "none" }}
          >
            Choose file
            <input
              hidden
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                updateAnswer(
                  field.id,
                  file ? { name: file.name, size: file.size, type: file.type } : "",
                );
              }}
            />
          </Button>
          <Typography sx={{ color: "#475569", fontSize: 13, overflowWrap: "anywhere" }}>
            {fileInfo?.name ?? "No file selected"}
          </Typography>
          <Typography sx={{ color: error ? "#d32f2f" : "#64748b", fontSize: 12.5 }}>
            {error || "This form records file details only; file storage is not configured."}
          </Typography>
        </Stack>
      );
    }

    return null;
  };

  const pageFrame = (children: React.ReactNode) => (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f6f5", px: { xs: 1.5, sm: 3 }, py: { xs: 2.5, sm: 4, md: 6 } }}>
      <Stack spacing={2.5} sx={{ width: "100%", maxWidth: 820, mx: "auto" }}>
        <Stack direction="row" spacing={1.25} sx={{ px: 0.5, alignItems: "center" }}>
          <Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: "#147d73", color: "#ffffff" }}>
            <DescriptionOutlined fontSize="small" />
          </Box>
          <Typography sx={{ color: "#334155", fontWeight: 700, fontSize: 14 }}>Dynamic Forms</Typography>
          <Box sx={{ flex: 1 }} />
          <Chip size="small" label="PUBLIC FORM" sx={{ bgcolor: "#e4f3ef", color: "#147d73", borderRadius: 1, fontWeight: 700, fontSize: 10.5 }} />
        </Stack>
        {children}
        <Typography sx={{ textAlign: "center", color: "#94a3b8", fontSize: 11.5 }}>
          Powered by Dynamic Forms
        </Typography>
      </Stack>
    </Box>
  );

  if (isLoading) {
    return pageFrame(
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderColor: "#e2e8e7", borderRadius: 2 }}>
        <Skeleton width="55%" height={40} />
        <Skeleton width="80%" />
        <Divider sx={{ my: 3 }} />
        <Stack spacing={3}>
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} variant="rounded" height={84} />)}
        </Stack>
      </Paper>,
    );
  }

  if (submittedResponseId !== null && form) {
    return pageFrame(
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, borderColor: "#e2e8e7", borderRadius: 2, textAlign: "center" }}>
        <Box sx={{ width: 64, height: 64, display: "grid", placeItems: "center", mx: "auto", mb: 2, borderRadius: "50%", bgcolor: "#e4f3ef", color: "#147d73" }}>
          <CheckCircleOutlined sx={{ fontSize: 36 }} />
        </Box>
        <Typography variant="h4" sx={{ color: "#0f172a", fontSize: { xs: 24, sm: 28 }, fontWeight: 700 }}>
          Response received
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b", fontSize: 14 }}>
          Thank you for completing {form.title}.
        </Typography>
        <Typography sx={{ mt: 1, color: "#94a3b8", fontSize: 12.5 }}>
          Reference #{submittedResponseId}
        </Typography>
        <Button onClick={resetResponse} sx={{ mt: 3, textTransform: "none", color: "#147d73" }}>
          Submit another response
        </Button>
      </Paper>,
    );
  }

  if (!form) {
    return pageFrame(
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderColor: "#e2e8e7", borderRadius: 2 }}>
        <Typography variant="h5" sx={{ color: "#0f172a", fontWeight: 700 }}>Form unavailable</Typography>
        <Alert severity="error" sx={{ mt: 2 }}>{submitError || "This form is unavailable or no longer accepting responses."}</Alert>
      </Paper>,
    );
  }

  return pageFrame(
    <Paper
      component="form"
      variant="outlined"
      onSubmit={(event) => void handleSubmit(event)}
      sx={{ borderColor: "#e2e8e7", borderRadius: 2, overflow: "hidden" }}
    >
      <Box sx={{ height: 5, bgcolor: "#147d73" }} />
      <Box sx={{ px: { xs: 2.5, sm: 4 }, pt: { xs: 3, sm: 4 }, pb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
          <Chip size="small" label={`${visibleFields.length} ${visibleFields.length === 1 ? "question" : "questions"}`} sx={{ borderRadius: 1, bgcolor: "#edf3f2", color: "#526663", fontWeight: 600 }} />
          {visibleFields.some((field) => field.is_required) && (
            <Typography sx={{ color: "#64748b", fontSize: 12.5 }}>* Required</Typography>
          )}
        </Stack>
        <Typography variant="h3" sx={{ color: "#0f172a", fontSize: { xs: 26, sm: 32 }, fontWeight: 700, lineHeight: 1.2, overflowWrap: "anywhere" }}>
          {form.title}
        </Typography>
        {form.description && (
          <Typography sx={{ mt: 1, color: "#64748b", fontSize: 14, whiteSpace: "pre-line" }}>
            {form.description}
          </Typography>
        )}
      </Box>

      <Divider />

      <Stack divider={<Divider flexItem />}>
        {visibleFields.map((field, index) => (
          <Box key={field.id} component="section" sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 2.5, sm: 3 } }}>
            <Stack direction="row" spacing={1.25} sx={{ mb: 1.4, alignItems: "flex-start" }}>
              <Typography sx={{ pt: 0.1, color: "#94a3a1", fontSize: 12, fontWeight: 700, minWidth: 22 }}>
                {String(index + 1).padStart(2, "0")}
              </Typography>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography id={`field-label-${field.id}`} component="label" htmlFor={`field-${field.id}`} sx={{ display: "block", color: "#1f2937", fontSize: 15, fontWeight: 650, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                  {field.label}{field.is_required && <Box component="span" sx={{ ml: 0.4, color: "#b54745" }}>*</Box>}
                </Typography>
                {field.description && !["checkbox", "radio", "file", "rating"].includes(field.field_type) && (
                  <Typography sx={{ mt: 0.35, color: "#64748b", fontSize: 12.5 }}>{field.description}</Typography>
                )}
              </Box>
            </Stack>
            <Box sx={{ pl: { xs: 0, sm: 4 } }}>{renderField(field)}</Box>
          </Box>
        ))}
      </Stack>

      {submitError && (
        <Alert severity={Object.keys(fieldErrors).length > 0 ? "warning" : "error"} sx={{ mx: { xs: 2.5, sm: 4 }, mt: 2 }}>
          {submitError}
        </Alert>
      )}

      <Box sx={{ px: { xs: 2.5, sm: 4 }, py: 2.5, bgcolor: "#fafcfb", borderTop: "1px solid #e8edeb" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
          <Typography sx={{ color: "#94a3b8", fontSize: 12 }}>Your answers are submitted securely.</Typography>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={isSubmitting || sortedFields.length === 0}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SendOutlined />}
            sx={{ minWidth: 150, minHeight: 42, borderRadius: 1.5, bgcolor: "#147d73", textTransform: "none", fontWeight: 700, "&:hover": { bgcolor: "#10695f" } }}
          >
            {isSubmitting ? "Submitting..." : "Submit response"}
          </Button>
        </Stack>
      </Box>
    </Paper>,
  );
};

export default PublicFormPage;