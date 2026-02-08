import { Box, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import type { ActivityLogEntry } from "../../types/game";

const variantColorMap: Record<ActivityLogEntry["variant"], string> = {
	info: "text.secondary",
	bet: "secondary.main",
	result: "text.primary",
	win: "success.main",
};

const formatTime = (date: Date): string => {
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

export const ActivityLog = ({ activityLog }: { activityLog: ActivityLogEntry[] }) => {
	const scrollRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new entries
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [activityLog]);

	return (
		<Box sx={{ border: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 2, p: 2, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", minHeight: 0 }}>
			{/* Activity log */}
			<Box
				ref={scrollRef}
				sx={{
					flex: 1,
					minHeight: 0,
					overflowY: "auto",
					"&::-webkit-scrollbar": { width: 4 },
					"&::-webkit-scrollbar-thumb": {
						backgroundColor: "rgba(255,255,255,0.2)",
						borderRadius: 2,
					},
				}}
			>
				{activityLog.length === 0 ? (
					<Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
						Waiting for game events...
					</Typography>
				) : (
					activityLog.map((entry) => (
						<Box key={entry.id} sx={{ py: 0.25 }}>
							<Typography
								variant="body2"
								component="span"
								color="text.secondary"
								sx={{ fontSize: "0.75rem", mr: 1 }}
							>
								{formatTime(entry.timestamp)}
							</Typography>
							<Typography
								variant="body2"
								component="span"
								sx={{ color: variantColorMap[entry.variant], fontSize: "0.85rem" }}
							>
								{entry.message}
							</Typography>
						</Box>
					))
				)}
			</Box>
		</Box>
	);
};
