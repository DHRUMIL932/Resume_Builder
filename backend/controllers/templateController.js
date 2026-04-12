const templates = require('../config/templatesCatalog');

exports.listTemplates = (req, res) => {
  res.status(200).json({ success: true, data: templates });
};
