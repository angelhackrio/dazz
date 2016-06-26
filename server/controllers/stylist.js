var path = require('path');

module.exports = {
  getPage: function getPage (req, res) {
    if (!req.isAuthenticated()) return res.goTo('/login');

    if (req.body.question) {
      res.locals.questionSend = req.body.question;

      return req.we.plugins['project'].question(req.we, req.body.question, function(err, result){
        if (err) return res.queryError(err);

        // console.log('<>', result);

        var tags = []

        for (var i = 0; i < result.classes.length; i++) {
          tags.push(result.classes[i].class_name);

          if (i >= 1) {
            // get only 2 tags
            break;
          }
        };

        if (!tags || !tags.length) {
          return res.ok();
        }

        var sql = "SELECT cloths.id FROM cloths"+
          " INNER JOIN modelsterms as mt ON mt.modelId=cloths.id"+
          " INNER JOIN terms as t ON t.id=mt.termId"+
          " WHERE t.text in (" + tags.map(function (t) {
            return "'"+String(t)+"'";
          }).join(', ') + ")";

        req.we.db.defaultConnection.query(sql, {
          logging: req.we.log.info
        })
        .spread(function (r) {
          if (!r) return res.ok();

          var ids = r.map(function(c){
            return c.id
          });

          return req.we.db.models.cloth.findAll({
            where: { id: ids }
          })
          .then(function(r){
            res.locals.cards = r;
            res.ok();
          })
        })
        .catch(res.queryError)
      });
    }

    if (req.method == 'post' && !req.question) {
      res.addMessage('warn', 'dazz.page.question.is.required');
    }

    res.ok();
  }
}

/*
sucesso {
  "classifier_id": "2374f9x68-nlc-7279",
  "url": "https://gateway.watsonplatform.net/natural-language-classifier/api/v1/classifiers/2374f9x68-nlc-7279",
  "text": "Andar no parque",
  "top_class": "saia",
  "classes": [
    {
      "class_name": "saia",
      "confidence": 0.9256668425204913
    },
    {
      "class_name": "preta",
      "confidence": 0.022112439154127115
    },
    {
      "class_name": "sandalha",
      "confidence": 0.008697902825709569
    },
    {
      "class_name": "azul",
      "confidence": 0.004871402537788326
    },
    {
      "class_name": "preto",
      "confidence": 0.004571711335697853
    },
    {
      "class_name": "sapato",
      "confidence": 0.0037441061613237205
    },
    {
      "class_name": "noite",
      "confidence": 0.0034212829091080916
    },
    {
      "class_name": "camiseta",
      "confidence": 0.003388432699735885
    },
    {
      "class_name": "noitada",
      "confidence": 0.0032835806297163753
    },
    {
      "class_name": "branca",
      "confidence": 0.002757583962831398
    }
  ]
}
*/
