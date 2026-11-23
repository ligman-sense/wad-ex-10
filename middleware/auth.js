function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  return res.redirect('/login?error=Administrator%20sign-in%20is%20required%20for%20this%20action.');
}

module.exports = { requireAdmin };

