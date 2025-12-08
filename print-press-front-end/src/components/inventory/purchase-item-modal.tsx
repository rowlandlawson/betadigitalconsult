'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inventoryApi } from '@/lib/inventoryService';
import { InventoryItem } from '@/types/inventory';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSuccess?: () => void;
}

export const PurchaseItemModal: React.FC<PurchaseItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    quantity: '',
    unit_price: '',
    total_amount: ''
  });

  useEffect(() => {
    if (isOpen && item) {
      // Reset form when modal opens
      setFormData({
        quantity: '',
        unit_price: '',
        total_amount: ''
      });
      setError('');
    }
  }, [isOpen, item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-calculate total_amount when quantity or unit_price changes
      if (name === 'quantity' || name === 'unit_price') {
        const qty = name === 'quantity' ? parseFloat(value) : parseFloat(prev.quantity);
        const unitPrice = name === 'unit_price' ? parseFloat(value) : parseFloat(prev.unit_price);
        
        if (qty > 0 && unitPrice > 0) {
          newData.total_amount = (qty * unitPrice).toFixed(2);
        } else {
          newData.total_amount = '';
        }
      }
      
      // Auto-calculate unit_price when total_amount or quantity changes
      if (name === 'total_amount' || name === 'quantity') {
        const total = name === 'total_amount' ? parseFloat(value) : parseFloat(prev.total_amount);
        const qty = name === 'quantity' ? parseFloat(value) : parseFloat(prev.quantity);
        
        if (total > 0 && qty > 0) {
          newData.unit_price = (total / qty).toFixed(2);
        } else if (name === 'total_amount') {
          newData.unit_price = '';
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!item) {
      setError('No item selected');
      setLoading(false);
      return;
    }

    const quantity = parseFloat(formData.quantity);
    const totalAmount = parseFloat(formData.total_amount);

    if (!quantity || quantity <= 0) {
      setError('Please enter a valid quantity');
      setLoading(false);
      return;
    }

    if (!totalAmount || totalAmount <= 0) {
      setError('Please enter a valid total amount');
      setLoading(false);
      return;
    }

    try {
      await inventoryApi.adjustStock(item.id, {
        adjustment_type: 'add',
        quantity: quantity,
        purchase_cost: totalAmount,
        reason: 'Purchase',
        notes: `Purchased ${quantity} ${item.unit_of_measure} at ${formData.unit_price} per unit`
      });

      toast.success(`Successfully purchased ${quantity} ${item.unit_of_measure} of ${item.material_name}`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to record purchase';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true"></div>
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <h2 className="text-xl font-bold">Purchase Item</h2>
            <p className="text-sm text-gray-600 mt-1">{item.material_name}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-red-600 bg-red-50 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Current Stock Info */}
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">Current Stock</p>
              <p className="text-lg font-semibold text-gray-900">
                {item.display_stock} ({item.current_stock} {item.unit_of_measure})
              </p>
            </div>

            {/* Quantity Ordered */}
            <div>
              <Label htmlFor="quantity">Quantity Ordered *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={handleChange}
                placeholder={`Enter quantity in ${item.unit_of_measure}`}
                required
                className="mt-1"
              />
            </div>

            {/* Unit Price */}
            <div>
              <Label htmlFor="unit_price">Unit Price *</Label>
              <Input
                id="unit_price"
                name="unit_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_price}
                onChange={handleChange}
                placeholder="Enter price per unit"
                required
                className="mt-1"
              />
            </div>

            {/* Total Amount Paid */}
            <div>
              <Label htmlFor="total_amount">Total Amount Paid *</Label>
              <Input
                id="total_amount"
                name="total_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.total_amount}
                onChange={handleChange}
                placeholder="Enter total amount paid"
                required
                className="mt-1"
              />
            </div>

            {/* Preview of new stock */}
            {formData.quantity && parseFloat(formData.quantity) > 0 && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">After Purchase:</p>
                <p className="text-lg font-semibold text-blue-900">
                  {(item.current_stock + parseFloat(formData.quantity || '0')).toFixed(2)} {item.unit_of_measure}
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Record Purchase'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

