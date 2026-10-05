import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { Visibility, VisibilityOff } from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { registerUser } from "../../api";
import AuthShell from "./AuthShell";

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const RegisterPage = () => {
  const navigate = useNavigate();

  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const passwordChecks = [
    (password?.length ?? 0) >= 8,
    /[a-z]/.test(password ?? "") && /[A-Z]/.test(password ?? ""),
    /\d/.test(password ?? ""),
    /[^A-Za-z0-9]/.test(password ?? ""),
  ];
  const passwordStrength = passwordChecks.filter(Boolean).length;
  const strengthLabel = ["Add a password", "Needs work", "Fair", "Good", "Strong"];
  const strengthColor = ["#dbe3dd", "#bc694f", "#c98952", "#4c8d6d", "#17665c"];

  const onSubmit = async (data: RegisterFormData) => {
    setServerError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      setSuccessMessage(
        "Registration successful. Redirecting to login...",
      );

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (error: any) {
      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        setServerError(
          detail
            .map((item: any) => item.msg)
            .join(", "),
        );
      } else {
        setServerError(
          detail ||
            "Unable to create account. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="Set up your workspace access and start managing forms and responses."
    >
      <Stack
        component="form"
        spacing={1.8}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {serverError && (
          <Alert severity="error" onClose={() => setServerError("")}>
            {serverError}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success">{successMessage}</Alert>
        )}

        <TextField
          fullWidth
          autoFocus
          label="Full name"
          autoComplete="name"
          {...register("name", {
            required: "Full name is required",
            minLength: { value: 2, message: "Name must be at least 2 characters" },
            maxLength: { value: 150, message: "Name cannot exceed 150 characters" },
          })}
          error={Boolean(errors.name)}
          helperText={errors.name?.message || " "}
        />

        <TextField
          fullWidth
          label="Email address"
          type="email"
          autoComplete="email"
          {...register("email", {
            required: "Email address is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Enter a valid email address",
            },
          })}
          error={Boolean(errors.email)}
          helperText={errors.email?.message || " "}
        />

        <Box>
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Use at least 8 characters" },
              maxLength: { value: 128, message: "Password cannot exceed 128 characters" },
            })}
            error={Boolean(errors.password)}
            helperText={errors.password?.message || "Use 8+ characters and combine letter types, numbers, or symbols."}
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
          {password && (
            <Box sx={{ mt: 0.2, px: 0.2 }}>
              <LinearProgress
                variant="determinate"
                value={(passwordStrength / 4) * 100}
                sx={{ height: 4, borderRadius: 2, bgcolor: "#e8ede8", "& .MuiLinearProgress-bar": { bgcolor: strengthColor[passwordStrength], transition: "transform 220ms ease, background-color 220ms ease" } }}
              />
              <Typography sx={{ mt: 0.6, color: strengthColor[passwordStrength], fontSize: 11.5, fontWeight: 700 }}>
                Password strength: {strengthLabel[passwordStrength]}
              </Typography>
            </Box>
          )}
        </Box>

        <TextField
          fullWidth
          label="Confirm password"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          {...register("confirmPassword", {
            required: "Please confirm your password",
            validate: (value) => value === password || "Passwords do not match",
          })}
          error={Boolean(errors.confirmPassword)}
          helperText={errors.confirmPassword?.message || (confirmPassword && confirmPassword === password ? "Passwords match" : " ")}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showConfirmPassword ? "Hide confirmation" : "Show confirmation"}
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    onMouseDown={(event) => event.preventDefault()}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
          disabled={isSubmitting || Boolean(successMessage)}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ minHeight: 48, mt: 0.5, borderRadius: 1.5, bgcolor: "#173d3a", fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: "#286158" } }}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>

        <Typography sx={{ pt: 0.7, textAlign: "center", color: "#68756f", fontSize: 13.5 }}>
          Already have an account?{" "}
          <Button
            variant="text"
            onClick={() => navigate("/login")}
            sx={{ minWidth: 0, p: 0.5, color: "#17665c", fontWeight: 700, textTransform: "none" }}
          >
            Sign in
          </Button>
        </Typography>
      </Stack>
    </AuthShell>
  );
};

export default RegisterPage;