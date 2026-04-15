import React from 'react';
import { API_URL } from '../utils/api';
import './ResumePreview.css';

function contactLine(p) {
  return [p.email, p.phone, p.location].filter(Boolean).join(' · ');
}

function linksLine(p) {
  return [p.linkedin, p.website].filter(Boolean).join(' · ');
}

function ResumePreview({ templateId, title, personal, education, experience, skills, projects, sectionOrder }) {
  const p = personal || {};
  const order = sectionOrder || ['summary', 'experience', 'education', 'skills', 'projects'];
  const photo = p.photoUrl
    ? p.photoUrl.startsWith('http') ? p.photoUrl : `${API_URL}${p.photoUrl}`
    : null;

  const header = (
    <header className="rp-header">
      {photo ? <img className="rp-photo" src={photo} alt="" /> : null}
      <div className="rp-header-text">
        <h1 className="rp-name">{p.fullName || 'Your Name'}</h1>
        <p className="rp-contact">{contactLine(p) || 'Email · Phone · Location'}</p>
        {(p.linkedin || p.website) && <p className="rp-links">{linksLine(p)}</p>}
      </div>
    </header>
  );

  const sectionBlocks = {
    summary: p.summary ? (
      <section key="summary" className="rp-section">
        <h2 className="rp-section-title">Summary</h2>
        <p className="rp-body">{p.summary}</p>
      </section>
    ) : null,

    experience: experience?.length ? (
      <section key="experience" className="rp-section">
        <h2 className="rp-section-title">Experience</h2>
        {experience.map((ex, i) => (
          <div key={ex._id || i} className="rp-item">
            <div className="rp-item-head">
              <strong>{ex.title || 'Role'}</strong>
              <span className="rp-muted">
                {ex.company}
                {(ex.startDate || ex.endDate || ex.current)
                  ? ` · ${ex.startDate || ''}${ex.current ? ' – Present' : ` – ${ex.endDate || ''}`}`
                  : ''}
              </span>
            </div>
            {ex.location ? <p className="rp-muted rp-tight">{ex.location}</p> : null}
            <ul className="rp-bullets">
              {(ex.bullets || []).filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          </div>
        ))}
      </section>
    ) : null,

    education: education?.length ? (
      <section key="education" className="rp-section">
        <h2 className="rp-section-title">Education</h2>
        {education.map((ed, i) => (
          <div key={ed._id || i} className="rp-item">
            <strong>{ed.degree || ed.school || 'Program'}</strong>
            <p className="rp-muted rp-tight">
              {[ed.school, ed.field, ed.startDate && `${ed.startDate} – ${ed.endDate || ''}`, ed.gpa ? `GPA: ${ed.gpa}` : ''].filter(Boolean).join(' · ')}
            </p>
            {ed.description ? <p className="rp-body rp-tight">{ed.description}</p> : null}
          </div>
        ))}
      </section>
    ) : null,

    skills: skills?.length ? (
      <section key="skills" className="rp-section">
        <h2 className="rp-section-title">Skills</h2>
        <div className="rp-skills">
          {skills.map((g, i) => (
            <p key={g._id || i} className="rp-skill-row">
              {g.category ? <strong>{g.category}: </strong> : null}
              {(g.items || []).filter(Boolean).join(', ') || '—'}
            </p>
          ))}
        </div>
      </section>
    ) : null,

    projects: projects?.length ? (
      <section key="projects" className="rp-section">
        <h2 className="rp-section-title">Projects</h2>
        {projects.map((pr, i) => (
          <div key={pr._id || i} className="rp-item">
            <strong>{pr.name || 'Project'}</strong>
            {pr.link ? <p className="rp-link rp-tight">{pr.link}</p> : null}
            {(pr.technologies || []).filter(Boolean).length ? (
              <p className="rp-muted rp-tight">{(pr.technologies || []).filter(Boolean).join(', ')}</p>
            ) : null}
            {pr.description ? <p className="rp-body rp-tight">{pr.description}</p> : null}
          </div>
        ))}
      </section>
    ) : null,
  };

  // Two-column template has a different layout
  if (templateId === 'twocolumn') {
    return (
      <div className="rp-paper rp-paper--twocolumn">
        <p className="rp-doc-title">{title || 'Untitled Resume'}</p>
        {header}
        <div className="rp-two-col">
          <aside className="rp-sidebar-col">
            {sectionBlocks.skills}
            {p.linkedin || p.website ? (
              <section className="rp-section">
                <h2 className="rp-section-title">Links</h2>
                {p.linkedin && <p className="rp-link rp-tight">{p.linkedin}</p>}
                {p.website  && <p className="rp-link rp-tight">{p.website}</p>}
              </section>
            ) : null}
          </aside>
          <div className="rp-main-col">
            {order.filter((s) => s !== 'skills').map((s) => sectionBlocks[s] || null)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rp-paper rp-paper--${templateId || 'classic'}`}>
      <p className="rp-doc-title">{title || 'Untitled Resume'}</p>
      {header}
      {order.map((s) => sectionBlocks[s] || null)}
    </div>
  );
}

export default ResumePreview;
