'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, isApiError } from '@/lib/api';
import { InventoryItem, PaginatedResponse } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Package, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const InventoryList: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchInventory();
    fetchCategories();
  }, [categoryFilter, lowStockOnly]);

  const fetchInventory = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (lowStockOnly) params.append('low_stock', 'true');
      
      const response = await api.get<PaginatedResponse<InventoryItem>>(`/inventory?${params.toString()}`);
      setInventory(response.data.data);
    } catch (err: unknown) {
      console.error('Failed to fetch inventory:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load inventory');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get<{ categories: string[] }>('/inventory/categories');
      setCategories(response.data.categories);
    } catch (err: unknown) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatusColor = (item: InventoryItem) => {
    const stockPercentage = (item.current_stock / item.threshold) * 100;
    
    if (item.current_stock <= item.threshold) {
      return 'bg-red-100 text-red-800';
    } else if (stockPercentage <= 150) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  const getStockStatusText = (item: InventoryItem) => {
    const stockPercentage = (item.current_stock / item.threshold) * 100;
    
    if (item.current_stock <= item.threshold) {
      return 'CRITICAL';
    } else if (stockPercentage <= 150) {
      return 'LOW';
    } else {
      return 'HEALTHY';
    }
  };

  const calculateStockValue = (item: InventoryItem) => {
    return item.current_stock * item.unit_cost;
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
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600">Manage and track all materials and supplies</p>
        </div>
        <Link href="/admin/inventory/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Items</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventory.filter(item => item.is_active).length}
                </p>
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
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventory.filter(item => item.current_stock <= item.threshold).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(inventory.reduce((sum, item) => sum + calculateStockValue(item), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by material name, category, or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <label className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md bg-white">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Low Stock Only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            Inventory Items ({filteredInventory.length})
          </h3>
        </CardHeader>
        <CardContent>
          {filteredInventory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No inventory items found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInventory.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{item.material_name}</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {item.category}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(item)}`}>
                        {getStockStatusText(item)}
                      </span>
                      {!item.is_active && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Stock:</span> {item.current_stock} {item.unit_of_measure}
                      </div>
                      <div>
                        <span className="font-medium">Threshold:</span> {item.threshold} {item.unit_of_measure}
                      </div>
                      <div>
                        <span className="font-medium">Unit Cost:</span> {formatCurrency(item.unit_cost)}
                      </div>
                      {item.supplier && (
                        <div>
                          <span className="font-medium">Supplier:</span> {item.supplier}
                        </div>
                      )}
                    </div>
                    
                    {/* Paper Specifications */}
                    {(item.paper_size || item.paper_type || item.grammage) && (
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        {item.paper_size && <span>Size: {item.paper_size}</span>}
                        {item.paper_type && <span>Type: {item.paper_type}</span>}
                        {item.grammage && <span>Grammage: {item.grammage}g</span>}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(calculateStockValue(item))}
                      </p>
                      <p className="text-sm text-gray-500">
                        Stock Value
                      </p>
                      {item.selling_price && (
                        <p className="text-sm text-green-600">
                          Sell: {formatCurrency(item.selling_price)}
                        </p>
                      )}
                    </div>
                    <Link href={`/admin/inventory/${item.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
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