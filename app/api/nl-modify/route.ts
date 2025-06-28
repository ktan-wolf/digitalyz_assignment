// app/api/nl-modify/route.ts
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  const { clients, workers, tasks, command } = await req.json();

  const prompt = `You are a helpful data editor. Given the dataset and a natural language command, apply the command to the data. Return a JSON object with modified "clients", "workers", or "tasks".

Command: ${command}
Clients: ${JSON.stringify(clients)}
Workers: ${JSON.stringify(workers)}
Tasks: ${JSON.stringify(tasks)}

Respond in this format:
{
  "message": "Applied: ...",
  "clients": [...],
  "workers": [...],
  "tasks": [...]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const result = completion.choices[0]?.message?.content || "";

    const json = JSON.parse(result);
    return NextResponse.json(json);
  } catch (e) {
    console.error("AI modify failed", e);
    return NextResponse.json({ error: "AI modify failed" }, { status: 500 });
  }
}
