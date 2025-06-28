// --- 📁 app/api/nl-to-rule/route.ts ---
import { NextResponse } from "next/server";
import OpenAI from "openai";


// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function POST(req: Request) {
//   const { text } = await req.json();

//   const prompt = `You are a rule converter. Convert the following natural language statement into a JSON rule object.
// Example:
// "Tasks of category Surgery must not run with tasks of category ICU" =>
// {
//   "type": "co-run",
//   "conditions": { "Category": "Surgery" },
//   "notWith": { "Category": ["ICU"] },
//   "weight": 50
// }

// Statement: ${text}
// JSON:`;

//   const completion = await openai.chat.completions.create({
//     model: "gpt-4",
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.2,
//   });

//   const raw = completion.choices?.[0]?.message?.content || "";

//   try {
//     const rule = JSON.parse(raw);
//     return NextResponse.json({ rule });
//   } catch (e) {
//     return NextResponse.json({ error: "Invalid rule format from AI." }, { status: 400 });
//   }
// }

// export async function POST(req: Request) {
//     const { text } = await req.json();
  
//     // Basic keyword-based mock logic
//     let rule = null;
  
//     if (text.toLowerCase().includes("surgery") && text.toLowerCase().includes("icu")) {
//       rule = {
//         type: "co-run",
//         conditions: { Category: "Surgery" },
//         notWith: { Category: ["ICU"] },
//         weight: 50,
//       };
//     } else if (text.toLowerCase().includes("sales") && text.toLowerCase().includes("max load")) {
//       rule = {
//         type: "load-limit",
//         WorkerGroup: "Sales",
//         maxSlotsPerPhase: 2,
//         weight: 40,
//       };
//     } else {
//       // fallback mock
//       rule = {
//         type: "co-run",
//         conditions: { Tag: "Example" },
//         notWith: { Tag: ["OtherExample"] },
//         weight: 50,
//       };
//     }
  
//     return NextResponse.json({ rule });
//   }


// --- 📁 app/api/nl-to-rule/route.ts ---

// app/api/nl-to-rule/route.ts

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: Request) {
  const { text } = await req.json();

  const prompt = `You are a rule converter. Convert the following natural language statement into a JSON rule object.
Example:
"Tasks of category Surgery must not run with tasks of category ICU" =>
{
  "type": "co-run",
  "conditions": { "Category": "Surgery" },
  "notWith": { "Category": ["ICU"] },
  "weight": 50
}

Statement: ${text}
JSON:`.slice(0, 8000);

  const completion = await groq.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const content = completion.choices?.[0]?.message?.content || "";

  // 👇 Extract valid JSON block from response using RegExp
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json({ error: "No JSON object found in AI response." }, { status: 400 });
  }

  try {
    const rule = JSON.parse(match[0]);
    return NextResponse.json({ rule });
  } catch (e) {
    return NextResponse.json({ error: "Invalid rule format from AI." }, { status: 400 });
  }
}

