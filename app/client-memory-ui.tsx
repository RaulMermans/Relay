"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import type { ChangeTarget } from "../lib/change-intelligence/types";
import type { ClientMemory, ReportSection } from "../lib/persistence/types";

export function FirstClient({
  invalidMemory,
  onCreate,
  onReset,
}: {
  invalidMemory: boolean;
  onCreate: (name: string) => void;
  onReset: () => void;
}) {
  const [name, setName] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim()) onCreate(name.trim());
  }
  return (
    <main className="memory-onboarding">
      <div className="onboarding-mark" aria-hidden="true">R</div>
      <section aria-labelledby="client-onboarding-heading">
        <p className="eyebrow">Browser-only client memory</p>
        <h1 id="client-onboarding-heading">Who are you reporting for?</h1>
        <p>Create a local client workspace. Relay will remember configuration and compact dashboard history in this browser—never uploaded CSV files or provider credentials.</p>
        {invalidMemory ? <div className="workspace-error" role="alert"><strong>Local Relay data needs a reset</strong><p>The saved browser data is corrupt or from an unsupported version.</p><button type="button" className="text-action" onClick={onReset}>Reset local Relay data</button></div> : null}
        <form onSubmit={submit} className="client-create-form">
          <label><span>Client name</span><input aria-label="Client name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Acme Skincare" required /></label>
          <button className="primary-action" type="submit">Create client</button>
        </form>
        <small>Memory stays on this device. Clearing browser/site data removes it, and another device will not see it.</small>
      </section>
    </main>
  );
}

export function ClientSelector({
  clients,
  activeClient,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  clients: ClientMemory[];
  activeClient: ClientMemory;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [rename, setRename] = useState(activeClient.name);
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
    setAdding(false);
  }
  function commitRename() {
    if (rename.trim() && rename.trim() !== activeClient.name) onRename(rename.trim());
    else setRename(activeClient.name);
  }
  return (
    <div className="client-selector">
      <label><span className="visually-hidden">Active client</span><select aria-label="Active client" value={activeClient.id} onChange={(event) => onSelect(event.target.value)}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
      <button type="button" className="client-add-action" onClick={() => setAdding((value) => !value)}>New client</button>
      <details className="client-options">
        <summary aria-label="Client options">•••</summary>
        <div>
          <label><span>Rename client</span><input aria-label="Rename client" value={rename} maxLength={80} onChange={(event) => setRename(event.target.value)} onBlur={commitRename} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
          <button type="button" className="danger-action" onClick={() => { if (window.confirm(`Delete ${activeClient.name} and all of its local Relay memory?`)) onDelete(); }}>Delete client</button>
        </div>
      </details>
      {adding ? <form className="new-client-popover" onSubmit={add}><label><span>New client name</span><input aria-label="New client name" value={newName} maxLength={80} onChange={(event) => setNewName(event.target.value)} autoFocus required /></label><button type="submit">Add client</button></form> : null}
    </div>
  );
}

const SECTION_LABELS: Record<ReportSection, string> = {
  performance: "Performance",
  what_changed: "What Changed",
  channels: "Channels",
  attention: "Attention",
  methodology: "Methodology",
};

export function ClientMemorySettings({
  client,
  onChange,
  onReset,
}: {
  client: ClientMemory;
  onChange: (client: ClientMemory) => void;
  onReset: () => void;
}) {
  const savedCpa = client.targets.find((target) => target.id === "cpa-workspace");
  const [cpaTarget, setCpaTarget] = useState(savedCpa?.value ?? "");
  const [cpaCurrency, setCpaCurrency] = useState(savedCpa?.currencyCode ?? "");
  const [note, setNote] = useState(client.attributionNotes[0]?.text ?? "");

  function persistCpa(value = cpaTarget, currency = cpaCurrency) {
    const others = client.targets.filter((target) => target.id !== "cpa-workspace");
    let targets: ChangeTarget[] = others;
    if (/^-?\d+(?:\.\d+)?$/.test(value) && /^[A-Z]{3}$/.test(currency)) {
      targets = [...others, { id: "cpa-workspace", metric: "cpa", scope: "report", operator: "<", value, unit: "currency", currencyCode: currency }];
    }
    if (!value) targets = others;
    onChange({ ...client, targets, updatedAt: new Date().toISOString() });
  }

  function persistNote() {
    const text = note.trim();
    const attributionNotes = text ? [{ id: "primary-note", text, updatedAt: new Date().toISOString() }] : [];
    onChange({ ...client, attributionNotes, updatedAt: new Date().toISOString() });
  }

  function toggleSection(section: ReportSection) {
    const current = client.reportPreferences.sections;
    const sections = current.includes(section) ? current.filter((item) => item !== section) : [...current, section];
    if (sections.length > 0) onChange({ ...client, reportPreferences: { sections }, updatedAt: new Date().toISOString() });
  }

  return (
    <details className="memory-settings">
      <summary>Client reporting memory <span>Saved in this browser</span></summary>
      <div className="memory-settings-grid">
        <section><p className="eyebrow">Targets</p><label><span>CPA target below</span><input aria-label="CPA target below" value={cpaTarget} inputMode="decimal" onChange={(event) => { const value = event.target.value; setCpaTarget(value); persistCpa(value, cpaCurrency); }} placeholder="38" /></label><label><span>Currency</span><input aria-label="CPA target currency" value={cpaCurrency} maxLength={3} onChange={(event) => { const currency = event.target.value.toUpperCase(); setCpaCurrency(currency); persistCpa(cpaTarget, currency); }} placeholder="EUR" /></label>{savedCpa ? <button type="button" className="text-action" onClick={() => { setCpaTarget(""); persistCpa("", cpaCurrency); }}>Remove target</button> : null}</section>
        <section><p className="eyebrow">Source of truth</p><strong>Shopify commerce revenue</strong><p>Meta and Google revenue remain provider-attributed context. These rules cannot be changed to an invalid source.</p></section>
        <section><p className="eyebrow">Attribution notes</p><label><span className="visually-hidden">Attribution notes</span><textarea aria-label="Attribution notes" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} onBlur={persistNote} placeholder="Optional context; notes never change calculations." /></label></section>
        <section><p className="eyebrow">Reporting preferences</p><label><span>Cadence</span><select aria-label="Reporting cadence" value={client.reporting.cadence} onChange={(event) => onChange({ ...client, reporting: { ...client.reporting, cadence: event.target.value as "weekly" | "monthly" }, updatedAt: new Date().toISOString() })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><fieldset><legend>Report sections</legend>{(Object.keys(SECTION_LABELS) as ReportSection[]).map((section) => <label key={section}><input type="checkbox" checked={client.reportPreferences.sections.includes(section)} onChange={() => toggleSection(section)} />{SECTION_LABELS[section]}</label>)}</fieldset></section>
      </div>
      <div className="memory-privacy"><strong>Browser-only memory</strong><p>Relay stores this client’s configuration and compact dashboard history only in this browser. Raw CSV files and provider credentials are not retained. No background refresh or cloud sync runs.</p><button type="button" className="danger-action" onClick={() => { if (window.confirm("Clear all local Relay clients, configuration, and dashboard history from this browser?")) onReset(); }}>Clear local Relay data</button></div>
    </details>
  );
}

export function RecentReports({ client }: { client: ClientMemory }) {
  if (client.reportHistory.length === 0) return null;
  return (
    <section className="dashboard-section history-section" aria-labelledby="history-heading">
      <div className="section-heading"><div><p className="eyebrow">Local activity</p><h2 id="history-heading">Recent reports</h2></div><span>{client.reportHistory.length}</span></div>
      <ol>{client.reportHistory.slice(0, 6).map((cycle) => <li key={cycle.id}><strong>{cycle.period.currentPeriod.start} – {cycle.period.currentPeriod.end}</strong><span>{cycle.sources.length} source{cycle.sources.length === 1 ? "" : "s"}</span><small>{cycle.healthStatus.replace("_", " ")}</small></li>)}</ol>
      <p>These are analysis-cycle summaries, not generated report artifacts.</p>
    </section>
  );
}
