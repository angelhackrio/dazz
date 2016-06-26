var path = require('path');

module.exports = {
  getPage: function getPage (req, res) {
    if (req.body.question) {
      res.locals.questionSend = req.body.question;

      return req.we.plugins['project'].question(req.we, req.body.question, function(err, result){
        if (err) return res.queryError(err);
        
        console.log('rrr>', result);

        res.ok();
      });
    }

    if (req.method == 'post' && !req.question) {
      res.addMessage('warn', 'dazz.page.question.is.required');
    }

    res.ok();
  }
}
