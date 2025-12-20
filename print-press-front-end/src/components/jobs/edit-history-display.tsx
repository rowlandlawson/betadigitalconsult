'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MaterialEditHistory } from '@/types/jobs';
import { formatDateTime } from '@/lib/utils';
import { History, ChevronDown, ChevronUp, User } from 'lucide-react';
import { api } from '@/lib/api';

interface EditHistoryDisplayProps {
  jobId: string;
  userRole: 'admin' | 'worker';
}

export const EditHistoryDisplay: React.FC<EditHistoryDisplayProps> = ({
  jobId,
  userRole: _userRole,
}) => {
  const [editHistory, setEditHistory] = useState<MaterialEditHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchEditHistory = useCallback(async () => {
    try {
      const response = await api.get(`/jobs/${jobId}/material-edit-history`);
      setEditHistory(response.data.editHistory || []);
    } catch (error) {
      console.error('Failed to fetch edit history:', error);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchEditHistory();
  }, [fetchEditHistory]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getChangeType = (history: MaterialEditHistory): string => {
    if (!history.previous_material_name && history.new_material_name) {
      return 'ADDED';
    }
    if (history.previous_material_name && !history.new_material_name) {
      return 'DELETED';
    }
    return 'UPDATED';
  };

  const getChangeTypeColor = (type: string): string => {
    switch (type) {
      case 'ADDED':
        return 'bg-green-100 text-green-800';
      case 'DELETED':
        return 'bg-red-100 text-red-800';
      case 'UPDATED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (editHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold">Edit History</h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            No edit history available for this job.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold">Edit History</h3>
            <span className="text-sm text-gray-500">
              ({editHistory.length} entries)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {editHistory.map((history) => {
            const isExpanded = expandedItems.has(history.id);
            const changeType = getChangeType(history);
            const hasChanges =
              history.previous_material_name !== history.new_material_name ||
              history.previous_quantity !== history.new_quantity ||
              history.previous_unit_cost !== history.new_unit_cost ||
              history.previous_total_cost !== history.new_total_cost;

            return (
              <div
                key={history.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getChangeTypeColor(changeType)}`}
                      >
                        {changeType}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {history.new_material_name ||
                          history.previous_material_name ||
                          'Unknown Material'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{history.editor_name || 'Unknown'}</span>
                      </div>
                      <span>•</span>
                      <span>{formatDateTime(history.edited_at)}</span>
                    </div>

                    {history.edit_reason && (
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Reason:</span>{' '}
                        {history.edit_reason}
                      </p>
                    )}

                    {isExpanded && hasChanges && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">
                              Previous Values
                            </h4>
                            <div className="space-y-1 text-gray-600">
                              <p>
                                <span className="font-medium">Material:</span>{' '}
                                {history.previous_material_name || 'N/A'}
                              </p>
                              <p>
                                <span className="font-medium">Quantity:</span>{' '}
                                {history.previous_quantity ?? 'N/A'}
                              </p>
                              <p>
                                <span className="font-medium">Unit Cost:</span>{' '}
                                {history.previous_unit_cost
                                  ? `₦${history.previous_unit_cost.toFixed(2)}`
                                  : 'N/A'}
                              </p>
                              <p>
                                <span className="font-medium">Total Cost:</span>{' '}
                                {history.previous_total_cost
                                  ? `₦${history.previous_total_cost.toFixed(2)}`
                                  : 'N/A'}
                              </p>
                              {history.previous_paper_size && (
                                <p>
                                  <span className="font-medium">Size:</span>{' '}
                                  {history.previous_paper_size}
                                </p>
                              )}
                              {history.previous_paper_type && (
                                <p>
                                  <span className="font-medium">Type:</span>{' '}
                                  {history.previous_paper_type}
                                </p>
                              )}
                              {history.previous_grammage && (
                                <p>
                                  <span className="font-medium">Grammage:</span>{' '}
                                  {history.previous_grammage}g
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">
                              New Values
                            </h4>
                            <div className="space-y-1 text-gray-600">
                              <p>
                                <span className="font-medium">Material:</span>{' '}
                                {history.new_material_name || 'N/A'}
                              </p>
                              <p>
                                <span className="font-medium">Quantity:</span>{' '}
                                {history.new_quantity ?? 'N/A'}
                              </p>
                              <p>
                                <span className="font-medium">Unit Cost:</span>{' '}
                                {history.new_unit_cost
                                  ? `₦${history.new_unit_cost.toFixed(2)}`
                                  : 'N/A'}
                              </p>
                              <p>
                                <span className="font-medium">Total Cost:</span>{' '}
                                {history.new_total_cost
                                  ? `₦${history.new_total_cost.toFixed(2)}`
                                  : 'N/A'}
                              </p>
                              {history.new_paper_size && (
                                <p>
                                  <span className="font-medium">Size:</span>{' '}
                                  {history.new_paper_size}
                                </p>
                              )}
                              {history.new_paper_type && (
                                <p>
                                  <span className="font-medium">Type:</span>{' '}
                                  {history.new_paper_type}
                                </p>
                              )}
                              {history.new_grammage && (
                                <p>
                                  <span className="font-medium">Grammage:</span>{' '}
                                  {history.new_grammage}g
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {hasChanges && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(history.id)}
                      className="ml-2"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Show Details
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
