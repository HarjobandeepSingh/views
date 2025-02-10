import { NextResponse } from 'next/server';
import Task from '@/app/models/Task';
import TrackLog from '@/app/models/TrackLog';
import dbConnect from '@/lib/mongodb';
import axios from 'axios';
import PQueue from 'p-queue';

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
    const gifs = await fetchGifData(keyword, offset);
    if (!gifs.length) break;

    totalGifs += gifs.length;
    const sampleGifs = gifs.slice(0, SAMPLE_SIZE);
    
    const viewCounts = await Promise.all(
      sampleGifs.map(gif => queue.add(() => fetchGifViewCount(gif.id)))
    );
    
    batchViews = viewCounts.reduce((sum, count) => sum + count, 0);
    totalViews += batchViews;
    sampledGifs += sampleGifs.length;
    
    offset += 50;
  }

  const averageViews = sampledGifs > 0 ? Math.round(totalViews / sampledGifs) : 0;
  const viewsScore = Math.log10(averageViews + 1) / 7;
  const gifsScore = Math.log10(totalGifs + 1) / 3;
  const difficulty = Math.round(Math.min(100, ((viewsScore * 60) + (gifsScore * 40))));
  const cpc = Number((0.05 + (difficulty * 0.095)).toFixed(2));
  const volume = averageViews > 1000000000 ? "1B+" :
                averageViews > 1000000 ? "1M+" :
                averageViews > 500000 ? "500K+" :
                averageViews > 100000 ? "100K+" :
                averageViews > 10000 ? "10K+" : "<10K";

  return {
    views: averageViews,
    totalGifs,
    difficulty,
    cpc,
    volume
  };
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Get all active tasks
    const activeTasks = await Task.find({ status: 'active' });

    if (!activeTasks || activeTasks.length === 0) {
      return NextResponse.json({ message: 'No active tasks found' }, { status: 200 });
    }
    
    // Process each task
    const results = await Promise.all(
      activeTasks.map(async (task) => {
        try {
          // Split keywords and process each one
          const keywords = task.keywords.split(',').map(k => k.trim());
          const keywordMetrics = await Promise.all(
            keywords.map(async (keyword) => {
              const metrics = await getKeywordMetrics(keyword);
              return {
                keyword,
                metrics
              };
            })
          );

          // Create log entry
          await TrackLog.create({
            taskId: task.id,
            date: new Date(),
            keywordMetrics
          });

          return {
            taskId: task.id,
            keyword: task.keywords,
            success: true
          };
        } catch (error) {
          console.error(`Error processing task ${task.id}:`, error);
          return {
            taskId: task.id,
            keyword: task.keywords || 'unknown',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return NextResponse.json({
      message: 'Batch processing completed',
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Error in batch metrics:', error);
    return NextResponse.json(
      { error: 'Failed to process batch metrics' },
      { status: 500 }
    );
  }
} 