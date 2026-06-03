"use client";

export default function LamanUtamaHeader() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
      <div className="flex flex-col">
        <h2 className="text-[30px] font-extrabold leading-9 tracking-tight text-[#0B1C30]">
          Ringkasan Eksekutif
        </h2>
        <p className="text-base text-grey leading-6 mt-1">
          Paparan statistik terkini bagi pengurusan kuarters Johor.
        </p>
      </div>
    </div>
  );
}
