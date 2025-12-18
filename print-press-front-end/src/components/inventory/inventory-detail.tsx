'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { inventoryApi } from '@/lib/inventoryService';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { isApiError } from '@/lib/api';
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Edit,
} from 'lucide-react';
import Link from 'next/link';
import { PurchaseItemModal } from './purchase-item-modal';

interface InventoryDetailProps {
  itemId: string;
}

export const InventoryDetail: React.FC<InventoryDetailProps> = ({ itemId }) => {
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      try {
        const { item: itemData } = await inventoryApi.getInventoryItem(itemId);
        setItem(itemData);
      } catch (err: unknown) {
        if (isApiError(err)) {
          setError(err.error);
        } else {
          setError('Failed to load inventory item');
        }
      } finally {
        setLoading(false);
      }
    };

    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

  const getStockStatusColor = (status?: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HEALTHY':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStockStatusIcon = (status?: string) => {
    switch (status) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'LOW':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Package className="h-4 w-4 text-green-600" />;
    }
  };

  const renderAttributes = (item: InventoryItem) => {
    const attributes = item.attributes || {};
    const commonAttributes = [];

    if (item.category === 'Paper') {
      if (attributes.paper_size)
        commonAttributes.push(`Size: ${attributes.paper_size}`);
      if (attributes.paper_type)
        commonAttributes.push(`Type: ${attributes.paper_type}`);
      if (attributes.grammage) commonAttributes.push(`${attributes.grammage}g`);
      if (attributes.sheets_per_unit)
        commonAttributes.push(`${attributes.sheets_per_unit} sheets/unit`);
    } else if (item.category === 'Ink') {
      if (attributes.color) commonAttributes.push(`Color: ${attributes.color}`);
      if (attributes.volume_ml)
        commonAttributes.push(`${attributes.volume_ml}ml`);
    } else if (item.category === 'Plates') {
      if (attributes.plate_size)
        commonAttributes.push(`Size: ${attributes.plate_size}`);
    }

    return commonAttributes.length > 0
      ? commonAttributes.join(' • ')
      : 'No specific attributes';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || 'Inventory item not found'}</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {item.material_name}
            </h1>
            <p className="text-gray-600">{item.category}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setPurchaseModalOpen(true)}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Purchase Item
          </Button>
          <Link href={`/admin/inventory/${item.id}/edit`}>
            <Button variant="outline" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Current Stock
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {item.display_stock}
                </p>
                <p className="text-xs text-gray-500">
                  {item.current_stock} {item.unit_of_measure}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Threshold</p>
                <p className="text-2xl font-bold text-gray-900">
                  {item.threshold} {item.unit_of_measure}
                </p>
                <div
                  className={`mt-2 px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getStockStatusColor(item.stock_status)}`}
                >
                  {getStockStatusIcon(item.stock_status)}
                  <span>{item.stock_status || 'HEALTHY'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unit Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(item.unit_cost)}
                </p>
                <p className="text-xs text-gray-500">
                  per {item.unit_of_measure}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stock Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    item.stock_value || item.current_stock * item.unit_cost || 0
                  )}
                </p>
                <p className="text-xs text-gray-500">Total inventory value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Item Details</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Material Name</p>
              <p className="text-gray-900">{item.material_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Category</p>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                {item.category}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Properties</p>
              <p className="text-gray-900">{renderAttributes(item)}</p>
            </div>
            {item.supplier && (
              <div>
                <p className="text-sm font-medium text-gray-500">Supplier</p>
                <p className="text-gray-900">{item.supplier}</p>
              </div>
            )}
            {item.selling_price && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Selling Price
                </p>
                <p className="text-gray-900">
                  {formatCurrency(item.selling_price)}
                </p>
              </div>
            )}
            {item.reorder_quantity && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Reorder Quantity
                </p>
                <p className="text-gray-900">
                  {item.reorder_quantity} {item.unit_of_measure}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                {item.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Stock Information</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Current Stock</span>
                <span className="text-lg font-bold text-gray-900">
                  {item.display_stock}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    item.stock_status === 'CRITICAL'
                      ? 'bg-red-500'
                      : item.stock_status === 'LOW'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (item.current_stock / Math.max(item.threshold * 2, 1)) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Unit Cost</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(item.unit_cost)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock Value</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(
                    item.stock_value || item.current_stock * item.unit_cost || 0
                  )}
                </p>
              </div>
            </div>
            {item.stock_percentage !== undefined && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Stock Percentage
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {item.stock_percentage.toFixed(1)}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchase Modal */}
      <PurchaseItemModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        item={item}
        onSuccess={() => {
          // Refresh item data
          inventoryApi
            .getInventoryItem(itemId)
            .then(({ item: updatedItem }) => {
              setItem(updatedItem);
            });
        }}
      />
    </div>
  );
};
