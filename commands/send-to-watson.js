module.exports = function sendToWatsonCommands (program, helpers) {
  var we;
  var fs = require('fs');
  var path = require('path');

  program
  .command('send-to-watson')
  .alias('stw')
  .description('Send data to watson')
  .action(function run() {
    we = helpers.getWe();

    we.bootstrap(function (err, we) {
      if (err) return doneAll(err);
	
	  we.plugins['project'].createClassifier(we, doneAll);
    });

    function doneAll(err) {
      if ( err ) {
        we.log.error('Error:', err);
      }
      // end / exit
      we.exit(function () { process.exit(); });
    }
  });
}
