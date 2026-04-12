const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema(
  {
    school: { type: String, default: '' },
    degree: { type: String, default: '' },
    field: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    gpa: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  { _id: true }
);

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, default: '' },
    title: { type: String, default: '' },
    location: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    current: { type: Boolean, default: false },
    bullets: [{ type: String, default: '' }]
  },
  { _id: true }
);

const skillGroupSchema = new mongoose.Schema(
  {
    category: { type: String, default: '' },
    items: [{ type: String, default: '' }]
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    link: { type: String, default: '' },
    technologies: [{ type: String, default: '' }]
  },
  { _id: true }
);

const personalSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    summary: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    website: { type: String, default: '' },
    photoUrl: { type: String, default: '' }
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: { type: String, default: 'Untitled Resume', trim: true },
    templateId: {
      type: String,
      enum: ['classic', 'modern', 'minimal'],
      default: 'classic'
    },
    personal: { type: personalSchema, default: () => ({}) },
    education: [educationSchema],
    experience: [experienceSchema],
    skills: [skillGroupSchema],
    projects: [projectSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);
