import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { API_URL } from '../utils/api';
import { getApiErrorMessage } from '../utils/apiError';
import { commaSeparatedToArray } from '../utils/commaList';
import ResumePreview from './ResumePreview';
import TemplateGallery from './TemplateGallery';
import './ResumeEditor.css';

const STEPS = ['Personal', 'Education', 'Experience', 'Skills', 'Projects'];

const emptyPersonal = () => ({
  fullName: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  linkedin: '',
  website: '',
  photoUrl: ''
});

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
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [resumePhotoError, setResumePhotoError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const skillsForApi = useMemo(
    () =>
      skills.map((g) => ({
        category: g.category || '',
        items: commaSeparatedToArray(g.itemsText)
      })),
    [skills]
  );

  const projectsForApi = useMemo(
    () =>
      projects.map((p) => ({
        name: p.name || '',
        description: p.description || '',
        link: p.link || '',
        technologies: commaSeparatedToArray(p.technologiesText)
      })),
    [projects]
  );

  const payload = useMemo(
    () => ({
      title,
      templateId,
      personal,
      education,
      experience,
      skills: skillsForApi,
      projects: projectsForApi
    }),
    [title, templateId, personal, education, experience, skillsForApi, projectsForApi]
  );

  const serialized = useMemo(() => JSON.stringify(payload), [payload]);

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
            ? d.skills.map((g) => ({
                category: g.category || '',
                itemsText: Array.isArray(g.items) ? g.items.join(', ') : ''
              }))
            : [{ category: '', itemsText: '' }]
        );
        setProjects(
          (d.projects || []).map((p) => ({
            name: p.name || '',
            description: p.description || '',
            link: p.link || '',
            technologiesText: Array.isArray(p.technologies) ? p.technologies.join(', ') : ''
          }))
        );
      } catch {
        navigate('/dashboard', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

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
      showToast('PDF downloaded successfully!', 'success');
    } catch {
      showToast('Could not download PDF. Try again.');
    } finally {
      setPdfLoading(false);
    }
  }, [id, title]);

  const addEducation = () => {
    setEducation((prev) => [
      ...prev,
      { school: '', degree: '', field: '', startDate: '', endDate: '', gpa: '', description: '' }
    ]);
  };

  const updateEducation = (index, field, value) => {
    setEducation((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeEducation = (index) => {
    setEducation((prev) => prev.filter((_, i) => i !== index));
  };

  const addExperience = () => {
    setExperience((prev) => [
      ...prev,
      { company: '', title: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] }
    ]);
  };

  const updateExperience = (index, field, value) => {
    setExperience((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateBullet = (expIndex, bulletIndex, value) => {
    setExperience((prev) => {
      const next = [...prev];
      const bullets = [...(next[expIndex].bullets || [])];
      bullets[bulletIndex] = value;
      next[expIndex] = { ...next[expIndex], bullets };
      return next;
    });
  };

  const addBullet = (expIndex) => {
    setExperience((prev) => {
      const next = [...prev];
      next[expIndex] = {
        ...next[expIndex],
        bullets: [...(next[expIndex].bullets || []), '']
      };
      return next;
    });
  };

  const removeBullet = (expIndex, bulletIndex) => {
    setExperience((prev) => {
      const next = [...prev];
      const bullets = (next[expIndex].bullets || []).filter((_, i) => i !== bulletIndex);
      next[expIndex] = { ...next[expIndex], bullets };
      return next;
    });
  };

  const removeExperience = (index) => {
    setExperience((prev) => prev.filter((_, i) => i !== index));
  };

  const addSkillGroup = () => {
    setSkills((prev) => [...prev, { category: '', itemsText: '' }]);
  };

  const updateSkillCategory = (index, value) => {
    setSkills((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], category: value };
      return next;
    });
  };

  const updateSkillItemsText = (index, value) => {
    setSkills((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], itemsText: value };
      return next;
    });
  };

  const removeSkillGroup = (index) => {
    setSkills((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const addProject = () => {
    setProjects((prev) => [...prev, { name: '', description: '', link: '', technologiesText: '' }]);
  };

  const updateProject = (index, field, value) => {
    setProjects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeProject = (index) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

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
    } catch (err) {
      setResumePhotoError(
        getApiErrorMessage(err, 'Resume photo upload failed. Use JPEG, PNG, or WebP under 2MB.')
      );
    }
    e.target.value = '';
  };

  const clearResumePhoto = () => {
    setResumePhotoError('');
    setPersonal((p) => ({ ...p, photoUrl: '' }));
  };

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

      <nav className="re-nav">
        <div className="re-nav-left">
          <Link to="/dashboard" className="re-back">
            <span className="re-back-icon" aria-hidden>
              ←
            </span>
            Dashboard
          </Link>
          <span className="re-nav-title">Resume Editor</span>
        </div>
        <div className="re-nav-actions">
          <span className={`re-save re-save--${saveStatus}`} role="status">
            {saveStatus === 'saving' && '⏳ Saving…'}
            {saveStatus === 'saved' && '✅ Saved'}
            {saveStatus === 'error' && '❌ Save failed'}
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
        <aside className="re-sidebar">
          <label className="re-label">
            <span className="re-label-text">Resume title</span>
            <input
              className="re-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Software Engineer Resume"
            />
          </label>

          <div className="re-steps-wrap">
            <p className="re-steps-label">Sections</p>
            <div className="re-steps" role="tablist" aria-label="Editor sections">
              {STEPS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={step === i}
                  className={`re-step ${step === i ? 're-step--active' : ''}`}
                  onClick={() => setStep(i)}
                >
                  <span className="re-step-num">{i + 1}</span>
                  <span className="re-step-name">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="re-forms">
            {step === 0 && (
              <div className="re-panel">
                {['fullName', 'email', 'phone', 'location'].map((field) => (
                  <label key={field} className="re-label">
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    <input
                      className="re-input"
                      value={personal[field] || ''}
                      onChange={(e) => setPersonal({ ...personal, [field]: e.target.value })}
                    />
                  </label>
                ))}
                <label className="re-label">
                  LinkedIn
                  <input
                    className="re-input"
                    value={personal.linkedin}
                    onChange={(e) => setPersonal({ ...personal, linkedin: e.target.value })}
                    placeholder="https://"
                  />
                </label>
                <label className="re-label">
                  Website
                  <input
                    className="re-input"
                    value={personal.website}
                    onChange={(e) => setPersonal({ ...personal, website: e.target.value })}
                    placeholder="https://"
                  />
                </label>
                <label className="re-label">
                  Professional summary
                  <textarea
                    className="re-textarea"
                    rows={5}
                    value={personal.summary}
                    onChange={(e) => setPersonal({ ...personal, summary: e.target.value })}
                  />
                </label>
                <div className="re-photo-block">
                  <label className="re-label">
                    <span className="re-label-text">Resume photo</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={onResumePhotoChange}
                    />
                  </label>
                  <p className="re-field-hint">
                    Shown only on this resume and its preview/PDF. Your account profile picture is unchanged — update
                    that under <Link to="/profile">Profile</Link>.
                  </p>
                  {resumePhotoError ? (
                    <p className="re-photo-error" role="alert">
                      {resumePhotoError}
                    </p>
                  ) : null}
                  {personal.photoUrl ? (
                    <div className="re-photo-preview-row">
                      <img
                        className="re-photo-thumb"
                        src={personal.photoUrl.startsWith('http') ? personal.photoUrl : `${API_URL}${personal.photoUrl}`}
                        alt="Resume"
                      />
                      <button type="button" className="re-btn-text" onClick={clearResumePhoto}>
                        Remove resume photo
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="re-panel">
                <div className="re-panel-head">
                  <h3>🎓 Education</h3>
                  <button type="button" className="re-btn-small" onClick={addEducation}>
                    + Add
                  </button>
                </div>
                {education.length === 0 && <p className="re-hint">Add schools or programs you have completed.</p>}
                {education.map((ed, idx) => (
                  <div key={idx} className="re-card-block">
                    <div className="re-card-head">
                      <span>Entry {idx + 1}</span>
                      <button type="button" className="re-btn-text" onClick={() => removeEducation(idx)}>
                        Remove
                      </button>
                    </div>
                    {['school', 'degree', 'field', 'startDate', 'endDate', 'gpa'].map((field) => (
                      <label key={field} className="re-label re-label--compact">
                        {field}
                        <input
                          className="re-input"
                          value={ed[field] || ''}
                          onChange={(e) => updateEducation(idx, field, e.target.value)}
                        />
                      </label>
                    ))}
                    <label className="re-label re-label--compact">
                      Description
                      <textarea
                        className="re-textarea"
                        rows={2}
                        value={ed.description || ''}
                        onChange={(e) => updateEducation(idx, 'description', e.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="re-panel">
                <div className="re-panel-head">
                  <h3>💼 Experience</h3>
                  <button type="button" className="re-btn-small" onClick={addExperience}>
                    + Add
                  </button>
                </div>
                {experience.length === 0 && <p className="re-hint">Add internships, jobs, or volunteering.</p>}
                {experience.map((ex, idx) => (
                  <div key={idx} className="re-card-block">
                    <div className="re-card-head">
                      <span>Role {idx + 1}</span>
                      <button type="button" className="re-btn-text" onClick={() => removeExperience(idx)}>
                        Remove
                      </button>
                    </div>
                    {['title', 'company', 'location', 'startDate', 'endDate'].map((field) => (
                      <label key={field} className="re-label re-label--compact">
                        {field}
                        <input
                          className="re-input"
                          value={ex[field] || ''}
                          onChange={(e) => updateExperience(idx, field, e.target.value)}
                          disabled={field === 'endDate' && ex.current}
                        />
                      </label>
                    ))}
                    <label className="re-check">
                      <input
                        type="checkbox"
                        checked={!!ex.current}
                        onChange={(e) => updateExperience(idx, 'current', e.target.checked)}
                      />
                      I currently work here
                    </label>
                    <p className="re-sub">Highlights (bullet points)</p>
                    {(ex.bullets || ['']).map((b, bi) => (
                      <div key={bi} className="re-bullet-row">
                        <input
                          className="re-input"
                          value={b}
                          onChange={(e) => updateBullet(idx, bi, e.target.value)}
                          placeholder="Achievement or responsibility"
                        />
                        <button type="button" className="re-btn-text" onClick={() => removeBullet(idx, bi)}>
                          ×
                        </button>
                      </div>
                    ))}
                    <button type="button" className="re-btn-small" onClick={() => addBullet(idx)}>
                      + Bullet
                    </button>
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="re-panel">
                <div className="re-panel-head">
                  <h3>⚡ Skills</h3>
                  <button type="button" className="re-btn-small" onClick={addSkillGroup}>
                    + Group
                  </button>
                </div>
                {skills.map((g, idx) => (
                  <div key={idx} className="re-card-block">
                    <div className="re-card-head">
                      <span>Group {idx + 1}</span>
                      <button type="button" className="re-btn-text" onClick={() => removeSkillGroup(idx)}>
                        Remove
                      </button>
                    </div>
                    <label className="re-label re-label--compact">
                      <span className="re-label-text">Category (optional)</span>
                      <input
                        className="re-input"
                        value={g.category || ''}
                        onChange={(e) => updateSkillCategory(idx, e.target.value)}
                        placeholder="e.g. Languages & frameworks"
                      />
                    </label>
                    <label className="re-label re-label--compact">
                      <span className="re-label-text">Skills</span>
                      <textarea
                        className="re-textarea re-textarea--list"
                        rows={3}
                        value={g.itemsText ?? ''}
                        onChange={(e) => updateSkillItemsText(idx, e.target.value)}
                        placeholder="Type freely — separate with commas: JavaScript, React, Node.js, C++, AWS"
                        spellCheck={false}
                      />
                      <span className="re-field-hint">Commas split into separate skills. Spaces inside a skill are kept.</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="re-panel">
                <div className="re-panel-head">
                  <h3>🚀 Projects</h3>
                  <button type="button" className="re-btn-small" onClick={addProject}>
                    + Add
                  </button>
                </div>
                {projects.length === 0 && <p className="re-hint">Showcase coursework, apps, or open source.</p>}
                {projects.map((pr, idx) => (
                  <div key={idx} className="re-card-block">
                    <div className="re-card-head">
                      <span>Project {idx + 1}</span>
                      <button type="button" className="re-btn-text" onClick={() => removeProject(idx)}>
                        Remove
                      </button>
                    </div>
                    <label className="re-label re-label--compact">
                      Name
                      <input
                        className="re-input"
                        value={pr.name || ''}
                        onChange={(e) => updateProject(idx, 'name', e.target.value)}
                      />
                    </label>
                    <label className="re-label re-label--compact">
                      Link
                      <input
                        className="re-input"
                        value={pr.link || ''}
                        onChange={(e) => updateProject(idx, 'link', e.target.value)}
                      />
                    </label>
                    <label className="re-label re-label--compact">
                      <span className="re-label-text">Technologies</span>
                      <textarea
                        className="re-textarea re-textarea--list"
                        rows={2}
                        value={pr.technologiesText ?? ''}
                        onChange={(e) => updateProject(idx, 'technologiesText', e.target.value)}
                        placeholder="React, TypeScript, MongoDB, Docker — use commas between tools"
                        spellCheck={false}
                      />
                      <span className="re-field-hint">Separate tools with commas; you can use spaces in each name.</span>
                    </label>
                    <label className="re-label re-label--compact">
                      Description
                      <textarea
                        className="re-textarea"
                        rows={3}
                        value={pr.description || ''}
                        onChange={(e) => updateProject(idx, 'description', e.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="re-preview-wrap">
          <div className="re-preview-header">
            <h2 className="re-preview-heading">👁 Live Preview</h2>
            <p className="re-preview-sub">Updates as you type</p>
          </div>
          <div className="re-preview-scroller">
            <ResumePreview
              templateId={templateId}
              title={title}
              personal={personal}
              education={education}
              experience={experience}
              skills={skillsForApi}
              projects={projectsForApi}
            />
          </div>
        </main>
      </div>

      <TemplateGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        selectedId={templateId}
        onSelect={(tid) => setTemplateId(tid)}
      />
    </div>
  );
}

export default ResumeEditor;
