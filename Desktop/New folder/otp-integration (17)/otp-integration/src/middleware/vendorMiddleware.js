const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.vendor) {
      req.vendor = decoded.vendor;
      return next(); // Vendor authenticated, proceed to the next middleware or route handler
    }

    return res.status(401).json({ message: "Invalid token payload for vendor" });

  } catch (err) {
    console.error("Authentication error:", err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token has expired" });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Token is not valid" });
    }
    return res.status(401).json({ message: "Token is not valid" });
  }
};
