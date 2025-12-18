export interface StockDisplay {
  totalSheets: number;
  reams: number;
  sheets: number;
  display: string;
  displayShort: string;
}

export interface InventoryItem {
  id: string;
  material_name: string;
  category: string;
  current_stock: number;
  unit_of_measure: string;
  unit_cost: number;
  threshold: number;
  attributes: Record<string, string | number | boolean | null>; // New: JSONB attributes
  supplier?: string;
  selling_price?: number;
  reorder_quantity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Calculated fields (from queries)
  stock_value?: number;
  stock_status?: 'CRITICAL' | 'LOW' | 'HEALTHY';
  stock_percentage?: number;
  total_count?: number;

  // Helper fields for display
  display_stock: string;

  // Common attribute shortcuts (for convenience)
  paper_size?: string;
  paper_type?: string;
  grammage?: number;
  sheets_per_unit?: number;
  color?: string;
  volume_ml?: number;
  plate_size?: string;
  chemical_type?: string;
  concentration?: string;
  volume_l?: number;
}

export interface AttributeTemplate {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  default?: string | number | boolean | null;
  options?: string[];
  required?: boolean;
}

export interface CategoryTemplates {
  [key: string]: AttributeTemplate[];
}

export interface InventoryFormData {
  material_name: string;
  category: string;
  current_stock?: number;
  unit_of_measure: string;
  unit_cost: number;
  threshold: number;
  attributes: Record<string, string | number | boolean | null>;
  supplier?: string;
  selling_price?: number;
  reorder_quantity?: number;
  is_active?: boolean;
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
  display_stock: string;
  display_threshold: string;
}

export interface MaterialUsageTrend {
  period: string;
  material_name: string;
  category: string;
  total_quantity_sheets: number;
  total_cost: number;
  average_unit_cost: number;
}

export interface StockLevel {
  material_name: string;
  category: string;
  current_stock_sheets: number;
  threshold_sheets: number;
  sheets_per_unit: number;
  unit_cost: number;
  cost_per_sheet: number;
  stock_value: number;
  stock_percentage: number;
  stock_status: 'CRITICAL' | 'LOW' | 'HEALTHY';
  display_stock: StockDisplay;
}

export interface MaterialUsageRecord {
  id: string;
  material_id: string;
  job_id?: string;
  quantity_used: number;
  quantity_sheets: number;
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
  quantity_sheets: number;
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
  quantity: number; // This is quantity_sheets
  previous_stock: number; // This is previous_stock_sheets
  new_stock: number; // This is new_stock_sheets
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
  quantity_sheets: number;
  unit_cost?: number;
  total_cost?: number;
  sub_type: string;
  reason?: string;
}
