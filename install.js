module.exports = {
  /**
   * Install function run in we.js project install.
   *
   * @param  {Object}   we    we.js object
   * @param  {Function} done  callback
   */
  install: function install (we, done) {
    we.log.info('Starting project install...');

    var fns = [];

    //
    // - Create first user
    //  

    fns.push(function registerUser1 (done) {
      var user1 = {
        username: 'Alberto',
        email: 'contato@albertosouza.net',
        password: '123', // change after install
        displayName: 'Alberto Souza',
        active: true,
        roles: ['administrator']
      };

      we.log.info('I will create the user: ', user1);

      we.db.models.user.create(user1)
      .then(function (user) {
        we.log.info('New User with id: ', user.id);
        // set the password
        we.db.models.password.create({
          userId: user.id,
          password: user1.password,
          confirmPassword: user1.password
        })
        .then(function () {

          console.log('passport created');

          return done();
        })
      }).catch(done);
    });

    //
    // -- Create example cloths
    //

    fns.push(function (done) {
      var cloths = [
        {
          name: 'Another day another off-sholder',
          categoria: [
            'azul', 'saia', 'branca', 'sandalha', 'saia curta', 'passear', 'parque'
          ]
        },
        {
          name: 'Body chain everyday wear',
          categoria: [
            'jeans', 'saia', 'azul', 'sapato', 'camiseta', 'preta', 'compras'
          ]
        },
        {
          name: 'Brick garden',
          categoria: [
            'marrom', 'saia', 'bustie', 'preto', 'preta', 'noitada', 'noite'
          ]
        },
        {
          name: 'Drake over',
          categoria: [
            'camisa', 'vermelha', 'saia', 'azul', 'sapato', 'ir', 'shopping'
          ]
        },
        {
          name: 'Human being',
          categoria: [
            'camisa', 'azul', 'calça', 'azul', 'sapato', 'vermelho', 'sair', 'amigas'
          ]
        },
        {
          name: 'Making statement shoes pop',
          categoria: [
            'skine', 'strat', 'preta', 'preto', 'sandalha', 'rosa', 'camiseta', 'preta',
            'balada', 'noitada', 'noite'
          ]
        }                
      ];

      we.utils.async.eachSeries(cloths, function (c, next) {
        we.db.models.cloth.create(c).nodeify(next);   
      }, done)
    })

    we.utils.async.series(fns, done);
  }
};