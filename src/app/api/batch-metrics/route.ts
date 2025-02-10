import { NextResponse } from 'next/server';
import Task from '@/app/models/Task';
import TrackLog from '@/app/models/TrackLog';
import dbConnect from '@/lib/mongodb';
import { getKeywordMetrics } from '../test-metrics/route';

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