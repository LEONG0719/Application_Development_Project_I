import { useEffect, useState } from "react";
import Icon from "@/app/components/Icon/Icon";

// Helper function to build pagination items based on the current page and total pages.
export function buildPaginationItems(
    currentPage: number,
    totalPages: number,
): (number | "ellipsis")[] {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
        return currentPage === 3
            ? [1, 2, 3, 4, "ellipsis", totalPages]
            : [1, 2, 3, "ellipsis", totalPages];
    }
    if (currentPage >= totalPages - 2) {
        return currentPage === totalPages - 2
            ? [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
            : [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

// Helper function to manage pagination state and logic.
export function usePaginationLogic(totalItems: number, itemsPerPage: number) {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

    const handlePageChange = (action: "first" | "prev" | "next" | "last" | "goto", pageNum?: number) => {
        switch (action) {
            case "first": setCurrentPage(1); break;
            case "prev": setCurrentPage(p => Math.max(p - 1, 1)); break;
            case "next": setCurrentPage(p => Math.min(p + 1, totalPages)); break;
            case "last": setCurrentPage(totalPages); break;
            case "goto": if (pageNum) setCurrentPage(Math.max(1, Math.min(pageNum, totalPages))); break;
        }
    };

    return { currentPage, totalPages, startIndex, endIndex, handlePageChange, setCurrentPage };
}

// PaginationControls component.
export function PaginationControls({
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    totalRecords,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    totalRecords: number;
    onPageChange: (action: "first" | "prev" | "next" | "last" | "goto", pageNum?: number) => void;
}) {
    // 处理输入框逻辑，移除浏览器默认的上下箭头样式
    const [inputValue, setInputValue] = useState(currentPage.toString());

    useEffect(() => { setInputValue(currentPage.toString()); }, [currentPage]);

    const handleBlur = () => {
        const val = parseInt(inputValue);
        if (!isNaN(val) && val !== currentPage) onPageChange("goto", val);
        else setInputValue(currentPage.toString());
    };

    // 辅助样式：普通按钮
    const btnClass = "flex h-8 w-8 items-center justify-center rounded-md border border-light-grey/30 bg-white text-grey hover:border-dark-blue hover:text-dark-blue disabled:opacity-30 disabled:pointer-events-none";

    return (
        <div className="flex flex-row items-center justify-between w-full gap-4">
            <div className="flex flex-row items-center gap-1.5">
                <button className={btnClass} onClick={() => onPageChange("first")} disabled={currentPage === 1}>«</button>
                <button className={btnClass} onClick={() => onPageChange("prev")} disabled={currentPage === 1}>‹</button>

                <button 
                    className={btnClass} 
                    onClick={() => onPageChange("goto", currentPage - 1)}
                    disabled={currentPage <= 1}
                >
                    {currentPage > 1 ? currentPage - 1 : ""}
                </button>

                <input
                    type="text"
                    inputMode="numeric"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={handleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                    className="h-8 w-10 rounded-md border-2 bg-dark-blue border-dark-blue text-white text-center font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />

                <button 
                    className={btnClass} 
                    onClick={() => onPageChange("goto", currentPage + 1)}
                    disabled={currentPage >= totalPages}
                >
                    {currentPage < totalPages ? currentPage + 1 : ""}
                </button>

                <button className={btnClass} onClick={() => onPageChange("next")} disabled={currentPage === totalPages}>›</button>
                <button className={btnClass} onClick={() => onPageChange("last")} disabled={currentPage === totalPages}>»</button>
            </div>

            <div className="text-xs text-grey">
                Memaparkan <span className="font-bold">{startIndex + 1}</span> - <span className="font-bold">{endIndex}</span> Daripada <span className="font-bold">{totalRecords}</span> Rekod
            </div>
        </div>
    );
}