'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FinancialSummary } from './financial-summary';
import { ProfitLoss } from './profit-loss';
import { MaterialMonitoringReport } from './material-monitoring-report';
import { BusinessPerformance } from './business-performance';
import { BarChart3, DollarSign, TrendingUp, Package } from 'lucide-react';

type ReportTab = 'financial' | 'profit-loss' | 'material' | 'performance';

export const ReportsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('financial');

  const tabs = [
    {
      id: 'financial' as ReportTab,
      label: 'Financial Summary',
      icon: DollarSign,
    },
    { id: 'profit-loss' as ReportTab, label: 'Profit & Loss', icon: BarChart3 },
    {
      id: 'material' as ReportTab,
      label: 'Material Monitoring',
      icon: Package,
    },
    {
      id: 'performance' as ReportTab,
      label: 'Business Performance',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Reports & Analytics
        </h1>
        <p className="text-gray-600">
          Comprehensive business insights and financial reports
        </p>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-b-2 border-[#AABD77] text-[#AABD77]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'financial' && <FinancialSummary />}
        {activeTab === 'profit-loss' && <ProfitLoss />}
        {activeTab === 'material' && <MaterialMonitoringReport />}
        {activeTab === 'performance' && <BusinessPerformance />}
      </div>
    </div>
  );
};
