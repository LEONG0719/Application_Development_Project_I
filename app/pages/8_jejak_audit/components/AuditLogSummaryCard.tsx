export default function AuditLogSummaryCard({
  totalRecords,
}: {
  totalRecords: number;
}) {
  return (
    <section className="rounded-lg border-l-4 border-l-dark-blue bg-white p-4 shadow">
      <div className="text-xs font-semibold text-grey/70">
        Jumlah Aktiviti
      </div>
      <div className="mt-1 text-3xl font-bold text-dark-grey">
        {totalRecords.toLocaleString("ms-MY")}
      </div>
    </section>
  );
}
