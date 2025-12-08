'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportsService } from '@/lib/reportsService';
import { MaterialMonitoringDashboard } from '@/types/reports';
import { formatCurrency } from '@/lib/utils';
import { isApiError } from '@/lib/api';
import { AlertTriangle, TrendingUp, Package } from 'lucide-react';

export const MaterialMonitoringReport: React.FC = () => {
  const [data, setData] = useState<MaterialMonitoringDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [months, setMonths] = useState(6);

  useEffect(() => {
    fetchData();
  }, [months]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const dashboard = await reportsService.getMaterialMonitoringDashboard(months);
      setData(dashboard);
    } catch (err: unknown) {
      console.error('Failed to fetch material monitoring:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load material monitoring data');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 text-center">
            <p className="text-lg font-semibold">Error loading report</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'LOW': return 'bg-yellow-100 text-yellow-800';
      case 'HEALTHY': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Material Monitoring Dashboard</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Period:</label>
              <Input
                type="number"
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value) || 6)}
                className="w-20"
                min="1"
                max="24"
              />
              <span className="text-sm text-gray-600">months</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Materials Tracked</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.total_materials_tracked}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Stock</p>
                <p className="text-2xl font-bold text-red-600">{data.summary.critical_stock_items}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Waste Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.summary.total_waste_cost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Material Return</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.summary.average_material_return.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Levels */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Stock Levels</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Material</th>
                  <th className="text-right p-2">Current Stock</th>
                  <th className="text-right p-2">Threshold</th>
                  <th className="text-left p-2">Unit</th>
                  <th className="text-right p-2">Stock Value</th>
                  <th className="text-right p-2">Stock %</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.stock_levels.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{item.material_name}</td>
                    <td className="p-2 text-right">{item.current_stock}</td>
                    <td className="p-2 text-right">{item.threshold}</td>
                    <td className="p-2">{item.unit_of_measure}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(item.stock_value)}</td>
                    <td className="p-2 text-right">{item.stock_percentage.toFixed(1)}%</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${getStockStatusColor(item.stock_status)}`}>
                        {item.stock_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Efficiency */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Material Cost Efficiency</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Material</th>
                  <th className="text-right p-2">Jobs Count</th>
                  <th className="text-right p-2">Total Quantity</th>
                  <th className="text-right p-2">Total Cost</th>
                  <th className="text-right p-2">Generated Profit</th>
                  <th className="text-right p-2">Return on Material</th>
                </tr>
              </thead>
              <tbody>
                {data.cost_efficiency.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{item.material_name}</td>
                    <td className="p-2 text-right">{item.jobs_count}</td>
                    <td className="p-2 text-right">{item.total_quantity}</td>
                    <td className="p-2 text-right">{formatCurrency(item.total_cost)}</td>
                    <td className="p-2 text-right font-medium text-green-600">
                      {formatCurrency(item.generated_profit)}
                    </td>
                    <td className="p-2 text-right font-medium">
                      {item.return_on_material.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Waste Analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Waste Analysis</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Reason</th>
                  <th className="text-right p-2">Occurrences</th>
                  <th className="text-right p-2">Total Cost</th>
                  <th className="text-right p-2">Avg Cost</th>
                  <th className="text-right p-2">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {data.waste_analysis.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{item.type}</td>
                    <td className="p-2">{item.waste_reason || 'N/A'}</td>
                    <td className="p-2 text-right">{item.occurrence_count}</td>
                    <td className="p-2 text-right font-medium text-red-600">
                      {formatCurrency(item.total_cost)}
                    </td>
                    <td className="p-2 text-right">{formatCurrency(item.average_cost)}</td>
                    <td className="p-2 text-right">{item.percentage_of_total.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

