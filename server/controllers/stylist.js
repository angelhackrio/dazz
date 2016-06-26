var path = require('path');

module.exports = {
  getPage: function getPage (req, res) {
    if (req.body.question) {
      res.locals.questionSend = req.body.question;

      question();
    } 

    if (req.method == 'post' && !req.question) {
      res.addMessage('warn', 'dazz.page.question.is.required');
    }

    res.ok();
  }
}

function question () {
  natural_language_classifier.classify({
    text: 'Is it sunny?',
    classifier_id: '<classifier-id>' },
    function(err, response) {
      if (err) {
         console.log('error:', err);
      } else {
        console.log('sucesso', JSON.stringify(response, null, 2));
      }
  });
}