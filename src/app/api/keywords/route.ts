import { NextResponse } from 'next/server';
import axios from 'axios';
import PQueue from 'p-queue';

interface GiphyGif {
  id: string;
}

interface KeywordData {
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

const VIEW_COUNT_API_URL = 'https://giphy.com/api/v1/proxy-gif';
const RATE_LIMIT_DELAY = 50;
const CONCURRENT_REQUESTS = 10;
const MAX_GIFS_PER_KEYWORD = 500;
const SAMPLE_SIZE = 3;

const queue = new PQueue({ concurrency: CONCURRENT_REQUESTS });
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchGifData(keyword: string, offset = 0) {
  try {
    await delay(RATE_LIMIT_DELAY);
    const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        q: keyword,
        api_key: process.env.GIPHY_API_KEY,
        limit: 50,
        offset,
      },
      timeout: 5000,
    });
    
    return response.data?.data || [];
  } catch (error) {
    console.error(`Error fetching GIFs for ${keyword}:`, error);
    return [];
  }
}

async function fetchGifViewCount(giphy_id: string): Promise<number> {
  try {
    const response = await axios.get(`${VIEW_COUNT_API_URL}/${giphy_id}/view-count/`);
    if (!response.data || typeof response.data.viewCount === 'undefined') {
      return 0;
    }
    return response.data.viewCount;
  } catch (error) {
    return 0;
  }
}

async function getKeywordMetrics(keyword: string): Promise<{
  totalViews: number;
  totalGifs: number;
}> {
  let offset = 0;
  let totalViews = 0;
  let totalGifs = 0;
  let sampledGifs = 0;
  let batchViews = 0;

  while (totalGifs < MAX_GIFS_PER_KEYWORD) {
    const gifs = await queue.add(() => fetchGifData(keyword, offset));
    if (gifs.length === 0) break;

    totalGifs += gifs.length;
    
    // Sample fewer GIFs
    for (const gif of gifs.slice(0, SAMPLE_SIZE)) {
      const viewCount = await queue.add(() => fetchGifViewCount(gif.id));
      batchViews += viewCount;
      sampledGifs++;
    }
    
    offset += 50;
    
    // Break if we've sampled enough
    if (offset >= MAX_GIFS_PER_KEYWORD) break;
  }

  if (sampledGifs > 0) {
    const averageViewsPerGif = batchViews / sampledGifs;
    totalViews = Math.round(averageViewsPerGif * totalGifs);
  }

  return { totalViews, totalGifs };
}

function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// Add this helper function to calculate trend
function calculateTrend(currentViews: number, avgViews: number): 'up' | 'down' | 'stable' {
  const difference = ((currentViews - avgViews) / avgViews) * 100;
  
  if (difference > 20) {
    return 'up';
  } else if (difference < -20) {
    return 'down';
  } else {
    return 'stable';
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const limit = Number(searchParams.get('limit')) || 20;

  if (!keyword) {
    return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
  }

  try {
    // Split the keyword into individual terms
    const terms = keyword.toLowerCase().split(/\s+/);
    const mainTerm = terms[0]; // Use the first term for initial search

    // First try to get search tags using the main term
    const tagsResponse = await fetch(
      `https://api.giphy.com/v1/gifs/search/tags?api_key=${process.env.GIPHY_API_KEY}&q=${encodeURIComponent(mainTerm)}&limit=${limit * 2}`,
      {
        headers: {
          'Accept': '*/*',
          'Referer': 'https://giphy.com/',
        }
      }
    );

    if (!tagsResponse.ok) {
      throw new Error(`Failed to fetch tags: ${tagsResponse.status}`);
    }

    const tagsData = await tagsResponse.json();
    
    if (!tagsData.data || !tagsData.data.length) {
      return NextResponse.json({ 
        results: [],
        message: 'No keywords found for the given search term'
      });
    }

    // Filter tags that contain all search terms
    const filteredTags = tagsData.data
      .filter((tag: { name: string }) => {
        const tagTerms = tag.name.toLowerCase().split(/\s+/);
        return terms.every(term => 
          tagTerms.some(tagTerm => tagTerm.includes(term) || term.includes(tagTerm))
        );
      })
      .slice(0, limit);

    // If no matching tags found, try searching with the full keyword
    if (filteredTags.length === 0) {
      filteredTags.push({ name: keyword });
    }

    // Get metrics for filtered tags
    const keywordsMetrics = await Promise.all(
      filteredTags.map(async (tag: { name: string }) => {
        const metrics = await getKeywordMetrics(tag.name);
        return metrics;
      })
    );

    // Calculate average views
    const totalViews = keywordsMetrics.reduce((sum, metric) => sum + metric.totalViews, 0);
    const averageViews = totalViews / keywordsMetrics.length;

    // Create final keyword data
    const keywords = keywordsMetrics.map((metrics, index) => {
      const viewsScore = Math.log10(metrics.totalViews + 1) / 7;
      const gifsScore = Math.log10(metrics.totalGifs + 1) / 3;
      
      const difficulty = Math.round(
        Math.min(100, ((viewsScore * 60) + (gifsScore * 40)))
      );

      const cpc = Number((0.05 + (difficulty * 0.095)).toFixed(2));

      return {
        keyword: filteredTags[index].name,
        totalViews: metrics.totalViews,
        totalGifs: metrics.totalGifs,
        formattedViews: formatNumber(metrics.totalViews),
        formattedGifs: formatNumber(metrics.totalGifs),
        volume: metrics.totalViews > 1000000000 ? "1B+" :
               metrics.totalViews > 1000000 ? "1M+" :
               metrics.totalViews > 500000 ? "500K+" :
               metrics.totalViews > 100000 ? "100K+" :
               metrics.totalViews > 10000 ? "10K+" : "<10K",
        difficulty,
        cpc,
        trend: calculateTrend(metrics.totalViews, averageViews)
      };
    });

    return NextResponse.json(keywords);
  } catch (error) {
    console.error('Error in keyword search:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch keywords',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}