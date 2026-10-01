import { Fragment, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  DescriptionOutlined,
  ExpandLess,
  ExpandMore,
  HistoryOutlined,
  Refresh,
  SendOutlined,
} from "@mui/icons-material";

import { getActivityLogs, type ActivityLog, type ActivityLogPage } from "../../api";
import { parseApiDate } from "../../utils/date";

const pageSizes = [10, 20, 50];

const actionOptions = [
  ["FORM_CREATED", "Form created"],
  ["FORM_UPDATED", "Form updated"],
  ["FORM_DELETED", "Form deleted"],
  ["FORM_ENABLED", "Form enabled"],
  ["FORM_DISABLED", "Form disabled"],
  ["RESPONSE_SUBMITTED", "Response submitted"],
  ["RESPONSE_UPDATED", "Response updated"],
  ["RESPONSE_DELETED", "Response deleted"],
] as const;

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

const formatAction = (value: string): string =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDateTime = (value: string): string => {
  const date = parseApiDate(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};

const getActionColor = (action: string) => {
  if (action.endsWith("DELETED")) {
    return { color: "#a03e3e", bgcolor: "#fae9e7" };
  }
  if (action.endsWith("CREATED") || action.endsWith("SUBMITTED")) {
    return { color: "#147d73", bgcolor: "#e4f3ef" };
  }
  if (action.endsWith("ENABLED")) {
    return { color: "#39704b", bgcolor: "#e8f2e8" };
  }
  return { color: "#9a6416", bgcolor: "#fff2df" };
};

const getEntityIcon = (entityType: string | null) => {
  if (entityType === "response") return <SendOutlined fontSize="small" />;
  if (entityType === "form") return <DescriptionOutlined fontSize="small" />;
  return <HistoryOutlined fontSize="small" />;
};

const ActivityLogsPage = () => {
  const [data, setData] = useState<ActivityLogPage | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError("");

    void getActivityLogs({
      page,
      page_size: pageSize,
      ...(action ? { action } : {}),
      ...(entityType ? { entity_type: entityType } : {}),
    })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setData(null);
          setError(getErrorMessage(requestError, "Unable to load activity logs."));
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, pageSize, action, entityType, refreshVersion]);

  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min((page - 1) * pageSize + logs.length, total);
  const filterCount = Number(Boolean(action)) + Number(Boolean(entityType));

  const toggleExpanded = (logId: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const resetFilters = () => {
    setAction("");
    setEntityType("");
    setPage(1);
    setExpandedIds(new Set());
  };

  return (
    <Stack spacing={2.5} sx={{ width: "100%", maxWidth: 1600, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontSize: { xs: 24, md: 28 }, fontWeight: 700, color: "#0f172a" }}>
            Activity logs
          </Typography>
          <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 14 }}>
            Review changes and submissions across your workspace.
          </Typography>
        </Box>
        <Tooltip title="Refresh activity">
          <span>
            <IconButton
              aria-label="Refresh activity"
              onClick={() => setRefreshVersion((version) => version + 1)}
              disabled={isLoading}
              sx={{ width: 42, height: 42, border: "1px solid #dbe3e8", borderRadius: 1.5, bgcolor: "#ffffff" }}
            >
              {isLoading ? <CircularProgress size={18} /> : <Refresh />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {[
          { label: "Matching events", value: isLoading ? "—" : total.toLocaleString(), tint: "#e5f3f1", color: "#147d73" },
          { label: "On this page", value: isLoading ? "—" : logs.length.toLocaleString(), tint: "#fff2df", color: "#a96412" },
          { label: "Active filters", value: filterCount.toString(), tint: "#e9f0f7", color: "#426681" },
        ].map((metric) => (
          <Paper key={metric.label} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2, borderColor: "#e2e8f0", display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: metric.tint, color: metric.color }}>
              <HistoryOutlined fontSize="small" />
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: 13 }}>{metric.label}</Typography>
              <Typography sx={{ mt: 0.2, color: "#0f172a", fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}>{metric.value}</Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      <Paper variant="outlined" sx={{ borderColor: "#e2e8f0", borderRadius: 2, overflow: "hidden", bgcolor: "#ffffff" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: "1px solid #e8edf0", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
        >
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Event history</Typography>
            <Typography sx={{ mt: 0.25, color: "#64748b", fontSize: 12.5 }}>
              {total > 0 ? `Showing ${rangeStart}–${rangeEnd} of ${total.toLocaleString()}` : "No matching events"}
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: "stretch" }}>
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 190 } }}>
              <InputLabel id="activity-action-label">Action</InputLabel>
              <Select
                labelId="activity-action-label"
                label="Action"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All actions</MenuItem>
                {actionOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
              <InputLabel id="activity-entity-label">Entity</InputLabel>
              <Select
                labelId="activity-entity-label"
                label="Entity"
                value={entityType}
                onChange={(event) => {
                  setEntityType(event.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All entities</MenuItem>
                <MenuItem value="form">Forms</MenuItem>
                <MenuItem value="response">Responses</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 105 } }}>
              <InputLabel id="activity-page-size-label">Rows</InputLabel>
              <Select
                labelId="activity-page-size-label"
                label="Rows"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {pageSizes.map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}
              </Select>
            </FormControl>
            {filterCount > 0 && (
              <Button variant="text" onClick={resetFilters} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
                Clear filters
              </Button>
            )}
          </Stack>
        </Stack>

        {isLoading ? (
          <Stack spacing={1} sx={{ p: 2.5 }}>
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} variant="rounded" height={54} />)}
          </Stack>
        ) : logs.length === 0 ? (
          <Box sx={{ px: 2, py: 8, textAlign: "center" }}>
            <HistoryOutlined sx={{ color: "#94a3b8", fontSize: 34, mb: 1 }} />
            <Typography sx={{ color: "#0f172a", fontWeight: 700 }}>No activity found</Typography>
            <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 13.5 }}>
              {filterCount > 0 ? "Try another action or entity filter." : "Events will appear here as changes and submissions are made."}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
              <Table size="small" aria-label="Activity log entries" sx={{ minWidth: 850 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f7f9fa" }}>
                    <TableCell sx={{ py: 1.5, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Time</TableCell>
                    <TableCell sx={{ py: 1.5, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Action</TableCell>
                    <TableCell sx={{ py: 1.5, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Entity</TableCell>
                    <TableCell sx={{ py: 1.5, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Description</TableCell>
                    <TableCell sx={{ py: 1.5, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Actor</TableCell>
                    <TableCell align="right" sx={{ py: 1.5, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log: ActivityLog) => {
                    const expanded = expandedIds.has(log.id);
                    const actionColor = getActionColor(log.action);

                    return (
                      <Fragment key={log.id}>
                        <TableRow key={log.id} hover>
                          <TableCell sx={{ minWidth: 160, color: "#475569", fontSize: 12.5, whiteSpace: "nowrap" }}>
                            {formatDateTime(log.created_at)}
                          </TableCell>
                          <TableCell sx={{ minWidth: 170 }}>
                            <Chip
                              size="small"
                              label={formatAction(log.action)}
                              sx={{ height: 25, fontSize: 11.5, fontWeight: 700, color: actionColor.color, bgcolor: actionColor.bgcolor, borderRadius: 1 }}
                            />
                          </TableCell>
                          <TableCell sx={{ minWidth: 130 }}>
                            <Stack direction="row" spacing={0.8} sx={{ color: "#64748b", alignItems: "center" }}>
                              {getEntityIcon(log.entity_type)}
                              <Typography sx={{ color: "#334155", fontSize: 12.5, textTransform: "capitalize" }}>
                                {log.entity_type ?? "System"}{log.entity_id ? ` #${log.entity_id}` : ""}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ minWidth: 240, maxWidth: 440, color: "#334155", fontSize: 13 }}>
                            <Typography sx={{ fontSize: 13, overflowWrap: "anywhere" }}>
                              {log.description || "No description provided"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 110, color: "#64748b", fontSize: 12.5 }}>
                            {log.user_id === null ? "System" : `User #${log.user_id}`}
                          </TableCell>
                          <TableCell align="right" sx={{ width: 68 }}>
                            <Tooltip title={expanded ? "Hide metadata" : "View metadata"}>
                              <IconButton
                                size="small"
                                aria-label={expanded ? "Hide metadata" : "View metadata"}
                                onClick={() => toggleExpanded(log.id)}
                                disabled={!log.metadata}
                              >
                                {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow key={`${log.id}-metadata`}>
                            <TableCell colSpan={6} sx={{ py: 1.5, bgcolor: "#f8fafb" }}>
                              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                                <Box sx={{ minWidth: 150 }}>
                                  <Typography sx={{ mb: 0.6, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Event ID</Typography>
                                  <Typography sx={{ color: "#334155", fontSize: 13 }}>#{log.id}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography sx={{ mb: 0.6, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Metadata</Typography>
                                  <Box
                                    component="pre"
                                    sx={{ m: 0, p: 1.5, maxHeight: 260, overflow: "auto", borderRadius: 1, bgcolor: "#eef2f3", color: "#334155", fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                                  >
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </Box>
                                </Box>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderTop: "1px solid #e8edf0", justifyContent: "space-between", alignItems: "center" }}
            >
              <Typography sx={{ color: "#64748b", fontSize: 12.5 }}>
                Page {page} of {totalPages}
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, nextPage) => {
                  setPage(nextPage);
                  setExpandedIds(new Set());
                }}
                size="small"
                shape="rounded"
                color="primary"
                aria-label="Activity log pages"
              />
            </Stack>
          </>
        )}
      </Paper>
    </Stack>
  );
};

export default ActivityLogsPage;