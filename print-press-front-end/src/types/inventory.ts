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
  total_quantity: number;
  total_cost: number;
  average_unit_cost: number;
}

export interface StockLevel {
  material_name: string;
  current_stock: number;
  threshold: number;
  unit_of_measure: string;
  unit_cost: number;
  stock_value: number;
  stock_percentage: number;
  stock_status: 'CRITICAL' | 'LOW' | 'HEALTHY';
}