import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
} from "@mui/material";
import { useState } from "react";

interface Props {
	onSubmit: (name: string) => void;
}

export const NameDialog = ({ onSubmit }: Props) => {
	const [name, setName] = useState("");

	const handleSubmit = () => {
		const trimmed = name.trim();
		if (trimmed) {
			onSubmit(trimmed);
		}
	};

	return (
		<Dialog open disableEscapeKeyDown>
			<DialogTitle>Please enter your name:</DialogTitle>
			<DialogContent>
				<TextField
					autoFocus
					fullWidth
					label="Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							handleSubmit();
						}
					}}
					sx={{ mt: 1 }}
					slotProps={{
						htmlInput: {
							maxLength: 20,
						},
					}}
				/>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button
					fullWidth
					color="primary"
					variant="contained"
					size="large"
					disabled={!name.trim()}
					onClick={handleSubmit}
				>
					Join Game
				</Button>
			</DialogActions>
		</Dialog>
	);
};
