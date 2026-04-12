const fs = require('fs');
const Resume = require('../models/Resume');
const { buildResumePdfBuffer } = require('../services/pdfService');

const emptyPayload = () => ({
  title: 'Untitled Resume',
  templateId: 'classic',
  personal: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    linkedin: '',
    website: '',
    photoUrl: ''
  },
  education: [],
  experience: [],
  skills: [],
  projects: []
});

exports.getResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: resumes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }
    res.status(200).json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createResume = async (req, res) => {
  try {
    const base = emptyPayload();
    const allowed = ['title', 'templateId', 'personal', 'education', 'experience', 'skills', 'projects'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) base[key] = req.body[key];
    });
    const resume = await Resume.create({ ...base, user: req.user._id });
    res.status(201).json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    const allowed = [
      'title',
      'templateId',
      'personal',
      'education',
      'experience',
      'skills',
      'projects'
    ];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        resume[key] = req.body[key];
      }
    });
    await resume.save();
    res.status(200).json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }
    res.status(200).json({ success: true, message: 'Resume deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.uploadResumePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {
        /* ignore */
      }
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }
    const photoUrl = `/uploads/resume-photos/${req.file.filename}`;
    res.status(200).json({
      success: true,
      data: { photoUrl }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.downloadPdf = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

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
