import { createTheme } from "@mui/material";

export const theme = createTheme({
	palette: {
		mode: "dark",
		primary: {
			main: "#1D6B45",
			contrastText: "#fff",
		},
		secondary: {
			main: "#C9A84C",
			contrastText: "#000",
		},
		background: {
			default: "#141414",
			paper: "#1E1E1E",
		},
	},
	typography: {
		fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
	},
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				root: {
					body: {
						backgroundColor: "#141414 !important",
						minHeight: "100vh",
					},
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundImage: "none",
					border: "1px solid rgba(201,168,76,0.15)",
				},
			},
		},
		MuiBackdrop: {
			styleOverrides: {
				root: {
					backdropFilter: "blur(8px)",
					backgroundColor: "rgba(0, 0, 0, 0.5)",
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
					borderRadius: 8,
					letterSpacing: "0.04em",
				},
			},
		},
		MuiDialog: {
			styleOverrides: {
				paper: {
					borderRadius: 4,
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
