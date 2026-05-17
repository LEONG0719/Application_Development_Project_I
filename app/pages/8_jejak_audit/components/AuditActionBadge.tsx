export default function AuditActionBadge({ actionType }: { actionType: string }) {
  return (
    <span className="inline-flex h-6 max-w-full items-center rounded-[5px] bg-[#EEF3FF] px-2.5 text-[10px] font-bold text-dark-blue">
      {formatEnumLabel(actionType)}
    </span>
  );
}

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}
