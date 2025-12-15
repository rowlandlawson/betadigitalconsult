'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';

// Types for the form data
export interface MaterialEntry {
  material_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  update_inventory: boolean;
}

export interface WasteEntry {
  type: 'paper_waste' | 'material_waste' | 'labor' | 'operational' | 'other';
  description: string;
  quantity?: number;
  unit_cost?: number;
  total_cost: number;
  waste_reason: string;
  material_id?: string;
}

export interface OperationalExpenseEntry {
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  receipt_number?: string;
  notes?: string;
}

interface JobCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (materials: MaterialEntry[], waste: WasteEntry[], expenses: OperationalExpenseEntry[]) => Promise<void>;
  loading: boolean;
}

export const JobCompletionModal: React.FC<JobCompletionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading
}) => {
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [waste, setWaste] = useState<WasteEntry[]>([]);
  const [expenses, setExpenses] = useState<OperationalExpenseEntry[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // Fetch inventory when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchInventory = async () => {
        try {
          const res = await api.get('/inventory');
          setInventoryItems(res.data.inventory || []);
        } catch (error) {
          console.error('Failed to fetch inventory', error);
        }
      };
      fetchInventory();
    }
  }, [isOpen]);

  const addMaterialRow = () => {
    setMaterials(prev => [
      ...prev, 
      { 
        material_name: '', 
        quantity: 1, 
        unit_cost: 0, 
        total_cost: 0, 
        update_inventory: true 
      }
    ]);
  };

  const removeMaterialRow = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  // --- FIXED UPDATE FUNCTION ---
  const updateMaterial = (index: number, field: keyof MaterialEntry, value: any) => {
    setMaterials(prevMaterials => {
      // 1. Create a deep copy of the array and the specific item we are editing
      const newMaterials = [...prevMaterials];
      const updatedItem = { ...newMaterials[index] };

      // 2. Handle specific field logic
      if (field === 'material_name') {
        updatedItem.material_name = value;
        
        // Find the selected item in inventory to get the cost
        const selectedItem = inventoryItems.find(item => item.material_name === value);
        if (selectedItem) {
          updatedItem.unit_cost = parseFloat(selectedItem.unit_cost);
        }
      } else if (field === 'quantity') {
        updatedItem.quantity = parseFloat(value) || 0;
      } else if (field === 'unit_cost') {
        updatedItem.unit_cost = parseFloat(value) || 0;
      } else {
        // Handle boolean or other simple types
        (updatedItem as any)[field] = value;
      }

      // 3. Always recalculate Total Cost
      updatedItem.total_cost = updatedItem.quantity * updatedItem.unit_cost;

      // 4. Place the updated item back into the array
      newMaterials[index] = updatedItem;
      return newMaterials;
    });
  };

  const addWasteRow = () => {
    setWaste(prev => [
      ...prev, 
      { 
        type: 'material_waste', 
        description: '', 
        quantity: 1, 
        total_cost: 0, 
        waste_reason: '' 
      }
    ]);
  };

  const addExpenseRow = () => {
    setExpenses(prev => [
      ...prev,
      {
        description: '',
        category: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        receipt_number: '',
        notes: ''
      }
    ]);
  };

  const removeExpenseRow = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const updateExpense = (index: number, field: keyof OperationalExpenseEntry, value: any) => {
    setExpenses(prev => {
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

  const removeWasteRow = (index: number) => {
    setWaste(prev => prev.filter((_, i) => i !== index));
  };

  const updateWaste = (index: number, field: keyof WasteEntry, value: any) => {
    setWaste(prevWaste => {
      const newWaste = [...prevWaste];
      const updatedItem = { ...newWaste[index] };

      if (field === 'material_id') {
        updatedItem.material_id = value || undefined;

        // When material is selected, derive unit cost and default values
        const inventoryItem = inventoryItems.find((item) => item.id === value);
        if (inventoryItem) {
          // Default description if empty
          if (!updatedItem.description) {
            updatedItem.description = inventoryItem.material_name;
          }
          // Auto unit_cost from inventory
          if (!updatedItem.unit_cost || updatedItem.unit_cost === 0) {
            updatedItem.unit_cost = parseFloat(inventoryItem.unit_cost);
          }
          // Ensure quantity has a sensible default
          if (!updatedItem.quantity || updatedItem.quantity === 0) {
            updatedItem.quantity = 1;
          }
        }
      } else if (field === 'quantity' || field === 'unit_cost' || field === 'total_cost') {
        (updatedItem as any)[field] = parseFloat(value) || 0;
      } else {
        (updatedItem as any)[field] = value;
      }

      // Always recalc total_cost from quantity and unit_cost
      const qty = updatedItem.quantity || 0;
      const unit = updatedItem.unit_cost || 0;
      updatedItem.total_cost = qty * unit;

      newWaste[index] = updatedItem;
      return newWaste;
    });
  };

  const handleConfirm = () => {
    onConfirm(materials, waste, expenses);
  };

  const totalMaterialCost = materials.reduce((sum, m) => sum + m.total_cost, 0);
  const totalWasteCost = waste.reduce((sum, w) => sum + w.total_cost, 0);
  const totalExpenseCost = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-6 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Job Details</DialogTitle>
          <p className="text-sm text-gray-500">
            Select materials used from inventory. The cost will be calculated automatically based on inventory prices.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Materials Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Materials Used</h3>
              <Button type="button" variant="outline" size="sm" onClick={addMaterialRow}>
                <Plus className="h-4 w-4 mr-2" /> Add Material
              </Button>
            </div>
            
            {materials.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border p-3 rounded-md bg-gray-50">
                <div className="md:col-span-4">
                  <Label className="text-xs">Material</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={item.material_name}
                    onChange={(e) => updateMaterial(index, 'material_name', e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {inventoryItems.map(inv => {
                      const isDisabled = inv.current_stock <= 0;
                      return (
                        <option 
                          key={inv.id} 
                          value={inv.material_name}
                          disabled={isDisabled}
                        >
                          {inv.material_name} ({formatCurrency(inv.unit_cost)}) {isDisabled ? '- OUT OF STOCK' : `- Stock: ${inv.current_stock}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input 
                    type="number" 
                    min="1"
                    step="0.1"
                    value={item.quantity}
                    onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Unit Cost</Label>
                  <Input 
                    type="number" 
                    value={item.unit_cost}
                    readOnly
                    className="bg-gray-100 text-gray-600"
                  />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-xs font-bold block">Total: {formatCurrency(item.total_cost)}</Label>
                  <div className="flex items-center space-x-2 mt-3">
                    <input 
                      type="checkbox" 
                      id={`inv-${index}`}
                      checked={item.update_inventory}
                      onChange={(e) => updateMaterial(index, 'update_inventory', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={`inv-${index}`} className="text-xs text-gray-600 cursor-pointer">Deduct Stock</label>
                  </div>
                </div>
                <div className="md:col-span-1 flex justify-end md:justify-center">
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeMaterialRow(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
             {materials.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed">No materials added yet.</p>}
          </div>

          <hr />

          {/* Waste Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-red-700">Waste & Expenses</h3>
              <Button type="button" variant="outline" size="sm" onClick={addWasteRow} className="text-red-600 border-red-200 hover:bg-red-50">
                <AlertTriangle className="h-4 w-4 mr-2" /> Add Waste
              </Button>
            </div>

            {waste.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border border-red-100 p-3 rounded-md bg-red-50">
                <div className="md:col-span-3">
                  <Label className="text-xs">Material (optional)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                    value={item.material_id || ''}
                    onChange={(e) => updateWaste(index, 'material_id', e.target.value)}
                  >
                    <option value="">-- Select material --</option>
                    {inventoryItems.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.material_name} ({formatCurrency(inv.unit_cost)})
                      </option>
                    ))}
                  </select>
                </div>
                 <div className="md:col-span-3">
                  <Label className="text-xs">Reason</Label>
                  <Input 
                    value={item.waste_reason}
                    onChange={(e) => updateWaste(index, 'waste_reason', e.target.value)}
                    placeholder="e.g. Error"
                  />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-xs">Description</Label>
                  <Input 
                    value={item.description}
                    onChange={(e) => updateWaste(index, 'description', e.target.value)}
                    placeholder="e.g. 5 sheets"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input 
                    type="number" 
                    value={item.quantity}
                    onChange={(e) => updateWaste(index, 'quantity', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Cost Lost</Label>
                  <Input 
                    type="number" 
                    value={item.total_cost}
                    readOnly
                    className="bg-gray-100 text-gray-600"
                  />
                </div>
                <div className="md:col-span-1 flex justify-end md:justify-center">
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-100" onClick={() => removeWasteRow(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
             {waste.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed">No waste recorded.</p>}
          </div>

          <hr />

          {/* Operational Expenses Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-orange-700">Operational Expenses</h3>
              <Button type="button" variant="outline" size="sm" onClick={addExpenseRow} className="text-orange-600 border-orange-200 hover:bg-orange-50">
                <Plus className="h-4 w-4 mr-2" /> Add Expense
              </Button>
            </div>

            {expenses.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border border-orange-100 p-3 rounded-md bg-orange-50">
                <div className="md:col-span-4">
                  <Label className="text-xs">Description</Label>
                  <Input 
                    value={item.description}
                    onChange={(e) => updateExpense(index, 'description', e.target.value)}
                    placeholder="e.g. Equipment maintenance"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Category</Label>
                  <Input 
                    value={item.category}
                    onChange={(e) => updateExpense(index, 'category', e.target.value)}
                    placeholder="e.g. Maintenance"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Amount</Label>
                  <Input 
                    type="number"
                    value={item.amount}
                    onChange={(e) => updateExpense(index, 'amount', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Date</Label>
                  <Input 
                    type="date"
                    value={item.expense_date}
                    onChange={(e) => updateExpense(index, 'expense_date', e.target.value)}
                  />
                </div>
                <div className="md:col-span-1 flex justify-end md:justify-center">
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-100" onClick={() => removeExpenseRow(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed">No expenses recorded.</p>}
          </div>
          
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center">
            <span className="font-semibold text-blue-900">Total Additional Cost:</span>
            <span className="font-bold text-lg text-blue-900">{formatCurrency(totalMaterialCost + totalWasteCost + totalExpenseCost)}</span>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Processing...' : 'Save & Complete Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};