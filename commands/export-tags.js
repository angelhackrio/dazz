module.exports = function exportTagsCommands (program, helpers) {
  var we;
  var fs = require('fs');
  var path = require('path');

  program
  .command('export-tags-cloth')
  .alias('etc')
  .description('Exporta as tags das roupas')
  .action(function run() {
    we = helpers.getWe();

    we.bootstrap(function (err, we) {
      if (err) return doneAll(err);

      var fPath = path.resolve('./data/roupas_train.cvs');

      we.db.models.cloth.findAll({
      	attributes: ['id']
      })
      .then(function (r) {
      	var data = '';

      	for (var i = 0; i < r.length; i++) {
      		if (r[i]) {
      			data += r[i].categoria.join(',');
      			data += '\n';
      		}
      	};

			  // This opens up the writeable stream to `output`
			  fs.writeFile(fPath, data, { flags: 'w' }, doneAll)
      })
      .catch(doneAll);
    });

    function doneAll(err) {
      if ( err ) {
        we.log.error('Error on set user as admin', err);
      }
      // end / exit
      we.exit(function () { process.exit(); });
    }
  });
}
