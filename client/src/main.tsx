import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NotificationSnackbar } from "./components/NotificationSnackbar";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });

const root = document.getElementById("root");

if (!root) {
	throw new Error("Failed to find the root element");
}

createRoot(root).render(
	<StrictMode>
		<NotificationSnackbar />
		<RouterProvider router={router} />
	</StrictMode>,
);
