import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BarChart3, BriefcaseBusiness, Check, CheckCircle2, ChevronRight, Cloud, Download,
  FileBarChart2, FileText, FileUp, LayoutDashboard, LoaderCircle, Mail, Printer,
  SearchCheck, ShieldCheck, UserRound, X,
} from 'lucide-react';
import { analyzeCandidate, jobSearchUrl, readResume, recommendRoles, type Candidate } from '@/lib/analyzer';
import './index.css';

type View = 'landing' | 'dashboard' | 'skills' | 'jobs';
const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = /\.(pdf|docx|txt)$/i;
const fmtSize = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [view, setView] = useState<View>('landing');
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [info, setInfo] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const cancelToken = useRef(0);
  const selected = candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0];
  const hasRequirements = Boolean(target.trim() || description.trim());
  const ranked = useMemo(() => [...candidates].sort((a, b) => b.score - a.score), [candidates]);
  const roles = useMemo(() => recommendRoles(selected?.skills ?? []), [selected]);

  const addFiles = (incoming: FileList | File[]) => {
    const accepted: File[] = [];
    const messages: string[] = [];
    for (const file of Array.from(incoming)) {
      if (!ACCEPTED.test(file.name)) messages.push(`${file.name}: unsupported format. Choose PDF, DOCX, or TXT.`);
      else if (file.size > MAX_SIZE) messages.push(`${file.name}: exceeds the 10 MB per-file limit.`);
      else if (files.some((current) => current.name === file.name && current.size === file.size) ||
        accepted.some((current) => current.name === file.name && current.size === file.size)) {
        messages.push(`${file.name}: already added.`);
      } else accepted.push(file);
    }
    if (accepted.length) {
      setFiles((current) => [...current, ...accepted]);
      setErrors(messages);
      setInfo('');
    } else if (messages.length) setErrors(messages);
  };

  const removeFile = (file: File) => setFiles((items) => items.filter((item) => item !== file));
  const clearResults = () => {
    cancelToken.current++;
    setBusy(false);
    setProgress({ done: 0, total: 0 });
    setFiles([]);
    setCandidates([]);
    setSelectedId('');
    setView('landing');
    setErrors([]);
    setInfo('');
    setTarget('');
    setDescription('');
    if (fileInput.current) fileInput.current.value = '';
  };
  const reAnalyze = () => {
    setCandidates([]);
    setSelectedId('');
    setErrors([]);
    setInfo('Update your target role or requirements, then run the local analysis again.');
    setView('landing');
  };

  const analyze = async () => {
    if (!files.length || busy) return;
    const token = ++cancelToken.current;
    setBusy(true);
    setErrors([]);
    setInfo('');
    setCandidates([]);
    setSelectedId('');
    setProgress({ done: 0, total: files.length });
    const results: Candidate[] = [];
    const issues: string[] = [];
    for (let i = 0; i < files.length; i++) {
      if (cancelToken.current !== token) return;
      const file = files[i];
      setProgress({ done: i, total: files.length });
      try {
        const text = await readResume(file);
        if (cancelToken.current !== token) return;
        if (text.length < 40) throw new Error('Not enough readable text was found. This may be a scanned image PDF; use a text-based PDF or TXT/DOCX.');
        results.push(analyzeCandidate(text, file.name, target, description));
      } catch (error) {
        issues.push(`${file.name}: ${error instanceof Error ? error.message : 'Could not read this resume.'}`);
      }
    }
    if (cancelToken.current !== token) return;
    setBusy(false);
    setProgress({ done: files.length, total: files.length });
    if (results.length) {
      setCandidates(results);
      setSelectedId(results[0].id);
      setView('dashboard');
      setInfo(`${results.length} resume${results.length === 1 ? '' : 's'} analyzed locally. Resume text was not uploaded or saved.`);
      if (issues.length) setErrors(issues);
    } else {
      setErrors(issues.length ? issues : ['No readable resume text was found.']);
    }
  };

  const cancelAnalysis = () => {
    cancelToken.current++;
    setBusy(false);
    setProgress({ done: 0, total: 0 });
    setInfo('Analysis canceled. Your files remain selected; nothing was uploaded.');
  };

  const exportResults = () => {
    if (!candidates.length) return;
    const report = {
      generatedAt: new Date().toISOString(),
      method: 'Local heuristic matching; not an employment decision.',
      target: target || null,
      requirementDescription: description || null,
      candidates: ranked.map(({ text: _text, ...candidate }) => candidate),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'talentai-analysis.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const className = view === 'landing' ? 'landing-bg' : view === 'dashboard' ? 'dash-bg' : view === 'skills' ? 'skills-bg' : 'rec-bg';
  const scoreLabel = hasRequirements ? 'LOCAL MATCH' : 'PROFILE SIGNAL';

  return (
    <main className={`app-container ${className}`}>
      {view === 'landing' && (
        <section className="screen" aria-label="Resume upload">
          <div className="window-frame">
            <div className="window-header">
              <div className="mac-dots"><div className="dot red" /><div className="dot yellow" /><div className="dot green" /></div>
              <div style={{ flex: 1, textAlign: 'center', color: '#9ca3af', fontSize: '.85rem' }}>talentai · private resume analysis</div>
              <div style={{ width: 50 }} />
            </div>
            <nav className="navbar">
              <div className="logo"><SearchCheck size={24} color="#0a58ca" /> TALENTAI</div>
              <div className="nav-links"><span>Private by design</span><span>Local analysis</span><span>Job matches</span></div>
              <div className="nav-actions"><span style={{ color: '#64748b', fontSize: '.86rem' }}>No account required</span></div>
            </nav>
            <div className="hero">
              <h1>Know your strengths.<br />Find your next role.</h1>
              <p>Understand what your resume says and explore roles that fit. Your documents stay on this device—always.</p>
              <div
                className={`upload-area${dragging ? ' dragging' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => fileInput.current?.click()}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInput.current?.click(); }}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
                data-testid="upload-dropzone"
              >
                <FileUp size={48} className="upload-icon" />
                <h2 className="upload-title">Drag &amp; drop your resume{files.length > 1 ? 's' : ''} here</h2>
                <p className="drop-hint">or browse files · PDF, DOCX, TXT · 10 MB max each</p>
                <input ref={fileInput} className="sr-only" type="file" accept=".pdf,.docx,.txt" multiple
                  onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }}
                  aria-label="Choose resume files" data-testid="input-resumes" />
                <div className="privacy-banner"><ShieldCheck size={18} /><span><strong>Your resume stays yours.</strong> Files are read in your browser only. No upload, account, or server storage.</span></div>
              </div>
              {files.length > 0 && <div className="file-list" aria-live="polite">
                {files.map((file, index) => <div key={`${file.name}-${file.size}-${index}`} className="file-pill">
                  <FileText size={17} color="#ef4444" /><strong className="file-name">{file.name}</strong>
                  <span className="file-meta">{fmtSize(file.size)}</span>
                  <button className="btn-quiet" aria-label={`Remove ${file.name}`} onClick={() => removeFile(file)} data-testid={`remove-file-${index}`}><X size={16} /></button>
                </div>)}
              </div>}
              {errors.length > 0 && <div className="alert-error" role="alert">
                {errors.map((error, index) => <div key={`${error}-${index}`}>{error}</div>)}
              </div>}
              {info && <p role="status" style={{ color: '#166534', margin: '12px auto 0', maxWidth: 700, fontSize: '.9rem' }}>{info}</p>}
              <div className="job-inputs">
                <div><label className="field-label" htmlFor="target-role">Target job title <span style={{ fontWeight: 400, color: '#94a3b8' }}>· optional</span></label>
                  <input id="target-role" className="field-input" placeholder="e.g. Product Manager" value={target} onChange={(event) => setTarget(event.target.value)} data-testid="input-job-title" /></div>
                <div><label className="field-label" htmlFor="job-description">Job description or requirements <span style={{ fontWeight: 400, color: '#94a3b8' }}>· optional</span></label>
                  <textarea id="job-description" className="field-textarea" placeholder="Paste role requirements to compare skills and keywords…" value={description} onChange={(event) => setDescription(event.target.value)} data-testid="input-job-description" /></div>
              </div>
              <div className="hero-actions">
                <button className="btn-primary" onClick={analyze} disabled={!files.length || busy} data-testid="button-analyze">
                  {busy ? <><LoaderCircle size={17} className="spin-icon" /> Reading {progress.done + 1} of {progress.total}…</> : 'Analyze resume'}
                </button>
                {busy && <button className="btn-secondary" style={{ marginLeft: 10 }} onClick={cancelAnalysis} data-testid="button-cancel">Cancel</button>}
                <div className="privacy-note"><ShieldCheck size={16} color="#10b981" /> Private &amp; local analysis</div>
              </div>
            </div>
            <div className="hero-footer"><span className="selected">How it works</span><span>Transparent matching</span><span>Private by design</span></div>
          </div>
        </section>
      )}

      {view === 'dashboard' && selected && (
        <section className="screen" aria-label="Resume insights">
          <div className="dark-dashboard">
            <div className="dash-header">
              <div className="dash-header-copy"><strong style={{ color: 'white', fontSize: '1.1rem' }}>RESUME INSIGHTS</strong>
                <span>|</span><span>Candidate: <strong style={{ color: '#e2e8f0' }}>{selected.name}</strong></span>
                {target && <><span>|</span><span>Role: <strong style={{ color: '#e2e8f0' }}>{target}</strong></span></>}
                <span>| {candidates.length} resume{candidates.length === 1 ? '' : 's'} · analyzed locally</span>
              </div>
              <div className="dash-toolbar">
                <button className="btn-secondary" onClick={reAnalyze} data-testid="button-reanalyze"><FileBarChart2 size={15} /> Re-analyze</button>
                <button className="btn-secondary" onClick={exportResults} data-testid="button-export"><Download size={15} /> Export</button>
                <button className="btn-secondary" onClick={() => window.print()} data-testid="button-print"><Printer size={15} /> Print</button>
                <button className="btn-secondary" onClick={clearResults} data-testid="button-reset">New analysis</button>
              </div>
            </div>
            <div className="dash-nav" role="tablist" aria-label="Analysis sections">
              <button className="active" onClick={() => setView('dashboard')} data-testid="tab-dashboard"><LayoutDashboard size={17} /> Dashboard</button>
              <button onClick={() => setView('skills')} data-testid="tab-skills"><FileBarChart2 size={17} /> Skills</button>
              <button onClick={() => setView('jobs')} data-testid="tab-jobs"><BriefcaseBusiness size={17} /> Job matches</button>
            </div>
            {info && <p role="status" style={{ color: '#a7f3d0', fontSize: '.86rem', margin: '0 0 16px' }}>{info}</p>}
            {errors.length > 0 && <div className="alert-error" role="alert">{errors.map((error) => <div key={error}>{error}</div>)}</div>}
            <div className="dash-grid">
              <div className="dash-tile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="score-circle-wrapper">
                  <div className="score-circle-bg" /><div className="score-circle-fill" style={{ background: `conic-gradient(#06b6d4 0 ${selected.score}%, #172438 ${selected.score}% 100%)` }} />
                  <div className="score-content"><div style={{ color: selected.score >= 70 ? '#10b981' : '#fbbf24', fontWeight: 600, marginBottom: 5 }}>{selected.score >= 70 ? 'Strong signals' : selected.score >= 40 ? 'Some alignment' : 'More evidence needed'}</div>
                    <div className="score-value">{selected.score}<span style={{ fontSize: '2rem' }}>%</span></div>
                    <div style={{ color: '#94a3b8', fontWeight: 600, letterSpacing: 1, marginTop: 7, fontSize: '.78rem' }}>{scoreLabel}</div>
                  </div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '.78rem', textAlign: 'center', marginTop: 14 }}>Weighted heuristic across skills, experience &amp; keywords.</p>
              </div>
              <div className="dash-tile">
                <h3 style={{ color: '#f8fafc', margin: '2px 0 1.4rem', fontSize: '.95rem', letterSpacing: 1 }}>SKILL ANALYSIS</h3>
                {selected.skills.length ? <div className="skill-bars">
                  {selected.skills.slice(0, 7).map((skill, index) => <div className="skill-bar-item" key={skill}>
                    <div className="skill-bar-labels"><span>{skill}</span><span>{hasRequirements ? (selected.matched.includes(skill) ? 'Matched' : 'Found') : 'Detected'}</span></div>
                    <div className="skill-bar-track"><div className="skill-bar-fill" style={{ width: `${Math.max(18, hasRequirements ? (selected.matched.includes(skill) ? 100 : 35) : 68 + (index % 4) * 8)}%`, background: ['#06b6d4','#0ea5e9','#10b981','#eab308','#f97316','#8b5cf6','#22c55e'][index % 7] }} /></div>
                  </div>)}
                </div> : <div className="empty-state" style={{ color: '#cbd5e1' }}>No recognizable skills detected in this document.</div>}
              </div>
              <div className="stats-cards">
                <Stat label="Skills matched" value={hasRequirements ? `${selected.matched.length}` : `${selected.skills.length}`} suffix={hasRequirements ? `/${selected.matched.length + selected.missing.length}` : ' found'} fill={selected.skillScore} color="#06b6d4" />
                <Stat label="Experience signal" value={selected.years === null ? 'Not stated' : `${selected.years}`} suffix={selected.years === null ? '' : ' yrs'} fill={selected.experienceScore} color="#10b981" />
                <Stat label="Keyword overlap" value={`${selected.keywordScore}`} suffix="%" fill={selected.keywordScore} color="#f97316" />
              </div>
              <div className="strengths-panel">
                <h3 style={{ color: '#10b981', fontSize: '1rem', letterSpacing: 1 }}>PROFILE HIGHLIGHTS</h3>
                <div className="strengths-grid">
                  <Highlight title={`${selected.skills.length} skills detected`} body={selected.skills.slice(0, 4).join(', ') || 'No known skills found'} />
                  <Highlight title={selected.years === null ? 'Experience not quantified' : `${selected.years} years indicated`} body="Estimated from dates or explicit experience statements." />
                  <Highlight title={selected.email ? 'Contact details found' : 'No email detected'} body={selected.email || 'Resume text did not include a recognizable email.'} />
                  <Highlight title={hasRequirements ? `${selected.matched.length} requirement matches` : 'Add a job description'} body={hasRequirements ? selected.missing.length ? `Potential gaps: ${selected.missing.slice(0, 4).join(', ')}` : 'All detected role skills are represented.' : 'Compare this profile to a specific role for explainable match scores.'} />
                </div>
              </div>
              {candidates.length > 1 && <div className="candidate-list">
                <div style={{ padding: '13px 16px', color: '#94a3b8', background: '#111c2d', fontSize: '.8rem', letterSpacing: 1 }}>CANDIDATES · RANKED BY {hasRequirements ? 'LOCAL MATCH' : 'PROFILE SIGNAL'}</div>
                {ranked.map((candidate, index) => <div key={candidate.id} className="candidate-row">
                  <button onClick={() => setSelectedId(candidate.id)} data-testid={`candidate-${index}`}>{index + 1}. {candidate.name} <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {candidate.fileName}</span></button>
                  <span>{candidate.score}%</span><span>{candidate.skills.length} skills</span>
                </div>)}
              </div>}
            </div>
            <p style={{ margin: '18px 2px 0', color: '#94a3b8', fontSize: '.78rem', lineHeight: 1.5 }}>Local text-based heuristics only. Scores explain keyword overlap, not candidate quality; they are not an employment decision. Resume content remains in this browser tab.</p>
          </div>
        </section>
      )}

      {view === 'skills' && selected && (
        <section className="screen" aria-label="Detailed skill analysis">
          <div className="skills-header">
            <h1 className="skills-title">RESUME ANALYSIS DASHBOARD</h1>
            <p style={{ fontSize: '1.1rem', color: '#4b5563', marginTop: 10 }}>Applicant Profile: <strong>{selected.name}</strong></p>
          </div>
          <div className="window-frame">
            <div className="skills-profilebar">
              <div><button className="btn-quiet" onClick={() => setView('dashboard')} data-testid="button-back-dashboard">Dashboard</button> &gt; <span style={{ color: '#111827' }}>Skill Analysis</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 32, height: 32, background: '#3b82f6', borderRadius: '50%', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{selected.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</div><strong style={{ fontSize: '.85rem' }}>{selected.name}</strong></div>
            </div>
            <div className="skills-layout">
              <div>
                <div className="chart-card"><div className="chart-header"><div>Detected skills <div style={{ fontSize: '.8rem', fontWeight: 400, color: '#6b7280' }}>Skills identified from the document text</div></div></div>
                  {selected.skills.length ? selected.skills.map((skill, index) => <SkillBar key={skill} skill={skill} value={hasRequirements ? selected.matched.includes(skill) ? 100 : 35 : 70 + (index % 3) * 10} color="linear-gradient(90deg,#0ea5e9,#06b6d4)" />) : <div className="empty-state">No recognizable skills found. Try a text-based resume with a skills section.</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="chart-card"><div className="chart-header">Education</div>{selected.education.length ? selected.education.map((item, index) => <p key={`${item}-${index}`} style={{ color: '#475569', margin: '9px 0', fontSize: '.88rem' }}>{item}</p>) : <p style={{ color: '#64748b', fontSize: '.88rem' }}>No education details detected.</p>}</div>
                  <div className="chart-card"><div className="chart-header">Experience</div><p style={{ color: '#475569', fontSize: '.9rem' }}>{selected.years === null ? 'Years not stated' : `Approximately ${selected.years} years identified`}</p><p style={{ color: '#64748b', fontSize: '.8rem', marginTop: 8 }}>Inferred from text; check dates for accuracy.</p>
                    {selected.experience.length > 0 && <div className="experience-excerpts">{selected.experience.slice(0, 5).map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}</div>}
                  </div>
                </div>
              </div>
              <div className="strengths-sidebar">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.3rem' }}>PROFILE DETAILS</h3>
                <div className="strength-item"><div className="strength-icon"><UserRound color="#64748b" /></div><div><strong style={{ fontSize: '.9rem' }}>{selected.name}</strong><div style={{ color: '#64748b', fontSize: '.78rem' }}>Inferred name</div></div></div>
                {selected.email && <div className="strength-item"><div className="strength-icon"><Mail color="#3b82f6" /></div><span style={{ fontSize: '.82rem', overflowWrap: 'anywhere' }}>{selected.email}</span></div>}
                <div className="strength-item"><div className="strength-icon"><BriefcaseBusiness color="#a855f7" /></div><strong style={{ fontSize: '.9rem' }}>{selected.skills.length} skills found</strong></div>
                <div className="strength-item"><div className="strength-icon"><Cloud color="#10b981" /></div><strong style={{ fontSize: '.9rem' }}>{selected.education.length} education lines</strong></div>
                {selected.phone && <p style={{ color: '#64748b', fontSize: '.82rem' }}>Phone: {selected.phone}</p>}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2rem 1.5rem', flexWrap: 'wrap', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setView('dashboard')} data-testid="button-skills-dashboard"><LayoutDashboard size={16} /> Dashboard</button>
              <button className="btn-primary" onClick={() => setView('jobs')} data-testid="button-skills-jobs">Explore matching jobs <ChevronRight size={16} /></button>
            </div>
          </div>
        </section>
      )}

      {view === 'jobs' && selected && (
        <section className="screen rec-window" aria-label="Job recommendations">
          <div className="window-frame">
            <div className="window-header"><div className="mac-dots"><div className="dot red" /><div className="dot yellow" /><div className="dot green" /></div><div style={{ flex: 1, textAlign: 'center', color: '#9ca3af', fontSize: '.85rem' }}>TalentAI · local role exploration</div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2.5rem', borderBottom: '1px solid #e5e7eb', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>Role matches <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '.9rem' }}>for {selected.name}</span></div>
              <button className="btn-quiet" onClick={() => setView('dashboard')} data-testid="button-jobs-back"><LayoutDashboard size={16} /> Resume analysis</button>
            </div>
            <div className="rec-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
                <div><h2 style={{ margin: 0, color: '#111827', fontSize: '1.3rem' }}>Explore roles suggested by your skills</h2><p style={{ color: '#64748b', margin: '8px 0 0', fontSize: '.9rem' }}>Sorted by skill overlap, with links to search current openings.</p></div>
                <button className="btn-secondary" onClick={() => window.open(jobSearchUrl(target || `${selected.skills.slice(0, 3).join(' ')} jobs`), '_blank', 'noopener,noreferrer')} data-testid="button-search-jobs"><SearchCheck size={16} /> Search all roles</button>
              </div>
              {roles.length ? <div className="pill-grid">
                {roles.map((role) => <a key={role.title} className={`career-pill ${role.color}`} href={jobSearchUrl(role.query)} target="_blank" rel="noreferrer" data-testid={`job-link-${role.query.replaceAll(' ', '-')}`}><span>{role.title}</span><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{role.score}% <ChevronRight size={16} /></span></a>)}
              </div> : <div className="empty-state" style={{ marginTop: 20 }}><BriefcaseBusiness size={26} style={{ margin: '0 auto 10px' }} /><strong>No role matches yet</strong><p>Add a resume with recognizable skills to see relevant job searches.</p></div>}
              <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: '#eff6ff', color: '#1e3a8a', fontSize: '.86rem', lineHeight: 1.55 }}>
                <strong>How recommendations work</strong><p style={{ margin: '5px 0 0' }}>Roles are ranked by overlap between skills extracted locally and a small built-in role taxonomy. Job links open an external Google search; openings and availability are not verified by TalentAI.</p>
              </div>
              <div className="cards-grid">
                <Advice title="Skills that stand out" icon={<CheckCircle2 size={20} />}>{selected.skills.slice(0, 7).join(' · ') || 'No listed skills detected yet.'}</Advice>
                <Advice title="Worth making explicit" icon={<BarChart3 size={20} />}>{selected.missing.length ? `In the target description but not found in the resume: ${selected.missing.slice(0, 6).join(', ')}.` : hasRequirements ? 'Detected role requirements appear in the resume text.' : 'Add a target role and description for requirement-specific gap analysis.'}</Advice>
                <Advice title="Search privately" icon={<ShieldCheck size={20} />}>Resume text remains in this browser. Search links contain role titles only, never your resume content.</Advice>
              </div>
              <p style={{ color: '#64748b', fontSize: '.78rem', marginTop: 18 }}>Role fit is a local keyword heuristic, not career advice or an employment decision.</p>
            </div>
          </div>
        </section>
      )}
      {busy && <div className="processing-overlay" role="dialog" aria-modal="true" aria-label="Analyzing resumes">
        <div className="processing-card"><div style={{ color: '#06b6d4', fontWeight: 600 }}>PRIVATE BROWSER ANALYSIS</div><div className="spinner-container"><div className="spinner-ring" /><div className="spinner-ring" /></div>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Reading your resume</h2><p style={{ color: '#9ca3af', fontSize: '.9rem', marginTop: 8 }}>Extracting text on this device · {progress.done + 1} of {progress.total}</p>
          <button className="btn-secondary" onClick={cancelAnalysis} style={{ marginTop: 20 }} data-testid="button-cancel-modal">Cancel analysis</button>
        </div>
      </div>}
    </main>
  );
}

function Stat({ label, value, suffix, fill, color }: { label: string; value: string; suffix: string; fill: number; color: string }) {
  return <div className="stat-card"><div style={{ color: '#94a3b8', fontSize: '.82rem', marginBottom: 5 }}>{label}</div><div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'white' }}>{value}<span style={{ fontSize: '.95rem', color: '#64748b' }}>{suffix}</span></div><div className="skill-bar-track" style={{ marginTop: 10, height: 4 }}><div className="skill-bar-fill" style={{ width: `${fill}%`, background: color }} /></div></div>;
}

function Highlight({ title, body }: { title: string; body: string }) {
  return <div><Check size={17} color="#10b981" style={{ marginBottom: 7 }} /><br /><strong style={{ color: 'white', fontSize: '.9rem' }}>{title}</strong><p style={{ color: '#94a3b8', fontSize: '.8rem', marginTop: 5, lineHeight: 1.45 }}>{body}</p></div>;
}

function SkillBar({ skill, value, color }: { skill: string; value: number; color: string }) {
  return <div className="horiz-bar-wrap"><div className="horiz-label">{skill}</div><div className="horiz-track"><div className="horiz-fill" style={{ width: `${value}%`, background: color }}>{value}%</div></div></div>;
}

function Advice({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <article className="advice-card"><div className="advice-header"><span className="advice-icon">{icon}</span>{title}</div><div style={{ fontSize: '.88rem', color: '#4b5563', lineHeight: 1.55 }}>{children}</div></article>;
}

export default App;