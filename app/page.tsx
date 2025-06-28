// app/page.tsx
"use client";

import { useState } from "react";
import { read, utils } from "xlsx";
import RuleBuilder from "@/components/Rulebuilder";
import Link from "next/link";

export default function Home() {
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [workersData, setWorkersData] = useState<any[]>([]);
  const [tasksData, setTasksData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [aiFixes, setAiFixes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFixes, setLoadingFixes] = useState(false);

  function normalizeHeaders(headers: string[]) {
    const map: Record<string, string> = {
      clientid: "ClientID",
      clientname: "ClientName",
      prioritylevel: "PriorityLevel",
      requestedtaskids: "RequestedTaskIDs",
      grouptag: "GroupTag",
      attributesjson: "AttributesJSON",
      workerid: "WorkerID",
      workername: "WorkerName",
      skills: "Skills",
      availableslots: "AvailableSlots",
      maxloadperphase: "MaxLoadPerPhase",
      workergroup: "WorkerGroup",
      qualificationlevel: "QualificationLevel",
      taskid: "TaskID",
      taskname: "TaskName",
      category: "Category",
      duration: "Duration",
      requiredskills: "RequiredSkills",
      preferredphases: "PreferredPhases",
      maxconcurrent: "MaxConcurrent",
    };
    return headers.map((h) => map[h.toLowerCase().replace(/\s+/g, "")] || h);
  }

  function parseFile(file: File, setter: (data: any[]) => void) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let json = utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      const [rawHeaders, ...rows] = json;
      const headers = normalizeHeaders(rawHeaders as string[]);
      const formatted = rows.map((row: any[]) => {
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = row?.[i] ?? "";
        });
        return obj;
      });
      setter(formatted);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleEntityUpload(e: React.ChangeEvent<HTMLInputElement>, setter: (data: any[]) => void) {
    const file = e.target.files?.[0];
    if (file) parseFile(file, setter);
  }

  async function validateAll() {
    const newErrors: string[] = [];

    // Clients
    for (const client of clientsData) {
      for (const key in client) {
        if (client[key] === "") newErrors.push(`Empty cell in clients: ${key}`);
      }
      if (!client.ClientID) newErrors.push("ClientID missing");
      if (Number(client.PriorityLevel) < 1 || Number(client.PriorityLevel) > 5) newErrors.push(`Invalid PriorityLevel for client ${client.ClientID}`);
      try {
        JSON.parse(client.AttributesJSON);
      } catch {
        newErrors.push(`Malformed AttributesJSON for client ${client.ClientID}`);
      }
    }

    // Workers
    const workerIDs = new Set();
    for (const worker of workersData) {
      for (const key in worker) {
        if (worker[key] === "") newErrors.push(`Empty cell in workers: ${key}`);
      }
      if (!worker.WorkerID) newErrors.push("WorkerID missing");
      if (workerIDs.has(worker.WorkerID)) newErrors.push("Duplicate WorkerID: " + worker.WorkerID);
      else workerIDs.add(worker.WorkerID);

      const slots = parseArray(worker.AvailableSlots);
      if (!Array.isArray(slots) || slots.some((x) => isNaN(Number(x)))) {
        newErrors.push(`Malformed AvailableSlots for worker ${worker.WorkerID}`);
      }
      if (isNaN(Number(worker.MaxLoadPerPhase))) newErrors.push(`Invalid MaxLoadPerPhase for worker ${worker.WorkerID}`);
    }

    // Tasks
    const taskIDs = new Set();
    for (const task of tasksData) {
      for (const key in task) {
        if (task[key] === "") newErrors.push(`Empty cell in tasks: ${key}`);
      }
      if (!task.TaskID) newErrors.push("TaskID missing");
      if (taskIDs.has(task.TaskID)) newErrors.push("Duplicate TaskID: " + task.TaskID);
      else taskIDs.add(task.TaskID);

      if (Number(task.Duration) < 1) newErrors.push(`Invalid Duration for task ${task.TaskID}`);

      const preferred = parseArray(task.PreferredPhases);
      if (!Array.isArray(preferred) || preferred.some((x) => isNaN(Number(x)))) {
        newErrors.push(`Malformed PreferredPhases for task ${task.TaskID}`);
      }
    }

    setErrors(newErrors);

    // AI Fix Suggestions
    try {
      setLoadingFixes(true);
      const res = await fetch("/api/ai-fix-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients: clientsData, workers: workersData, tasks: tasksData, errors: newErrors }),
      });
      const data = await res.json();
      setAiFixes(data.fixes || []);
    } catch (e) {
      console.error("AI Fix fetch failed", e);
    } finally {
      setLoadingFixes(false);
    }
  }

  function parseArray(val: any): any[] {
    try {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        return JSON.parse(val);
      }
      return [];
    } catch {
      if (typeof val === "string") {
        return val.split(",").map((v) => v.trim());
      }
      return [];
    }
  }

  function filterData(data: any[], query: string): any[] {
    if (!query.trim()) return data;
    const lower = query.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(lower))
    );
  }

  function renderEditableTable(data: any[], setData: (d: any[]) => void) {
    if (!data.length) return null;
    const headers = Object.keys(data[0]);
    return (
      <table className="table-auto border-collapse border w-full mb-4">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="border px-2 py-1 bg-gray-100">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filterData(data, searchQuery).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((h) => (
                <td key={h} className="border px-2 py-1">
                  <input
                    value={row[h] || ""}
                    onChange={(e) => {
                      const newData = [...data];
                      newData[rowIndex][h] = e.target.value;
                      setData(newData);
                    }}
                    className="w-full border-none"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">📊 Data Alchemist</h1>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="block font-semibold">📤 Upload Your Files:</label>
          <input type="file" onChange={(e) => handleEntityUpload(e, setClientsData)} />
          <input type="file" onChange={(e) => handleEntityUpload(e, setWorkersData)} />
          <input type="file" onChange={(e) => handleEntityUpload(e, setTasksData)} />
        </div>

        <div className="text-sm text-gray-600">
          Or try with our prefilled sample files:
        </div>

        <ul className="list-disc list-inside text-blue-700 underline text-sm">
          <li><a href="/samples/clients.csv" download>Download clients.csv</a></li>
          <li><a href="/samples/workers.csv" download>Download workers.csv</a></li>
          <li><a href="/samples/tasks.csv" download>Download tasks.csv</a></li>
        </ul>
      </div>

      <button onClick={validateAll} className="bg-red-500 text-white px-4 py-2 rounded">Validate</button>

      {errors.length > 0 && (
        <div className="bg-red-100 border p-2">
          <h3 className="font-bold">Validation Errors:</h3>
          <ul>{errors.map((e, i) => (<li key={i}>{e}</li>))}</ul>
        </div>
      )}

      {aiFixes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 p-2">
          <h3 className="font-bold">AI Suggestions:</h3>
          <ul>{aiFixes.map((f, i) => (<li key={i}>{f}</li>))}</ul>
        </div>
      )}

      <input
        type="text"
        placeholder="Search (e.g. priority 5 clients)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="border p-1 rounded w-full"
      />

      {renderEditableTable(clientsData, setClientsData)}
      {renderEditableTable(workersData, setWorkersData)}
      {renderEditableTable(tasksData, setTasksData)}

      <RuleBuilder
        clients={clientsData}
        workers={workersData}
        tasks={tasksData}
        setClientsData={setClientsData}
        setWorkersData={setWorkersData}
        setTasksData={setTasksData}
      />
    </div>
  );
}
