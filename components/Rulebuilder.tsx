"use client";

import { useState } from "react";
import axios from "axios";
import { Dispatch, SetStateAction } from "react";

export default function RuleBuilder({
  clients = [],
  workers = [],
  tasks = [],
  setClientsData,
  setWorkersData,
  setTasksData,
}: {
  clients?: any[];
  workers?: any[];
  tasks?: any[];
  setClientsData: Dispatch<SetStateAction<any[]>>;
  setWorkersData: Dispatch<SetStateAction<any[]>>;
  setTasksData: Dispatch<SetStateAction<any[]>>;
}) {
  const [rules, setRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({
    type: "co-run",
    conditionKey: "",
    conditionValue: "",
    notWithKey: "",
    notWithValues: "",
    weight: 50,
  });
  const [nlRule, setNlRule] = useState("");
  const [nlCommand, setNlCommand] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [fixes, setFixes] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState({ rules: false, suggestions: false, fix: false });

  async function getSuggestions() {
    setLoading((s) => ({ ...s, suggestions: true }));
    const res = await axios.post("/api/rule-suggestions", { clients, workers, tasks });
    setSuggestions(res.data.suggestions || []);
    setLoading((s) => ({ ...s, suggestions: false }));
  }

  async function applyFixes() {
    setLoading((s) => ({ ...s, fix: true }));
    const res = await axios.post("/api/ai-fix-suggestions", { clients, workers, tasks, errors });
    setFixes(res.data.fixes || []);
    setLoading((s) => ({ ...s, fix: false }));
  }

  async function applyNaturalCommand() {
    const res = await axios.post("/api/nl-modify", {
      clients,
      workers,
      tasks,
      command: nlCommand,
    });

    if (res.data.clients) setClientsData(res.data.clients);
    if (res.data.workers) setWorkersData(res.data.workers);
    if (res.data.tasks) setTasksData(res.data.tasks);

    alert("AI modification applied successfully.");
  }

  async function convertNLToRule() {
    const res = await axios.post("/api/nl-to-rule", { text: nlRule });
    if (res.data.rule) setRules((prev) => [...prev, res.data.rule]);
  }

  function addRule() {
    const rule = {
      type: newRule.type,
      conditions: {
        [newRule.conditionKey]: newRule.conditionValue,
      },
      notWith: {
        [newRule.notWithKey]: newRule.notWithValues.split(",").map((s) => s.trim()),
      },
      weight: newRule.weight,
    };
    setRules([...rules, rule]);
    setNewRule({
      type: "co-run",
      conditionKey: "",
      conditionValue: "",
      notWithKey: "",
      notWithValues: "",
      weight: 50,
    });
  }

  function exportRules() {
    const blob = new Blob([JSON.stringify({ rules }, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "rules.json";
    link.click();
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">🧠 Rule Builder</h2>

      {/* Manual Rule Input */}
      <div className="grid grid-cols-2 gap-2">
        <label>Condition Key</label>
        <input
          className="p-1 border rounded"
          value={newRule.conditionKey}
          onChange={(e) => setNewRule({ ...newRule, conditionKey: e.target.value })}
        />
        <label>Condition Value</label>
        <input
          className="p-1 border rounded"
          value={newRule.conditionValue}
          onChange={(e) => setNewRule({ ...newRule, conditionValue: e.target.value })}
        />
        <label>Not With Key</label>
        <input
          className="p-1 border rounded"
          value={newRule.notWithKey}
          onChange={(e) => setNewRule({ ...newRule, notWithKey: e.target.value })}
        />
        <label>Not With Values</label>
        <input
          className="p-1 border rounded"
          value={newRule.notWithValues}
          onChange={(e) => setNewRule({ ...newRule, notWithValues: e.target.value })}
        />
      </div>

      <button onClick={addRule} className="bg-green-600 text-white px-4 py-2 rounded">
        ➕ Add Rule
      </button>

      {/* Rule Suggestions */}
      <button onClick={getSuggestions} className="bg-purple-600 text-white px-4 py-2 rounded">
        💡 Get Suggestions
      </button>
      <ul>{suggestions.map((s, i) => (<li key={i}>{s.hint}</li>))}</ul>

      {/* NL Rule Input */}
      <textarea
        placeholder="Type rule in English"
        value={nlRule}
        onChange={(e) => setNlRule(e.target.value)}
        className="w-full border p-2 rounded"
      />
      <button onClick={convertNLToRule} className="bg-indigo-600 text-white px-4 py-2 rounded">
        ✨ Convert to Rule
      </button>

      {/* NL Data Modification */}
      <textarea
        placeholder="e.g. Change priority 1 to priority 3"
        value={nlCommand}
        onChange={(e) => setNlCommand(e.target.value)}
        className="w-full border p-2 rounded"
      />
      <button onClick={applyNaturalCommand} className="bg-orange-600 text-white px-4 py-2 rounded">
        🛠 Apply Command
      </button>

      {/* Error Correction */}
      <button onClick={applyFixes} className="bg-red-600 text-white px-4 py-2 rounded">
        🔧 Suggest Fixes
      </button>
      <ul>{fixes.map((f, i) => (<li key={i}>{f}</li>))}</ul>

      <button onClick={exportRules} className="bg-blue-600 text-white px-4 py-2 rounded">
        ⬇️ Export rules.json
      </button>

      <pre className="bg-gray-100 p-2 text-xs overflow-auto">{JSON.stringify(rules, null, 2)}</pre>
    </div>
  );
}
