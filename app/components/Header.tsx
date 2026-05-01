"use client";


import { useRouter } from "next/navigation";

import Icon from "./Icon";
import HelpButton from "./HelpButton";
import { ROUTES } from "../constants/routes";

export default function Header() {
    const router = useRouter();

    // Helper function to handle logout by calling the API route and then redirecting to the login page.
    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
            });

            // Redirect to login page after logout.
            router.push(ROUTES.auth);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }

    return (
        <header className="flex flex-row justify-end gap-5 p-4">
            {/* Help Button */}
            <HelpButton />

            {/* Logout Button */}
            <button
                type="button"
                className="material-symbols-outlined text-red hover:cursor-pointer hover:text-dark-blue hover:scale-[0.98] active:scale-[0.86]"
                onClick={handleLogout}
                title="Logout"
            >
                <Icon icon="logout" size={24} />
            </button>
        </header>
    );
}
