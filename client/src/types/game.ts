export * from "./generated";

export type ActivityLogEntry = {
	id: string;
	timestamp: Date;
	message: string;
	variant: "info" | "bet" | "result" | "win";
};
