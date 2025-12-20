// components/jobs/edit-materials-modal.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { Material, MaterialEditHistory } from '@/types/jobs';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

// Types for waste and expenses
export interface WasteEntry {
  id?: string;
  type: 'paper_waste' | 'material_waste' | 'labor' | 'operational' | 'other';
  description: string;
  quantity?: number;
  unit_cost?: number;
  total_cost: number;
  waste_reason?: string;
  material_id?: string;
}

export interface OperationalExpenseEntry {
  id?: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  receipt_number?: string;
  notes?: string;
}

interface EditMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    materials: Material[],
    editHistory: MaterialEditHistory[],
    waste?: WasteEntry[],
    expenses?: OperationalExpenseEntry[]
  ) => void;
  initialMaterials: Material[];
  initialWaste?: WasteEntry[];
  initialExpenses?: OperationalExpenseEntry[];
  jobId: string;
  userRole: 'admin' | 'worker';
}

export const EditMaterialsModal: React.FC<EditMaterialsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMaterials,
  initialWaste = [],
  initialExpenses = [],
  jobId,
  userRole: _userRole,
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [waste, setWaste] = useState<WasteEntry[]>([]);
  const [expenses, setExpenses] = useState<OperationalExpenseEntry[]>([]);
  const [editReason, setEditReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [_showHistory, _setShowHistory] = useState(false);
  const [_editHistory, _setEditHistory] = useState<MaterialEditHistory[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setMaterials(initialMaterials);
      setWaste(initialWaste || []);
      setExpenses(initialExpenses || []);
      setEditReason('');
      setError('');
      loadEditHistory();
      fetchInventory();
    }
  }, [isOpen, initialMaterials, initialWaste, initialExpenses]);

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventoryItems(response.data.inventory || []);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  const loadEditHistory = async () => {
    try {
      // You'll need to implement this in your jobService
      // const history = await jobService.getMaterialEditHistory(jobId);
      // setEditHistory(history);
    } catch (error) {
      console.error('Failed to load edit history:', error);
    }
  };

  const addMaterial = () => {
    setMaterials((prev) => [
      ...prev,
      {
        material_name: '',
        paper_size: '',
        paper_type: '',
        grammage: undefined, // Changed from empty string to undefined
        quantity: 1,
        unit_cost: 0,
        total_cost: 0,
      },
    ]);
  };

  const removeMaterial = (index: number) => {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof Material, value: any) => {
    setMaterials((prev: Material[]) => {
      const updated: Material[] = [...prev];
      const newMaterial: Material = { ...updated[index] };

      // Update the field that changed
      if (field === 'grammage') {
        newMaterial[field] = value === '' ? undefined : Number(value);
      } else if (field === 'quantity' || field === 'unit_cost') {
        // Explicitly assign numeric fields to avoid implicit any/never issues
        if (field === 'quantity') {
          newMaterial.quantity = Number(value) || 0;
        } else {
          newMaterial.unit_cost = Number(value) || 0;
        }
      } else {
        // Safely assign other fields using a type assertion
        (newMaterial as any)[field] = value;
      }

      // If material name changes, check inventory and autofill/reset data
      if (field === 'material_name') {
        const inventoryItem = inventoryItems.find(
          (item) => item.material_name === value
        );
        const wasInventoryItem = inventoryItems.some(
          (item) => item.material_name === updated[index].material_name
        );

        if (inventoryItem) {
          // An inventory item is selected
          newMaterial.material_id = inventoryItem.id;
          newMaterial.unit_cost = inventoryItem.unit_cost;
          newMaterial.paper_size = inventoryItem.paper_size || '';
          newMaterial.paper_type = inventoryItem.paper_type || '';
          newMaterial.grammage = inventoryItem.grammage || undefined;
        } else if (wasInventoryItem && value !== updated[index].material_name) {
          // It was an inventory item, but now it's custom
          newMaterial.unit_cost = 0;
          newMaterial.paper_size = '';
          newMaterial.paper_type = '';
          newMaterial.grammage = undefined;
        }
      }

      // Always recalculate total cost
      newMaterial.total_cost =
        (newMaterial.quantity || 0) * (newMaterial.unit_cost || 0);

      updated[index] = newMaterial;
      return updated;
    });
  };

  const addWasteRow = () => {
    setWaste((prev) => [
      ...prev,
      {
        type: 'material_waste',
        description: '',
        quantity: 1,
        total_cost: 0,
        waste_reason: '',
      },
    ]);
  };

  const removeWasteRow = (index: number) => {
    setWaste((prev) => prev.filter((_, i) => i !== index));
  };

  const updateWaste = (index: number, field: keyof WasteEntry, value: any) => {
    setWaste((prevWaste) => {
      const newWaste = [...prevWaste];
      const updatedItem = { ...newWaste[index] };

      if (
        field === 'quantity' ||
        field === 'total_cost' ||
        field === 'unit_cost'
      ) {
        (updatedItem as any)[field] = parseFloat(value) || 0;
        // Auto-calculate total_cost if quantity or unit_cost changes
        if (field === 'quantity' || field === 'unit_cost') {
          const quantity =
            field === 'quantity'
              ? parseFloat(value) || 0
              : updatedItem.quantity || 0;
          const unit_cost =
            field === 'unit_cost'
              ? parseFloat(value) || 0
              : updatedItem.unit_cost || 0;
          updatedItem.total_cost = quantity * unit_cost;
        }
      } else {
        (updatedItem as any)[field] = value;
      }

      newWaste[index] = updatedItem;
      return newWaste;
    });
  };

  const addExpenseRow = () => {
    setExpenses((prev) => [
      ...prev,
      {
        description: '',
        category: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        receipt_number: '',
        notes: '',
      },
    ]);
  };

  const removeExpenseRow = (index: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExpense = (
    index: number,
    field: keyof OperationalExpenseEntry,
    value: any
  ) => {
    setExpenses((prev) => {
      const newExpenses = [...prev];
      const updatedItem = { ...newExpenses[index] };

      if (field === 'amount') {
        updatedItem.amount = parseFloat(value) || 0;
      } else {
        (updatedItem as any)[field] = value;
      }

      newExpenses[index] = updatedItem;
      return newExpenses;
    });
  };

  const validateForm = (): boolean => {
    if (!editReason.trim() || editReason.trim().length < 5) {
      setError('Please provide a detailed edit reason (at least 5 characters)');
      return false;
    }

    for (const material of materials) {
      if (!material.material_name.trim()) {
        setError('All materials must have a name');
        return false;
      }
      if (material.quantity <= 0) {
        setError('Quantity must be greater than 0');
        return false;
      }
      if (material.unit_cost < 0) {
        setError('Unit cost cannot be negative');
        return false;
      }
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await api.put(`/jobs/${jobId}/materials`, {
        materials,
        waste: waste.length > 0 ? waste : undefined,
        expenses: expenses.length > 0 ? expenses : undefined,
        edit_reason: editReason,
      });

      onSave(
        response.data.materials || materials,
        response.data.editHistory || [],
        response.data.waste || waste,
        response.data.expenses || expenses
      );
      onClose();
    } catch (error: any) {
      console.error('Failed to update materials:', error);
      setError(error.response?.data?.error || 'Failed to update materials');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Materials</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Edit Reason - Using native textarea */}
            <div>
              <Label htmlFor="editReason">Reason for Editing *</Label>
              <textarea
                id="editReason"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Explain why you are making these changes (required, at least 5 characters)"
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This reason will be recorded in the edit history for audit
                purposes.
              </p>
            </div>

            {/* Materials List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Materials Used</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMaterial}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Material
                </Button>
              </div>

              {materials.map((material, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Material {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMaterial(index)}
                      disabled={materials.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Material Name *</Label>
                      <select
                        value={material.material_name}
                        onChange={(e) =>
                          updateMaterial(index, 'material_name', e.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        required
                      >
                        <option value="">-- Select from Inventory --</option>
                        {inventoryItems.map((inv) => {
                          const isDisabled = inv.current_stock <= 0;
                          return (
                            <option
                              key={inv.id}
                              value={inv.material_name}
                              disabled={isDisabled}
                            >
                              {inv.material_name} (
                              {formatCurrency(inv.unit_cost)}){' '}
                              {isDisabled
                                ? '- OUT OF STOCK'
                                : `- Stock: ${inv.current_stock}`}
                            </option>
                          );
                        })}
                      </select>
                      <Input
                        value={material.material_name}
                        onChange={(e) =>
                          updateMaterial(index, 'material_name', e.target.value)
                        }
                        placeholder="Or enter custom material name"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Paper Size</Label>
                      <Input
                        value={material.paper_size || ''}
                        onChange={(e) =>
                          updateMaterial(index, 'paper_size', e.target.value)
                        }
                        placeholder="e.g., A4, A3, Letter"
                      />
                    </div>

                    <div>
                      <Label>Paper Type</Label>
                      <Input
                        value={material.paper_type || ''}
                        onChange={(e) =>
                          updateMaterial(index, 'paper_type', e.target.value)
                        }
                        placeholder="e.g., Glossy, Matte"
                      />
                    </div>

                    <div>
                      <Label>Grammage</Label>
                      <Input
                        type="number"
                        value={material.grammage || ''}
                        onChange={(e) =>
                          updateMaterial(index, 'grammage', e.target.value)
                        }
                        placeholder="e.g., 80, 120"
                      />
                    </div>

                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={material.quantity}
                        onChange={(e) =>
                          updateMaterial(index, 'quantity', e.target.value)
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Unit Cost (₦) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={material.unit_cost}
                        onChange={(e) =>
                          updateMaterial(index, 'unit_cost', e.target.value)
                        }
                        required
                        disabled={inventoryItems.some(
                          (item) =>
                            item.material_name === material.material_name
                        )}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Total Cost (₦)</Label>
                      <Input
                        type="number"
                        value={material.total_cost}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Waste Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold text-red-700">
                  Waste & Expenses
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addWasteRow}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Add Waste
                </Button>
              </div>

              {waste.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border border-red-100 rounded-lg bg-red-50 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Waste {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWasteRow(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <select
                        value={item.type}
                        onChange={(e) =>
                          updateWaste(index, 'type', e.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="material_waste">Material Waste</option>
                        <option value="paper_waste">Paper Waste</option>
                        <option value="labor">Labor</option>
                        <option value="operational">Operational</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <Label>Reason</Label>
                      <Input
                        value={item.waste_reason || ''}
                        onChange={(e) =>
                          updateWaste(index, 'waste_reason', e.target.value)
                        }
                        placeholder="e.g., Error, Damage"
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateWaste(index, 'description', e.target.value)
                        }
                        placeholder="e.g., 5 sheets wasted"
                      />
                    </div>

                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity || ''}
                        onChange={(e) =>
                          updateWaste(index, 'quantity', e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label>Unit Cost (₦)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost || ''}
                        onChange={(e) =>
                          updateWaste(index, 'unit_cost', e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label>Total Cost (₦)</Label>
                      <Input
                        type="number"
                        value={item.total_cost}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Operational Expenses Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">
                  Operational Expenses
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExpenseRow}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Expense
                </Button>
              </div>

              {expenses.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Expense {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpenseRow(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateExpense(index, 'description', e.target.value)
                        }
                        placeholder="e.g., Machine maintenance"
                        required
                      />
                    </div>

                    <div>
                      <Label>Category *</Label>
                      <Input
                        value={item.category}
                        onChange={(e) =>
                          updateExpense(index, 'category', e.target.value)
                        }
                        placeholder="e.g., Maintenance, Utilities"
                        required
                      />
                    </div>

                    <div>
                      <Label>Amount (₦) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) =>
                          updateExpense(index, 'amount', e.target.value)
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Expense Date *</Label>
                      <Input
                        type="date"
                        value={item.expense_date}
                        onChange={(e) =>
                          updateExpense(index, 'expense_date', e.target.value)
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Receipt Number</Label>
                      <Input
                        value={item.receipt_number || ''}
                        onChange={(e) =>
                          updateExpense(index, 'receipt_number', e.target.value)
                        }
                        placeholder="Optional"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Notes</Label>
                      <textarea
                        value={item.notes || ''}
                        onChange={(e) =>
                          updateExpense(index, 'notes', e.target.value)
                        }
                        placeholder="Additional notes (optional)"
                        className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between p-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !editReason.trim()}>
              {loading ? 'Updating...' : 'Update Materials'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
