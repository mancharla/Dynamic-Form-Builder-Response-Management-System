import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  AssessmentOutlined,
  FileDownloadOutlined,
  PictureAsPdfOutlined,
  Refresh,
} from "@mui/icons-material";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

import {
  downloadFormAnalyticsExport,
  getFormAnalytics,
  getForms,
  type AnalyticsExportFormat,
  type FieldAnalyticsItem,
  type Form,
  type FormAnalytics,
} from "../../api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  ChartTooltip,
);

type TrendRange = "30" | "all";

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const detail = (
    error as { response?: { data?: { detail?: unknown } } }
  ).response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

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

const formatDay = (value: string): string => {
  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en", {
        month: "short",
        day: "numeric",
      });
};

const formatAnswerLabel = (value: string): string =>
  value.length > 28 ? `${value.slice(0, 25)}...` : value;

const cardSx = {
  p: { xs: 2, sm: 2.5 },
  borderColor: "#e2e8f0",
  borderRadius: 2,
  bgcolor: "#ffffff",
};

const AnalyticsPage = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | "">("");
  const [analytics, setAnalytics] = useState<FormAnalytics | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | "">("");
  const [range, setRange] = useState<TrendRange>("30");
  const [isFormsLoading, setIsFormsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [exporting, setExporting] = useState<AnalyticsExportFormat | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    let active = true;

    setIsFormsLoading(true);
    setError("");

    void getForms()
      .then((items) => {
        if (!active) return;
        setForms(items);
        setSelectedFormId((current) =>
          items.some((form) => form.id === current)
            ? current
            : items[0]?.id ?? "",
        );
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(getErrorMessage(requestError, "Unable to load forms."));
        }
      })
      .finally(() => {
        if (active) setIsFormsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedFormId === "") {
      setAnalytics(null);
      return;
    }

    let active = true;
    setAnalytics(null);
    setIsAnalyticsLoading(true);
    setError("");

    void getFormAnalytics(selectedFormId)
      .then((result) => {
        if (!active) return;
        setAnalytics(result);
        setSelectedFieldId((current) =>
          result.field_analytics.some((field) => field.field_id === current)
            ? current
            : result.field_analytics[0]?.field_id ?? "",
        );
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            getErrorMessage(requestError, "Unable to load form analytics."),
          );
        }
      })
      .finally(() => {
        if (active) setIsAnalyticsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedFormId, refreshVersion]);

  const activeField: FieldAnalyticsItem | undefined =
    analytics?.field_analytics.find(
      (field) => field.field_id === selectedFieldId,
    ) ?? analytics?.field_analytics[0];

  const trend = useMemo(() => {
    const items = analytics?.response_trend ?? [];

    if (range === "all") {
      return items;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 29);
    cutoff.setHours(0, 0, 0, 0);

    return items.filter((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      return date >= cutoff;
    });
  }, [analytics, range]);

  const trendData = useMemo(
    () => ({
      labels: trend.map((item) => formatDay(item.date)),
      datasets: [
        {
          label: "Submissions",
          data: trend.map((item) => item.count),
          borderColor: "#147d73",
          backgroundColor: "rgba(20, 125, 115, 0.12)",
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#147d73",
          fill: true,
          tension: 0.3,
        },
      ],
    }),
    [trend],
  );

  const distribution = useMemo(
    () =>
      Object.entries(activeField?.distribution ?? {})
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 10),
    [activeField],
  );

  const distributionData = useMemo(
    () => ({
      labels: distribution.map(([answer]) => formatAnswerLabel(answer)),
      datasets: [
        {
          label: "Answers",
          data: distribution.map(([, count]) => count),
          backgroundColor: [
            "#147d73",
            "#398b7f",
            "#62a094",
            "#8ab7ad",
            "#b4d0ca",
            "#c98b3c",
            "#d7a968",
            "#e5c597",
            "#4c7190",
            "#88a0b4",
          ],
          borderRadius: 3,
          barThickness: 18,
        },
      ],
    }),
    [distribution],
  );

  const answeredTotal =
    analytics?.field_analytics.reduce(
      (sum, field) => sum + field.total_answers,
      0,
    ) ?? 0;

  const handleExport = async (format: AnalyticsExportFormat) => {
    if (selectedFormId === "") return;

    setExporting(format);
    setExportError("");

    try {
      const file = await downloadFormAnalyticsExport(selectedFormId, format);
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      const selectedForm = forms.find((form) => form.id === selectedFormId);
      const slug = selectedForm?.slug ?? `form-${selectedFormId}`;

      link.href = objectUrl;
      link.download = `${slug}-responses.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError: unknown) {
      setExportError(
        getErrorMessage(requestError, `Unable to export ${format.toUpperCase()}.`),
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ width: "100%", maxWidth: 1600, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontSize: { xs: 24, md: 28 }, fontWeight: 700, color: "#0f172a" }}>
            Analytics
          </Typography>
          <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 14 }}>
            Track response volume and understand how people answer.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: "stretch" }}>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 250 } }}>
            <InputLabel id="analytics-form-label">Form</InputLabel>
            <Select
              labelId="analytics-form-label"
              label="Form"
              value={selectedFormId}
              onChange={(event) => setSelectedFormId(Number(event.target.value))}
              disabled={isFormsLoading || forms.length === 0}
            >
              {forms.map((form) => (
                <MenuItem key={form.id} value={form.id}>
                  {form.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            disabled={selectedFormId === "" || isAnalyticsLoading}
            onClick={() => setRefreshVersion((version) => version + 1)}
            sx={{ minHeight: 40, textTransform: "none", whiteSpace: "nowrap" }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={exporting === "excel" ? <CircularProgress size={16} /> : <FileDownloadOutlined />}
            disabled={selectedFormId === "" || exporting !== null}
            onClick={() => void handleExport("excel")}
            sx={{ minHeight: 40, textTransform: "none", whiteSpace: "nowrap" }}
          >
            Excel
          </Button>
          <Button
            variant="contained"
            disableElevation
            startIcon={exporting === "pdf" ? <CircularProgress size={16} /> : <PictureAsPdfOutlined />}
            disabled={selectedFormId === "" || exporting !== null}
            onClick={() => void handleExport("pdf")}
            sx={{ minHeight: 40, textTransform: "none", whiteSpace: "nowrap", bgcolor: "#147d73" }}
          >
            PDF
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {exportError && <Alert severity="error">{exportError}</Alert>}

      {!isFormsLoading && forms.length === 0 && !error && (
        <Paper variant="outlined" sx={{ ...cardSx, py: 7, textAlign: "center" }}>
          <AssessmentOutlined sx={{ color: "#94a3b8", fontSize: 36, mb: 1 }} />
          <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>No forms to analyze</Typography>
          <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 14 }}>
            Create a form to see submission trends and answer summaries here.
          </Typography>
        </Paper>
      )}

      {isFormsLoading && (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={104} />
          <Skeleton variant="rounded" height={360} />
        </Stack>
      )}

      {forms.length > 0 && analytics && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            {[
              { label: "Total responses", value: analytics.total_responses, tint: "#e5f3f1", color: "#147d73" },
              { label: "Questions", value: analytics.field_analytics.length, tint: "#fff2df", color: "#a96412" },
              { label: "Answers recorded", value: answeredTotal, tint: "#e9f0f7", color: "#426681" },
            ].map((metric) => (
              <Paper key={metric.label} variant="outlined" sx={{ ...cardSx, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: metric.tint, color: metric.color }}>
                  <AssessmentOutlined fontSize="small" />
                </Box>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: 13 }}>{metric.label}</Typography>
                  <Typography sx={{ mt: 0.2, color: "#0f172a", fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}>
                    {isAnalyticsLoading ? "—" : metric.value.toLocaleString()}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>

          <Paper variant="outlined" sx={cardSx}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
              <Box>
                <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Response trend</Typography>
                <Typography sx={{ mt: 0.3, fontSize: 13, color: "#64748b" }}>
                  Submissions by day for {analytics.form_title}.
                </Typography>
              </Box>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={range}
                onChange={(_, value: TrendRange | null) => value && setRange(value)}
                aria-label="Response trend range"
              >
                <ToggleButton value="30" sx={{ px: 1.5, textTransform: "none" }}>30 days</ToggleButton>
                <ToggleButton value="all" sx={{ px: 1.5, textTransform: "none" }}>All time</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Box sx={{ position: "relative", height: { xs: 250, md: 320 }, mt: 2 }}>
              {isAnalyticsLoading ? (
                <Skeleton variant="rounded" height="100%" />
              ) : trend.length > 0 ? (
                <Line
                  data={trendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
                      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#edf1f4" } },
                    },
                  }}
                />
              ) : (
                <Box sx={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center" }}>
                  <Typography sx={{ color: "#64748b", fontSize: 14 }}>
                    No submissions in this period.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={cardSx}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
              <Box>
                <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Answer distribution</Typography>
                <Typography sx={{ mt: 0.3, fontSize: 13, color: "#64748b" }}>
                  Most common answers for a selected question.
                </Typography>
              </Box>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 270 } }} disabled={!analytics.field_analytics.length}>
                <InputLabel id="analytics-field-label">Question</InputLabel>
                <Select
                  labelId="analytics-field-label"
                  label="Question"
                  value={activeField?.field_id ?? ""}
                  onChange={(event) => setSelectedFieldId(Number(event.target.value))}
                >
                  {analytics.field_analytics.map((field) => (
                    <MenuItem key={field.field_id} value={field.field_id}>{field.field_label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            {activeField ? (
              <>
                <Typography sx={{ mt: 2, color: "#475569", fontSize: 13 }}>
                  {activeField.total_answers.toLocaleString()} answers · {activeField.field_type.replaceAll("_", " ")}
                </Typography>
                <Box sx={{ position: "relative", height: Math.max(190, distribution.length * 38), mt: 1.5 }}>
                  {distribution.length > 0 ? (
                    <Bar
                      data={distributionData}
                      options={{
                        indexAxis: "y",
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#edf1f4" } },
                          y: { grid: { display: false } },
                        },
                      }}
                    />
                  ) : (
                    <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
                      <Typography sx={{ color: "#64748b", fontSize: 14 }}>No answers recorded for this question.</Typography>
                    </Box>
                  )}
                </Box>
                {Object.keys(activeField.distribution).length > distribution.length && (
                  <Typography sx={{ color: "#64748b", fontSize: 12, textAlign: "right" }}>
                    Showing the top {distribution.length} answers.
                  </Typography>
                )}
              </>
            ) : (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <Typography sx={{ color: "#64748b", fontSize: 14 }}>This form does not have any questions yet.</Typography>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Stack>
  );
};

export default AnalyticsPage;