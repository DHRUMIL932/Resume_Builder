const PDFDocument = require('pdfkit');

function esc(text) {
  if (text == null) return '';
  return String(text);
}

function theme(templateId) {
  switch (templateId) {
    case 'modern':
      return { primary: '#0d9488', muted: '#64748b', headerBg: '#0f766e' };
    case 'minimal':
      return { primary: '#111827', muted: '#6b7280', headerBg: null };
    default:
      return { primary: '#1e3a5f', muted: '#64748b', headerBg: '#1e3a5f' };
  }
}

function addWrapped(doc, text, x, y, width) {
  const t = esc(text).trim();
  if (!t) return y;
  doc.fontSize(10).fillColor('#111827').font('Helvetica');
  doc.text(t, x, y, { width, lineGap: 3 });
  return y + doc.heightOfString(t, { width }) + 4;
}

function buildResumePdfBuffer(resume, ownerName) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const t = theme(resume.templateId || 'classic');
      const p = resume.personal || {};
      const margin = 48;
      const contentWidth = doc.page.width - margin * 2;
      let y = margin;

      if (t.headerBg && resume.templateId !== 'minimal') {
        doc.rect(0, 0, doc.page.width, 100).fill(t.headerBg);
        doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold');
        doc.text(esc(p.fullName) || esc(ownerName) || 'Resume', margin, 36, { width: contentWidth });
        doc.fontSize(10).font('Helvetica');
        const contact = [p.email, p.phone, p.location].filter(Boolean).join('  •  ');
        doc.text(contact, margin, 68, { width: contentWidth });
        y = 120;
        doc.fillColor('#111827');
      } else {
        doc.fillColor(t.primary).fontSize(22).font('Helvetica-Bold');
        doc.text(esc(p.fullName) || esc(ownerName) || 'Resume', margin, y, { width: contentWidth });
        y += 28;
        doc.fontSize(10).font('Helvetica').fillColor(t.muted);
        const line = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean).join('  |  ');
        doc.text(line, margin, y, { width: contentWidth });
        y += 28;
        doc.fillColor('#111827');
      }

      const section = (title) => {
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = margin;
        }
        doc.moveTo(margin, y).lineTo(margin + contentWidth, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        y += 10;
        doc.fontSize(12).font('Helvetica-Bold').fillColor(t.primary);
        doc.text(esc(title), margin, y);
        y += 18;
        doc.fillColor('#111827').font('Helvetica');
      };

      if (esc(p.summary)) {
        section('Summary');
        y = addWrapped(doc, p.summary, margin, y, contentWidth);
        y += 8;
      }

      if (resume.experience && resume.experience.length) {
        section('Experience');
        resume.experience.forEach((ex) => {
          if (y > doc.page.height - 100) {
            doc.addPage();
            y = margin;
          }
          const range = ex.current
            ? `${esc(ex.startDate)} – Present`
            : `${esc(ex.startDate)} – ${esc(ex.endDate)}`;
          doc.font('Helvetica-Bold').fontSize(10).text(esc(ex.title), margin, y, { continued: false });
          doc.font('Helvetica').fontSize(9).fillColor(t.muted);
          doc.text(`  ${esc(ex.company)}  •  ${range}`, margin, y + 12, { width: contentWidth });
          y += 28;
          doc.fillColor('#111827');
          (ex.bullets || []).forEach((b) => {
            if (!esc(b).trim()) return;
            if (y > doc.page.height - 60) {
              doc.addPage();
              y = margin;
            }
            doc.fontSize(10).text(`• ${esc(b)}`, margin + 8, y, { width: contentWidth - 8 });
            y += doc.heightOfString(`• ${esc(b)}`, { width: contentWidth - 8 }) + 2;
          });
          y += 6;
        });
      }

      if (resume.education && resume.education.length) {
        section('Education');
        resume.education.forEach((ed) => {
          if (y > doc.page.height - 80) {
            doc.addPage();
            y = margin;
          }
          doc.font('Helvetica-Bold').fontSize(10).text(esc(ed.degree) || esc(ed.school), margin, y);
          y += 14;
          doc.font('Helvetica').fontSize(9).fillColor(t.muted);
          doc.text(
            [esc(ed.school), esc(ed.field), `${esc(ed.startDate)} – ${esc(ed.endDate)}`, esc(ed.gpa) ? `GPA: ${esc(ed.gpa)}` : '']
              .filter(Boolean)
              .join('  •  '),
            margin,
            y,
            { width: contentWidth }
          );
          y += 22;
          doc.fillColor('#111827');
          if (esc(ed.description)) {
            y = addWrapped(doc, ed.description, margin, y, contentWidth);
          }
        });
      }

      if (resume.skills && resume.skills.length) {
        section('Skills');
        resume.skills.forEach((g) => {
          if (y > doc.page.height - 50) {
            doc.addPage();
            y = margin;
          }
          const items = (g.items || []).map(esc).filter(Boolean).join(', ');
          const cat = esc(g.category);
          if (!items && !cat) return;
          doc.fontSize(10).fillColor('#111827');
          if (cat) {
            doc.font('Helvetica-Bold').text(`${cat}: `, margin, y, { continued: true });
            doc.font('Helvetica').text(items || '—', { continued: false });
          } else {
            doc.font('Helvetica').text(items || '—', margin, y);
          }
          y += 16;
        });
        y += 4;
      }

      if (resume.projects && resume.projects.length) {
        section('Projects');
        resume.projects.forEach((pr) => {
          if (y > doc.page.height - 80) {
            doc.addPage();
            y = margin;
          }
          doc.font('Helvetica-Bold').fontSize(10).text(esc(pr.name) || 'Project', margin, y);
          y += 14;
          if (esc(pr.link)) {
            doc.font('Helvetica').fontSize(9).fillColor('#2563eb').text(esc(pr.link), margin, y, { link: esc(pr.link), underline: true });
            y += 14;
            doc.fillColor('#111827');
          }
          const tech = (pr.technologies || []).map(esc).filter(Boolean).join(', ');
          if (tech) {
            doc.fontSize(9).fillColor(t.muted).text(tech, margin, y, { width: contentWidth });
            y += 14;
            doc.fillColor('#111827');
          }
          if (esc(pr.description)) {
            y = addWrapped(doc, pr.description, margin, y, contentWidth);
          }
          y += 6;
        });
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { buildResumePdfBuffer };
