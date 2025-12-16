import { RecordPaymentForm } from '@/components/payments/record-payment-form';

export default function RecordPaymentPage() {
  return (
    <div className="container mx-auto py-6">
      <RecordPaymentForm userRole="admin" />
    </div>
  );
}
