'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, isApiError } from '@/lib/api';
import { InventoryFormData, InventoryItem } from '@/types/inventory';

interface InventoryFormProps {
  itemId?: string;
  mode: 'create' | 'edit';
}

export const InventoryForm: React.FC<InventoryFormProps> = ({ itemId, mode }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [customUnit, setCustomUnit] = useState(false);
  const [formData, setFormData] = useState<InventoryFormData>({
    material_name: '',
    category: '',
    paper_size: '',
    paper_type: '',
    grammage: undefined,
    supplier: '',
    current_stock: 0,
    unit_of_measure: 'sheets',
    unit_cost: 0,
    selling_price: undefined,
    threshold: 0,
    reorder_quantity: undefined,
  });

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ item: InventoryItem }>(`/inventory/${itemId}`);
        const item = response.data.item;
        if (item) {
          setFormData({
            material_name: item.material_name,
            category: item.category,
            paper_size: item.paper_size || '',
            paper_type: item.paper_type || '',
            grammage: item.grammage || undefined,
            supplier: item.supplier || '',
            current_stock: item.current_stock,
            unit_of_measure: item.unit_of_measure,
            unit_cost: item.unit_cost,
            selling_price: item.selling_price || undefined,
            threshold: item.threshold,
            reorder_quantity: item.reorder_quantity || undefined,
          });
          
          // Check if unit is custom
          const standardUnits = ['sheets', 'reams', 'rolls', 'liters', 'kilograms', 'grams', 'pieces', 'packs', 'boxes'];
          if (!standardUnits.includes(item.unit_of_measure)) {
            setCustomUnit(true);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to fetch item:', err);
        if (isApiError(err)) {
          setError(err.error);
        } else {
          setError('Failed to load item');
        }
      } finally {
        setLoading(false);
      }
    };

    if (mode === 'edit' && itemId) {
      fetchItem();
    }
  }, [mode, itemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.material_name.trim() || !formData.category.trim()) {
      setError('Material name and category are required');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'create') {
        await api.post('/inventory', formData);
        router.push('/admin/inventory');
      } else if (mode === 'edit' && itemId) {
        await api.put(`/inventory/${itemId}`, formData);
        router.push('/admin/inventory');
      }
    } catch (err: unknown) {
      console.error('Failed to save inventory item:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError(`Failed to ${mode} inventory item`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value,
    }));
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setCustomUnit(true);
      setFormData(prev => ({ ...prev, unit_of_measure: '' }));
    } else {
      setCustomUnit(false);
      setFormData(prev => ({ ...prev, unit_of_measure: value }));
    }
  };

  const commonCategories = [
    'Paper',
    'Ink',
    'Plates',
    'Chemicals',
    'Binding',
    'Finishing',
    'Packaging',
    'Maintenance',
    'Office Supplies'
  ];

  const unitOptions = [
    'sheets',
    'reams',
    'rolls',
    'liters',
    'kilograms',
    'grams',
    'pieces',
    'packs',
    'boxes',
    'custom'
  ];

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Add New Inventory Item' : 'Edit Inventory Item'}
        </h2>
        <p className="text-gray-600">
          {mode === 'create' ? 'Enter details for the new inventory item' : 'Update the inventory item details'}
        </p>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Material Name *"
              name="material_name"
              type="text"
              required
              value={formData.material_name}
              onChange={handleChange}
              placeholder="e.g., A4 Glossy Paper"
              disabled={loading}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                disabled={loading}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Category</option>
                {commonCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paper Specifications */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Paper Specifications (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Paper Size"
                name="paper_size"
                type="text"
                value={formData.paper_size || ''}
                onChange={handleChange}
                placeholder="e.g., A4, A3"
                disabled={loading}
              />
              
              <Input
                label="Paper Type"
                name="paper_type"
                type="text"
                value={formData.paper_type || ''}
                onChange={handleChange}
                placeholder="e.g., Glossy, Matte"
                disabled={loading}
              />
              
              <Input
                label="Grammage (g)"
                name="grammage"
                type="number"
                min="0"
                value={formData.grammage || ''}
                onChange={handleChange}
                placeholder="e.g., 120"
                disabled={loading}
              />
            </div>
          </div>

          {/* Stock Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Current Stock *"
              name="current_stock"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.current_stock}
              onChange={handleChange}
              placeholder="0"
              disabled={loading}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure *
              </label>
              <select
                name="unit_of_measure_select"
                required
                value={customUnit ? 'custom' : formData.unit_of_measure}
                onChange={handleUnitChange}
                disabled={loading}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Unit</option>
                {unitOptions.map(unit => (
                  <option key={unit} value={unit}>
                    {unit === 'custom' ? 'Custom Unit...' : unit}
                  </option>
                ))}
              </select>
              
              {customUnit && (
                <Input
                  name="unit_of_measure"
                  type="text"
                  required
                  value={formData.unit_of_measure}
                  onChange={handleChange}
                  placeholder="Enter custom unit (e.g., bottles, tubes, etc.)"
                  disabled={loading}
                  className="mt-2"
                />
              )}
            </div>
            
            <Input
              label="Low Stock Threshold *"
              name="threshold"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.threshold}
              onChange={handleChange}
              placeholder="0"
              disabled={loading}
            />
          </div>

          {/* Pricing Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Unit Cost (₦) *"
              name="unit_cost"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.unit_cost}
              onChange={handleChange}
              placeholder="0.00"
              disabled={loading}
            />
            
            <Input
              label="Selling Price (₦)"
              name="selling_price"
              type="number"
              min="0"
              step="0.01"
              value={formData.selling_price || ''}
              onChange={handleChange}
              placeholder="0.00"
              disabled={loading}
            />
            
            <Input
              label="Reorder Quantity"
              name="reorder_quantity"
              type="number"
              min="0"
              step="0.01"
              value={formData.reorder_quantity || ''}
              onChange={handleChange}
              placeholder="Auto-calculate"
              disabled={loading}
            />
          </div>

          {/* Supplier Information */}
          <Input
            label="Supplier"
            name="supplier"
            type="text"
            value={formData.supplier || ''}
            onChange={handleChange}
            placeholder="Enter supplier name"
            disabled={loading}
          />

          {/* Stock Value Calculation */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Stock Value Calculation</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700">
                  Current Stock Value: ₦{(formData.current_stock * formData.unit_cost).toLocaleString()}
                </p>
                <p className="text-blue-600">
                  {formData.current_stock} {formData.unit_of_measure} × ₦{formData.unit_cost}
                </p>
              </div>
              {formData.selling_price && (
                <div>
                  <p className="text-green-700">
                    Potential Revenue: ₦{(formData.current_stock * formData.selling_price).toLocaleString()}
                  </p>
                  <p className="text-green-600">
                    {formData.current_stock} {formData.unit_of_measure} × ₦{formData.selling_price}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {mode === 'create' ? 'Create Item' : 'Update Item'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};