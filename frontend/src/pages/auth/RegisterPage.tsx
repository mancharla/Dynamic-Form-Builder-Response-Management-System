import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { PersonAddOutlined } from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { registerUser } from "../../api";

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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch("password");

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
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
        }}
      >
        <Paper
          elevation={4}
          sx={{
            width: "100%",
            p: {
              xs: 3,
              sm: 5,
            },
            borderRadius: 3,
          }}
        >
          <Stack spacing={3}>
            {/* Header */}
            <Box sx={{ textAlign: "center" }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  mx: "auto",
                  mb: 2,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "primary.main",
                  color: "white",
                }}
              >
                <PersonAddOutlined />
              </Box>

              <Typography
                variant="h4"
                sx={{ fontWeight: 700 }}
              >
                Create Account
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1,
                }}
              >
                Create your account to access the
                Dynamic Form Management System
              </Typography>
            </Box>

            {/* Server Error */}
            {serverError && (
              <Alert severity="error">
                {serverError}
              </Alert>
            )}

            {/* Success */}
            {successMessage && (
              <Alert severity="success">
                {successMessage}
              </Alert>
            )}

            {/* Register Form */}
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <Stack spacing={2.5}>
                {/* Name */}
                <TextField
                  fullWidth
                  label="Full Name"
                  autoComplete="name"
                  {...register("name", {
                    required: "Full name is required",
                    minLength: {
                      value: 2,
                      message:
                        "Name must be at least 2 characters",
                    },
                    maxLength: {
                      value: 150,
                      message:
                        "Name cannot exceed 150 characters",
                    },
                  })}
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                />

                {/* Email */}
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  {...register("email", {
                    required: "Email address is required",
                    pattern: {
                      value:
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message:
                        "Please enter a valid email address",
                    },
                  })}
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                />

                {/* Password */}
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message:
                        "Password must be at least 8 characters",
                    },
                    maxLength: {
                      value: 128,
                      message:
                        "Password cannot exceed 128 characters",
                    },
                  })}
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                />

                {/* Confirm Password */}
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword", {
                    required:
                      "Please confirm your password",
                    validate: (value) =>
                      value === password ||
                      "Passwords do not match",
                  })}
                  error={Boolean(errors.confirmPassword)}
                  helperText={
                    errors.confirmPassword?.message
                  }
                />

                {/* Submit */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={isSubmitting}
                  sx={{
                    py: 1.4,
                    fontWeight: 600,
                  }}
                >
                  {isSubmitting ? (
                    <CircularProgress
                      size={24}
                      color="inherit"
                    />
                  ) : (
                    "Create Account"
                  )}
                </Button>

                {/* Login */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                >
                  Already have an account?{" "}
                  <Button
                    variant="text"
                    onClick={() =>
                      navigate("/login")
                    }
                    sx={{
                      textTransform: "none",
                    }}
                  >
                    Sign In
                  </Button>
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;