'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { MaterialUsageTrend, StockLevel, CostAnalysis, StockUpdate } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, AlertTriangle, Package, DollarSign } from 'lucide-react';

interface PieTooltipProps {
  payload?: Array<{
    payload?: {
      name: string;
      value: number;
      percent?: number;
    };
  }>;
}

export const MaterialMonitoringDashboard: React.FC = () => {
  const [usageTrends, setUsageTrends] = useState<MaterialUsageTrend[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis | null>(null);
  const [stockUpdates, setStockUpdates] = useState<StockUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchMonitoringData = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      });

      const [trendsRes, levelsRes, costRes, updatesRes] = await Promise.all([
        api.get(`/inventory/monitoring/usage-trends?${params}`),
        api.get('/inventory/monitoring/stock-levels'),
        api.get(`/inventory/monitoring/cost-analysis?${params}`),
        api.get('/inventory/monitoring/automatic-updates?limit=10')
      ]);

      setUsageTrends(trendsRes.data.usage_trends);
      setStockLevels(levelsRes.data.stock_levels);
      setCostAnalysis(costRes.data);
      setStockUpdates(updatesRes.data.updates);
    } catch (err: unknown) {
      console.error('Failed to fetch monitoring data:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return '#ef4444';
      case 'LOW': return '#f59e0b';
      case 'HEALTHY': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'usage': return '#3b82f6';
      case 'waste': return '#ef4444';
      case 'adjustment': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const stockStatusData = stockLevels.reduce((acc, item) => {
    acc[item.stock_status] = (acc[item.stock_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(stockStatusData).map(([name, value]) => ({
    name,
    value,
    color: getStockStatusColor(name)
  }));

  // Fixed pie chart label function with proper TypeScript types
  const renderCustomizedLabel = ({ percent, name }: { percent?: number; name?: string }) => {
    return `${name} (${((percent || 0) * 100).toFixed(0)}%)`;
  };

  // Custom tooltip for pie chart with proper typing
  const PieChartTooltip = ({ payload }: PieTooltipProps) => {
    if (!payload || payload.length === 0) return null;

    const data = payload[0].payload;
    if (!data) return null;

    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-sm">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-gray-600">
          {data.value} items ({(data.percent || 0 * 100).toFixed(1)}%)
        </p>
      </div>
    );
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Material Monitoring</h1>
          <p className="text-gray-600">Track material usage, waste, and costs</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="w-full sm:w-auto"
          />
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="w-full sm:w-auto"
          />
          <Button onClick={fetchMonitoringData}>
            <Calendar className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{stockLevels.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Critical Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {stockLevels.filter(item => item.stock_status === 'CRITICAL').length}
                </p>
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
                <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(costAnalysis?.total_inventory_value || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Usage Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(costAnalysis?.usage_costs.reduce((sum, cost) => sum + cost.usage_cost, 0) || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Status Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Stock Status Distribution</h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center mt-4 space-x-4">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage Trends */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Material Usage Trends</h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageTrends.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="material_name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Cost']} />
                <Legend />
                <Bar dataKey="total_cost" name="Total Cost" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Cost Analysis</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Total Usage Cost</p>
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(costAnalysis?.usage_costs.reduce((sum, cost) => sum + cost.usage_cost, 0) || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">Total Waste Cost</p>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(costAnalysis?.waste_costs.reduce((sum, cost) => sum + cost.waste_cost, 0) || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Waste Percentage</p>
              <p className="text-2xl font-bold text-green-700">
                {costAnalysis ? (
                  ((costAnalysis.waste_costs.reduce((sum, cost) => sum + cost.waste_cost, 0) / 
                   (costAnalysis.usage_costs.reduce((sum, cost) => sum + cost.usage_cost, 0) + 
                    costAnalysis.waste_costs.reduce((sum, cost) => sum + cost.waste_cost, 0))) * 100).toFixed(1)
                ) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Stock Updates */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Stock Updates</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stockUpdates.map((update, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getUpdateTypeColor(update.type) }}
                  ></div>
                  <div>
                    <p className="font-medium text-gray-900">{update.material_name}</p>
                    <p className="text-sm text-gray-500 capitalize">
                      {update.type} • {update.sub_type} • {update.quantity} units
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(update.created_at).toLocaleDateString()}
                  </p>
                  {update.total_cost && (
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(update.total_cost)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};