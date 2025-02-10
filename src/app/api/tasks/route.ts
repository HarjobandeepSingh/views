import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/app/models/Task';

export async function POST(request: Request) {
  try {
    const conn = await dbConnect();
    console.log('MongoDB connected:', conn.connection.readyState === 1);
    
    const body = await request.json();
    
    // Validate and clean the input data
    const taskName = body.taskName?.trim();
    const personName = body.personName?.trim();
    const keywords = body.keywords?.trim();

    if (!taskName || !personName || !keywords) {
      return NextResponse.json(
        { error: 'All fields are required and cannot be empty' },
        { status: 400 }
      );
    }

    // Create the task with validated data
    const task = await Task.create({
      taskName,
      personName,
      keywords,
      dateAdded: new Date(),
      lastChecked: new Date(),
      status: 'active'
    });

    console.log('Task created successfully:', task);

    return NextResponse.json({
      success: true,
      task: {
        id: task._id,
        taskName: task.taskName,
        personName: task.personName,
        keywords: task.keywords,
        dateAdded: task.dateAdded.toISOString(),
        lastChecked: task.lastChecked.toISOString(),
        status: task.status
      }
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();
    const tasks = await Task.find({}).sort({ dateAdded: -1 });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
} 