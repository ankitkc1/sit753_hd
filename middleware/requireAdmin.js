module.exports = function requireAdmin(req, res, next) {
  if (req.session && req.session.adminUserId) return next();
  return res.redirect('/onlyankit/login');
};
