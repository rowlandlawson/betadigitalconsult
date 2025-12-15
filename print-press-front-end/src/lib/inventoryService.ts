// print-press-front-end/src/lib/inventoryService.ts
import { api } from './api';
import { 
  InventoryItem, 
  InventoryFormData, 
  LowStockAlert, 
  StockUpdate,
  MaterialUsageTrend,
  StockLevel,
  CostAnalysis,
  MaterialUsageRecord, 
  MaterialWasteRecord, 
  StockAdjustment, 
  CategoryTemplates
} from '../types/inventory';

// Define a type for pagination data
export interface Pagination<T> {
  inventory: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const inventoryApi = {
  // Fetch all inventory items with pagination and filtering
  getInventory: async (
    page: number = 1,
    limit: number = 10,
    category?: string,
    lowStock?: boolean,
    search?: string
  ): Promise<Pagination<InventoryItem>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (category) params.append('category', category);
    if (lowStock) params.append('low_stock', 'true');
    if (search) params.append('search', search);

    const response = await api.get(`/inventory?${params.toString()}`);
    return response.data;
  },

  // Fetch a single inventory item by ID
  getInventoryItem: async (id: string): Promise<{ item: InventoryItem }> => {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  // Create a new inventory item
  createInventory: async (formData: InventoryFormData): Promise<{ message: string; item: InventoryItem }> => {
    const response = await api.post('/inventory', formData);
    return response.data;
  },

  // Update an existing inventory item
  updateInventory: async (id: string, updates: Partial<InventoryFormData>): Promise<{ message: string; item: InventoryItem }> => {
    const response = await api.put(`/inventory/${id}`, updates);
    return response.data;
  },

  // Delete an inventory item (soft delete)
  deleteInventory: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  },
  
  // Fetch low stock alerts
  getLowStockAlerts: async (): Promise<{ low_stock_items: LowStockAlert[] }> => {
    const response = await api.get('/inventory/low-stock-alerts');
    return response.data;
  },

  // Adjust stock (add, remove, set)
  adjustStock: async (
    id: string, 
    data: { 
      adjustment_type: 'add' | 'remove' | 'set'; 
      quantity: number; 
      purchase_cost?: number; 
      unit_price?: number; // Unit price per unit (will be used as new unit_cost)
      reason?: string; 
      notes?: string 
    }
  ): Promise<{ message: string; item: InventoryItem }> => {
    const response = await api.post(`/inventory/${id}/adjust-stock`, data);
    return response.data;
  },

  // Record material usage (general - works with any unit)
  recordUsage: async (data: { 
    material_id: string; 
    job_id?: string; 
    quantity_used: number; 
    notes?: string 
  }): Promise<{ message: string; usage: MaterialUsageRecord }> => {
    const response = await api.post('/inventory/record-usage', data);
    return response.data;
  },

  // Get material history (usage, waste, adjustments)
  getMaterialHistory: async (
    materialId: string, 
    days: number = 30
  ): Promise<{
    material: InventoryItem;
    history: {
      usage: MaterialUsageRecord[];
      waste: MaterialWasteRecord[];
      adjustments: StockAdjustment[];
    };
    totals: {
      used: number;
      wasted: number;
    };
  }> => {
    const response = await api.get(`/inventory/material-history?material_id=${materialId}&days=${days}`);
    return response.data;
  },

  // Get all inventory categories
  getCategories: async (): Promise<{ categories: string[] }> => {
    const response = await api.get('/inventory/categories');
    return response.data;
  },

  // NEW: Get attribute templates for categories
  getAttributeTemplates: async (): Promise<{ templates: CategoryTemplates }> => {
    const response = await api.get('/inventory/attribute-templates');
    return response.data;
  },

  // NEW: Search inventory by material name or attributes
  searchInventory: async (
    query: string, 
    category?: string
  ): Promise<{ results: InventoryItem[] }> => {
    const params = new URLSearchParams({ query });
    if (category) params.append('category', category);
    
    const response = await api.get(`/inventory/search?${params.toString()}`);
    return response.data;
  },

  // NEW: Quick stock check
  quickStockCheck: async (id: string): Promise<{
    material: string;
    currentStock: string;
    threshold: string;
    status: 'CRITICAL' | 'LOW' | 'HEALTHY';
  }> => {
    const response = await api.get(`/inventory/${id}/stock-check`);
    return response.data;
  },

  // NEW: Calculate sheets (for paper category)
  calculateSheets: async (data: {
    reams?: number;
    sheets?: number;
    sheets_per_unit?: number;
  }): Promise<{
    totalSheets: number;
    display: string;
    reams: number;
    sheets: number;
  }> => {
    const response = await api.post('/inventory/calculate-sheets', data);
    return response.data;
  },

  // NEW: Update job materials (for job integration)
  updateJobMaterials: async (
    jobId: string, 
    data: { 
      materials: Array<{
        material_id?: string;
        material_name: string;
        quantity: number;
        unit_cost?: number;
        total_cost?: number;
      }>
    }
  ): Promise<{ message: string }> => {
    const response = await api.post(`/inventory/job/${jobId}/materials`, data);
    return response.data;
  },

  // Material monitoring endpoints
  getMaterialUsageTrends: async (
    period: string = 'month', 
    months: number = 6
  ): Promise<{ material_usage_trends: MaterialUsageTrend[] }> => {
    const response = await api.get(`/inventory/monitoring/usage-trends?period=${period}&months=${months}`);
    return response.data;
  },

  getStockLevels: async (): Promise<{ stock_levels: StockLevel[] }> => {
    const response = await api.get('/inventory/monitoring/stock-levels');
    return response.data;
  },

  getCostAnalysis: async (
    months: number = 6
  ): Promise<CostAnalysis> => {
    const response = await api.get(`/inventory/monitoring/cost-analysis?months=${months}`);
    return response.data;
  },

  getAutomaticStockUpdates: async (
    days: number = 30
  ): Promise<{ automatic_updates: StockUpdate[] }> => {
    const response = await api.get(`/inventory/monitoring/automatic-updates?days=${days}`);
    return response.data;
  },

  getWasteAnalysis: async (
    months: number = 3
  ): Promise<{ waste_analysis: Array<{
    type: string;
    waste_reason: string;
    occurrence_count: number;
    total_cost: number;
    average_cost: number;
  }> }> => {
    const response = await api.get(`/inventory/monitoring/waste-analysis?months=${months}`);
    return response.data;
  },

  getMaterialCostAnalysis: async (
    months: number = 6
  ): Promise<{ material_cost_analysis: Array<{
    material_name: string;
    jobs_count: number;
    total_quantity: number;
    total_cost: number;
    avg_unit_cost: number;
    max_unit_cost: number;
    min_unit_cost: number;
  }> }> => {
    const response = await api.get(`/inventory/monitoring/material-cost-analysis?months=${months}`);
    return response.data;
  }
};