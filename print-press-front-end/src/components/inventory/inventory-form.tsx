'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inventoryApi } from '@/lib/inventoryService';
import { InventoryFormData, InventoryItem } from '@/types/inventory';

interface InventoryFormProps {
  itemId?: string;
  mode: 'create' | 'edit';
}

export const InventoryForm: React.FC<InventoryFormProps> = ({ itemId, mode }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<Partial<InventoryFormData>>({
    material_name: '',
    category: '',
    current_stock: 0,
    unit_of_measure: 'pieces',
    unit_cost: 0,
    threshold: 0,
    attributes: {},
    supplier: '',
    selling_price: undefined,
    reorder_quantity: undefined,
    is_active: true,
  });

  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId) return;
      setLoading(true);
      try {
        const { item } = await inventoryApi.getInventoryItem(itemId);
        
        // Map the item data to form data
        setFormData({
          material_name: item.material_name,
          category: item.category,
          current_stock: item.current_stock,
          unit_of_measure: item.unit_of_measure,
          unit_cost: item.unit_cost,
          threshold: item.threshold,
          attributes: item.attributes || {},
          supplier: item.supplier,
          selling_price: item.selling_price,
          reorder_quantity: item.reorder_quantity,
          is_active: item.is_active,
        });
      } catch (err) {
        setError('Failed to load inventory item.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (mode === 'edit') {
      fetchItem();
    }
  }, [itemId, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    
    // Handle nested attributes for paper-specific fields
    if (name.startsWith('attr_')) {
      const attrName = name.replace('attr_', '');
      setFormData(prev => ({
        ...prev,
        attributes: {
          ...prev.attributes,
          [attrName]: isNumber ? (value ? Number(value) : 0) : value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: isNumber ? (value ? Number(value) : 0) : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Handle legacy paper attributes by moving them to attributes object
    const attributes = { ...formData.attributes };
    
    // If it's a paper category, ensure common paper attributes are in attributes
    if (formData.category?.toLowerCase() === 'paper') {
      // Check if we have any legacy paper fields in the form
      const legacyPaperFields = ['paper_size', 'paper_type', 'grammage', 'sheets_per_unit'];
      legacyPaperFields.forEach(field => {
        if ((formData as any)[field]) {
          attributes[field] = (formData as any)[field];
        }
      });
    }

    const submissionData: InventoryFormData = {
      material_name: formData.material_name || '',
      category: formData.category || '',
      current_stock: formData.current_stock || 0,
      unit_of_measure: formData.unit_of_measure || 'pieces',
      unit_cost: formData.unit_cost || 0,
      threshold: formData.threshold || 0,
      attributes: attributes,
      supplier: formData.supplier,
      selling_price: formData.selling_price,
      reorder_quantity: formData.reorder_quantity,
      is_active: formData.is_active ?? true,
    };

    try {
      if (mode === 'create') {
        await inventoryApi.createInventory(submissionData);
      } else if (itemId) {
        await inventoryApi.updateInventory(itemId, submissionData);
      }
      router.push('/admin/inventory');
    } catch (err) {
      setError(`Failed to ${mode} item. Please check the fields.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get attribute value for display
  const getAttributeValue = (attrName: string): string | number | undefined => {
    return formData.attributes?.[attrName] || '';
  };

  // Determine if we should show paper-specific fields
  const showPaperFields = formData.category?.toLowerCase() === 'paper';

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold">{mode === 'create' ? 'Add New' : 'Edit'} Inventory Item</h2>
        <p className="text-gray-600">Fill in the details for the inventory item.</p>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && <div className="p-3 text-red-600 bg-red-50 rounded-md">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="material_name">Material Name *</Label>
              <Input 
                id="material_name" 
                name="material_name" 
                value={formData.material_name} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <select 
                id="category" 
                name="category" 
                value={formData.category} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select category</option>
                <option value="Paper">Paper</option>
                <option value="Ink">Ink</option>
                <option value="Plates">Plates</option>
                <option value="Chemicals">Chemicals</option>
                <option value="Consumables">Consumables</option>
                <option value="Tools">Tools</option>
                <option value="Packaging">Packaging</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="current_stock">Current Stock</Label>
              <Input 
                id="current_stock" 
                name="current_stock" 
                type="number" 
                min="0"
                step="0.01"
                value={formData.current_stock || 0} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <Label htmlFor="unit_of_measure">Unit of Measure *</Label>
              <Input 
                id="unit_of_measure" 
                name="unit_of_measure" 
                value={formData.unit_of_measure} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div>
              <Label htmlFor="unit_cost">Unit Cost</Label>
              <Input 
                id="unit_cost" 
                name="unit_cost" 
                type="number" 
                min="0"
                step="0.01"
                value={formData.unit_cost || 0} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <Label htmlFor="threshold">Low Stock Threshold</Label>
              <Input 
                id="threshold" 
                name="threshold" 
                type="number" 
                min="0"
                step="0.01"
                value={formData.threshold || 0} 
                onChange={handleChange} 
              />
            </div>
          </div>

          {/* Paper-specific fields (shown only for Paper category) */}
          {showPaperFields && (
            <div className="border p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Paper Specifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="attr_paper_size">Paper Size</Label>
                  <Input 
                    id="attr_paper_size" 
                    name="attr_paper_size" 
                    value={getAttributeValue('paper_size') as string} 
                    onChange={handleChange} 
                    placeholder="A4, A3, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="attr_paper_type">Paper Type</Label>
                  <Input 
                    id="attr_paper_type" 
                    name="attr_paper_type" 
                    value={getAttributeValue('paper_type') as string} 
                    onChange={handleChange} 
                    placeholder="Glossy, Matte, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="attr_grammage">Grammage (g)</Label>
                  <Input 
                    id="attr_grammage" 
                    name="attr_grammage" 
                    type="number" 
                    value={getAttributeValue('grammage') as number || ''} 
                    onChange={handleChange} 
                  />
                </div>
                <div>
                  <Label htmlFor="attr_sheets_per_unit">Sheets per Unit</Label>
                  <Input 
                    id="attr_sheets_per_unit" 
                    name="attr_sheets_per_unit" 
                    type="number" 
                    value={getAttributeValue('sheets_per_unit') as number || 500} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* General attributes section (for any category) */}
          <div className="border p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Additional Attributes</h3>
            <p className="text-sm text-gray-500 mb-4">Add any additional specifications for this material</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="attr_color">Color (optional)</Label>
                <Input 
                  id="attr_color" 
                  name="attr_color" 
                  value={getAttributeValue('color') as string} 
                  onChange={handleChange} 
                  placeholder="e.g., Red, Blue, Black"
                />
              </div>
              <div>
                <Label htmlFor="attr_description">Description (optional)</Label>
                <Input 
                  id="attr_description" 
                  name="attr_description" 
                  value={getAttributeValue('description') as string} 
                  onChange={handleChange} 
                  placeholder="Additional details about the material"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input 
                id="supplier" 
                name="supplier" 
                value={formData.supplier || ''} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <Label htmlFor="selling_price">Selling Price (optional)</Label>
              <Input 
                id="selling_price" 
                name="selling_price" 
                type="number" 
                min="0"
                step="0.01"
                value={formData.selling_price || ''} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <Label htmlFor="reorder_quantity">Reorder Quantity (optional)</Label>
              <Input 
                id="reorder_quantity" 
                name="reorder_quantity" 
                type="number" 
                min="0"
                step="0.01"
                value={formData.reorder_quantity || ''} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <Label htmlFor="is_active">Status</Label>
              <select 
                id="is_active" 
                name="is_active" 
                value={String(formData.is_active)} 
                onChange={e => setFormData(p => ({...p, is_active: e.target.value === 'true'}))} 
                className="w-full p-2 border rounded"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};