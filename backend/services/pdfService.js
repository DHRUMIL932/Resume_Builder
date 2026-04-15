const PDFDocument = require('pdfkit');

function esc(text) {
  if (text == null) return '';
  return String(text);
}

function theme(templateId) {
  switch (templateId) {
    case 'modern':
      return { primary: '#0d9488', muted: '#64748b', headerBg: '#0f766e', accent: '#14b8a6' };
    case 'minimal':
      return { primary: '#111827', muted: '#6b7280', headerBg: null, accent: '#374151' };
    case 'twocolumn':
      return { primary: '#1e40af', muted: '#64748b', headerBg: '#1e3a8a', accent: '#3b82f6', twoCol: true };
    default: // classic
      return { primary: '#1e3a5f', muted: '#64748b', headerBg: '#1e3a5f', accent: '#2563eb' };
  }
}

function addWrapped(doc, text, x, y, width, opts = {}) {
  const t = esc(text).trim();
  if (!t) return y;
  const fontSize = opts.fontSize || 10;
  doc.fontSize(fontSize).fillColor(opts.color || '#111827').font(opts.font || 'Helvetica');
  doc.text(t, x, y, { width, lineGap: 3 });
  return y + doc.heightOfString(t, { width }) + 4;
}

function sectionHeader(doc, title, t, margin, contentWidth, y) {
  if (y > doc.page.height - 120) { doc.addPage(); y = margin; }
  doc.moveTo(margin, y).lineTo(margin + contentWidth, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  y += 8;
  doc.fontSize(12).font('Helvetica-Bold').fillColor(t.primary);
  doc.text(esc(title), margin, y);
  y += 18;
  doc.fillColor('#111827').font('Helvetica');
  return y;
}

function renderSingleColumn(doc, resume, t, margin, contentWidth) {
  const p = resume.personal || {};
  let y = margin;

  // Header
  if (t.headerBg) {
    doc.rect(0, 0, doc.page.width, 100).fill(t.headerBg);
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold');
    doc.text(esc(p.fullName) || 'Resume', margin, 30, { width: contentWidth });
    doc.fontSize(10).font('Helvetica');
    const contact = [p.email, p.phone, p.location].filter(Boolean).join('  •  ');
    doc.text(contact, margin, 60, { width: contentWidth });
    if (p.linkedin || p.website) {
      doc.fillColor(t.accent || '#2563eb');
      doc.text([p.linkedin, p.website].filter(Boolean).join('  |  '), margin, 76, { width: contentWidth });
    }
    y = 118;
    doc.fillColor('#111827');
  } else {
    doc.fillColor(t.primary).fontSize(22).font('Helvetica-Bold');
    doc.text(esc(p.fullName) || 'Resume', margin, y, { width: contentWidth });
    y += 28;
    doc.fontSize(10).font('Helvetica').fillColor(t.muted);
    const line = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean).join('  |  ');
    doc.text(line, margin, y, { width: contentWidth });
    y += 28;
    doc.fillColor('#111827');
  }

  const order = resume.sectionOrder || ['summary', 'experience', 'education', 'skills', 'projects'];

  for (const section of order) {
    switch (section) {
      case 'summary':
        if (esc(p.summary)) {
          y = sectionHeader(doc, 'Summary', t, margin, contentWidth, y);
          y = addWrapped(doc, p.summary, margin, y, contentWidth);
          y += 8;
        }
        break;

      case 'experience':
        if (resume.experience?.length) {
          y = sectionHeader(doc, 'Experience', t, margin, contentWidth, y);
          [...resume.experience].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((ex) => {
            if (y > doc.page.height - 100) { doc.addPage(); y = margin; }
            const range = ex.current ? `${esc(ex.startDate)} – Present` : `${esc(ex.startDate)} – ${esc(ex.endDate)}`;
            doc.font('Helvetica-Bold').fontSize(10).text(esc(ex.title), margin, y);
            doc.font('Helvetica').fontSize(9).fillColor(t.muted);
            doc.text(`  ${esc(ex.company)}  •  ${range}`, margin, y + 12, { width: contentWidth });
            y += 28;
            doc.fillColor('#111827');
            (ex.bullets || []).forEach((b) => {
              if (!esc(b).trim()) return;
              if (y > doc.page.height - 60) { doc.addPage(); y = margin; }
              doc.fontSize(10).text(`• ${esc(b)}`, margin + 8, y, { width: contentWidth - 8 });
              y += doc.heightOfString(`• ${esc(b)}`, { width: contentWidth - 8 }) + 2;
            });
            y += 6;
          });
        }
        break;

      case 'education':
        if (resume.education?.length) {
          y = sectionHeader(doc, 'Education', t, margin, contentWidth, y);
          [...resume.education].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((ed) => {
            if (y > doc.page.height - 80) { doc.addPage(); y = margin; }
            doc.font('Helvetica-Bold').fontSize(10).text(esc(ed.degree) || esc(ed.school), margin, y);
            y += 14;
            doc.font('Helvetica').fontSize(9).fillColor(t.muted);
            doc.text(
              [esc(ed.school), esc(ed.field), `${esc(ed.startDate)} – ${esc(ed.endDate)}`, esc(ed.gpa) ? `GPA: ${esc(ed.gpa)}` : ''].filter(Boolean).join('  •  '),
              margin, y, { width: contentWidth }
            );
            y += 22;
            doc.fillColor('#111827');
            if (esc(ed.description)) y = addWrapped(doc, ed.description, margin, y, contentWidth);
          });
        }
        break;

      case 'skills':
        if (resume.skills?.length) {
          y = sectionHeader(doc, 'Skills', t, margin, contentWidth, y);
          [...resume.skills].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((g) => {
            if (y > doc.page.height - 50) { doc.addPage(); y = margin; }
            const items = (g.items || []).map(esc).filter(Boolean).join(', ');
            if (!items && !esc(g.category)) return;
            doc.fontSize(10).fillColor('#111827');
            if (esc(g.category)) {
              doc.font('Helvetica-Bold').text(`${esc(g.category)}: `, margin, y, { continued: true });
              doc.font('Helvetica').text(items || '—', { continued: false });
            } else {
              doc.font('Helvetica').text(items || '—', margin, y);
            }
            y += 16;
          });
          y += 4;
        }
        break;

      case 'projects':
        if (resume.projects?.length) {
          y = sectionHeader(doc, 'Projects', t, margin, contentWidth, y);
          [...resume.projects].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((pr) => {
            if (y > doc.page.height - 80) { doc.addPage(); y = margin; }
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
            if (esc(pr.description)) y = addWrapped(doc, pr.description, margin, y, contentWidth);
            y += 6;
          });
        }
        break;
    }
  }
}

function renderTwoColumn(doc, resume, t, margin) {
  const p = resume.personal || {};
  const pageW = doc.page.width;
  const sideW = 190;
  const mainX = margin + sideW + 20;
  const mainW = pageW - mainX - margin;

  // Header bar
  doc.rect(0, 0, pageW, 90).fill(t.headerBg);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold');
  doc.text(esc(p.fullName) || 'Resume', margin, 22, { width: pageW - margin * 2 });
  doc.fontSize(9).font('Helvetica');
  const contact = [p.email, p.phone, p.location].filter(Boolean).join('  •  ');
  doc.text(contact, margin, 52, { width: pageW - margin * 2 });
  doc.fillColor('#111827');

  // Left sidebar background
  doc.rect(0, 90, sideW + margin + 10, doc.page.height - 90).fill('#f8fafc');

  let leftY = 106;
  let rightY = 106;

  // ── Left: skills + contact links
  const leftSectionTitle = (title) => {
    doc.fontSize(10).font('Helvetica-Bold').fillColor(t.primary).text(title, margin, leftY);
    leftY += 14;
    doc.moveTo(margin, leftY).lineTo(margin + sideW, leftY).strokeColor(t.accent).lineWidth(1).stroke();
    leftY += 8;
    doc.fillColor('#111827').font('Helvetica');
  };

  if (p.linkedin || p.website) {
    leftSectionTitle('Links');
    if (p.linkedin) {
      doc.fontSize(9).fillColor(t.accent).text(p.linkedin, margin, leftY, { width: sideW, link: p.linkedin });
      leftY += 14;
    }
    if (p.website) {
      doc.fontSize(9).fillColor(t.accent).text(p.website, margin, leftY, { width: sideW, link: p.website });
      leftY += 14;
    }
    leftY += 6;
    doc.fillColor('#111827');
  }

  if (resume.skills?.length) {
    leftSectionTitle('Skills');
    [...resume.skills].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((g) => {
      const items = (g.items || []).map(esc).filter(Boolean).join(', ');
      if (!items) return;
      if (esc(g.category)) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(t.muted).text(esc(g.category), margin, leftY, { width: sideW });
        leftY += 12;
      }
      doc.fontSize(9).font('Helvetica').fillColor('#111827').text(items, margin, leftY, { width: sideW });
      leftY += doc.heightOfString(items, { width: sideW }) + 6;
    });
  }

  // ── Right: summary, experience, education, projects
  const rightSectionTitle = (title) => {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(t.primary).text(title, mainX, rightY, { width: mainW });
    rightY += 16;
    doc.moveTo(mainX, rightY).lineTo(mainX + mainW, rightY).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    rightY += 8;
    doc.fillColor('#111827').font('Helvetica');
  };

  const order = resume.sectionOrder || ['summary', 'experience', 'education', 'skills', 'projects'];

  for (const section of order) {
    if (section === 'skills') continue; // rendered in sidebar

    switch (section) {
      case 'summary':
        if (esc(p.summary)) {
          rightSectionTitle('Summary');
          doc.fontSize(10).font('Helvetica').fillColor('#111827').text(esc(p.summary), mainX, rightY, { width: mainW, lineGap: 2 });
          rightY += doc.heightOfString(esc(p.summary), { width: mainW }) + 12;
        }
        break;

      case 'experience':
        if (resume.experience?.length) {
          rightSectionTitle('Experience');
          [...resume.experience].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((ex) => {
            if (rightY > doc.page.height - 100) { doc.addPage(); rightY = margin; }
            const range = ex.current ? `${esc(ex.startDate)} – Present` : `${esc(ex.startDate)} – ${esc(ex.endDate)}`;
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(esc(ex.title), mainX, rightY, { width: mainW });
            doc.font('Helvetica').fontSize(9).fillColor(t.muted);
            doc.text(`${esc(ex.company)}  •  ${range}`, mainX, rightY + 12, { width: mainW });
            rightY += 26;
            doc.fillColor('#111827');
            (ex.bullets || []).forEach((b) => {
              if (!esc(b).trim()) return;
              doc.fontSize(9).text(`• ${esc(b)}`, mainX + 6, rightY, { width: mainW - 6 });
              rightY += doc.heightOfString(`• ${esc(b)}`, { width: mainW - 6 }) + 2;
            });
            rightY += 6;
          });
        }
        break;

      case 'education':
        if (resume.education?.length) {
          rightSectionTitle('Education');
          [...resume.education].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((ed) => {
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(esc(ed.degree) || esc(ed.school), mainX, rightY, { width: mainW });
            rightY += 13;
            doc.font('Helvetica').fontSize(9).fillColor(t.muted);
            doc.text([esc(ed.school), esc(ed.field), `${esc(ed.startDate)} – ${esc(ed.endDate)}`].filter(Boolean).join('  •  '), mainX, rightY, { width: mainW });
            rightY += 18;
            doc.fillColor('#111827');
          });
        }
        break;

      case 'projects':
        if (resume.projects?.length) {
          rightSectionTitle('Projects');
          [...resume.projects].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((pr) => {
            if (rightY > doc.page.height - 80) { doc.addPage(); rightY = margin; }
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(esc(pr.name) || 'Project', mainX, rightY, { width: mainW });
            rightY += 13;
            const tech = (pr.technologies || []).map(esc).filter(Boolean).join(', ');
            if (tech) {
              doc.font('Helvetica').fontSize(9).fillColor(t.muted).text(tech, mainX, rightY, { width: mainW });
              rightY += 13;
            }
            doc.fillColor('#111827');
            if (esc(pr.description)) {
              doc.fontSize(9).text(esc(pr.description), mainX, rightY, { width: mainW });
              rightY += doc.heightOfString(esc(pr.description), { width: mainW }) + 6;
            }
          });
        }
        break;
    }
  }
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
      const margin = 48;
      const contentWidth = doc.page.width - margin * 2;

      if (t.twoCol) {
        renderTwoColumn(doc, resume, t, margin);
      } else {
        renderSingleColumn(doc, resume, t, margin, contentWidth);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { buildResumePdfBuffer };
