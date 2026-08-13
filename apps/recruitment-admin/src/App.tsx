import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { hasSupabaseConfig, loadPortalConfig } from "./lib/config";
import type { Candidate, PortalConfig } from "./types";
import { ACTIONS, POSITIONS, STATUS_COLORS, STATUS_OPTIONS } from "./types";

type View = "login" | "dashboard" | "candidates" | "detail" | "templates" | "holidays";

const API = "/api";

function createClients(config: PortalConfig) {
  const supabase = createClient(config.supabaseUrl!, config.supabaseAnonKey!);
  return { supabase };
}

export default function App() {
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [stats, setStats] = useState({ attention: 0, interviews: 0, tests: 0, offers: 0 });
  const [templates, setTemplates] = useState<{ id: string; template_key: string; subject: string; body: string }[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [holidays, setHolidays] = useState<{ id: string; date: string; name: string; type: string }[]>([]);
  const [overrides, setOverrides] = useState<{ id: string; date: string; status: string; reason: string | null }[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newOverrideDate, setNewOverrideDate] = useState("");
  const [newOverrideStatus, setNewOverrideStatus] = useState("closed");
  const [newOverrideReason, setNewOverrideReason] = useState("");
  const [holidayMode, setHolidayMode] = useState<"holidays" | "overrides">("holidays");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [archivedFilter, setArchivedFilter] = useState("false");
  const [searchQuery, setSearchQuery] = useState("");

  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    loadPortalConfig().then((cfg) => {
      setConfig(cfg);
      if (hasSupabaseConfig(cfg)) {
        const { supabase: sb } = createClients(cfg);
        setSupabase(sb);
        sb.auth.getSession().then(({ data }) => {
          if (data.session) {
            setSession(data.session);
            setView("dashboard");
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError("Invalid email or password.");
      setAuthLoading(false);
      return;
    }
    setAuthLoading(false);
    setView("dashboard");
  };

  const signOut = async () => {
    await supabase!.auth.signOut();
    setSession(null);
    setView("login");
    setCandidates([]);
    setSelectedCandidate(null);
  };

  const fetchStats = async () => {
    try {
      const r = await fetch(`${API}/admin-recruitment/stats`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const d = await r.json();
      if (d.ok) setStats(d.stats);
    } catch {}
  };

  const fetchCandidates = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (positionFilter) params.set("position", positionFilter);
      if (archivedFilter) params.set("archived", archivedFilter);
      if (searchQuery) params.set("search", searchQuery);
      const r = await fetch(`${API}/admin-recruitment?${params}`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const d = await r.json();
      if (d.ok) setCandidates(d.candidates);
    } catch {}
  };

  const fetchHolidays = async () => {
    try {
      const [hRes, oRes] = await Promise.all([
        fetch(`${API}/admin-recruitment/holidays`, { headers: { Authorization: `Bearer ${session?.access_token}` } }),
        fetch(`${API}/admin-recruitment/overrides`, { headers: { Authorization: `Bearer ${session?.access_token}` } }),
      ]);
      const hData = await hRes.json();
      const oData = await oRes.json();
      if (hData.ok) setHolidays(hData.holidays);
      if (oData.ok) setOverrides(oData.overrides);
    } catch {}
  };

  const addHoliday = async () => {
    if (!newHolidayDate || !newHolidayName) return;
    await fetch(`${API}/admin-recruitment/holidays`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ date: newHolidayDate, name: newHolidayName }),
    });
    setNewHolidayDate("");
    setNewHolidayName("");
    fetchHolidays();
  };

  const deleteHoliday = async (id: string) => {
    await fetch(`${API}/admin-recruitment/holidays`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id }),
    });
    fetchHolidays();
  };

  const addOverride = async () => {
    if (!newOverrideDate || !newOverrideStatus) return;
    await fetch(`${API}/admin-recruitment/overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ date: newOverrideDate, status: newOverrideStatus, reason: newOverrideReason }),
    });
    setNewOverrideDate("");
    setNewOverrideReason("");
    fetchHolidays();
  };

  const deleteOverride = async (id: string) => {
    await fetch(`${API}/admin-recruitment/overrides`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id }),
    });
    fetchHolidays();
  };

  const fetchTemplates = async () => {
    try {
      const r = await fetch(`${API}/admin-recruitment/templates`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const d = await r.json();
      if (d.ok) setTemplates(d.templates);
    } catch {}
  };

  const performAction = async (candidateId: string, action: string) => {
    try {
      const r = await fetch(`${API}/admin-recruitment/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ candidateId, action }),
      });
      const d = await r.json();
      if (d.ok) {
        setSelectedCandidate(null);
        fetchCandidates();
        fetchStats();
      }
      return d;
    } catch {
      return { ok: false, error: "Request failed" };
    }
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    await fetch(`${API}/admin-recruitment/templates`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id: editingTemplate, subject: editSubject, body: editBody }),
    });
    setEditingTemplate(null);
    fetchTemplates();
  };

  const updateNotes = async (candidateId: string, notes: string) => {
    await fetch(`${API}/admin-recruitment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id: candidateId, internal_notes: notes }),
    });
  };

  // Navigate
  const goTo = (v: View) => {
    setView(v);
    if (v === "dashboard") fetchStats();
    if (v === "candidates") fetchCandidates();
    if (v === "templates") fetchTemplates();
    if (v === "holidays") fetchHolidays();
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }); }
    catch { return d; }
  };

  if (loading) return <div className="loading-screen"><p>Loading...</p></div>;

  if (!supabase || !hasSupabaseConfig(config)) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p className="login-kicker">Urban Mistrii</p>
          <h1 className="login-title">Recruitment Admin</h1>
          <p className="login-error">Supabase not configured. Check deployment.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p className="login-kicker">Urban Mistrii</p>
          <h1 className="login-title">Recruiter Login</h1>
          <form onSubmit={signIn} className="login-form">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="text-input" placeholder="hr@urbanmistrii.com" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="text-input" required />
            </div>
            {authError && <p className="form-error">{authError}</p>}
            <button type="submit" className="btn btn-primary" disabled={authLoading}>{authLoading ? "Signing in..." : "Sign in"}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="admin-nav-left">
          <span className="admin-brand">Urban Mistrii</span>
          <button className={`nav-link ${view === "dashboard" ? "is-active" : ""}`} onClick={() => goTo("dashboard")}>Dashboard</button>
          <button className={`nav-link ${view === "candidates" ? "is-active" : ""}`} onClick={() => { goTo("candidates"); setSelectedCandidate(null); }}>Candidates</button>
          <button className={`nav-link ${view === "templates" ? "is-active" : ""}`} onClick={() => goTo("templates")}>Templates</button>
          <button className={`nav-link ${view === "holidays" ? "is-active" : ""}`} onClick={() => goTo("holidays")}>Hours</button>
        </div>
        <div className="admin-nav-right">
          <span className="nav-email">{session.user.email}</span>
          <button className="nav-signout" onClick={signOut}>Sign out</button>
        </div>
      </nav>

      <main className="admin-main">
        {view === "dashboard" && (
          <div>
            <h1 className="page-title">Dashboard</h1>
            <div className="stats-grid">
              {[
                { label: "Requiring Attention", value: stats.attention, filter: "Applied,Reviewing,Assignment Submitted" },
                { label: "Upcoming Interviews", value: stats.interviews, filter: "Interview Scheduled" },
                { label: "Tests Awaiting Review", value: stats.tests, filter: "Assignment Submitted" },
                { label: "Offers Pending", value: stats.offers, filter: "Offer Extended" },
              ].map(card => (
                <button key={card.label} className="stat-card" onClick={() => { setStatusFilter(card.filter); goTo("candidates"); }}>
                  <span className="stat-label">{card.label}</span>
                  <span className="stat-value">{card.value}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === "candidates" && !selectedCandidate && (
          <div>
            <h1 className="page-title">Candidates</h1>
            <div className="filters-bar">
              <div className="field">
                <label>Search</label>
                <input type="text" className="text-input" placeholder="Name, email..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setTimeout(fetchCandidates, 300); }} />
              </div>
              <div className="field">
                <label>Status</label>
                <select className="select-input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTimeout(fetchCandidates, 50); }}>
                  <option value="">All</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Position</label>
                <select className="select-input" value={positionFilter} onChange={e => { setPositionFilter(e.target.value); setTimeout(fetchCandidates, 50); }}>
                  <option value="">All</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Show</label>
                <select className="select-input" value={archivedFilter} onChange={e => { setArchivedFilter(e.target.value); setTimeout(fetchCandidates, 50); }}>
                  <option value="false">Active</option>
                  <option value="true">Archived</option>
                  <option value="all">All</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={fetchCandidates} style={{ alignSelf: "end" }}>Refresh</button>
            </div>
            {candidates.length === 0 ? (
              <p className="empty-state">No candidates found.</p>
            ) : (
              <div className="table-wrap">
                <table className="candidates-table">
                  <thead>
                    <tr><th>Name</th><th>App ID</th><th>Position</th><th>Status</th><th>Updated</th></tr>
                  </thead>
                  <tbody>
                    {candidates.map(c => (
                      <tr key={c.id} className="clickable-row" onClick={() => { setSelectedCandidate(c); setView("detail"); }}>
                        <td className="cell-name">{c.full_name}</td>
                        <td className="cell-muted">{c.application_id}</td>
                        <td>{c.position}</td>
                        <td><span className="status-badge" style={{ background: STATUS_COLORS[c.status]?.bg || "transparent", color: STATUS_COLORS[c.status]?.text || "#111" }}>{c.status}</span></td>
                        <td className="cell-muted">{formatDate(c.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === "detail" && selectedCandidate && (
          <div>
            <button className="back-link" onClick={() => { setSelectedCandidate(null); setView("candidates"); }}>&larr; Back to Candidates</button>
            <div className="detail-header">
              <div>
                <h1 className="page-title" style={{ marginBottom: 4 }}>{selectedCandidate.full_name}</h1>
                <div className="detail-meta">
                  <span className="cell-muted">{selectedCandidate.application_id}</span>
                  <span className="status-badge" style={{ background: STATUS_COLORS[selectedCandidate.status]?.bg || "transparent", color: STATUS_COLORS[selectedCandidate.status]?.text || "#111" }}>{selectedCandidate.status}</span>
                </div>
              </div>
              {!selectedCandidate.archived && (
                <div className="action-dropdown">
                  <label>Recruiter Action</label>
                  <div className="action-buttons">
                    {ACTIONS.map(a => (
                      <button key={a.value} className={`btn btn-action btn-${a.style}`} onClick={async () => {
                        const r = await performAction(selectedCandidate.id, a.value);
                        if (r.ok) alert("Action completed successfully.");
                        else alert(r.error || "Action failed.");
                      }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="detail-grid">
              <div className="detail-section">
                <h2 className="section-title">Candidate Details</h2>
                <div className="detail-card">
                  {[
                    ["Email", selectedCandidate.email],
                    ["Phone", selectedCandidate.phone || "—"],
                    ["City", selectedCandidate.city || "—"],
                    ["Position", selectedCandidate.position],
                    ["Experience", selectedCandidate.experience || "—"],
                    ["Current Employer", selectedCandidate.current_employer || "—"],
                    ["Available From", formatDate(selectedCandidate.available_from)],
                    ["Expected Salary", selectedCandidate.expected_salary || "—"],
                    ["Notice Period", selectedCandidate.notice_period || "—"],
                    ["Relocation", selectedCandidate.relocation_status || "—"],
                    ["Applied", formatDate(selectedCandidate.application_date)],
                    ["Last Updated", formatDate(selectedCandidate.updated_at)],
                  ].map(([label, value], i) => (
                    <div key={label} className={`detail-row ${i === 0 ? "first" : ""}`}>
                      <span className="detail-label">{label}</span>
                      <span className="detail-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <h2 className="section-title">Documents</h2>
                <div className="detail-card">
                  {([
                    ["Resume", selectedCandidate.resume_url],
                    ["Portfolio", selectedCandidate.portfolio_url],
                    ["LinkedIn", selectedCandidate.linkedin_url],
                  ] as const).map(([label, url], i) => (
                    <div key={label} className={`detail-row ${i === 0 ? "first" : ""}`}>
                      <span className="detail-label">{label}</span>
                      {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="detail-link">View {label.toLowerCase()}</a> : <span className="cell-muted">Not provided</span>}
                    </div>
                  ))}
                </div>

                {selectedCandidate.cover_letter && (
                  <>
                    <h2 className="section-title" style={{ marginTop: 24 }}>Cover Letter</h2>
                    <div className="detail-card">
                      <p className="cover-letter-text">{selectedCandidate.cover_letter}</p>
                    </div>
                  </>
                )}

                <h2 className="section-title" style={{ marginTop: 24 }}>Internal Notes</h2>
                <textarea
                  className="text-input notes-textarea"
                  rows={5}
                  defaultValue={selectedCandidate.internal_notes || ""}
                  placeholder="Add notes about this candidate..."
                  onBlur={e => updateNotes(selectedCandidate.id, e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {view === "holidays" && (
          <div>
            <h1 className="page-title">Company Hours</h1>
            <div className="holiday-tabs">
              <button className={`btn ${holidayMode === "holidays" ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => setHolidayMode("holidays")}>Holidays</button>
              <button className={`btn ${holidayMode === "overrides" ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => setHolidayMode("overrides")}>Overrides</button>
            </div>

            {holidayMode === "holidays" && (
              <div style={{ marginTop: 20 }}>
                <div className="inline-form">
                  <input type="date" className="text-input" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)} style={{ width: 180 }} />
                  <input type="text" className="text-input" value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} placeholder="Holiday name" style={{ width: 220 }} />
                  <button className="btn btn-primary btn-sm" onClick={addHoliday}>Add</button>
                </div>
                <div className="table-wrap" style={{ marginTop: 16 }}>
                  <table className="candidates-table">
                    <thead><tr><th>Date</th><th>Name</th><th>Type</th><th></th></tr></thead>
                    <tbody>
                      {holidays.map(h => (
                        <tr key={h.id}>
                          <td>{h.date}</td>
                          <td>{h.name}</td>
                          <td className="cell-muted">{h.type.replace(/_/g, " ")}</td>
                          <td><button className="btn btn-danger btn-sm" onClick={() => deleteHoliday(h.id)}>Delete</button></td>
                        </tr>
                      ))}
                      {holidays.length === 0 && <tr><td colSpan={4} className="empty-state">No holidays configured.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {holidayMode === "overrides" && (
              <div style={{ marginTop: 20 }}>
                <div className="inline-form">
                  <input type="date" className="text-input" value={newOverrideDate} onChange={e => setNewOverrideDate(e.target.value)} style={{ width: 180 }} />
                  <select className="select-input" value={newOverrideStatus} onChange={e => setNewOverrideStatus(e.target.value)} style={{ width: 140 }}>
                    <option value="closed">Closed</option>
                    <option value="open">Open</option>
                    <option value="half_day">Half Day</option>
                  </select>
                  <input type="text" className="text-input" value={newOverrideReason} onChange={e => setNewOverrideReason(e.target.value)} placeholder="Reason (e.g. Emergency)" style={{ width: 220 }} />
                  <button className="btn btn-primary btn-sm" onClick={addOverride}>Add</button>
                </div>
                <div className="table-wrap" style={{ marginTop: 16 }}>
                  <table className="candidates-table">
                    <thead><tr><th>Date</th><th>Status</th><th>Reason</th><th></th></tr></thead>
                    <tbody>
                      {overrides.map(o => (
                        <tr key={o.id}>
                          <td>{o.date}</td>
                          <td><span className="status-badge" style={{ background: o.status === "open" ? "rgba(82,98,85,0.12)" : "rgba(143,110,82,0.12)", color: o.status === "open" ? "#4a6a5a" : "#8f6e52" }}>{o.status.replace(/_/g, " ")}</span></td>
                          <td className="cell-muted">{o.reason || "—"}</td>
                          <td><button className="btn btn-danger btn-sm" onClick={() => deleteOverride(o.id)}>Delete</button></td>
                        </tr>
                      ))}
                      {overrides.length === 0 && <tr><td colSpan={4} className="empty-state">No overrides configured.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {view === "templates" && (
          <div>
            <h1 className="page-title">Email Templates</h1>
            <div className="templates-list">
              {templates.map(t => (
                <div key={t.id} className="template-card">
                  <div className="template-header">
                    <span className="template-name">{t.template_key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                    {editingTemplate !== t.id && <button className="btn btn-secondary btn-sm" onClick={() => { setEditingTemplate(t.id); setEditSubject(t.subject); setEditBody(t.body); }}>Edit</button>}
                  </div>
                  {editingTemplate === t.id ? (
                    <div className="template-edit-form">
                      <div className="field">
                        <label>Subject</label>
                        <input className="text-input" value={editSubject} onChange={e => setEditSubject(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Body</label>
                        <textarea className="text-input template-body-input" rows={8} value={editBody} onChange={e => setEditBody(e.target.value)} />
                      </div>
                      <div className="template-edit-actions">
                        <button className="btn btn-primary btn-sm" onClick={saveTemplate}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingTemplate(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="template-preview">
                      <div><span className="template-field-label">Subject:</span> <span>{t.subject}</span></div>
                      <pre className="template-body-preview">{t.body}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
