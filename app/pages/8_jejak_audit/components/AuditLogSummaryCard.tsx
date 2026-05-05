export default function AuditLogSummaryCard({
  totalRecords,
}: {
  totalRecords: number;
}) {
  return (
    <section className="mb-8 rounded-xl border border-light-grey/20 border-l-4 border-l-dark-blue bg-white px-5 py-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[3px] text-[#555967]">
        Jumlah Aktiviti
      </div>
      <div className="mt-2 text-[40px] font-extrabold leading-none tracking-wide">
        {totalRecords.toLocaleString("ms-MY")}
      </div>
    </section>
  );
}
