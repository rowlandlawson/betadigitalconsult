import { CustomerForm } from '@/components/customers/customer-form';

export default function CreateCustomerPage() {
  return (
    <div className="container mx-auto py-6">
      <CustomerForm mode="create" />
    </div>
  );
}