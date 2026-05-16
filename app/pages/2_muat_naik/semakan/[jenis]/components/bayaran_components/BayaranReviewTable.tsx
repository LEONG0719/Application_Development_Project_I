"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ExtractedBayaranRecord,
  Pagination,
  RESIDENTS_PER_PAGE,
} from "../../../../components/extract-review-shared";
import BayaranDeleteDialog from "./BayaranDeleteDialog";
import BayaranReviewRow from "./BayaranReviewRow";
import type { BayaranReviewRowModel } from "./types";

export default function BayaranReviewTable({
  records,
  onTotalAmountChange,
  onRecordsChange,
  selectedKeys = [],
  onSelectedKeysChange,
}: {
  records: ExtractedBayaranRecord[];
  onTotalAmountChange?: (totalAmount: string) => void;
  onRecordsChange?: (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => ExtractedBayaranRecord | void | Promise<ExtractedBayaranRecord | void>;
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
}) {
  const initialRows = useMemo(
    () =>
      records.map((record, index) => ({
        ...record,
        catatan: record.catatan || "bayaran",
        id: `${record.page}-${record.bil}-${record.noGajiNoKp}-${index}`,
      })),
    [records],
  );
  const [savedRows, setSavedRows] = useState(initialRows);
  const [draftRows, setDraftRows] = useState(initialRows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(savedRows.length / RESIDENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * RESIDENTS_PER_PAGE;
  const pageRows = savedRows.slice(pageStartIndex, pageStartIndex + RESIDENTS_PER_PAGE);
  const displayStart = savedRows.length === 0 ? 0 : pageStartIndex + 1;
  const displayEnd = pageStartIndex + pageRows.length;
  const pendingDeleteRow =
    savedRows.find((row) => row.id === pendingDeleteId) ?? null;
  const selectedKeySet = new Set(selectedKeys);
  const allRecordKeys = savedRows.map(getBayaranRecordKey);
  const isAllSelected =
    allRecordKeys.length > 0 && allRecordKeys.every((key) => selectedKeySet.has(key));

  useEffect(() => {
    setSavedRows(initialRows);
    setDraftRows(initialRows);
    setEditingId(null);
  }, [initialRows]);

  useEffect(() => {
    if (!editingId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-bayaran-editor='true']")) {
        return;
      }

      setDraftRows(savedRows);
      setEditingId(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [editingId, savedRows]);

  const calculateTotalAmount = (rows: BayaranReviewRowModel[]) =>
    rows.reduce((total, row) => total + (Number(row.amaunRm) || 0), 0).toFixed(2);
  const stripRowIds = (rows: BayaranReviewRowModel[]): ExtractedBayaranRecord[] =>
    rows.map((row) => ({
      paymentId: row.paymentId,
      residentId: row.residentId,
      isExisted: row.isExisted,
      page: row.page,
      jabatanCode: row.jabatanCode,
      jabatanName: row.jabatanName,
      ptjpkCode: row.ptjpkCode,
      ptjpkName: row.ptjpkName,
      bil: row.bil,
      noRujukan: row.noRujukan,
      noGajiNoKp: row.noGajiNoKp,
      nama: row.nama,
      amaunRm: row.amaunRm,
      tarikh: row.tarikh,
      noResit: row.noResit,
      catatan: row.catatan,
    }));

  const updateDraft = (
    id: string,
    field:
      | "nama"
      | "noGajiNoKp"
      | "jabatanName"
      | "noRujukan"
      | "tarikh"
      | "amaunRm"
      | "catatan",
    value: string,
  ) => {
    setDraftRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const saveRow = async (id: string) => {
    const draft = draftRows.find((row) => row.id === id);

    if (!draft) {
      setEditingId(null);
      return;
    }

    const nextRows = savedRows.map((row) =>
      row.id === id ? { ...row, ...draft } : row,
    );
    const totalAmount = calculateTotalAmount(nextRows);

    try {
      const updatedRecord = await onRecordsChange?.(stripRowIds(nextRows), totalAmount);
      const committedRows = updatedRecord
        ? nextRows.map((row) =>
            row.id === id ? { ...row, ...updatedRecord } : row,
          )
        : nextRows;
      const committedTotalAmount = calculateTotalAmount(committedRows);

      onTotalAmountChange?.(committedTotalAmount);
      setSavedRows(committedRows);
      setDraftRows(committedRows);
      setEditingId(null);
    } catch {
      setEditingId(id);
    }
  };

  const confirmDeleteRow = () => {
    if (!pendingDeleteId) {
      return;
    }

    const id = pendingDeleteId;
    setSavedRows((currentRows) => {
      const nextRows = currentRows.filter((row) => row.id !== id);
      const totalAmount = calculateTotalAmount(nextRows);
      onTotalAmountChange?.(totalAmount);
      onRecordsChange?.(stripRowIds(nextRows), totalAmount);
      return nextRows;
    });
    setDraftRows((currentRows) => currentRows.filter((row) => row.id !== id));
    setEditingId((currentId) => (currentId === id ? null : currentId));
    setPendingDeleteId(null);
  };

  const startEdit = (id: string) => {
    const saved = savedRows.find((row) => row.id === id);

    if (saved) {
      setDraftRows((currentRows) =>
        currentRows.map((row) => (row.id === id ? { ...row, ...saved } : row)),
      );
    }

    setEditingId(id);
  };

  const toggleSelectedRow = (key: string, checked: boolean) => {
    const nextKeys = new Set(selectedKeys);

    if (checked) {
      nextKeys.add(key);
    } else {
      nextKeys.delete(key);
    }

    onSelectedKeysChange?.([...nextKeys]);
  };

  const toggleAllRows = (checked: boolean) => {
    const nextKeys = new Set(selectedKeys);

    allRecordKeys.forEach((key) => {
      if (checked) {
        nextKeys.add(key);
      } else {
        nextKeys.delete(key);
      }
    });

    onSelectedKeysChange?.([...nextKeys]);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#DCE2F1] bg-white">
      <div className="overflow-x-auto">
      <table className="w-full min-w-220 border-collapse text-left">
        <thead className="bg-background">
          <tr>
            <th className="w-10 whitespace-nowrap px-3 py-3 text-left">
              <input
                type="checkbox"
                aria-label="Pilih semua rekod bayaran"
                checked={isAllSelected}
                className="h-4 w-4 accent-dark-blue"
                onChange={(event) => toggleAllRows(event.target.checked)}
              />
            </th>
            <th className="w-[24%] px-3 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              Nama Penghuni
            </th>
            <th className="w-[16%] px-3 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              No. Kad Pengenalan
            </th>
            <th className="w-[24%] px-3 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              Nama Jabatan
            </th>
            <th className="w-[16%] px-3 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              No. Rujukan
            </th>
            <th className="w-[16%] px-3 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              Catatan
            </th>
            <th className="w-40 whitespace-nowrap px-3 py-4 text-right text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              Amaun Bayar (RM)
            </th>
            <th className="w-24 px-3 py-4 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              Tindakan
            </th>
          </tr>
        </thead>
        <tbody>
          {pageRows.length === 0 ? (
            <tr className="border-t border-light-grey/20">
              <td
                colSpan={8}
                className="px-6 py-10 text-center text-xs font-semibold text-grey"
              >
                Tiada rekod bayaran ditemui.
              </td>
            </tr>
          ) : (
          pageRows.map((resident) => {
            const isEditing = editingId === resident.id;
            const draft = draftRows.find((row) => row.id === resident.id) ?? resident;
            const selectionKey = getBayaranRecordKey(resident);

            return (
              <BayaranReviewRow
                key={resident.id}
                row={resident}
                draft={draft}
                isEditing={isEditing}
                isSelected={selectedKeySet.has(selectionKey)}
                onSelectionChange={(checked) =>
                  toggleSelectedRow(selectionKey, checked)
                }
                onDraftChange={(field, value) =>
                  updateDraft(resident.id, field, value)
                }
                onSave={() => void saveRow(resident.id)}
                onEdit={() => startEdit(resident.id)}
                onDelete={() => setPendingDeleteId(resident.id)}
              />
          )}))}
        </tbody>
      </table>
      </div>
      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        label={`Memaparkan ${displayStart}-${displayEnd} Daripada ${savedRows.length} Rekod`}
      />
      <BayaranDeleteDialog
        row={pendingDeleteRow}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDeleteRow}
      />
    </div>
  );
}

function getBayaranRecordKey(record: ExtractedBayaranRecord) {
  return (
    record.paymentId ??
    `${record.page}-${record.bil}-${record.noGajiNoKp}-${record.noRujukan}`
  );
}
