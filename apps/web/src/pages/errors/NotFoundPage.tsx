import { Link } from "react-router-dom";

export function NotFoundPage() {
    return (
        <main>
            <h1>404 - Page Not Found</h1>
            <Link to="/">Go to Dashboard</Link>
        </main>
    );
}