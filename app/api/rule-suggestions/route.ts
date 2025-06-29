import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { tasks, clients, workers } = await req.json();

    const suggestions: any[] = [];

    // Co-run tasks in same category
    if (Array.isArray(tasks)) {
      const taskMap: Record<string, string[]> = {};

      for (const task of tasks) {
        const category = task.Category;
        if (!taskMap[category]) taskMap[category] = [];
        taskMap[category].push(task.TaskID);
      }

      for (const [category, taskIDs] of Object.entries(taskMap)) {
        if (taskIDs.length >= 2) {
          suggestions.push({
            type: 'co-run',
            hint: `Tasks in category '${category}' often run together.`,
            tasks: taskIDs.slice(0, 2),
            weight: 50,
          });
        }
      }
    }

    // Load-limit suggestion
    if (Array.isArray(workers)) {
      for (const worker of workers) {
        const slots = Array.isArray(worker.AvailableSlots)
          ? worker.AvailableSlots.length
          : 0;
        const maxLoad = Number(worker.MaxLoadPerPhase);
        if (!isNaN(maxLoad) && slots < maxLoad) {
          suggestions.push({
            type: 'load-limit',
            hint: `Worker ${worker.WorkerID} is likely overloaded.`,
            WorkerGroup: worker.WorkerGroup,
            maxSlotsPerPhase: slots,
            weight: 40,
          });
        }
      }
    }

    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error('Suggestion API Error:', e);
    return NextResponse.json({ error: 'Server error during suggestion generation.' }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ message: 'hello there' });
}
