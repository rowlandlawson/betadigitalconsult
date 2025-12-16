'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { inventoryApi } from '@/lib/inventoryService';
import { LowStockAlert, InventoryItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import {
  AlertTriangle,
  Package,
  Bell,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import { StockManagementModal } from './stock-management-modal';

export const LowStockAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const fetchLowStockAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getLowStockAlerts();
      setAlerts(response.low_stock_items);
    } catch (err) {
      setError('Failed to load low stock alerts.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLowStockAlerts();
  }, [fetchLowStockAlerts]);

  const getStatusStyle = (status: 'CRITICAL' | 'LOW' | 'HEALTHY') => {
    switch (status) {
      case 'CRITICAL':
        return {
          card: 'border-red-500 bg-red-50',
          iconContainer: 'bg-red-100',
          icon: 'text-red-600',
          text: 'text-red-800',
          progressBar: 'bg-red-500',
        };
      case 'LOW':
        return {
          card: 'border-yellow-500 bg-yellow-50',
          iconContainer: 'bg-yellow-100',
          icon: 'text-yellow-600',
          text: 'text-yellow-800',
          progressBar: 'bg-yellow-500',
        };
      default:
        return {
          card: 'border-green-500 bg-green-50',
          iconContainer: 'bg-green-100',
          icon: 'text-green-600',
          text: 'text-green-800',
          progressBar: 'bg-green-500',
        };
    }
  };

  const criticalCount = alerts.filter(
    (a) => a.stock_status === 'CRITICAL'
  ).length;
  const lowCount = alerts.filter((a) => a.stock_status === 'LOW').length;

  const handlePurchaseClick = async (alert: LowStockAlert) => {
    try {
      // Fetch the full inventory item details
      const response = await inventoryApi.getInventoryItem(alert.id);
      setSelectedItem(response.item);
      setPurchaseModalOpen(true);
    } catch (err) {
      console.error('Failed to load item details:', err);
      setError('Failed to load item details for purchase.');
    }
  };

  const handlePurchaseSuccess = () => {
    // Refresh alerts after successful purchase
    fetchLowStockAlerts();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Low Stock Alerts</h1>
          <p className="text-gray-600">Items that need immediate attention.</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchLowStockAlerts}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm">Critical Alerts</p>
              <p className="text-2xl font-bold">{criticalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Bell className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm">Low Alerts</p>
              <p className="text-2xl font-bold">{lowCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm">Total Alerts</p>
              <p className="text-2xl font-bold">{alerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            Stock Alerts ({alerts.length})
          </h3>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 bg-green-50 rounded-lg">
              <p className="font-semibold text-green-800">
                All stock levels are healthy!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                const styles = getStatusStyle(alert.stock_status);
                const stockValue = alert.current_stock * alert.unit_cost;

                return (
                  <div
                    key={alert.id}
                    className={`p-4 border-l-4 rounded-r-lg ${styles.card}`}
                  >
                    <div className="flex flex-col lg:flex-row justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold">
                            {alert.material_name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${styles.card} ${styles.text}`}
                          >
                            {alert.stock_status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Current:</span>{' '}
                            {alert.display_stock}
                          </div>
                          <div>
                            <span className="font-medium">Threshold:</span>{' '}
                            {alert.display_threshold}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${styles.progressBar}`}
                              style={{
                                width: `${alert.stock_percentage || 0}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {formatCurrency(stockValue)}
                          </p>
                          <p className="text-sm text-gray-500">Stock Value</p>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePurchaseClick(alert)}
                          className="flex items-center gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Update Stock
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Modal */}
      <StockManagementModal
        isOpen={purchaseModalOpen}
        onClose={() => {
          setPurchaseModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
};
