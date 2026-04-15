import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api, { API_URL } from '../utils/api';
import { getApiErrorMessage } from '../utils/apiError';
import { commaSeparatedToArray } from '../utils/commaList';
import ResumePreview from './ResumePreview';
import TemplateGallery from './TemplateGallery';
import './ResumeEditor.css';

const STEPS = ['Personal', 'Education', 'Experience', 'Skills', 'Projects'];

const FIELD_LABELS = {
  school: 'School / University',
  degree: 'Degree',
  field: 'Field of Study',
  startDate: 'Start Date',
  endDate: 'End Date',
  gpa: 'GPA',
  title: 'Job Title',
  company: 'Company',
  location: 'Location',
};

const SECTION_ORDER_LABELS = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
};

const emptyPersonal = () => ({
  fullName: '', email: '', phone: '', location: '',
  summary: '', linkedin: '', website: '', photoUrl: '',
});

// ── Sortable item wrapper ────────────────────────────────────────
function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  };
  return (
    <div ref={setNodeRef} style={style} className="re-sortable-item">
      <button type="button" className="re-drag-handle" {...attributes} {...listeners} title="Drag to reorder">
        ⠿
      </button>
      {children}
    </div>
  );
}


// ── Main Editor ──────────────────────────────────────────────────
function ResumeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('Untitled Resume');
  const [templateId, setTemplateId] = useState('classic');
  const [personal, setPersonal] = useState(emptyPersonal);
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);
  const [skills, setSkills] = useState([{ category: '', itemsText: '' }]);
  const [projects, setProjects] = useState([]);
  const [sectionOrder, setSectionOrder] = useState(['summary', 'experience', 'education', 'skills', 'projects']);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [resumePhotoError, setResumePhotoError] = useState('');
  const [toast, setToast] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const showToast = (text, type = 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Unsaved-change guard
  useEffect(() => {
    const handler = (e) => {
      if (saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveStatus]);

  const skillsForApi = useMemo(
    () => skills.map((g) => ({ category: g.category || '', items: commaSeparatedToArray(g.itemsText) })),
    [skills]
  );

  const projectsForApi = useMemo(
    () => projects.map((p) => ({ name: p.name || '', description: p.description || '', link: p.link || '', technologies: commaSeparatedToArray(p.technologiesText) })),
    [projects]
  );

  const payload = useMemo(
    () => ({ title, templateId, personal, education, experience, skills: skillsForApi, projects: projectsForApi, sectionOrder }),
    [title, templateId, personal, education, experience, skillsForApi, projectsForApi, sectionOrder]
  );

  const serialized = useMemo(() => JSON.stringify(payload), [payload]);

  // Load resume
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/resumes/${id}`);
        const d = res.data.data;
        if (cancelled || !d) return;
        setTitle(d.title || 'Untitled Resume');
        setTemplateId(d.templateId || 'classic');
        setPersonal({ ...emptyPersonal(), ...(d.personal || {}) });
        setEducation(d.education || []);
        setExperience(d.experience || []);
        setSkills(
          d.skills?.length
            ? d.skills.map((g) => ({ category: g.category || '', itemsText: Array.isArray(g.items) ? g.items.join(', ') : '' }))
            : [{ category: '', itemsText: '' }]
        );
        setProjects(
          (d.projects || []).map((p) => ({ name: p.name || '', description: p.description || '', link: p.link || '', technologiesText: Array.isArray(p.technologies) ? p.technologies.join(', ') : '' }))
        );
        setSectionOrder(d.sectionOrder?.length ? d.sectionOrder : ['summary', 'experience', 'education', 'skills', 'projects']);
      } catch {
        navigate('/dashboard', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

  // Auto-save with debounce
  useEffect(() => {
    if (loading) return;
    setSaveStatus('saving');
    const t = setTimeout(async () => {
      try {
        await api.put(`/resumes/${id}`, JSON.parse(serialized));
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [serialized, id, loading]);

  const downloadPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const res = await api.get(`/resumes/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safe = (title || 'resume').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'resume';
      a.href = url;
      a.download = `${safe}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF downloaded!', 'success');
    } catch {
      showToast('Could not download PDF. Try again.');
    } finally {
      setPdfLoading(false);
    }
  }, [id, title]);

  // ── Section order drag ─────────────────────────────────────────
  const handleSectionDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSectionOrder((prev) => {
        const oldIdx = prev.indexOf(active.id);
        const newIdx = prev.indexOf(over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  // ── Education ──────────────────────────────────────────────────
  const addEducation = () =>
    setEducation((p) => [...p, { school: '', degree: '', field: '', startDate: '', endDate: '', gpa: '', description: '' }]);
  const updateEducation = (i, field, val) =>
    setEducation((p) => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const removeEducation = (i) => setEducation((p) => p.filter((_, idx) => idx !== i));
  const handleEduDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      setEducation((prev) => arrayMove(prev, prev.findIndex((e) => e._id === active.id || active.id === `edu-${prev.indexOf(e)}`), prev.findIndex((e) => e._id === over.id || over.id === `edu-${prev.indexOf(e)}`)));
    }
  };

  // ── Experience ─────────────────────────────────────────────────
  const addExperience = () =>
    setExperience((p) => [...p, { company: '', title: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] }]);
  const updateExperience = (i, field, val) =>
    setExperience((p) => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const removeExperience = (i) => setExperience((p) => p.filter((_, idx) => idx !== i));
  const updateBullet = (ei, bi, val) =>
    setExperience((p) => p.map((ex, idx) => idx !== ei ? ex : { ...ex, bullets: ex.bullets.map((b, j) => j === bi ? val : b) }));
  const addBullet = (ei) =>
    setExperience((p) => p.map((ex, idx) => idx !== ei ? ex : { ...ex, bullets: [...(ex.bullets || []), ''] }));
  const removeBullet = (ei, bi) =>
    setExperience((p) => p.map((ex, idx) => idx !== ei ? ex : { ...ex, bullets: ex.bullets.filter((_, j) => j !== bi) }));
  const handleExpDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      setExperience((prev) => {
        const oldIdx = prev.findIndex((_, i) => `exp-${i}` === active.id);
        const newIdx = prev.findIndex((_, i) => `exp-${i}` === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  // ── Skills ─────────────────────────────────────────────────────
  const addSkillGroup = () => setSkills((p) => [...p, { category: '', itemsText: '' }]);
  const updateSkillCategory = (i, val) =>
    setSkills((p) => p.map((g, idx) => idx === i ? { ...g, category: val } : g));
  const updateSkillItemsText = (i, val) =>
    setSkills((p) => p.map((g, idx) => idx === i ? { ...g, itemsText: val } : g));
  const removeSkillGroup = (i) =>
    setSkills((p) => p.length <= 1 ? p : p.filter((_, idx) => idx !== i));

  // ── Projects ───────────────────────────────────────────────────
  const addProject = () =>
    setProjects((p) => [...p, { name: '', description: '', link: '', technologiesText: '' }]);
  const updateProject = (i, field, val) =>
    setProjects((p) => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const removeProject = (i) => setProjects((p) => p.filter((_, idx) => idx !== i));
  const handleProjDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      setProjects((prev) => {
        const oldIdx = prev.findIndex((_, i) => `proj-${i}` === active.id);
        const newIdx = prev.findIndex((_, i) => `proj-${i}` === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  // ── Photo ──────────────────────────────────────────────────────
  const onResumePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumePhotoError('');
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await api.post(`/resumes/${id}/photo`, fd);
      const photoUrl = res.data.data?.photoUrl;
      if (photoUrl) setPersonal((p) => ({ ...p, photoUrl }));
      showToast('Photo updated!', 'success');
    } catch (err) {
      setResumePhotoError(getApiErrorMessage(err, 'Photo upload failed. Use JPEG, PNG, or WebP under 2MB.'));
    }
    e.target.value = '';
  };

  const clearResumePhoto = () => {
    setResumePhotoError('');
    setPersonal((p) => ({ ...p, photoUrl: '' }));
  };

  const goToPreviousStep = () => setStep((current) => Math.max(current - 1, 0));
  const goToNextStep = () => setStep((current) => Math.min(current + 1, STEPS.length - 1));

  const summaryLen = (personal?.summary || '').length;

  if (loading) {
    return (
      <div className="re-loading">
        <div className="spinner" />
        <span>Loading editor…</span>
      </div>
    );
  }

  return (
    <div className="re-page">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast--${toast.type}`}>{toast.text}</div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="re-nav">
        <div className="re-nav-left">
          <Link to="/dashboard" className="re-back">← Dashboard</Link>
          <span className="re-nav-title">Resume Editor</span>
        </div>
        <div className="re-nav-actions">
          <span className={`re-save re-save--${saveStatus}`} role="status">
            {saveStatus === 'saving' && '⏳ Saving…'}
            {saveStatus === 'saved'  && '✅ Saved'}
            {saveStatus === 'error'  && '❌ Save failed'}
          </span>
          <button type="button" className="re-btn-ghost" onClick={() => setGalleryOpen(true)}>
            🎨 Templates
          </button>
          <button type="button" className="re-btn-primary" onClick={downloadPdf} disabled={pdfLoading}>
            {pdfLoading ? '⏳ PDF…' : '📥 Download PDF'}
          </button>
        </div>
      </nav>

      <div className="re-layout">
        {/* ── Sidebar ── */}
        <aside className="re-sidebar">
          <label className="re-label">
            <span className="re-label-text">Resume title</span>
            <input className="re-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Software Engineer Resume" />
          </label>

          {/* Section order */}
          <div className="re-section-order-wrap">
            <p className="re-steps-label">Section order (drag to reorder)</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
              <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                {sectionOrder.map((sec) => (
                  <SortableItem key={sec} id={sec}>
                    <span className="re-section-order-label">{SECTION_ORDER_LABELS[sec] || sec}</span>
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="re-steps-wrap">
            <p className="re-steps-label">Edit sections</p>
            <div className="re-steps" role="tablist">
              {STEPS.map((label, i) => (
                <button key={label} type="button" role="tab" aria-selected={step === i}
                  className={`re-step ${step === i ? 're-step--active' : ''}`} onClick={() => setStep(i)}>
                  <span className="re-step-num">{i + 1}</span>
                  <span className="re-step-name">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="re-forms">

            {/* ── STEP 0: Personal ── */}
            {step === 0 && (
              <div className="re-panel">
                {[
                  { field: 'fullName', label: 'Full Name', placeholder: 'Jane Doe' },
                  { field: 'email',    label: 'Email Address', placeholder: 'jane@example.com' },
                  { field: 'phone',    label: 'Phone Number', placeholder: '+1 555 000 0000' },
                  { field: 'location', label: 'Location', placeholder: 'City, Country' },
                ].map(({ field, label, placeholder }) => (
                  <label key={field} className="re-label">
                    {label}
                    <input className="re-input" value={personal[field] || ''} placeholder={placeholder}
                      onChange={(e) => setPersonal({ ...personal, [field]: e.target.value })} />
                  </label>
                ))}
                <label className="re-label">
                  LinkedIn URL
                  <input className="re-input" value={personal.linkedin} placeholder="https://linkedin.com/in/…"
                    onChange={(e) => setPersonal({ ...personal, linkedin: e.target.value })} />
                </label>
                <label className="re-label">
                  Personal Website
                  <input className="re-input" value={personal.website} placeholder="https://yoursite.com"
                    onChange={(e) => setPersonal({ ...personal, website: e.target.value })} />
                </label>
                <label className="re-label">
                  Professional Summary
                  <textarea className="re-textarea" rows={5} value={personal.summary}
                    onChange={(e) => setPersonal({ ...personal, summary: e.target.value })} />
                  <span className={`re-char-count ${summaryLen < 150 ? 're-char-count--warn' : summaryLen > 600 ? 're-char-count--warn' : 're-char-count--ok'}`}>
                    {summaryLen} / 600 chars {summaryLen < 150 && summaryLen > 0 ? '(aim for 150+)' : ''}
                  </span>
                </label>
                <div className="re-photo-block">
                  <label className="re-label">
                    <span className="re-label-text">Resume photo (optional)</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onResumePhotoChange} />
                  </label>
                  <p className="re-field-hint">Shown only on this resume. Your account photo is separate — update it under <Link to="/profile">Profile</Link>.</p>
                  {resumePhotoError && <p className="re-photo-error" role="alert">{resumePhotoError}</p>}
                  {personal.photoUrl && (
                    <div className="re-photo-preview-row">
                      <img className="re-photo-thumb"
                        src={personal.photoUrl.startsWith('http') ? personal.photoUrl : `${API_URL}${personal.photoUrl}`}
                        alt="Resume" />
                      <button type="button" className="re-btn-text" onClick={clearResumePhoto}>Remove photo</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 1: Education ── */}
            {step === 1 && (
              <div className="re-panel">
                <div className="re-panel-head">
                  <h3>🎓 Education</h3>
                  <button type="button" className="re-btn-small" onClick={addEducation}>+ Add</button>
                </div>
                {education.length === 0 && <p className="re-hint">Add schools, universities, or programs you've attended.</p>}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEduDragEnd}>
                  <SortableContext items={education.map((_, i) => `edu-${i}`)} strategy={verticalListSortingStrategy}>
                    {education.map((ed, idx) => (
                      <SortableItem key={`edu-${idx}`} id={`edu-${idx}`}>
                        <div className="re-card-block">
                          <div className="re-card-head">
                            <span>{ed.school || `Entry ${idx + 1}`}</span>
                            <button type="button" className="re-btn-text" onClick={() => removeEducation(idx)}>Remove</button>
                          </div>
                          {['school', 'degree', 'field', 'startDate', 'endDate', 'gpa'].map((field) => (
                            <label key={field} className="re-label re-label--compact">
                              {FIELD_LABELS[field] || field}
                              <input className="re-input" value={ed[field] || ''}
                                onChange={(e) => updateEducation(idx, field, e.target.value)} />
                            </label>
                          ))}
                          <label className="re-label re-label--compact">
                            Additional notes
                            <textarea className="re-textarea" rows={2} value={ed.description || ''}
                              onChange={(e) => updateEducation(idx, 'description', e.target.value)} />
                          </label>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* ── STEP 2: Experience ── */}
            {step === 2 && (
              <div className="re-panel">
                <div className="re-panel-head">
                  <h3>💼 Experience</h3>
                  <button type="button" className="re-btn-small" onClick={addExperience}>+ Add</button>
                </div>
                {experience.length === 0 && <p className="re-hint">Add jobs, internships, or volunteer roles.</p>}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExpDragEnd}>
                  <SortableContext items={experience.map((_, i) => `exp-${i}`)} strategy={verticalListSortingStrategy}>
                    {experience.map((ex, idx) => (
                      <SortableItem key={`exp-${idx}`} id={`exp-${idx}`}>
                        <div className="re-card-block">
                          <div className="re-card-head">
                            <span>{ex.title ? `${ex.title} @ ${ex.company}` : `Role ${idx + 1}`}</span>
                            <button type="button" className="re-btn-text" onClick={() => removeExperience(idx)}>Remove</button>
                          </div>
                          {['title', 'company', 'location', 'startDate', 'endDate'].map((field) => (
                            <label key={field} className="re-label re-label--compact">
                              {FIELD_LABELS[field] || field}
                              <input className="re-input" value={ex[field] || ''}
                                onChange={(e) => updateExperience(idx, field, e.target.value)}
                                disabled={field === 'endDate' && ex.current} />
                            </label>
                          ))}
                          <label className="re-check">
                            <input type="checkbox" checked={!!ex.current}
                              onChange={(e) => updateExperience(idx, 'current', e.target.checked)} />
                            I currently work here
                          </label>
                          <p className="re-sub">Bullet points (achievements & responsibilities)</p>
                          {(ex.bullets || ['']).map((b, bi) => (
                            <div key={bi} className="re-bullet-row">
                              <input className="re-input" value={b}
                                onChange={(e) => updateBullet(idx, bi, e.target.value)}
                                placeholder="Achieved X by doing Y, resulting in Z" />
                              <button type="button" className="re-btn-text" onClick={() => removeBullet(idx, bi)}>×</button>
                            </div>
                          ))}
                          <button type="button" className="re-btn-small" onClick={() => addBullet(idx)}>+ Bullet</button>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* ── STEP 3: Skills ── */}
            {step === 3 && (
              <div className="re-panel">
                <div className="re-panel-head">
                  <h3>⚡ Skills</h3>
                  <button type="button" className="re-btn-small" onClick={addSkillGroup}>+ Group</button>
                </div>
                {skills.map((g, idx) => (
                  <div key={idx} className="re-card-block">
                    <div className="re-card-head">
                      <span>{g.category || `Group ${idx + 1}`}</span>
                      <button type="button" className="re-btn-text" onClick={() => removeSkillGroup(idx)}>Remove</button>
                    </div>
                    <label className="re-label re-label--compact">
                      <span className="re-label-text">Category (optional)</span>
                      <input className="re-input" value={g.category || ''}
                        onChange={(e) => updateSkillCategory(idx, e.target.value)}
                        placeholder="e.g. Programming Languages" />
                    </label>
                    <label className="re-label re-label--compact">
                      <span className="re-label-text">Skills (comma-separated)</span>
                      <textarea className="re-textarea re-textarea--list" rows={3} value={g.itemsText ?? ''}
                        onChange={(e) => updateSkillItemsText(idx, e.target.value)}
                        placeholder="JavaScript, React, Node.js, Python, AWS"
                        spellCheck={false} />
                      <span className="re-field-hint">Separate with commas. Spaces within a skill name are preserved.</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* ── STEP 4: Projects ── */}
            {step === 4 && (
              <div className="re-panel">
                <div className="re-panel-head">
                  <h3>🚀 Projects</h3>
                  <button type="button" className="re-btn-small" onClick={addProject}>+ Add</button>
                </div>
                {projects.length === 0 && <p className="re-hint">Showcase side projects, coursework, or open source contributions.</p>}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProjDragEnd}>
                  <SortableContext items={projects.map((_, i) => `proj-${i}`)} strategy={verticalListSortingStrategy}>
                    {projects.map((pr, idx) => (
                      <SortableItem key={`proj-${idx}`} id={`proj-${idx}`}>
                        <div className="re-card-block">
                          <div className="re-card-head">
                            <span>{pr.name || `Project ${idx + 1}`}</span>
                            <button type="button" className="re-btn-text" onClick={() => removeProject(idx)}>Remove</button>
                          </div>
                          <label className="re-label re-label--compact">
                            Project Name
                            <input className="re-input" value={pr.name || ''}
                              onChange={(e) => updateProject(idx, 'name', e.target.value)} />
                          </label>
                          <label className="re-label re-label--compact">
                            Link / URL
                            <input className="re-input" value={pr.link || ''}
                              onChange={(e) => updateProject(idx, 'link', e.target.value)}
                              placeholder="https://github.com/…" />
                          </label>
                          <label className="re-label re-label--compact">
                            <span className="re-label-text">Technologies (comma-separated)</span>
                            <textarea className="re-textarea re-textarea--list" rows={2} value={pr.technologiesText ?? ''}
                              onChange={(e) => updateProject(idx, 'technologiesText', e.target.value)}
                              placeholder="React, TypeScript, MongoDB, Docker"
                              spellCheck={false} />
                          </label>
                          <label className="re-label re-label--compact">
                            Description
                            <textarea className="re-textarea" rows={3} value={pr.description || ''}
                              onChange={(e) => updateProject(idx, 'description', e.target.value)}
                              placeholder="What it does and what you built/learned" />
                          </label>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
            <div className="re-step-actions">
              <button
                type="button"
                className="re-btn-ghost"
                onClick={goToPreviousStep}
                disabled={step === 0}
              >
                Previous
              </button>
              {step < STEPS.length - 1 && (
                <button
                  type="button"
                  className="re-btn-primary"
                  onClick={goToNextStep}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── Preview ── */}
        <main className="re-preview-wrap">
          <div className="re-preview-header">
            <h2 className="re-preview-heading">👁 Live Preview</h2>
            <p className="re-preview-sub">Updates as you type</p>
          </div>
          <div className="re-preview-scroller">
            <ResumePreview
              templateId={templateId} title={title} personal={personal}
              education={education} experience={experience}
              skills={skillsForApi} projects={projectsForApi}
              sectionOrder={sectionOrder}
            />
          </div>
        </main>
      </div>

      <TemplateGallery open={galleryOpen} onClose={() => setGalleryOpen(false)}
        selectedId={templateId} onSelect={(tid) => setTemplateId(tid)} />
    </div>
  );
}

export default ResumeEditor;
