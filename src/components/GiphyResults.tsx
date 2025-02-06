'use client';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { KeywordPDF } from '@/components/KeywordPDF';
import ExportMenu from './ExportMenu';

interface GiphyResultsProps {
  results: any[];
  selectedKeywords: Set<number>;
  toggleKeyword: (index: number) => void;
  setSelectedKeywords: (keywords: Set<number>) => void;
}

export default function GiphyResults({ 
  results, 
  selectedKeywords, 
  toggleKeyword,
  setSelectedKeywords 
}: GiphyResultsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedKeywords(
              new Set(results.length === selectedKeywords.size 
                ? [] 
                : results.map((_, index) => index)
              )
            )}
            className="inline-flex items-center px-4 py-2 text-sm font-medium
                     bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 
                     transition-all duration-200 border border-gray-200"
          >
            {results.length === selectedKeywords.size ? 'Deselect All' : 'Select All'}
            <span className="ml-2 text-gray-500">({results.length})</span>
          </button>
          <span className="text-sm text-gray-600">
            {selectedKeywords.size} keywords selected
          </span>
        </div>

        <ExportMenu
          selectedCount={selectedKeywords.size}
          onExportPDF={() => {
            // Existing PDF export logic
          }}
          onExportExcel={() => {
            // Excel export logic
            const data = Array.from(selectedKeywords).map(index => results[index]);
            const csvContent = "data:text/csv;charset=utf-8," 
              + "Keyword,Views,GIFs,Difficulty,CPM\n"
              + data.map(row => {
                  return `${row.keyword},${row.totalViews},${row.totalGifs},${row.difficulty},${row.cpc}`;
                }).join("\n");
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "keyword-research.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          disabled={selectedKeywords.size === 0}
        />
      </div>

      <div className="space-y-3">
        {results.map((result, index) => (
          <div
            key={index}
            className="flex items-center space-x-4 p-4 bg-white rounded-xl
                     border border-gray-100 hover:border-gray-200 transition-colors duration-200"
          >
            <input
              type="checkbox"
              checked={selectedKeywords.has(index)}
              onChange={() => toggleKeyword(index)}
              className="w-5 h-5 text-indigo-600 rounded-lg border-gray-300
                       focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
            />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              <span className="font-medium text-gray-900">{result.keyword}</span>
              <span className="text-gray-600">Views: {result.formattedViews}</span>
              <span className="text-gray-600">GIFs: {result.formattedGifs}</span>
              <span className="text-gray-600">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    result.difficulty > 66 ? 'bg-red-500' :
                    result.difficulty > 33 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <span>Difficulty: {result.difficulty}</span>
                </div>
              </span>
              <span className="text-gray-600">CPM: ${result.cpc}</span>
            </div>
            <span className={`flex items-center gap-1 min-w-[100px] ${
              result.trend === 'up' ? 'text-green-600' :
              result.trend === 'down' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {result.trend === 'up' ? '↑ Trending' : 
               result.trend === 'down' ? '↓ Declining' : 
               '→ Stable'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 