import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { useAuth } from "../../context";
import AuthShell from "./AuthShell";

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setServerError("");
    setIsSubmitting(true);

    try {
      await login(data);
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail
            .map((item: { msg?: string }) => item.msg)
            .filter(Boolean)
            .join(", ")
        : typeof detail === "string"
          ? detail
          : error.message?.includes("VITE_API_URL")
            ? error.message
            : "Unable to sign in. Check your email and password, then try again.";

      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Your workspace"
      title="Welcome back"
      description="Sign in to continue building forms and reviewing responses."
    >
      <Stack
        component="form"
        spacing={2.25}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {serverError && (
          <Alert severity="error" onClose={() => setServerError("")}>
            {serverError}
          </Alert>
        )}

        <TextField
          fullWidth
          autoFocus
          label="Email address"
          type="email"
          autoComplete="email"
          {...register("email", {
            required: "Email address is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Enter a valid email address",
            },
            onChange: () => setServerError(""),
          })}
          error={Boolean(errors.email)}
          helperText={errors.email?.message || " "}
        />

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
            onChange: () => setServerError(""),
          })}
          error={Boolean(errors.password)}
          helperText={errors.password?.message || " "}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((visible) => !visible)}
                    onMouseDown={(event) => event.preventDefault()}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{
            minHeight: 48,
            mt: 0.5,
            borderRadius: 1.5,
            bgcolor: "#173d3a",
            fontWeight: 700,
            textTransform: "none",
            "&:hover": { bgcolor: "#286158" },
          }}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>

        <Typography sx={{ pt: 1, textAlign: "center", color: "#68756f", fontSize: 13.5 }}>
          New to Dynamic Forms?{" "}
          <Button
            variant="text"
            onClick={() => navigate("/register")}
            sx={{ minWidth: 0, p: 0.5, color: "#17665c", fontWeight: 700, textTransform: "none" }}
          >
            Create an account
          </Button>
        </Typography>
      </Stack>
    </AuthShell>
  );
};

export default LoginPage;