import { PaymentList } from '@/components/payments/payment-list';
import { OutstandingPayments } from '@/components/payments/outstanding-payments';

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-8">
      <OutstandingPayments />
      <div className="border-t border-gray-200 pt-8">
        <PaymentList userRole="admin" />
      </div>
    </div>
  );
}
