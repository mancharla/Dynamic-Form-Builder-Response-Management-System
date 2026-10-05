import axios from "axios";

const localApiUrl = `http://${window.location.hostname}:8000/api/v1`;
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
const isPlaceholderApiUrl = configuredApiUrl?.includes("your-backend-domain");
const normalizedApiUrl = configuredApiUrl
  ? /\/api\/v1$/i.test(configuredApiUrl)
    ? configuredApiUrl
    : `${configuredApiUrl}/api/v1`
  : undefined;

const api = axios.create({
  baseURL:
    normalizedApiUrl ||
    (import.meta.env.DEV ? localApiUrl : undefined),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (!import.meta.env.DEV && (!normalizedApiUrl || isPlaceholderApiUrl)) {
      return Promise.reject(
        new Error(
          "Backend URL is not configured. Set VITE_API_URL in Vercel to your deployed API URL.",
        ),
      );
    }

    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }

    return Promise.reject(error);
  },
);

export default api;