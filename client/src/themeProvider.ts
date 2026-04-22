import { createTheme } from "@mui/material";
import { GOLD, GOLD_15, GOLD_30, GOLD_60, MONO_FONT } from "./theme/colors";

export const theme = createTheme({
	palette: {
		mode: "dark",
		primary: {
			main: "#1D6B45",
			contrastText: "#fff",
		},
		secondary: {
			main: GOLD,
			contrastText: "#000",
		},
		background: {
			default: "#141414",
			paper: "#1E1E1E",
		},
	},
	typography: {
		fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
		fontSize: 15,
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
					border: `1px solid ${GOLD_15}`,
				},
			},
		},
		MuiOutlinedInput: {
			styleOverrides: {
				notchedOutline: {
					borderColor: GOLD_30,
				},
				root: {
					"&:hover .MuiOutlinedInput-notchedOutline": {
						borderColor: GOLD_60,
					},
					"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
						borderColor: GOLD,
					},
				},
			},
		},
		MuiInputLabel: {
			styleOverrides: {
				root: {
					"&.Mui-focused": { color: GOLD },
				},
			},
		},
		MuiSelect: {
			styleOverrides: {
				select: { fontFamily: MONO_FONT },
			},
		},
		MuiMenuItem: {
			styleOverrides: {
				root: { fontFamily: MONO_FONT },
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
