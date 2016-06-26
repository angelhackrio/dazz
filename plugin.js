/**
 * We.js plugin file, use to load routes and configs
 *
 * @param  {String} projectPath current project path
 * @param  {Object} Plugin      we.js Plugin class
 * @return {Object}             intance of we.js Plugin class
 */
var watson = require('watson-developer-cloud');
var fs = require('fs');
var path = require('path');

module.exports = function loadPlugin (projectPath, Plugin) {
  var plugin = new Plugin(__dirname);

  plugin.nlc = watson.natural_language_classifier({
    "url": "https://gateway.watsonplatform.net/natural-language-classifier/api",
    "password": "zyRRvZSIFf7T",
    "username": "445ffcd9-85be-43f6-a000-7248278c87f3",
    version: 'v1'
  });

  plugin.createClassifier = function createClassifier (we, done) {

  	var params = {
  	  language: 'pt-br',
  	  name: 'roupas',
  	  training_data: fs.createReadStream(path.resolve('./data/roupas_train.cvs'))
  	};

  	plugin.nlc.create(params, function (err, response) {
  	  if (err) return done(err);

      we.log.info('Watson response:', response);

  	  we.db.models.classifier.create(response || response.success)
  	  .then(function (r) {

  	    we.log.info('new classifier:', r.id, r.classifier_id);

  	    done();	
  	  })
  	  .catch(done);
    }); 
  }

  plugin.preloadClassifier = function preloadClassifier (we, next) {
    we.db.models.classifier.findOne({
      where: { name: 'roupas' }
    })
    .then(function (r) {
      plugin.watsonClassifier = r;
      next();
    })
    .catch(next)
  }

  plugin.question = function question (we, text, done) {
    plugin.nlc.classify({
      text: text,
      classifier_id: plugin.watsonClassifier.classifier_id
    }, function (err, response) {
      if (err) return done(err);

      console.log('sucesso', JSON.stringify(response, null, 2));

      done();
    });
  }

  plugin.hooks.on('we:server:before:start', plugin.preloadClassifier);

  return plugin;
};