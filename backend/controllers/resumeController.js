const fs = require('fs');
const path = require('path');
const Resume = require('../models/Resume');
const { buildResumePdfBuffer } = require('../services/pdfService');

const emptyPayload = () => ({
  title: 'Untitled Resume',
  templateId: 'classic',
  personal: { fullName: '', email: '', phone: '', location: '', summary: '', linkedin: '', website: '', photoUrl: '' },
  education: [],
  experience: [],
  skills: [],
  projects: [],
  sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects'],
});

const ALLOWED_FIELDS = ['title', 'templateId', 'personal', 'education', 'experience', 'skills', 'projects', 'sectionOrder'];

// ── GET /api/resumes ──────────────────────────────────────────────
exports.getResumes = async (req, res) => {
  try {
    const { search, template, limit = 50, skip = 0 } = req.query;
    const query = { user: req.user._id };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (template && ['classic', 'modern', 'minimal', 'twocolumn'].includes(template)) {
      query.templateId = template;
    }

    const resumes = await Resume.find(query)
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .select('title templateId personal.fullName updatedAt createdAt');

    const total = await Resume.countDocuments(query);

    res.status(200).json({ success: true, data: resumes, total });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── GET /api/resumes/:id ──────────────────────────────────────────
exports.getResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
    res.status(200).json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── POST /api/resumes ─────────────────────────────────────────────
exports.createResume = async (req, res) => {
  try {
    const base = emptyPayload();
    ALLOWED_FIELDS.forEach((key) => { if (req.body[key] !== undefined) base[key] = req.body[key]; });
    const resume = await Resume.create({ ...base, user: req.user._id });
    res.status(201).json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── PUT /api/resumes/:id ──────────────────────────────────────────
exports.updateResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });

    ALLOWED_FIELDS.forEach((key) => { if (req.body[key] !== undefined) resume[key] = req.body[key]; });
    await resume.save();
    res.status(200).json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── DELETE /api/resumes/:id ───────────────────────────────────────
exports.deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });

    // Clean up photo file if present
    if (resume.personal?.photoUrl) {
      const filePath = path.join(__dirname, '..', resume.personal.photoUrl);
      fs.unlink(filePath, () => {});
    }

    res.status(200).json({ success: true, message: 'Resume deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── POST /api/resumes/:id/duplicate ──────────────────────────────
exports.duplicateResume = async (req, res) => {
  try {
    const source = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!source) return res.status(404).json({ success: false, message: 'Resume not found' });

    const copy = source.toObject();
    delete copy._id;
    delete copy.__v;
    copy.title = `${copy.title || 'Untitled Resume'} (Copy)`;
    copy.user = req.user._id;
    // Don't copy the photo URL — it references a file tied to the original
    if (copy.personal) copy.personal.photoUrl = '';

    const newResume = await Resume.create(copy);
    res.status(201).json({ success: true, data: newResume });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── POST /api/resumes/:id/photo ───────────────────────────────────
exports.uploadResumePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Delete old photo file
    if (resume.personal?.photoUrl) {
      const oldPath = path.join(__dirname, '..', resume.personal.photoUrl);
      fs.unlink(oldPath, () => {});
    }

    const photoUrl = `/uploads/resume-photos/${req.file.filename}`;
    resume.personal = { ...(resume.personal?.toObject?.() || resume.personal || {}), photoUrl };
    await resume.save();

    res.status(200).json({ success: true, data: { photoUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── GET /api/resumes/:id/pdf ──────────────────────────────────────
exports.downloadPdf = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });

    const buffer = await buildResumePdfBuffer(resume.toObject(), req.user.name);
    const safeName = (resume.title || 'resume').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'resume';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('PDF error:', error);
    res.status(500).json({ success: false, message: 'Could not generate PDF', error: error.message });
  }
};
