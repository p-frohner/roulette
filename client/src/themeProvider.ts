import { createTheme } from "@mui/material";

export const theme = createTheme({
	palette: {
		mode: "dark",
		primary: {
			main: "#26a14ba7",
			contrastText: "#fff",
		},
		secondary: {
			main: "#afb3b0",
		},
		background: {
			// default: "#a39f9f",
			default: "#1a1a1a",
			// paper: "#7d7d7d",
		},
	},
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				root: {
					body: {
						backgroundColor: "#1a1a1a !important",
						minHeight: "100vh",
					},
				},
			},
		},
		MuiBackdrop: {
			styleOverrides: {
				root: {
					backdropFilter: "blur(8px)",
					backgroundColor: "rgba(0, 0, 0, 0.4)",
				},
			},
		},
		MuiButtonBase: {
			defaultProps: {
				disableRipple: true,
			},
		},
		MuiButton: {
			defaultProps: {
				color: "primary",
			},
			styleOverrides: {
				root: {
					textTransform: "none",
					fontWeight: 600,
					borderRadius: 20,
				},
			},
		},
		MuiDialog: {
			styleOverrides: {
				paper: {
					borderRadius: 10,
				},
			},
		},
		MuiDialogTitle: {
			styleOverrides: {
				root: {
					textAlign: "center",
					fontWeight: 600,
					fontSize: "1.5rem",
					padding: 24,
				},
			},
		},
	},
});
