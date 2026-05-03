"use client";

import { useState } from "react";
import Icon from "../../../components/Icon";
import { Pagination, sampleResidents } from "./extract-review-shared";

export default function BayaranReviewTable() {
  const initialRows = sampleResidents.map((resident) => ({
    ...resident,
    note: "N/A",
  }));
  const [savedRows, setSavedRows] = useState(initialRows);
  const [draftRows, setDraftRows] = useState(initialRows);
  const [editingIc, setEditingIc] = useState<string | null>(initialRows[0]?.ic ?? null);

  const updateDraft = (ic: string, field: "amount" | "note", value: string) => {
    setDraftRows((currentRows) =>
      currentRows.map((row) => (row.ic === ic ? { ...row, [field]: value } : row)),
    );
  };

  const saveRow = (ic: string) => {
    const draft = draftRows.find((row) => row.ic === ic);

    if (!draft) {
      setEditingIc(null);
      return;
    }

    setSavedRows((currentRows) =>
      currentRows.map((row) => (row.ic === ic ? { ...row, ...draft } : row)),
    );
    setEditingIc(null);
  };

  const startEdit = (ic: string) => {
    const saved = savedRows.find((row) => row.ic === ic);

    if (saved) {
      setDraftRows((currentRows) =>
        currentRows.map((row) => (row.ic === ic ? { ...row, ...saved } : row)),
      );
    }

    setEditingIc(ic);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#DCE2F1] bg-white">
      <table className="w-full table-fixed text-left text-xs">
        <thead className="bg-[#F7F9FF] text-[10px] font-extrabold uppercase text-[#667085]">
          <tr>
            <th className="w-10 px-5 py-4">
              <input type="checkbox" className="h-4 w-4" />
            </th>
            <th className="px-4 py-4">Penghuni</th>
            <th className="w-[14%] px-4 py-4">Tarikh</th>
            <th className="w-[16%] px-4 py-4">No. Resit</th>
            <th className="w-[18%] px-4 py-4">Catatan</th>
            <th className="w-[18%] px-4 py-4 text-right">Amaun Bayar (RM)</th>
            <th className="w-[16%] px-4 py-4 text-center">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF1F7]">
          {savedRows.map((resident, index) => {
            const isEditing = editingIc === resident.ic;
            const draft = draftRows.find((row) => row.ic === resident.ic) ?? resident;

            return (
            <tr key={resident.ic}>
              <td className="px-5 py-4">
                <input
                  type="checkbox"
                  defaultChecked={index === 0}
                  className="h-4 w-4 accent-dark-blue"
                />
              </td>
              <td className="px-4 py-4">
                <p className="font-extrabold text-[#172033]">{resident.name}</p>
                <p className="text-[10px] font-semibold text-[#667085]">
                  {resident.ic}
                </p>
              </td>
              <td className="px-4 py-4">{resident.date}</td>
              <td className="px-4 py-4">{resident.receipt}</td>
              <td className="px-4 py-4">
                {isEditing ? (
                  <input
                    className="h-10 w-full rounded-lg border border-[#E6EAF2] px-3 text-xs"
                    placeholder="Tambah catatan..."
                    value={draft.note === "N/A" ? "" : draft.note}
                    onChange={(event) =>
                      updateDraft(resident.ic, "note", event.target.value)
                    }
                  />
                ) : (
                  resident.note || "N/A"
                )}
              </td>
              <td className="px-4 py-4 text-right">
                {isEditing ? (
                  <input
                    className="h-10 w-23 rounded-lg border border-[#E6EAF2] px-3 text-right font-extrabold"
                    value={draft.amount}
                    onChange={(event) =>
                      updateDraft(resident.ic, "amount", event.target.value)
                    }
                  />
                ) : (
                  <span className="font-extrabold text-[#172033]">
                    {resident.amount}
                  </span>
                )}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-center gap-4">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        aria-label="Simpan perubahan bayaran"
                        onClick={() => saveRow(resident.ic)}
                      >
                        <Icon icon="save" size={16} weight={700} className="text-green" />
                      </button>
                      <button type="button" aria-label="Padam bayaran">
                        <Icon icon="delete" size={16} weight={700} className="text-red" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      aria-label="Edit bayaran"
                      onClick={() => startEdit(resident.ic)}
                    >
                      <Icon icon="edit" size={16} weight={700} className="text-dark-blue" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
      <Pagination label="Memaparkan 1-3 Daripada 45 Rekod" />
    </div>
  );
}
