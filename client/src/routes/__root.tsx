import { CssBaseline, ThemeProvider } from "@mui/material";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ErrorBoundary } from "react-error-boundary";

import { theme } from "../themeProvider";

export const Route = createRootRoute({
	component: () => {
		return (
			<ErrorBoundary FallbackComponent={({ error }) => <pre>{error.message}</pre>}>
				<ThemeProvider theme={theme}>
					<CssBaseline />
					<Outlet />
				</ThemeProvider>
			</ErrorBoundary>
		);
	},
});
