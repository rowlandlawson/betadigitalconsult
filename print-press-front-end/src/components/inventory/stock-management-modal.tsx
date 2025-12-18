'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inventoryApi } from '@/lib/inventoryService';
import { InventoryItem } from '@/types/inventory';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api';

interface StockManagementModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * A management modal dedicated to updating stock with visibility of remaining stock
 * and the ability to input purchased quantity and price to recalc unit cost.
 */
export const StockManagementModal: React.FC<StockManagementModalProps> = ({
  isOpen,
  item,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setTotalCost('');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const remainingDisplay =
    item.display_stock || `${item.current_stock} ${item.unit_of_measure}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const qty = parseFloat(quantity);
      const cost = parseFloat(totalCost);
      if (!qty || qty <= 0) {
        toast.error('Enter a valid quantity');
        setLoading(false);
        return;
      }
      if (!cost || cost <= 0) {
        toast.error('Enter a valid total cost');
        setLoading(false);
        return;
      }

      await inventoryApi.adjustStock(item.id, {
        adjustment_type: 'add',
        quantity: qty,
        purchase_cost: cost,
        unit_price: cost / qty,
        reason: 'Manual stock update',
        notes: `Added ${qty} ${item.unit_of_measure} at total cost ${cost}`,
      });

      toast.success('Stock updated and unit cost recalculated');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(err.error);
      } else {
        toast.error('Failed to update stock');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-600">
            Material:{' '}
            <span className="font-semibold">{item.material_name}</span>
          </p>
          <p className="text-sm text-gray-600">
            Current stock:{' '}
            <span className="font-semibold">{remainingDisplay}</span>
          </p>
          <p className="text-xs text-gray-500">Unit: {item.unit_of_measure}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="qty">Quantity to add</Label>
            <Input
              id="qty"
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Enter quantity in ${item.unit_of_measure}`}
              required
            />
          </div>

          <div>
            <Label htmlFor="cost">Total cost for this quantity</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              placeholder="Enter total purchase cost"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Unit price will be recalculated automatically.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
