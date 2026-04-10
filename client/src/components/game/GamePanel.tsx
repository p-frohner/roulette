import { Paper, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import type { ReactNode } from "react";

type Props = {
	title: string;
	children: ReactNode;
	flex?: number | string;
	minHeight?: number | string;
	sx?: SxProps<Theme>;
};

export const GamePanel = ({ title, children, flex, minHeight, sx }: Props) => (
	<Paper
		sx={{
			p: 2,
			display: "flex",
			flexDirection: "column",
			minHeight: minHeight ?? 0,
			...(flex !== undefined ? { flex } : {}),
			...sx,
		}}
	>
		<Typography
			variant="h6"
			mb={2}
			sx={{ letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.95rem", flexShrink: 0 }}
		>
			{title}
		</Typography>
		{children}
	</Paper>
);
