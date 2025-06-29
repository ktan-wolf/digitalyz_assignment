export const runtime = 'nodejs'; // 👈 Required for OpenAI SDK

import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// const openaiFix = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function POST(req: Request) {
//   const { clients, workers, tasks, errors } = await req.json();

//   const prompt = `You're a smart validator. Given the following dataset and validation errors, suggest possible fixes in plain text.
// Clients: ${JSON.stringify(clients)}
// Workers: ${JSON.stringify(workers)}
// Tasks: ${JSON.stringify(tasks)}
// Errors: ${JSON.stringify(errors)}
// Fix Suggestions:`;

//   const completion = await openaiFix.chat.completions.create({
//     model: "gpt-3.5-turbo",
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.3,
//   });

//   const fixes = completion.choices?.[0]?.message?.content?.split("\n").filter(Boolean) || [];

//   return NextResponse.json({ fixes });
// 


import OpenAI from "openai"; // Groq-compatible SDK

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: Request) {
  try {
    const { clients, workers, tasks, errors } = await req.json();

    const prompt = `You're a smart validator. Given the following dataset and validation errors, suggest possible fixes in plain text.
Clients: ${JSON.stringify(clients)}
Workers: ${JSON.stringify(workers)}
Tasks: ${JSON.stringify(tasks)}
Errors: ${JSON.stringify(errors)}
Fix Suggestions:`.slice(0, 8000); // safety limit

    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const text = completion.choices?.[0]?.message?.content || "";
    const fixes = text.split("\n").filter((line) => line.trim() !== "");

    return NextResponse.json({ fixes });
  } catch (err: any) {
    console.error("Fix suggestion error:", err);
    return NextResponse.json({ error: "Failed to generate fix suggestions." }, { status: 500 });
  }
}

