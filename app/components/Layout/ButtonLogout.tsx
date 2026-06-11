"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Icon from "../Icon/Icon";
import { ROUTES } from "../../constants/routes";
import HeaderIconButton from "./HeaderIconButton";

export default function ButtonLogout() {
	const router = useRouter();
	const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
	const cancelButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!isLogoutDialogOpen) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsLogoutDialogOpen(false);
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		cancelButtonRef.current?.focus();

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isLogoutDialogOpen]);

	function openLogoutDialog() {
		setIsLogoutDialogOpen(true);
	}

	function closeLogoutDialog() {
		setIsLogoutDialogOpen(false);
	}

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
		} finally {
			closeLogoutDialog();
		}
	}

	return (
		<>
			{/* Logout Button */}
			<HeaderIconButton
				icon="logout"
				label="Log keluar"
				tone="danger"
				isActive={isLogoutDialogOpen}
				onClick={openLogoutDialog}
				aria-haspopup="dialog"
				aria-expanded={isLogoutDialogOpen}
			/>

			{/* Logout Confirmation Dialog */}
			{isLogoutDialogOpen ? (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-static-dark/45 p-4 backdrop-blur-[2px]"
					role="dialog"
					aria-modal="true"
					aria-labelledby="logout-dialog-title"
					aria-describedby="logout-dialog-description"
					onClick={(event) => {
						if (event.target === event.currentTarget) {
							closeLogoutDialog();
						}
					}}
				>
					<div className="w-full max-w-md rounded-xl border border-red/30 bg-surface p-6 shadow-[0_22px_55px_rgba(15,23,42,0.22)]">
						<div className="flex items-start gap-4">
							{/* Icon */}
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-danger-surface text-red">
								<Icon icon="logout" size={24} weight={700} />
							</div>

							{/* Dialog Content */}
							<div className="min-w-0">
								<h2
									id="logout-dialog-title"
									className="text-lg font-extrabold leading-6 text-content"
								>
									Log Keluar daripada Sistem?
								</h2>
								<p
									id="logout-dialog-description"
									className="mt-2 text-sm font-medium leading-6 text-content-muted"
								>
									Sesi semasa anda akan ditamatkan dan anda akan kembali ke
									halaman log masuk.
								</p>
							</div>
						</div>

						{/* Dialog Actions */}
						<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
							{/* Cancel Button */}
							<button
								ref={cancelButtonRef}
								type="button"
								className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 text-xs font-extrabold text-content shadow-sm transition-[background-color,border-color,transform] hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-accent/45 active:scale-[0.98]"
								onClick={closeLogoutDialog}
							>
								Batal
							</button>

							{/* Confirm Logout Button */}
							<button
								type="button"
								className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red px-5 text-xs font-extrabold text-static-white shadow-sm transition-[background-color,transform] hover:bg-red/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.98]"
								onClick={handleLogout}
							>
								<Icon icon="logout" size={16} />
								Ya, Log Keluar
							</button>
						</div>
					</div>
				</div>
				) : null}
		</>
	);
}
