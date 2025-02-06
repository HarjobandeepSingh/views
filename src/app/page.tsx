'use client';
import { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { KeywordPDF } from '@/components/KeywordPDF';
import { Range } from 'react-range';
import GiphyResults from '@/components/GiphyResults';

// Add new type for search modes
type SearchMode = 'single' | 'bulk';

// Add new type for sort options
type SortOption = 'views' | 'gifs' | 'difficulty' | 'cpm';
type SortDirection = 'asc' | 'desc';

interface KeywordResult {
  keyword: string;
  volume: string;
  difficulty: number;
  cpc: number;
  trend: 'up' | 'down' | 'stable';
  totalViews: number;
  totalGifs: number;
  formattedViews: string;
  formattedGifs: string;
}

const SkeletonLoader = () => (
  <>
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 animate-pulse mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-40 bg-gray-200 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-10 w-full max-w-[300px] bg-gray-200 rounded-lg"></div>
        </div>
        <div className="h-4 w-24 bg-gray-200 rounded-lg"></div>
      </div>
    </div>

    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div className="h-8 w-32 bg-gray-200 rounded-lg"></div>
        <div className="h-8 w-40 bg-gray-200 rounded-lg"></div>
      </div>

      <div className="space-y-3">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="flex items-center space-x-4 p-4 bg-white rounded-xl
                     border border-gray-100 animate-pulse"
          >
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-4 w-28 bg-gray-200 rounded"></div>
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  </>
);

export default function Home() {
  const [searchMode, setSearchMode] = useState<SearchMode>('single');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkKeywords, setBulkKeywords] = useState('');
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState('5');
  const [sortBy, setSortBy] = useState<SortOption>('views');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [difficultyRange, setDifficultyRange] = useState<[number, number]>([0, 100]);
  const [progress, setProgress] = useState(0);
  const [totalKeywords, setTotalKeywords] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults([]);
    setSelectedKeywords(new Set());

    try {
      if (searchMode === 'bulk') {
        const keywords = bulkKeywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);

        if (keywords.length === 0) {
          throw new Error('Please enter at least one keyword');
        }

        // Reset progress and set total keywords
        setProgress(0);
        setTotalKeywords(keywords.length);

        let allResults: KeywordResult[] = [];
        
        for (let i = 0; i < keywords.length; i++) {
          const keyword = keywords[i];
          let retryCount = 0;
          const maxRetries = 3;
          let success = false;

          while (retryCount < maxRetries && !success) {
            try {
              const response = await fetch(
                `/api/bulk-keywords?keyword=${encodeURIComponent(keyword)}&limit=50`
              );

              if (!response.ok) {
                throw new Error(`Failed to fetch data for keyword: ${keyword}`);
              }

              const data = await response.json();
              if (Array.isArray(data) && data.length > 0) {
                allResults = [...allResults, ...data];
                setResults(allResults);
                success = true;
                
                // Update progress
                setProgress(i + 1);
                
                if (i < keywords.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else {
                throw new Error(`No results for keyword: ${keyword}`);
              }
            } catch (err) {
              console.warn(
                `Attempt ${retryCount + 1}/${maxRetries} failed for "${keyword}":`,
                err
              );
              retryCount++;
              
              if (retryCount === maxRetries) {
                console.error(`Failed to process keyword after ${maxRetries} attempts:`, keyword);
              } else {
                // Exponential backoff
                await new Promise(resolve => 
                  setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 5000))
                );
              }
            }
          }
        }

        console.log(`Processed ${keywords.length} keywords`);
      } else {
        // Single keyword search - keep existing logic
        const response = await fetch(`/api/keywords?keyword=${encodeURIComponent(searchTerm)}&limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch keywords');
        
        const data = await response.json();
        setResults(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKeyword = (index: number) => {
    const newSelected = new Set(selectedKeywords);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedKeywords(newSelected);
  };

  // Add sorting function
  const sortedResults = [...results].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'views':
        comparison = a.totalViews - b.totalViews;
        break;
      case 'gifs':
        comparison = a.totalGifs - b.totalGifs;
        break;
      case 'difficulty':
        comparison = a.difficulty - b.difficulty;
        break;
      case 'cpc':
        comparison = a.cpc - b.cpc;
        break;
    }
    return sortDirection === 'desc' ? -comparison : comparison;
  }).filter(result => 
    result.difficulty >= difficultyRange[0] && 
    result.difficulty <= difficultyRange[1]
  );

  // Add this after your search form and before results
  const FilterBar = () => (
    <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border-gray-200 text-sm text-gray-900 
                     focus:ring-indigo-500 focus:border-indigo-500 
                     bg-white px-3 py-2"
          >
            <option value="views">Views</option>
            <option value="gifs">GIFs Count</option>
            <option value="difficulty">Difficulty</option>
            <option value="cpc">CPM</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium 
                     text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 
                     transition-colors duration-200"
          >
            {sortDirection === 'desc' ? '↓ Descending' : '↑ Ascending'}
          </button>
        </div>

        <div className="flex-1 px-4">
          <div className="flex flex-col gap-2 max-w-[300px]">
            <label className="text-sm font-medium text-gray-700">
              Competition Level
            </label>
            <div className="inline-flex p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setDifficultyRange([0, 100])}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                           ${difficultyRange[0] === 0 && difficultyRange[1] === 100
                             ? 'bg-white text-gray-900 shadow-sm'
                             : 'text-gray-600 hover:text-gray-900'
                           }`}
              >
                All
              </button>
              <button
                onClick={() => setDifficultyRange([0, 33])}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                           ${difficultyRange[1] <= 33
                             ? 'bg-white text-green-700 shadow-sm'
                             : 'text-gray-600 hover:text-gray-900'
                           }`}
              >
                Low
              </button>
              <button
                onClick={() => setDifficultyRange([34, 66])}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                           ${difficultyRange[0] >= 34 && difficultyRange[1] <= 66
                             ? 'bg-white text-yellow-700 shadow-sm'
                             : 'text-gray-600 hover:text-gray-900'
                           }`}
              >
                Medium
              </button>
              <button
                onClick={() => setDifficultyRange([67, 100])}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                           ${difficultyRange[0] >= 67
                             ? 'bg-white text-red-700 shadow-sm'
                             : 'text-gray-600 hover:text-gray-900'
                           }`}
              >
                High
              </button>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                </div>
                <span className="text-xs text-gray-500">Competition Level</span>
              </div>
              <span className="text-xs text-gray-500">
                {difficultyRange[0]}-{difficultyRange[1]}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{sortedResults.length}</span> results found
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="flex items-center gap-3 mb-2">
              <img 
                src="/logo.png" 
                alt="GIF Studios" 
                className="h-8 w-auto"
              />
              <h1 className="text-2xl font-bold text-gray-900">
                GIF Studios
              </h1>
            </div>
            <p className="text-gray-600 text-sm">
              GIPHY Keyword Research Tool
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="flex items-center bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setSearchMode('single')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  searchMode === 'single'
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Single Search
              </button>
              <button
                onClick={() => setSearchMode('bulk')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  searchMode === 'bulk'
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Bulk Search
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-3">
              {searchMode === 'single' ? (
                <>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search GIPHY keywords..."
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm text-gray-900"
                    />
                  </div>
                  <div className="w-36">
                    <select
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm bg-white text-gray-900"
                    >
                      <option value="5">5 results</option>
                      <option value="10">10 results</option>
                      <option value="20">20 results</option>
                      <option value="50">50 results</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <textarea
                    value={bulkKeywords}
                    onChange={(e) => setBulkKeywords(e.target.value)}
                    placeholder="Enter keywords separated by commas (e.g., hello, why, what)..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm text-gray-900"
                  />
                </div>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium h-fit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching...
                  </span>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </form>
        </div>

        {searchMode === 'bulk' && isLoading && totalKeywords > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Processing keywords... ({progress} of {totalKeywords})
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((progress / totalKeywords) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress / totalKeywords) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <SkeletonLoader />
        ) : (
          results.length > 0 && (
            <>
              <FilterBar />
              <GiphyResults
                results={sortedResults}
                selectedKeywords={selectedKeywords}
                toggleKeyword={toggleKeyword}
                setSelectedKeywords={setSelectedKeywords}
              />
            </>
          )
        )}
      </main>
    </div>
  );
}