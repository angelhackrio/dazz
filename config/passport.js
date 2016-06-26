module.exports.passport = {
  strategies: {
    facebook: {
      clientID: '1689311324666529',
      clientSecret: 'be1f1c3f69df43cc3560b0d8c8e4764b',
      findUser: function findUser(token, tokenSecret, profile, done) {
          // // log profile data
          // console.log('>>profile>>', profile);

          var we = this.we;
          // get email
          var email = profile.emails[0].value;

          var query = {
            where: { email: email },
            defaults: {
              displayName: profile.displayName,
              fullName: profile.displayName,
              acceptTerms: true,
              active: true,
              email: email,
              confirmEmail: email,
              roles: []
            }
          };

          we.db.models.user.findOrCreate(query)
          .spread(function afterCreateUserFromFacebook(user, created) {
            if (created) we.log.info('New user from facebook', user.id);
            // TODO download and save user picture from facebook API

            return done(null, user);
          }).catch(done);
      }        
      // callbackURL: 'a custom callback url' // optional
    }
  }
};
