"use client";

import { useState } from "react";
import { PatternFormat } from "react-number-format";

import Icon from "@/app/components/Icon";
import { PaginationControls, usePaginationLogic } from "@/app/pages/6_penghuni/controller/PaginationControl";
import type { ExtractedPenghuniRecord } from "../../../../components/extract-review-shared";
import { getPenghuniRecordKey } from "./helpers";
import PenghuniReviewDetail from "./PenghuniReviewDetail";

const mainTextSize = "text-[12px]";
const subTextSize = "text-[11px]";

type PenghuniReviewTableProps = {
  records: ExtractedPenghuniRecord[];
  onRecordsChange?: (records: ExtractedPenghuniRecord[]) => void;
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
};

export default function PenghuniReviewTable({
  records,
  onRecordsChange,
  selectedKeys = [],
  onSelectedKeysChange,
}: PenghuniReviewTableProps) {
  const [selectedResident, setSelectedResident] =
    useState<ExtractedPenghuniRecord | null>(null);
  const itemsPerPage = 10;
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
    paginationItems,
  } = usePaginationLogic(records.length, itemsPerPage);
  const currentRecords = records.slice(startIndex, endIndex);
  const selectedKeySet = new Set(selectedKeys);
  const allRecordKeys = records.map(getPenghuniRecordKey);
  const isAllSelected =
    allRecordKeys.length > 0 && allRecordKeys.every((key) => selectedKeySet.has(key));

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

  const saveResident = (updatedResident: ExtractedPenghuniRecord) => {
    const updatedRecords = records.map((record) =>
      getPenghuniRecordKey(record) === getPenghuniRecordKey(updatedResident)
        ? updatedResident
        : record,
    );

    onRecordsChange?.(updatedRecords);
    setSelectedResident(updatedResident);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
      <div className="rounded-lg overflow-x-auto overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="font-bold text-xs text-grey bg-background">
              <th className="text-left px-3 py-3 w-10 whitespace-nowrap">
                <input
                  type="checkbox"
                  aria-label="Pilih semua rekod penghuni"
                  checked={isAllSelected}
                  className="h-4 w-4 accent-dark-blue"
                  onChange={(event) => toggleAllRows(event.target.checked)}
                />
              </th>
              <th className="text-left px-3 py-3 w-min whitespace-nowrap">Penghuni</th>
              <th className="text-left px-3 py-3 w-min whitespace-nowrap">
                Perhubungan
              </th>
              <th className="text-left px-3 py-3 w-min whitespace-nowrap">Pekerjaan</th>
              <th className="text-left px-3 py-3 w-min whitespace-nowrap">
                Taraf Perkhidmatan
              </th>
              <th className="text-left px-3 py-3 w-min whitespace-nowrap">Kuarters</th>
              <th className="text-center px-3 py-3 w-min whitespace-nowrap">
                Tindakan
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {records.length === 0 ? (
              <tr className="text-sm">
                <td className="px-3 py-4 text-center text-grey" colSpan={7}>
                  Tiada rekod penghuni baharu ditemui.
                </td>
              </tr>
            ) : (
              currentRecords.map((resident) => {
                const recordKey = getPenghuniRecordKey(resident);

                return (
                  <tr
                    key={recordKey}
                    className="text-sm border-l-4 border-transparent border-b border-b-light-grey/20"
                  >
                    <td className="px-3 py-2 text-left w-10 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedKeySet.has(recordKey)}
                        className="h-4 w-4 accent-dark-blue"
                        onChange={(event) =>
                          toggleSelectedRow(recordKey, event.target.checked)
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>{resident.nama}</div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        <PatternFormat
                          value={resident.noKadPengenalan}
                          format="######-##-####"
                          displayType="text"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.perhubungan ? (
                          <PatternFormat
                            value={resident.perhubungan}
                            format="###-#### ####"
                            displayType="text"
                          />
                        ) : (
                          "N/A"
                        )}
                      </div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        N/A
                      </div>
                    </td>
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.pekerjaan || "N/A"}
                      </div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        {resident.jabatan || "N/A"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.tarafPerkhidmatan || "N/A"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.kuarters || "N/A"}
                      </div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        {formatQuarterAddress(resident)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center align-middle w-min whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          aria-label={`Lihat butiran ${resident.nama}`}
                          className="flex items-center justify-center"
                          onClick={() => setSelectedResident(resident)}
                        >
                          <Icon icon="eye" className="text-dark-blue" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {records.length > 0 ? (
            <tfoot>
              <tr>
                <td
                  colSpan={7}
                  className="bg-white border-t border-light-grey/20 px-3 py-4"
                >
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalRecords={records.length}
                    paginationItems={paginationItems}
                    onPageChange={handlePageChange}
                  />
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {selectedResident ? (
        <PenghuniReviewDetail
          resident={selectedResident}
          onClose={() => setSelectedResident(null)}
          onSave={saveResident}
        />
      ) : null}
    </div>
  );
}

function formatQuarterAddress(resident: ExtractedPenghuniRecord) {
  if (resident.unit && resident.alamatKuarters) {
    return `${resident.unit}, ${resident.alamatKuarters}`;
  }

  return resident.unit || resident.alamatKuarters || "N/A";
}
