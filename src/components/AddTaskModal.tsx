import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (taskName: string, personName: string, keywords: string) => void;
}

export default function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
  const [taskName, setTaskName] = useState('');
  const [personName, setPersonName] = useState('');
  const [keywords, setKeywords] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskName.trim() && personName.trim() && keywords.trim()) {
      onAdd(taskName.trim(), personName.trim(), keywords.trim());
      setTaskName('');
      setPersonName('');
      setKeywords('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Add New Tracking Tasks
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="taskName" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Task Name
              </label>
              <input
                type="text"
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter task name..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 
                         focus:ring-2 focus:ring-indigo-500 focus:border-transparent 
                         shadow-sm text-gray-900"
                required
              />
            </div>

            <div>
              <label htmlFor="personName" className="block text-sm font-medium text-gray-700 mb-1">
                Person Name
              </label>
              <input
                type="text"
                id="personName"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm text-gray-900"
                required
              />
            </div>

            <div>
              <label 
                htmlFor="keywords" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Keywords to Track
              </label>
              <textarea
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Enter keywords separated by commas (e.g., happy cats, funny dogs, cute pets)"
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 
                         focus:ring-2 focus:ring-indigo-500 focus:border-transparent 
                         shadow-sm text-gray-900"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Add multiple keywords by separating them with commas
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 
                         bg-gray-50 rounded-lg hover:bg-gray-100 
                         transition-colors border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white 
                         bg-indigo-600 rounded-lg hover:bg-indigo-700 
                         transition-colors"
              >
                Add Tasks
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 