// components/jobs/edit-materials-modal.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { AlertCircle, History, Plus, Trash2, X } from 'lucide-react';
import { Material, MaterialEditHistory } from '@/types/jobs';

interface EditMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (materials: Material[], editHistory: MaterialEditHistory[]) => void;
  initialMaterials: Material[];
  jobId: string;
  userRole: 'admin' | 'worker';
}

export const EditMaterialsModal: React.FC<EditMaterialsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMaterials,
  jobId,
  userRole
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editReason, setEditReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [editHistory, setEditHistory] = useState<MaterialEditHistory[]>([]);

  useEffect(() => {
    if (isOpen) {
      setMaterials(initialMaterials);
      setEditReason('');
      setError('');
      loadEditHistory();
    }
  }, [isOpen, initialMaterials]);

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
    setMaterials(prev => [...prev, {
      material_name: '',
      paper_size: '',
      paper_type: '',
      grammage: undefined, // Changed from empty string to undefined
      quantity: 1,
      unit_cost: 0,
      total_cost: 0
    }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof Material, value: any) => {
    setMaterials(prev => {
      const updated = [...prev];
      
      // Handle grammage conversion from string to number
      if (field === 'grammage') {
        const numValue = value === '' ? undefined : Number(value);
        updated[index] = { ...updated[index], [field]: numValue };
      } 
      // Handle quantity and unit_cost conversion
      else if (field === 'quantity' || field === 'unit_cost') {
        const numValue = Number(value) || 0;
        updated[index] = { ...updated[index], [field]: numValue };
        
        // Auto-calculate total cost if quantity or unit_cost changes
        const quantity = field === 'quantity' ? numValue : updated[index].quantity;
        const unit_cost = field === 'unit_cost' ? numValue : updated[index].unit_cost;
        updated[index].total_cost = quantity * unit_cost;
      }
      // Handle string fields
      else {
        updated[index] = { ...updated[index], [field]: value };
      }
      
      return updated;
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
      // You'll need to implement updateJobMaterials in your jobService
      // const result = await jobService.updateJobMaterials(jobId, materials, editReason);
      // onSave(result.materials, result.editHistory);
      
      // For now, just pass the materials back
      onSave(materials, []);
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
                This reason will be recorded in the edit history for audit purposes.
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
                      <Input
                        value={material.material_name}
                        onChange={(e) => updateMaterial(index, 'material_name', e.target.value)}
                        placeholder="e.g., A4 Paper, Cardstock"
                        required
                      />
                    </div>

                    <div>
                      <Label>Paper Size</Label>
                      <Input
                        value={material.paper_size || ''}
                        onChange={(e) => updateMaterial(index, 'paper_size', e.target.value)}
                        placeholder="e.g., A4, A3, Letter"
                      />
                    </div>

                    <div>
                      <Label>Paper Type</Label>
                      <Input
                        value={material.paper_type || ''}
                        onChange={(e) => updateMaterial(index, 'paper_type', e.target.value)}
                        placeholder="e.g., Glossy, Matte"
                      />
                    </div>

                    <div>
                      <Label>Grammage</Label>
                      <Input
                        type="number"
                        value={material.grammage || ''}
                        onChange={(e) => updateMaterial(index, 'grammage', e.target.value)}
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
                        onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
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
                        onChange={(e) => updateMaterial(index, 'unit_cost', e.target.value)}
                        required
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
            <Button
              type="submit"
              disabled={loading || !editReason.trim()}
            >
              {loading ? 'Updating...' : 'Update Materials'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};