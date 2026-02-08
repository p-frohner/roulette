import { createFileRoute } from "@tanstack/react-router";
import { RouletteGame } from "../components/game/RouletteGame";

export const Route = createFileRoute("/")({
	component: () => <RouletteGame />,
});
