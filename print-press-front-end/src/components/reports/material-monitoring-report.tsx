'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportsService } from '@/lib/reportsService';
import { MaterialMonitoringDashboard } from '@/types/reports';
import { formatCurrency } from '@/lib/utils';
import { isApiError } from '@/lib/api';
import { AlertTriangle, TrendingUp, Package, Calendar } from 'lucide-react';

export const MaterialMonitoringReport: React.FC = () => {
  const [data, setData] = useState<MaterialMonitoringDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  // Default to current month (same as other reports)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    // First day of current month
    return new Date(date.getFullYear(), date.getMonth(), 1)
      .toISOString()
      .split('T')[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const dashboard = await reportsService.getMaterialMonitoringDashboard(
        startDate,
        endDate
      );
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
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800';
      case 'HEALTHY':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">
                Material Monitoring Dashboard
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
              <span className="text-gray-500 text-sm text-center hidden sm:block">
                to
              </span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
              <Button
                onClick={fetchData}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? 'Loading...' : 'Generate'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77]"></div>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600 text-center">
              <p className="text-lg font-semibold">Error loading report</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {data && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                      Materials Tracked
                    </p>
                    <p className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 break-words">
                      {data.summary.total_materials_tracked}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                      Critical Stock
                    </p>
                    <p className="text-base sm:text-lg lg:text-2xl font-bold text-red-600 break-words">
                      {data.summary.critical_stock_items}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                      Total Waste Cost
                    </p>
                    <p className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 break-words">
                      {formatCurrency(data.summary.total_waste_cost)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                      Avg Material Return
                    </p>
                    <p className="text-base sm:text-lg lg:text-2xl font-bold text-green-600 break-words">
                      {(
                        Number(data.summary.average_material_return) || 0
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Levels */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <h3 className="text-base sm:text-lg font-semibold">
                Stock Levels
              </h3>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2 whitespace-nowrap">
                        Material
                      </th>
                      <th className="text-right p-2 whitespace-nowrap">
                        Stock
                      </th>
                      <th className="text-right p-2 hidden sm:table-cell">
                        Threshold
                      </th>
                      <th className="text-left p-2 hidden md:table-cell">
                        Unit
                      </th>
                      <th className="text-right p-2 whitespace-nowrap">
                        Value
                      </th>
                      <th className="text-right p-2 hidden lg:table-cell">
                        Stock %
                      </th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stock_levels.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium whitespace-nowrap">
                          {item.material_name}
                        </td>
                        <td className="p-2 text-right">{item.current_stock}</td>
                        <td className="p-2 text-right hidden sm:table-cell">
                          {item.threshold}
                        </td>
                        <td className="p-2 hidden md:table-cell">
                          {item.unit_of_measure}
                        </td>
                        <td className="p-2 text-right font-medium whitespace-nowrap">
                          {formatCurrency(item.stock_value)}
                        </td>
                        <td className="p-2 text-right hidden lg:table-cell">
                          {(Number(item.stock_percentage) || 0).toFixed(1)}%
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${getStockStatusColor(item.stock_status)}`}
                          >
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
            <CardHeader className="pb-2 sm:pb-4">
              <h3 className="text-base sm:text-lg font-semibold">
                Material Cost Efficiency
              </h3>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2 whitespace-nowrap">
                        Material
                      </th>
                      <th className="text-right p-2">Jobs</th>
                      <th className="text-right p-2 hidden sm:table-cell">
                        Qty
                      </th>
                      <th className="text-right p-2 whitespace-nowrap">Cost</th>
                      <th className="text-right p-2 whitespace-nowrap">
                        Profit
                      </th>
                      <th className="text-right p-2">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cost_efficiency.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium whitespace-nowrap">
                          {item.material_name}
                        </td>
                        <td className="p-2 text-right">{item.jobs_count}</td>
                        <td className="p-2 text-right hidden sm:table-cell">
                          {item.total_quantity}
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          {formatCurrency(item.total_cost)}
                        </td>
                        <td className="p-2 text-right font-medium text-green-600 whitespace-nowrap">
                          {formatCurrency(item.generated_profit)}
                        </td>
                        <td className="p-2 text-right font-medium">
                          {(Number(item.return_on_material) || 0).toFixed(1)}%
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
            <CardHeader className="pb-2 sm:pb-4">
              <h3 className="text-base sm:text-lg font-semibold">
                Waste Analysis
              </h3>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2 whitespace-nowrap">Type</th>
                      <th className="text-left p-2 hidden sm:table-cell">
                        Material
                      </th>
                      <th className="text-left p-2 hidden md:table-cell">
                        Reason
                      </th>
                      <th className="text-right p-2">#</th>
                      <th className="text-right p-2 whitespace-nowrap">Cost</th>
                      <th className="text-right p-2 hidden lg:table-cell">
                        Avg
                      </th>
                      <th className="text-right p-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.waste_analysis.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium whitespace-nowrap">
                          {item.type}
                        </td>
                        <td className="p-2 hidden sm:table-cell">
                          {item.material_name || 'General'}
                        </td>
                        <td className="p-2 hidden md:table-cell">
                          {item.waste_reason || 'N/A'}
                        </td>
                        <td className="p-2 text-right">
                          {item.occurrence_count}
                        </td>
                        <td className="p-2 text-right font-medium text-red-600 whitespace-nowrap">
                          {formatCurrency(item.total_cost)}
                        </td>
                        <td className="p-2 text-right hidden lg:table-cell">
                          {formatCurrency(item.average_cost)}
                        </td>
                        <td className="p-2 text-right">
                          {(Number(item.percentage_of_total) || 0).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
