'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inventoryApi } from '@/lib/inventoryService';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { Minus, RefreshCw } from 'lucide-react';

export const MaterialUsageTracker: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [sheetsUsed, setSheetsUsed] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getInventory(1, 1000); // Fetch all for dropdown
      setInventory(response.inventory);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load inventory' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !sheetsUsed || Number(sheetsUsed) <= 0) {
      setMessage({
        type: 'error',
        text: 'Please select a material and enter a valid number of sheets.',
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await inventoryApi.recordUsage({
        material_id: selectedMaterial,
        quantity_used: Number(sheetsUsed),
        notes: notes,
      });

      setMessage({
        type: 'success',
        text: 'Material usage recorded successfully.',
      });
      // Reset form
      setSelectedMaterial('');
      setSheetsUsed('');
      setNotes('');
      fetchInventory(); // Refresh list
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || 'Failed to record material usage.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMaterialData = inventory.find(
    (item) => item.id === selectedMaterial
  );
  const costOfUsage =
    selectedMaterialData && sheetsUsed
      ? Number(sheetsUsed) * selectedMaterialData.unit_cost
      : 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold">Track Material Usage</h2>
        <p className="text-gray-600">
          Record material usage for production jobs.
        </p>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
            >
              {message.text}
            </div>
          )}

          <div>
            <Label htmlFor="material-select">Select Material *</Label>
            <select
              id="material-select"
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              required
              disabled={loading}
              className="w-full p-2 border rounded"
            >
              <option value="">
                {loading ? 'Loading...' : 'Choose a material'}
              </option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.material_name} ({item.display_stock} in stock)
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="sheets-used">Sheets Used *</Label>
            <Input
              id="sheets-used"
              type="number"
              min="1"
              value={sheetsUsed}
              onChange={(e) => setSheetsUsed(e.target.value)}
              placeholder="Number of sheets"
              disabled={!selectedMaterial}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., For Job #1234"
              rows={3}
              className="w-full p-2 border rounded"
            />
          </div>

          {selectedMaterialData && sheetsUsed && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold mb-2">Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Cost of Usage:</p>
                  <p className="font-medium text-red-600">
                    {formatCurrency(costOfUsage)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Stock Remaining:</p>
                  <p className="font-medium">
                    {selectedMaterialData.current_stock - Number(sheetsUsed)}{' '}
                    sheets
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={fetchInventory}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            type="submit"
            disabled={submitting || !selectedMaterial || !sheetsUsed}
          >
            <Minus className="h-4 w-4 mr-2" />
            Record Usage
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
