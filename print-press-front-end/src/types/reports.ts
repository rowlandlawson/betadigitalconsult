export interface MonthlyFinancialSummary {
  period: {
    start_date: string;
    end_date: string;
    days?: number;
  };
  revenue: {
    total_revenue: number;
    total_material_costs: number;
    gross_profit: number;
    gross_profit_margin: number;
  };
  expenses: {
    material_costs: number;
    waste_costs: number;
    operational_costs: number;
    labor_costs: number;
    total_expenses: number;
  };
  profit: {
    net_profit: number;
    profit_margin: number;
    is_profitable: boolean;
  };
  cash_flow: {
    total_invoiced: number;
    payments_received: number;
    outstanding_amount: number;
    collection_rate: number;
  };
  job_stats: {
    total_jobs: number;
    completed_jobs: number;
    in_progress_jobs: number;
    fully_paid_jobs: number;
    average_job_value: number;
    highest_job_value: number;
  };
  top_materials: Array<{
    material_name: string;
    total_quantity: number;
    total_cost: number;
    jobs_count: number;
  }>;
  efficiency_metrics: {
    material_efficiency: number;
    waste_percentage: number;
  };
}

export interface ProfitLossStatement {
  period: {
    start_date: string;
    end_date: string;
    days?: number;
  };
  summary: {
    total_revenue: number;
    total_invoiced: number;
    outstanding_amount: number;
    material_costs: number;
    gross_profit: number;
    gross_profit_margin: number;
    total_expenses: number;
    net_profit: number;
    profit_margin: number;
  };
  revenue_breakdown: Array<{
    ticket_id: string;
    description: string;
    revenue: number;
    customer_name: string;
    payment_date: string;
    status: string;
    payments_received?: number;
    outstanding?: number;
  }>;
  expense_breakdown: Array<{
    category: string;
    description: string;
    amount: number;
    date: string;
  }>;
}

export interface MaterialMonitoringDashboard {
  monitoring_period: string;
  material_usage_trends: Array<{
    period: string;
    material_name: string;
    total_quantity: number;
    total_cost: number;
    average_unit_cost: number;
  }>;
  waste_analysis: Array<{
    type: string;
    waste_reason: string;
    material_name?: string;
    occurrence_count: number;
    total_cost: number;
    average_cost: number;
    percentage_of_total: number;
  }>;
  stock_levels: Array<{
    material_name: string;
    current_stock: number;
    threshold: number;
    unit_of_measure: string;
    unit_cost: number;
    stock_value: number;
    stock_percentage: number;
    stock_status: 'CRITICAL' | 'LOW' | 'HEALTHY';
  }>;
  cost_efficiency: Array<{
    material_name: string;
    jobs_count: number;
    total_quantity: number;
    total_cost: number;
    avg_unit_cost: number;
    generated_profit: number;
    return_on_material: number;
  }>;
  summary: {
    total_materials_tracked: number;
    critical_stock_items: number;
    total_waste_cost: number;
    average_material_return: number;
  };
}

export interface BusinessPerformance {
  period: string;
  revenue_trends: Array<{
    period: string;
    job_count: number;
    total_revenue: number;
    collected_revenue: number;
    average_job_value: number;
  }>;
  customer_trends: Array<{
    period: string;
    new_customers: number;
    repeat_customers: number;
  }>;
  efficiency_metrics: Array<{
    period: string;
    total_jobs: number;
    completed_jobs: number;
    avg_completion_hours: number;
    completion_rate: number;
  }>;
  performance_indicators: {
    total_periods: number;
    average_revenue: number;
    customer_growth_rate: number;
  };
}

export interface MaterialUsageTrends {
  material_usage_trends: Array<{
    period: string;
    material_name: string;
    total_quantity: number;
    total_cost: number;
    average_unit_cost: number;
  }>;
}

export interface WasteAnalysis {
  waste_analysis: Array<{
    type: string;
    waste_reason: string;
    material_name?: string;
    occurrence_count: number;
    total_cost: number;
    average_cost: number;
    percentage_of_total: number;
  }>;
}

export interface StockLevels {
  stock_levels: Array<{
    material_name: string;
    current_stock: number;
    threshold: number;
    unit_of_measure: string;
    unit_cost: number;
    stock_value: number;
    stock_percentage: number;
    stock_status: 'CRITICAL' | 'LOW' | 'NORMAL';
  }>;
}

export interface MaterialCostAnalysis {
  material_cost_analysis: Array<{
    material_name: string;
    jobs_count: number;
    total_quantity: number;
    total_cost: number;
    avg_unit_cost: number;
    max_unit_cost: number;
    min_unit_cost: number;
  }>;
}
