"use client";

export default function Header() {
    return (
        <header className="flex flex-row justify-end gap-5 p-4">
            <span className="material-symbols-outlined text-grey">notifications</span>
            <span className="material-symbols-outlined text-grey">help</span>
            <span className="material-symbols-outlined text-red">logout</span>
        </header>
    );
}