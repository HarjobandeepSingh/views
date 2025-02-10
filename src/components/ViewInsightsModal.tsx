import React, { useEffect, useState } from 'react';
import { ChartBarIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface ViewHistory {
  date: string;
  views: number;
  change: number; // Positive for increase, negative for decrease
}

interface TaskInsights {
  id: string;
  taskName: string;
  keyword: string;
  dateAdded: string;
  lastChecked: string;
  status: string;
  // Add any additional metrics you want to show
  totalViews?: number;
  totalGifs?: number;
  difficulty?: number;
  cpc?: number;
  viewHistory?: ViewHistory[];
}

interface TrackLog {
  date: string;
  keywordMetrics: {
    keyword: string;
    metrics: {
      views: number;
      totalGifs: number;
      difficulty: number;
      cpc: number;
      volume: string;
    };
  }[];
}

interface ViewInsightsModalProps {
  task: TaskInsights;
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewInsightsModal({ task, isOpen, onClose }: ViewInsightsModalProps) {
  const [logs, setLogs] = useState<TrackLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!isOpen || !task) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/track-logs?taskId=${task.id}`);
        if (!response.ok) throw new Error('Failed to fetch logs');
        const data = await response.json();
        setLogs(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch logs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [isOpen, task]);

  const handleRowClick = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-black">Task Insights</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-4 text-black">Loading...</div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-black mb-2">Task Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700">Task Name</p>
                    <p className="font-medium text-black">{task.taskName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Keyword</p>
                    <p className="font-medium text-black">{task.keyword}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-black mb-4">Tracking History</h4>
                {logs.map((log, index) => (
                  <div 
                    key={index}
                    className="border rounded-lg overflow-hidden transition-all duration-200 ease-in-out"
                  >
                    {/* Summary Row */}
                    <div 
                      onClick={() => handleRowClick(index)}
                      className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-black font-medium">
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                        <span className="text-gray-700">
                          {log.keywordMetrics.length} keywords tracked
                        </span>
                      </div>
                      <ChevronDownIcon 
                        className={`h-5 w-5 text-gray-500 transition-transform duration-200 
                          ${expandedIndex === index ? 'transform rotate-180' : ''}`}
                      />
                    </div>

                    {/* Expanded Details - With custom scrollbar */}
                    <div 
                      className={`transition-all duration-200 ease-in-out overflow-hidden
                        ${expandedIndex === index ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="p-4 bg-gray-50">
                        <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4
                          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
                          hover:scrollbar-thumb-gray-400">
                          {log.keywordMetrics.map((km, kIndex) => (
                            <div key={kIndex} 
                              className="border-t first:border-t-0 pt-4 first:pt-0 bg-white rounded-lg p-4 shadow-sm">
                              <p className="font-medium text-black mb-2">{km.keyword}</p>
                              <div className="grid grid-cols-2 gap-4 text-sm text-black">
                                <div>Views: {km.metrics.views.toLocaleString()}</div>
                                <div>GIFs: {km.metrics.totalGifs.toLocaleString()}</div>
                                <div>Difficulty: {km.metrics.difficulty}%</div>
                                <div>CPC: ${km.metrics.cpc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 