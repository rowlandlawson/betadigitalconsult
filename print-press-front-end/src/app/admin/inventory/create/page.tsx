import { InventoryForm } from '@/components/inventory/inventory-form';

export default function CreateInventoryPage() {
  return (
    <div className="container mx-auto py-6">
      <InventoryForm mode="create" />
    </div>
  );
}
