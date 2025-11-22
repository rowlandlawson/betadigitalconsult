export interface InventoryItem {
  id: string;
  material_name: string;
  category: string;
  paper_size?: string;
  paper_type?: string;
  grammage?: number;
  supplier?: string;
  current_stock: number;
  unit_of_measure: string;
  unit_cost: number;
  selling_price?: number;
  threshold: number;
  reorder_quantity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stock_value?: number;
  stock_status?: 'CRITICAL' | 'LOW' | 'HEALTHY';
  stock_percentage?: number;
}

export interface InventoryFormData {
  material_name: string;
  category: string;
  paper_size?: string;
  paper_type?: string;
  grammage?: number;
  supplier?: string;
  current_stock: number;
  unit_of_measure: string;
  unit_cost: number;
  selling_price?: number;
  threshold: number;
  reorder_quantity?: number;
}

export interface LowStockAlert {
  id: string;
  material_name: string;
  current_stock: number;
  threshold: number;
  unit_of_measure: string;
  unit_cost: number;
  stock_percentage: number;
  stock_status: 'CRITICAL' | 'LOW' | 'HEALTHY';
}

export interface MaterialUsageTrend {
  period: string;
  material_name: string;
  category: string;
  total_quantity: number;
  total_cost: number;
  average_unit_cost: number;
}

export interface StockLevel {
  material_name: string;
  category: string;
  current_stock: number;
  threshold: number;
  unit_of_measure: string;
  unit_cost: number;
  stock_value: number;
  stock_percentage: number;
  stock_status: 'CRITICAL' | 'LOW' | 'HEALTHY';
}

export interface MaterialUsageRecord {
  id: string;
  material_id: string;
  job_id?: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  usage_type: 'production' | 'waste' | 'adjustment' | 'other';
  usage_date: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  material_name?: string;
}

export interface MaterialWasteRecord {
  id: string;
  material_id: string;
  job_id?: string;
  quantity_wasted: number;
  unit_cost: number;
  total_cost: number;
  waste_date: string;
  reason?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  material_name?: string;
}

export interface StockAdjustment {
  id: string;
  material_id: string;
  adjustment_type: 'add' | 'remove' | 'correction';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  notes?: string;
  adjusted_by?: string;
  adjustment_date: string;
  material_name?: string;
}

export interface CostAnalysis {
  usage_costs: Array<{
    period: string;
    usage_cost: number;
    usage_count: number;
  }>;
  waste_costs: Array<{
    period: string;
    waste_cost: number;
    waste_count: number;
  }>;
  total_inventory_value: number;
}

export interface StockUpdate {
  type: 'usage' | 'waste' | 'adjustment';
  created_at: string;
  material_name: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  sub_type: string;
  reason?: string;
}