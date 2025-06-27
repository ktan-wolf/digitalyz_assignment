"use client";

import { useState } from "react";
import axios from "axios";

export default function RuleBuilder({ clients = [], workers = [], tasks = [] }: { clients?: any[]; workers?: any[]; tasks?: any[] }) {
  const [rules, setRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({
    type: "co-run",
    conditionKey: "",
    conditionValue: "",
    notWithKey: "",
    notWithValues: "",
    weight: 50,
  });
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");

  async function getSuggestions() {
    try {
      setLoadingSuggestions(true);
      setSuggestionError("");
      console.log("Sending data:", { clients, workers, tasks });
  
      const res = await axios.post("/api/rule-suggestions", {
        clients,
        workers,
        tasks,
      });
  
      console.log("API response:", res.data);
  
      if (res.data?.suggestions) {
        setRules((prev) => [...prev, ...res.data.suggestions]);
      } else {
        setSuggestionError("No suggestions returned.");
      }
    } catch (err: any) {
      console.error("Error during rule suggestion:", err);
      setSuggestionError("Could not fetch suggestions. Please try again.");
    } finally {
      setLoadingSuggestions(false);
    }
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

      <div className="grid grid-cols-2 gap-2">
        <label className="font-semibold">Rule Type</label>
        <select
          value={newRule.type}
          onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
          className="p-1 border rounded"
        >
          <option value="co-run">Co-run</option>
          <option value="slot-limit">Slot Limit</option>
        </select>

        <label>Condition Key</label>
        <input
          className="p-1 border rounded"
          placeholder="e.g. Task.Category"
          value={newRule.conditionKey}
          onChange={(e) => setNewRule({ ...newRule, conditionKey: e.target.value })}
        />

        <label>Condition Value</label>
        <input
          className="p-1 border rounded"
          placeholder="e.g. Medical"
          value={newRule.conditionValue}
          onChange={(e) => setNewRule({ ...newRule, conditionValue: e.target.value })}
        />

        <label>Not With Key</label>
        <input
          className="p-1 border rounded"
          placeholder="e.g. RequiredSkills"
          value={newRule.notWithKey}
          onChange={(e) => setNewRule({ ...newRule, notWithKey: e.target.value })}
        />

        <label>Not With Values (comma separated)</label>
        <input
          className="p-1 border rounded"
          placeholder="e.g. Surgery, ICU"
          value={newRule.notWithValues}
          onChange={(e) => setNewRule({ ...newRule, notWithValues: e.target.value })}
        />

        <label>Weight</label>
        <input
          type="range"
          min={0}
          max={100}
          value={newRule.weight}
          onChange={(e) => setNewRule({ ...newRule, weight: parseInt(e.target.value) })}
        />
        <span className="text-sm">{newRule.weight}</span>
      </div>

      <button onClick={addRule} className="bg-green-600 text-white px-4 py-2 rounded">
        ➕ Add Rule
      </button>

      <button
        onClick={getSuggestions}
        disabled={loadingSuggestions}
        className="bg-purple-600 text-white px-4 py-2 rounded"
      >
        💡 {loadingSuggestions ? "Loading..." : "Suggest Rules"}
      </button>

      {suggestionError && <div className="text-red-600">{suggestionError}</div>}

      <div>
        <h3 className="font-semibold mt-4">🔍 Preview Rules</h3>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(rules, null, 2)}
        </pre>
      </div>

      <button
        onClick={exportRules}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        ⬇️ Export rules.json
      </button>
    </div>
  );
}
