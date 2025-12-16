import { PaymentList } from '@/components/payments/payment-list';

export default function AdminPaymentsPage() {
  return <PaymentList userRole="admin" />;
}
