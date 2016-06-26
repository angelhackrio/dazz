/**
 * Main project controller
 */

module.exports = {
  index: function index(req, res) {
  	if (req.isAuthenticated()) {
	    res.redirect('/stylist')
  	} else {
			res.redirect('/login')
  	}
    
  }
};