// app/page.tsx
"use client";

import RuleBuilder from "@/components/Rulebuilder";
import { useState } from "react";
import { read, utils } from "xlsx";

export default function Home() {
  const [query, setQuery] = useState('');
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [workersData, setWorkersData] = useState<any[]>([]);
  const [tasksData, setTasksData] = useState<any[]>([]);
  const [clientsColumns, setClientsColumns] = useState<string[]>([]);
  const [workersColumns, setWorkersColumns] = useState<string[]>([]);
  const [tasksColumns, setTasksColumns] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [weights, setWeights] = useState({ coRun: 1, slotRestriction: 1, phaseWindow: 1 });
  const [rules, setRules] = useState<any[]>([]);

  function filterData(data: any[], query: string): any[] {
    if (!query.trim()) return data;
    try {
      const lower = query.toLowerCase();
      return data.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(lower))
      );
    } catch {
      return data;
    }
  }

  function normalizeHeaders(row: any, entity: 'clients' | 'workers' | 'tasks') {
    const headerMap: Record<string, string> = {
      clientid: 'ClientID', clientname: 'ClientName', priority: 'PriorityLevel',
      taskids: 'RequestedTaskIDs', group: 'GroupTag', attributes: 'AttributesJSON',
      workerid: 'WorkerID', workername: 'WorkerName', skills: 'Skills',
      availableslots: 'AvailableSlots', maxloadperphase: 'MaxLoadPerPhase',
      workergroup: 'WorkerGroup', qualificationlevel: 'QualificationLevel',
      taskid: 'TaskID', taskname: 'TaskName', category: 'Category',
      duration: 'Duration', requiredskills: 'RequiredSkills',
      preferredphases: 'PreferredPhases', maxconcurrent: 'MaxConcurrent'
    };
    const normalized: any = {};
    for (const key in row) {
      const mappedKey = headerMap[key.toLowerCase()] || key;
      normalized[mappedKey] = row[key];
    }
    return normalized;
  }

  function handleEntityUpload(e: React.ChangeEvent<HTMLInputElement>, entity: 'clients' | 'workers' | 'tasks') {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      let workbook = ext === "csv"
        ? read(data as string, { type: "string" })
        : read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = utils.sheet_to_json(sheet);
      const json = raw.map((row) => normalizeHeaders(row, entity));

      switch (entity) {
        case 'clients': setClientsData(json); setClientsColumns(Object.keys(json[0] || {})); break;
        case 'workers': setWorkersData(json); setWorkersColumns(Object.keys(json[0] || {})); break;
        case 'tasks': setTasksData(json); setTasksColumns(Object.keys(json[0] || {})); break;
      }
    };

    ext === "csv" ? reader.readAsText(file) : reader.readAsBinaryString(file);
  }

  function isValidJson(jsonString: string) {
    try { return typeof JSON.parse(jsonString) === 'object'; } catch { return false; }
  }

  function validateClients(data: any[]) {
    const issues: string[] = [];
    const seenIDs = new Set();

    for (const [i, row] of data.entries()) {
      const rowLabel = `Clients Row ${i + 1}`;
      if (!row.ClientID) issues.push(`${rowLabel} is missing ClientID.`);
      if (row.ClientID && seenIDs.has(row.ClientID)) issues.push(`${rowLabel} has duplicate ClientID '${row.ClientID}'.`);
      seenIDs.add(row.ClientID);

      if (row.PriorityLevel && (isNaN(row.PriorityLevel) || row.PriorityLevel < 1 || row.PriorityLevel > 5)) {
        issues.push(`${rowLabel}: PriorityLevel should be between 1 and 5.`);
      }

      if (row.RequestedTaskIDs && typeof row.RequestedTaskIDs === 'string' && row.RequestedTaskIDs.split(',').some((id: string) => id.trim() === '')) {
        issues.push(`${rowLabel}: RequestedTaskIDs contains empty values.`);
      }

      if (row.AttributesJSON && typeof row.AttributesJSON === 'string' && !isValidJson(row.AttributesJSON)) {
        issues.push(`${rowLabel}: AttributesJSON is not valid JSON.`);
      }
    }

    setErrors(issues);
  }

  function handleEdit(entity: 'clients' | 'workers' | 'tasks', rowIndex: number, column: string, value: string) {
    const update = (data: any[], setData: any) => {
      const newData = [...data];
      newData[rowIndex] = { ...newData[rowIndex], [column]: value };
      setData(newData);
    };
    if (entity === 'clients') update(clientsData, setClientsData);
    if (entity === 'workers') update(workersData, setWorkersData);
    if (entity === 'tasks') update(tasksData, setTasksData);
  }

  function renderEditableTable(data: any[], columns: string[], entity: 'clients' | 'workers' | 'tasks') {
    const filtered = filterData(data, query);
    return (
      <table className="min-w-full text-sm text-left border mb-2">
        <thead className="bg-gray-200">
          <tr>{columns.map(col => <th key={col} className="px-2 py-1 border">{col}</th>)}</tr>
        </thead>
        <tbody>
          {filtered.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-white even:bg-gray-100">
              {columns.map(col => (
                <td key={col} className="px-2 py-1 border">
                  <input
                    className="w-full p-1 border rounded"
                    value={row[col] || ''}
                    onChange={(e) => handleEdit(entity, rowIndex, col, e.target.value)}
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
    <main className="p-4 space-y-8">
      <h1 className="text-2xl font-bold">📥 Data Alchemist Upload</h1>

      <input
        type="text"
        placeholder="🔎 Search data naturally, e.g. 'priority 5 clients'"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full p-2 border rounded shadow mb-4"
      />

      {['clients', 'workers', 'tasks'].map(entity => (
        <section key={entity}>
          <h2 className="font-semibold">Upload {entity.charAt(0).toUpperCase() + entity.slice(1)} File</h2>
          <input type="file" accept=".csv, .xlsx" onChange={(e) => handleEntityUpload(e, entity as any)} />
        </section>
      ))}

      {errors.length > 0 && (
        <div className="bg-red-100 text-red-800 p-2 rounded">
          <h2 className="font-bold">Validation Errors</h2>
          <ul className="list-disc pl-4">{errors.map((err, idx) => <li key={idx}>{err}</li>)}</ul>
        </div>
      )}

      {clientsData.length > 0 && (
        <div>
          <h3 className="font-semibold">Clients (Editable)</h3>
          {renderEditableTable(clientsData, clientsColumns, 'clients')}
          <button onClick={() => validateClients(clientsData)} className="bg-blue-600 text-white px-4 py-2 rounded">✅ Validate Clients</button>
        </div>
      )}

      {workersData.length > 0 && (
        <div>
          <h3 className="font-semibold">Workers (Editable)</h3>
          {renderEditableTable(workersData, workersColumns, 'workers')}
          <button onClick={() => validateClients(workersData)} className="bg-blue-600 text-white px-4 py-2 rounded">✅ Validate Workers</button>
        </div>
      )}

      {tasksData.length > 0 && (
        <div>
          <h3 className="font-semibold">Tasks (Editable)</h3>
          {renderEditableTable(tasksData, tasksColumns, 'tasks')}
          <button onClick={() => validateClients(tasksData)} className="bg-blue-600 text-white px-4 py-2 rounded">✅ Validate Tasks</button>
        </div>
      )}

      <RuleBuilder
        clients={clientsData}
        workers={workersData}
        tasks={tasksData}
        setClientsData={setClientsData}
        setWorkersData={setWorkersData}
        setTasksData={setTasksData}
      />
    </main>
  );
}
