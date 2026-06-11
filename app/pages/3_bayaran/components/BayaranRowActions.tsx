"use client";

import TableActionIconButton from "@/app/components/TableActionIconButton";
import ViewIconButton from "@/app/components/ViewIconButton";

type BayaranRowActionsProps = {
  onAddPayment: (paymentId: string) => void;
  onViewPayment: (paymentId: string) => void;
  paymentId: string;
};

export default function BayaranRowActions({
  onAddPayment,
  onViewPayment,
  paymentId,
}: BayaranRowActionsProps) {
  return (
    <div
      className="flex items-center justify-center gap-1"
      data-payment-id={paymentId}
    >
      <ViewIconButton
        label="Lihat butiran bayaran"
        onClick={() => onViewPayment(paymentId)}
      />
      <TableActionIconButton
        icon="add"
        label="Tambah bayaran manual"
        onClick={(event) => {
          event.stopPropagation();
          onAddPayment(paymentId);
        }}
      />
    </div>
  );
}
