import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.port, () => {
    console.log(
        `DevFlow API running at http://localhost:${env.port}`,
    );
});

server.on("error", (error) => {
    console.error("[DevFlow] Server error:", error);
});