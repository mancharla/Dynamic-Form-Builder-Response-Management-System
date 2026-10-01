import { BrowserRouter } from "react-router-dom";
import { CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import { AuthProvider } from "./context";
import AppRoutes from "./routes/AppRoutes";

const theme = createTheme({
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    h1: { fontFamily: '"Manrope", sans-serif' },
    h2: { fontFamily: '"Manrope", sans-serif' },
    h3: { fontFamily: '"Manrope", sans-serif' },
    h4: { fontFamily: '"Manrope", sans-serif' },
    h5: { fontFamily: '"Manrope", sans-serif' },
    h6: { fontFamily: '"Manrope", sans-serif' },
    button: { textTransform: "none", fontWeight: 600 },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;