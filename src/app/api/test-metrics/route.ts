import { NextResponse } from 'next/server';
import axios from 'axios';
import PQueue from 'p-queue';
import TrackLog from '@/app/models/TrackLog';
import dbConnect from '@/lib/mongodb';

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
    return response.data?.viewCount || 0;
  } catch (error) {
    return 0;
  }
}

async function getKeywordMetrics(keyword: string) {
  let offset = 0;
  let totalViews = 0;
  let totalGifs = 0;
  let sampledGifs = 0;
  let batchViews = 0;

  while (totalGifs < MAX_GIFS_PER_KEYWORD) {
    const gifs = await queue.add(() => fetchGifData(keyword, offset));
    if (gifs.length === 0) break;

    totalGifs += gifs.length;
    
    for (const gif of gifs.slice(0, SAMPLE_SIZE)) {
      const viewCount = await queue.add(() => fetchGifViewCount(gif.id));
      batchViews += viewCount;
      sampledGifs++;
    }
    
    offset += 50;
    if (offset >= MAX_GIFS_PER_KEYWORD) break;
  }

  const averageViewsPerGif = sampledGifs > 0 ? batchViews / sampledGifs : 0;
  totalViews = Math.round(averageViewsPerGif * totalGifs);

  // Calculate difficulty and CPC using the same formula as keywords route
  const viewsScore = Math.log10(totalViews + 1) / 7;
  const gifsScore = Math.log10(totalGifs + 1) / 3;
  const difficulty = Math.round(Math.min(100, ((viewsScore * 60) + (gifsScore * 40))));
  const cpc = Number((0.05 + (difficulty * 0.095)).toFixed(2));
  
  // Calculate volume category
  const volume = totalViews > 1000000000 ? "1B+" :
                totalViews > 1000000 ? "1M+" :
                totalViews > 500000 ? "500K+" :
                totalViews > 100000 ? "100K+" :
                totalViews > 10000 ? "10K+" : "<10K";

  return {
    views: totalViews,
    totalGifs,
    difficulty,
    cpc,
    volume
  };
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { keyword, taskId } = body;

    if (!keyword || !taskId) {
      return NextResponse.json(
        { error: 'Keyword and taskId are required' }, 
        { status: 400 }
      );
    }

    // Split keywords by comma and trim whitespace
    const keywords = keyword.split(',').map(k => k.trim()).filter(k => k.length > 0);

    // Get metrics for all keywords
    const keywordMetricsPromises = keywords.map(async (keyword) => {
      const metrics = await getKeywordMetrics(keyword);
      return {
        keyword,
        metrics: {
          views: metrics.views,
          totalGifs: metrics.totalGifs,
          difficulty: metrics.difficulty,
          cpc: metrics.cpc,
          volume: metrics.volume
        }
      };
    });

    const keywordMetrics = await Promise.all(keywordMetricsPromises);
    
    // Save all keyword metrics in a single log
    const log = await TrackLog.create({
      taskId,
      date: new Date(),
      keywordMetrics
    });

    return NextResponse.json({
      success: true,
      log: {
        date: log.date,
        keywordMetrics: log.keywordMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching/saving metrics:', error);
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    );
  }
} 