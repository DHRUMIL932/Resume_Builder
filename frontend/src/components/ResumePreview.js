import React from 'react';
import { API_URL } from '../utils/api';
import './ResumePreview.css';

function contactLine(personal) {
  return [personal.email, personal.phone, personal.location].filter(Boolean).join(' · ');
}

function linksLine(personal) {
  return [personal.linkedin, personal.website].filter(Boolean).join(' · ');
}

function ResumePreview({ templateId, title, personal, education, experience, skills, projects }) {
  const p = personal || {};
  const photo = p.photoUrl
    ? p.photoUrl.startsWith('http')
      ? p.photoUrl
      : `${API_URL}${p.photoUrl}`
    : null;

  const header = (
    <header className="rp-header">
      {photo ? <img className="rp-photo" src={photo} alt="" /> : null}
      <div className="rp-header-text">
        <h1 className="rp-name">{p.fullName || 'Your name'}</h1>
        <p className="rp-contact">{contactLine(p) || 'Email · Phone · Location'}</p>
        {(p.linkedin || p.website) && <p className="rp-links">{linksLine(p)}</p>}
      </div>
    </header>
  );

  const summary = p.summary ? (
    <section className="rp-section">
      <h2 className="rp-section-title">Summary</h2>
      <p className="rp-body">{p.summary}</p>
    </section>
  ) : null;

  const expBlock =
    experience && experience.length ? (
      <section className="rp-section">
        <h2 className="rp-section-title">Experience</h2>
        {experience.map((ex) => (
          <div key={ex._id || `${ex.company}-${ex.title}`} className="rp-item">
            <div className="rp-item-head">
              <strong>{ex.title || 'Role'}</strong>
              <span className="rp-muted">
                {ex.company}
                {ex.startDate || ex.endDate || ex.current
                  ? ` · ${ex.startDate || ''}${ex.current ? ' – Present' : ` – ${ex.endDate || ''}`}`
                  : ''}
              </span>
            </div>
            {ex.location ? <p className="rp-muted rp-tight">{ex.location}</p> : null}
            <ul className="rp-bullets">
              {(ex.bullets || []).filter(Boolean).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    ) : null;

  const eduBlock =
    education && education.length ? (
      <section className="rp-section">
        <h2 className="rp-section-title">Education</h2>
        {education.map((ed) => (
          <div key={ed._id || ed.school} className="rp-item">
            <strong>{ed.degree || ed.school || 'Program'}</strong>
            <p className="rp-muted rp-tight">
              {[ed.school, ed.field, ed.startDate && `${ed.startDate} – ${ed.endDate || ''}`, ed.gpa ? `GPA: ${ed.gpa}` : '']
                .filter(Boolean)
                .join(' · ')}
            </p>
            {ed.description ? <p className="rp-body rp-tight">{ed.description}</p> : null}
          </div>
        ))}
      </section>
    ) : null;

  const skillsBlock =
    skills && skills.length ? (
      <section className="rp-section">
        <h2 className="rp-section-title">Skills</h2>
        <div className="rp-skills">
          {skills.map((g, idx) => (
            <p key={g._id || idx} className="rp-skill-row">
              {g.category ? <strong>{g.category}: </strong> : null}
              {(g.items || []).filter(Boolean).join(', ') || '—'}
            </p>
          ))}
        </div>
      </section>
    ) : null;

  const projBlock =
    projects && projects.length ? (
      <section className="rp-section">
        <h2 className="rp-section-title">Projects</h2>
        {projects.map((pr) => (
          <div key={pr._id || pr.name} className="rp-item">
            <strong>{pr.name || 'Project'}</strong>
            {pr.link ? (
              <p className="rp-link rp-tight">{pr.link}</p>
            ) : null}
            {(pr.technologies || []).filter(Boolean).length ? (
              <p className="rp-muted rp-tight">{(pr.technologies || []).filter(Boolean).join(', ')}</p>
            ) : null}
            {pr.description ? <p className="rp-body rp-tight">{pr.description}</p> : null}
          </div>
        ))}
      </section>
    ) : null;

  return (
    <div className={`rp-paper rp-paper--${templateId || 'classic'}`}>
      <p className="rp-doc-title">{title || 'Untitled Resume'}</p>
      {header}
      {summary}
      {expBlock}
      {eduBlock}
      {skillsBlock}
      {projBlock}
    </div>
  );
}

export default ResumePreview;
