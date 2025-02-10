import { NextResponse } from 'next/server';
import Task from '@/app/models/Task';
import TrackLog from '@/app/models/TrackLog';
import dbConnect from '@/lib/mongodb';
import { getKeywordMetrics } from '../test-metrics/route';

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    // Get all active tasks
    const activeTasks = await Task.find({ status: 'active' });
    
    // Process each task
    const results = await Promise.all(
      activeTasks.map(async (task) => {
        try {
          const metrics = await getKeywordMetrics(task.keyword);
          
          // Create log entry directly
          await TrackLog.create({
            taskId: task.id,
            date: new Date(),
            keywordMetrics: [{
              keyword: task.keyword,
              metrics
            }]
          });

          return {
            taskId: task.id,
            keyword: task.keyword,
            success: true
          };
        } catch (error) {
          return {
            taskId: task.id,
            keyword: task.keyword,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in batch metrics:', error);
    return NextResponse.json(
      { error: 'Failed to process batch metrics' },
      { status: 500 }
    );
  }
} 