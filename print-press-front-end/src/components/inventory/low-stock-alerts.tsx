'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, isApiError } from '@/lib/api';
import { LowStockAlert } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, Package, Bell } from 'lucide-react';
import Link from 'next/link';

export const LowStockAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchLowStockAlerts();
  }, []);

  const fetchLowStockAlerts = async () => {
    try {
      const response = await api.get<{ low_stock_items: LowStockAlert[] }>('/inventory/alerts/low-stock');
      setAlerts(response.data.low_stock_items);
    } catch (err: unknown) {
      console.error('Failed to fetch low stock alerts:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load low stock alerts');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getStockPercentageColor = (percentage: number) => {
    if (percentage <= 50) return 'text-red-600';
    if (percentage <= 100) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Low Stock Alerts</h1>
          <p className="text-gray-600">Monitor items that need immediate attention</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchLowStockAlerts}>
            Refresh
          </Button>
          <Link href="/admin/inventory/create">
            <Button>
              <Package className="h-4 w-4 mr-2" />
              Add Stock
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-600">
                  {alerts.filter(alert => alert.stock_status === 'CRITICAL').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Bell className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {alerts.filter(alert => alert.stock_status === 'LOW').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {alerts.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            Stock Alerts ({alerts.length})
          </h3>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 bg-green-50 rounded-lg">
                <Package className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-green-800 font-semibold">All stock levels are healthy!</p>
                <p className="text-green-600 text-sm mt-1">No low stock items found.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border-l-4 rounded-r-lg ${
                    alert.stock_status === 'CRITICAL' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{alert.material_name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(alert.stock_status)}`}>
                          {alert.stock_status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Current Stock:</span>
                          <span className={`ml-2 font-semibold ${getStockPercentageColor(alert.stock_percentage)}`}>
                            {alert.current_stock} {alert.unit_of_measure}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Threshold:</span>
                          <span className="ml-2 font-semibold">
                            {alert.threshold} {alert.unit_of_measure}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Stock Level:</span>
                          <span className={`ml-2 font-semibold ${getStockPercentageColor(alert.stock_percentage)}`}>
                            {alert.stock_percentage}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Stock Level</span>
                          <span>{alert.stock_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              alert.stock_status === 'CRITICAL' 
                                ? 'bg-red-500' 
                                : 'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(alert.stock_percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(alert.current_stock * alert.unit_cost)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Stock Value
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(alert.unit_cost)} per {alert.unit_of_measure}
                        </p>
                      </div>
                      <Link href={`/admin/inventory`}>
                        <Button variant="outline" size="sm">
                          Manage Stock
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Recommendation */}
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {alert.stock_status === 'CRITICAL' ? '🚨 Immediate Action Required' : '⚠️ Monitor Closely'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {alert.stock_status === 'CRITICAL' 
                        ? `Stock is critically low. Consider urgent reordering to avoid production delays.`
                        : `Stock is below optimal levels. Plan for reordering soon.`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};