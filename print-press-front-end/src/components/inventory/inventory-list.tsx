// print-press-front-end/src/components/inventory/inventory-list.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inventoryApi } from '@/lib/inventoryService';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Package, AlertTriangle, ChevronLeft, ChevronRight, Eye, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useDebounce } from '@/hooks/useDebounce';
import { PurchaseItemModal } from './purchase-item-modal';

export const InventoryList: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getInventory(
        page,
        limit,
        categoryFilter,
        lowStockOnly,
        debouncedSearchTerm
      );
      setData(response);
    } catch (err: any) {
      console.error('Failed to fetch inventory:', err);
      setError(err.response?.data?.error || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, lowStockOnly, debouncedSearchTerm]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await inventoryApi.getCategories();
        setCategories(response.categories);
      } catch (err: any) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const getStockStatusColor = (status?: string) => {
    switch (status) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'LOW': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HEALTHY': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStockStatusIcon = (status?: string) => {
    switch (status) {
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'LOW': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Package className="h-4 w-4 text-green-600" />;
    }
  };

  const renderAttributes = (item: InventoryItem) => {
    const attributes = item.attributes || {};
    const commonAttributes = [];
    
    // Show common attributes based on category
    if (item.category === 'Paper') {
      if (attributes.paper_size) commonAttributes.push(`Size: ${attributes.paper_size}`);
      if (attributes.paper_type) commonAttributes.push(`Type: ${attributes.paper_type}`);
      if (attributes.grammage) commonAttributes.push(`${attributes.grammage}g`);
    } else if (item.category === 'Ink') {
      if (attributes.color) commonAttributes.push(`Color: ${attributes.color}`);
      if (attributes.volume_ml) commonAttributes.push(`${attributes.volume_ml}ml`);
    } else if (item.category === 'Plates') {
      if (attributes.plate_size) commonAttributes.push(`Size: ${attributes.plate_size}`);
    }
    
    return commonAttributes.length > 0 ? commonAttributes.join(' • ') : '-';
  };

  const inventory = data?.inventory || [];
  const pagination = data?.pagination;

  const totalValue = inventory.reduce((sum: number, item: InventoryItem) => {
    const stockValue = (item.current_stock * item.unit_cost) || 0;
    return sum + (isNaN(stockValue) ? 0 : stockValue);
  }, 0);
  const lowStockCount = inventory.filter((item: InventoryItem) => 
    item.stock_status === 'LOW' || item.stock_status === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track and manage all materials and supplies</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/inventory/alerts">
            <Button variant="outline" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock
              {lowStockCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                  {lowStockCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/admin/inventory/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      {error && <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{pagination?.total || 0}</p>
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
                  {inventory.filter((item: InventoryItem) => item.stock_status === 'CRITICAL').length}
                </p>
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
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by material name, category, supplier, or attributes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="w-full sm:w-40">
                <Label htmlFor="category-filter" className="sr-only">Category</Label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center space-x-2 px-3 py-2 border rounded-md bg-white">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Low Stock Only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Inventory Items ({pagination?.total || 0})</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Page {page} of {Math.ceil((pagination?.total || 0) / limit)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No inventory items found</p>
              <p className="text-gray-400 mb-6">Try adjusting your search or add a new item</p>
              <Link href="/admin/inventory/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Material</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Properties</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Stock</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Value</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item: InventoryItem) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.material_name}</p>
                          {item.supplier && (
                            <p className="text-sm text-gray-500">{item.supplier}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600">{renderAttributes(item)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{item.display_stock}</p>
                          <p className="text-xs text-gray-500">
                            {item.current_stock} {item.unit_of_measure}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStockStatusColor(item.stock_status)}`}>
                            {getStockStatusIcon(item.stock_status)}
                            <span>{item.stock_status || 'HEALTHY'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{formatCurrency(item.current_stock * item.unit_cost)}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.unit_cost)}/{item.unit_of_measure}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Link href={`/admin/inventory/${item.id}`}>
                            <Button size="sm" variant="outline" className="h-8">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button 
                            size="sm" 
                            className="h-8"
                            onClick={() => {
                              setSelectedItem(item);
                              setPurchaseModalOpen(true);
                            }}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Purchase Item
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        
        {/* Pagination */}
        {pagination && pagination.total > limit && (
          <div className="flex justify-between items-center p-4 border-t">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, pagination.total)} of {pagination.total} items
            </div>
            <Button
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= pagination.total}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </Card>

      {/* Purchase Item Modal */}
      <PurchaseItemModal
        isOpen={purchaseModalOpen}
        onClose={() => {
          setPurchaseModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSuccess={() => {
          fetchInventory();
        }}
      />
    </div>
  );
};