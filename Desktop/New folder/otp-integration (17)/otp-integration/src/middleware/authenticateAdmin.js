// src/middleware/authenticateAdmin.js
const jwt = require('jsonwebtoken');
const Admin = require('../model/adminModel');

const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header is missing' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Token is missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found or token is invalid' });
    }

    req.admin = admin;
    req.token = token;

    next();
  } catch (err) {
    res.status(401).json({ message: 'Not authorized to access this resource', error: err.message });
  }
};

module.exports = authenticateAdmin;
