import { NextResponse } from 'next/server';
import TrackLog from '@/app/models/TrackLog';
import dbConnect from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'TaskId is required' }, { status: 400 });
    }

    const logs = await TrackLog.find({ taskId })
      .sort({ date: -1 })
      .limit(30); // Get last 30 days of logs

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching track logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch track logs' },
      { status: 500 }
    );
  }
} 