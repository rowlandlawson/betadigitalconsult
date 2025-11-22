'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, isApiError } from '@/lib/api';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { Plus, Minus, RefreshCw } from 'lucide-react';

export const MaterialUsageTracker: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [usageType, setUsageType] = useState<'production' | 'waste'>('production');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory');
      setInventory(response.data.inventory);
    } catch (err: unknown) {
      console.error('Failed to fetch inventory:', err);
      setMessage({ type: 'error', text: 'Failed to load inventory' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMaterial || !quantity || parseFloat(quantity) <= 0) {
      setMessage({ type: 'error', text: 'Please select a material and enter a valid quantity' });
      return;
    }

    if (usageType === 'waste' && !reason) {
      setMessage({ type: 'error', text: 'Please provide a reason for waste' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const material = inventory.find(item => item.id === selectedMaterial);
      if (!material) throw new Error('Material not found');

      const payload = {
        material_id: selectedMaterial,
        quantity_used: usageType === 'production' ? parseFloat(quantity) : 0,
        quantity_wasted: usageType === 'waste' ? parseFloat(quantity) : 0,
        unit_cost: material.unit_cost,
        reason: usageType === 'waste' ? reason : undefined,
        notes: notes || undefined,
        usage_type: usageType
      };

      if (usageType === 'production') {
        await api.post('/inventory/usage/record', payload);
        setMessage({ type: 'success', text: 'Material usage recorded successfully' });
      } else {
        await api.post('/inventory/waste/record', payload);
        setMessage({ type: 'success', text: 'Material waste recorded successfully' });
      }

      // Reset form
      setSelectedMaterial('');
      setQuantity('');
      setReason('');
      setNotes('');
      fetchInventory(); // Refresh inventory data
    } catch (err: unknown) {
      console.error('Failed to record usage:', err);
      if (isApiError(err)) {
        setMessage({ type: 'error', text: err.error });
      } else {
        setMessage({ type: 'error', text: 'Failed to record material usage' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMaterialData = inventory.find(item => item.id === selectedMaterial);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900">Track Material Usage</h2>
        <p className="text-gray-600">Record material usage and waste for accurate tracking</p>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {message && (
            <div className={`p-3 text-sm rounded-md ${
              message.type === 'success' 
                ? 'text-green-600 bg-green-50' 
                : 'text-red-600 bg-red-50'
            }`}>
              {message.text}
            </div>
          )}

          {/* Material Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Material *
            </label>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              required
              disabled={loading}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">Choose a material</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.material_name} - {item.current_stock} {item.unit_of_measure} in stock
                </option>
              ))}
            </select>
          </div>

          {/* Usage Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type *
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="production"
                  checked={usageType === 'production'}
                  onChange={(e) => setUsageType(e.target.value as 'production')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2">Production Usage</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="waste"
                  checked={usageType === 'waste'}
                  onChange={(e) => setUsageType(e.target.value as 'waste')}
                  className="text-red-600 focus:ring-red-500"
                />
                <span className="ml-2">Waste</span>
              </label>
            </div>
          </div>

          {/* Quantity */}
          <Input
            label={`Quantity ${usageType === 'production' ? 'Used' : 'Wasted'} *`}
            type="number"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            disabled={loading || !selectedMaterial}
            required
          />

          {/* Waste Reason */}
          {usageType === 'waste' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Waste *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select reason</option>
                <option value="printing_error">Printing Error</option>
                <option value="setup_waste">Setup Waste</option>
                <option value="damaged">Damaged Material</option>
                <option value="expired">Expired Material</option>
                <option value="measurement_error">Measurement Error</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Cost Calculation */}
          {selectedMaterialData && quantity && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Cost Calculation</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Current Stock:</p>
                  <p className="font-medium">{selectedMaterialData.current_stock} {selectedMaterialData.unit_of_measure}</p>
                </div>
                <div>
                  <p className="text-gray-600">After {usageType}:</p>
                  <p className="font-medium">
                    {selectedMaterialData.current_stock - parseFloat(quantity)} {selectedMaterialData.unit_of_measure}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Unit Cost:</p>
                  <p className="font-medium">{formatCurrency(selectedMaterialData.unit_cost)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Cost:</p>
                  <p className="font-medium text-red-600">
                    {formatCurrency(parseFloat(quantity) * selectedMaterialData.unit_cost)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={fetchInventory}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button
              type="submit"
              loading={submitting}
              disabled={submitting || !selectedMaterial || !quantity}
              className={usageType === 'waste' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {usageType === 'production' ? (
                <Plus className="h-4 w-4 mr-2" />
              ) : (
                <Minus className="h-4 w-4 mr-2" />
              )}
              Record {usageType === 'production' ? 'Usage' : 'Waste'}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
};