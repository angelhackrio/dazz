/**
 * Authentication controller
 */

module.exports = {
  _config: { acl: false },
  // getter for current logged in user
  current: function current(req, res) {
    if (!req.isAuthenticated() ) return res.send({});
    return res.ok(req.user);
  },
  /**
   * Signup action for POST and GET methods
   */
  signup: function Register(req, res) {
    var we = req.we;
    // check allowRegister flag how block signup
    if (!we.config.auth.allowRegister) return res.forbidden();
    // anti spam honeypot field
    if (req.body.mel) {
      we.log.info('Bot get mel:', req.ip, req.body.email);
      return res.forbidden();
    }

    if (req.method !== 'POST' || req.isAuthenticated()) {
      return res.ok();
    }

    var newUser, requireAccountActivation;
    // --  set req.body for handle db errors
    res.locals.data = req.body;

    we.utils.async.series([
      function checkIfIsSpam(cb) {
        we.antiSpam.recaptcha.verify(req, res, function (err, isSpam) {
          if (err) return cb(err);
          if (isSpam) {
            we.log.warn('auth.signup: spambot found in recaptcha verify: ', req.ip, req.body.email);

            res.addMessage('warning', {
              text: 'auth.register.spam',
              vars: { email: req.body.email }
            });

            return res.queryError();
          }

          requireAccountActivation = we.config.auth.requireAccountActivation;
          // if dont need a account activation email then create a active user
          if (!requireAccountActivation) req.body.active = true;

          cb();
        });
      },
      function checkUSerAcceptTermsField(cb) {
        if (!req.body.acceptTerms || req.body.acceptTerms == 'false') {
          cb('auth.register.acceptTerms.required');
        } else {
          cb();
        }
      },
      // save the user and password with transaction
      function saveUserAndPassword(cb) {
        we.db.defaultConnection.transaction(function (t) {
          // create the user
          return we.db.models.user.create(
            req.body, { transaction: t }
          ).then(function (u) {
            newUser = u;
            // save password
            return we.db.models.password.create({
              userId: u.id,
              password: req.body.password,
              confirmPassword: req.body.confirmPassword
            }, { transaction: t });
          });
        }).then(function () {
          we.log.info( 'Auth plugin:New user:', req.body.email , 'username:' , req.body.username , 'ID:' , newUser.id );
          cb();
        }).catch(function (err) {
          cb(err);
        });
      }
    ], function afterCreateUserAndPassword(err) {
      if(err) return res.queryError(err);

      if (requireAccountActivation) {
        return we.db.models.authtoken.create({
          userId: newUser.id, redirectUrl: res.locals.redirectTo
        })
        .then(function (token) {

          if (we.plugins['we-plugin-email']) {
            var templateVariables = {
              user: newUser,
              site: {
                name: we.config.appName
              },
              confirmUrl: we.config.hostname + '/user/'+ newUser.id +'/activate/' + token.token
            };

            var options = {
              subject: req.__('we.email.AccontActivationEmail.subject', templateVariables),
              to: newUser.email
            };
            // send email in async
            we.email.sendEmail('AccontActivationEmail',
              options, templateVariables,
            function (err) {
              if (err) {
                we.log.error('Action:Login sendAccontActivationEmail:', err);
              }
            });
          }

          res.addMessage('warning', {
            text: 'auth.register.require.email.activation',
            vars: {
              email: newUser.email
            }
          }, {
            requireActivation: true,
            email: newUser.email
          });

          res.locals.authToken = token;
          res.locals.newUserCreated = true;
          res.locals.skipRedirect = true;
          return res.created();
        });
      }

      we.auth.logIn(req, res, newUser, function (err) {
        if (err) {
          we.log.error('logIn error: ', err);
          return res.serverError(err);
        }

        if (req.accepts('html')) {
          return res.goTo( (res.locals.redirectTo || '/') );
        }

        res.locals.newUserCreated = true;
        res.locals.model = 'user';
        res.locals.data = newUser;
        res.created();
      });
    });
  },

  /**
   * Log out current user
   * Beware! this dont run socket.io disconect
   */
  logout: function logout(req, res) {
    var we = req.we;

    we.auth.logOut(req, res, function (err) {
      if (err)
      we.log.error('Error on logout user', req.id, req.cookie);
      res.goTo('/');
    })
  },
  /**
   * Login API with session and passport-local strategy
   *
   * This action receives the static and JSON request
   */
  login: function login(req, res, next) {
    var we = req.we;

    if (!we.config.passport || !we.config.passport.strategies || !we.config.passport.strategies.local) {
      return res.notFound();
    }

    var email = req.body.email;

    if (req.isAuthenticated()) {
      return res.goTo('/stylist');
    }

    if (req.method !== 'POST') {
      // else show login page
      return res.ok();
    }
    // --  set req.body for error page
    res.locals.data = req.body;

    return we.passport.authenticate('local', function(err, user, info) {
      if (err) {
        we.log.error('AuthController:login:Error on get user ', err, email);
        return res.serverError(err);
      }

      if (!user) {
        we.log.debug('AuthController:login:User not found', email);
        res.addMessage('warning', {
          text: info.message,
          vars: { email: email }
        });
        return res.badRequest();
      }

      if (!user.active) {
        we.log.debug('AuthController:login:User not active', email);
        res.addMessage('warning', {
          text: 'auth.login.user.not.active',
          vars: { email: email }
        });
        return res.badRequest();
      }

      we.auth.logIn(req, res, user, function (err) {
        if (err) return res.serverError(err);
        we.log.info('AuthController:login: user autheticated:', user.id, user.username);

        if (err) {
          we.log.error('logIn error: ', err);
          return res.serverError(err);
        }

        res.locals.newUserCreated = true;
        // redirect if are a html response or have the redirectTo
        if (res.locals.redirectTo) return res.goTo(res.locals.redirectTo);
        if (req.accepts('html')) return res.goTo('/');

        res.send({ user: user});
      });
    })(req, res, next);
  },

  /**
   * Activate a user account with activation code
   */
  activate: function activate(req, res) {
    var we = req.we;

    var user = {};
    user.id = req.params.id;
    var token = req.params.token;

    var responseForbiden = function responseForbiden() {
      res.addMessage('warning', 'auth.access.invalid.token');
      return res.goTo('/login');
    };

    we.db.models.authtoken.validAuthToken(user.id, token, function (err, result, authToken) {
      if (err) {
        we.log.error('auth:activate: Error on validate token: ', err, token, user.id);
        return responseForbiden();
      }

      // token is invalid
      if (!result) {
        we.log.info('auth:activate: invalid token: ', token, user.id);
        return responseForbiden();
      }

      // token is valid then get user form db
      we.db.models.user.findById(user.id).then(function (usr) {
        // user found
        if (!usr) {
          we.log.error('auth:activate: user not found: ', user.id);
          // user not found
          return res.badRequest();
        }
        // activate user and login
        usr.active = true;
        usr.save().then(function () {
          var rediredtUrl = ( authToken.redirectUrl || '/' );
          // destroy auth token after use
          authToken.destroy().catch(function (err) {
            if (err) we.log.error('Error on delete token', err);
          });
          // login and redirect the user
          we.auth.logIn(req, res, usr, function(err) {
            if (err) {
              we.log.error('logIn error:', err);
              return res.serverError(err);
            }

            return res.goTo(rediredtUrl);
          });
        }).catch(res.queryError);
      }).catch(res.queryError);
    });
  },

  /**
   * Forgot password API endpoint
   * Generate one reset token and send to user email
   */
  forgotPassword: function forgotPassword(req, res) {
    var we = req.we;

    var email = req.body.email;

    res.locals.emailSend = false;
    res.locals.messages = [];
    res.locals.user = req.body.user;

    if (req.method !== 'POST') return res.ok();

    if (!res.locals.user) res.locals.user = {};
    res.locals.formAction = '/auth/forgot-password';

    if (!email) {
      return res.badRequest('auth.forgot-password.field.email.required');
    }

    we.db.models.user.find({ where: {email: email }})
    .then(function (user) {
      if (!user)
        return res.badRequest('auth.forgot-password.user.not-found');

      we.db.models.authtoken.create({
        userId: user.id, tokenType: 'resetPassword'
      }).then(function (token) {
        if (we.plugins['we-plugin-email']) {
          var options = {
            email: user.email,
            subject: we.config.appName + ' - ' + req.__('auth.forgot-password.reset-password'),
            from: we.config.email.siteEmail
          };

          user = user.toJSON();

          if (!user.displayName) {
            user.displayName = user.username;
          }

          var templateVariables = {
            user: {
              name: user.username,
              displayName: user.displayName
            },
            site: {
              name: we.config.appName,
              url: we.config.hostname
            },
            resetPasswordUrl: token.getResetUrl()
          };

          we.email.sendEmail('AuthResetPasswordEmail', options, templateVariables, function(err , emailResp){
            if (err) {
              we.log.error('Error on send email AuthResetPasswordEmail', err, emailResp);
              return res.serverError();
            }
            we.log.verbose('AuthResetPasswordEmail: Email resp:', emailResp);
          });

          res.locals.emailSend = true;
        }

        res.addMessage('success', 'auth.forgot-password.email.send');
        if (req.accepts('json')) return res.ok();
        return res.ok();
      }).catch(res.queryError);
    }).catch(res.queryError);
  },

  /**
   * Generate and return one auth token
   * Only allow admin users in permissions
   */
  authToken: function authToken(req, res) {
    if (!req.isAuthenticated()) return res.forbiden();

    var we = req.we;

    var email = req.params.email;

    if (!email) {
      return res.badRequest('Email is required to request a password reset token.');
    }

    we.db.models.user.find({ where: {email: email}})
    .then(function (user) {
      if (!user) return res.badRequest('unknow error trying to find a user');

      we.db.models.authtoken.create({
        'userId': user.id,
        tokenType: 'resetPassword'
      }).then(function (token) {
        if (!token) {
          return res.serverError('unknow error on create auth token');
        }

        return res.json(token.getResetUrl());
      });
    });
  },

  /**
   * Api endpoint to check if current user can change the password without old password
   */
  checkIfCanResetPassword: function checkIfCanResetPassword(req, res) {
    if(!req.isAuthenticated()) return res.forbidden();

    if (req.session && req.session.resetPassword) {
      res.addMessage('success', 'auth.reset-password.success.can');
      return res.ok();
    }

    res.addMessage('error', 'auth.reset-password.error.forbidden');
    return res.forbidden();
  },

  consumeForgotPasswordToken: function consumeForgotPasswordToken(req, res, next) {
    var we = req.we;

    var uid = req.params.id;
    var token = req.params.token;

    if (!uid || !token){
      we.log.info('consumeForgotPasswordToken: Uid of token not found', uid, token);
      return next();
    }

    loadUserAndAuthToken(we, uid, token, function(error, user, authToken){
      if (error) {
        we.log.error('AuthController:consumeForgotPasswordToken: Error on loadUserAndAuthToken', error);
        return res.serverError();
      }

      if (!user || !authToken) {
        we.log.warn('consumeForgotPasswordToken: invalid token: ', token, ' for uid: ', uid);

        req.flash('messages',[{
          status: 'warning',
          type: 'updated',
          message: req.__('auth.consumeForgotPasswordToken.token.invalid')
        }]);
        return res.goTo('/auth/forgot-password');
      }

      if (user.active) {
        return respondToUser();
      } else {
        // If user dont are active, change and salve the active status
        user.active = true;
        user.save().then(function () {
          respondToUser();
        });
      }

      function respondToUser() {
        we.auth.logIn(req, res, user, function (err) {
          if (err) {
            we.log.error('AuthController:consumeForgotPasswordToken:logIn error', err);
            return res.serverError(err);
          }
          // consumes the token
          authToken.isValid = false;
          authToken.destroy().then(function () {
            // set session variable req.session.resetPassword to indicate that there is a new password to be defined
            req.session.resetPassword = true;

            res.goTo( '/auth/' + user.id + '/new-password');
          }).catch(function(err) {
            if (err) we.log.error('auth:consumeForgotPasswordToken: Error on dstroy token:', err);
          });

        });
      }
    });
  },

  /**
   * newPassword page
   * Page to set new user password after click in new password link
   */
  newPassword: function newPasswordAction(req, res) {
    // not authenticated
    if (!req.isAuthenticated()) return res.goTo('/auth/forgot-password');

    // check access
    if (
      req.session.resetPassword &&
      (req.params.id != req.user.id)
    ) {
      req.we.log.warn('auth.newPassword cant change other user password: '+req.params.id+ ' auid: '+req.user.id);
      return res.goTo('/auth/'+req.user.id+'/new-password');
    } else if (req.we.acl.canStatic('manage_users', req.userRoleNames)) {
      // can manage users then can change others users password
    } else if (!req.session.resetPassword){
      req.we.log.warn('auth.newPassword req.session.resetPassword is false, uid: '+req.params.id+' auid: '+req.user.id);
      return res.goTo('/auth/forgot-password');
    }

    var we = req.we;

    if (req.method !== 'POST') return res.ok();

    var newPassword = req.body.newPassword;
    var rNewPassword = req.body.rNewPassword;

    var userId = req.params.id;

    if ( we.utils._.isEmpty(newPassword) || we.utils._.isEmpty(rNewPassword) )
      return res.badRequest('auth.confirmPassword.and.password.required');

    if (newPassword !== rNewPassword)
      return res.badRequest('auth.newPassword.and.password.diferent');

    we.db.models.user.findById(userId)
    .then(function (user) {
      if (!user) {
        we.log.info('newPassword: User not found', user);
        return res.serverError();
      }
      user.updatePassword(newPassword, function (err) {
        if (err) return res.serverError(err);
        // Reset req.session.resetPassword to indicate that the operation has been completed
        delete req.session.resetPassword;

        if (req.accepts('json')) {
          return res.status(200).send({messages: res.locals.messages});
        }

        res.addMessage('success', 'auth.new-password.set.successfully');
        res.locals.successfully = true;

        return res.ok();
      });
    }).catch(res.queryError);
  },

  /**
   * Change authenticated user password
   */
  changePassword: function (req, res) {
    if(!req.isAuthenticated()) return res.goTo('/');
    var we = req.we;

    if (req.method !== 'POST') return res.ok();

    var oldPassword = req.body.password;
    var newPassword = req.body.newPassword;
    var rNewPassword = req.body.rNewPassword;
    var userId = req.user.id;

    if(!req.isAuthenticated())
      return res.badRequest('auth.change-password.forbiden');

    // skip old password if have resetPassword flag in session
    if (!req.session.resetPassword) {
      if (!oldPassword)
        return res.badRequest('field.password.required');
    }

    if ( we.utils._.isEmpty(newPassword) || we.utils._.isEmpty(rNewPassword) ) {
      return res.badRequest('field.confirm-password.password.required');
    }

    if (newPassword !== rNewPassword) {
      return res.badRequest('field.password.confirm-password.diferent');
    }

    we.db.models.user.findById(userId)
    .then(function (user) {
      if (!user) {
        we.log.info('resetPassword: User not found', user);
        return res.badRequest();
      }

      // skip password check if have resetPassord flag active
      if (req.session.resetPassword) {
        return changePassword();
      } else {
        user.verifyPassword(oldPassword, function(err, passwordOk) {
          if (!passwordOk) {
            res.addMessage('error', 'field.password.invalid');
            return res.badRequest();
          }

          return changePassword();
        });
      }

      function changePassword() {
        // set newPassword and save it for generate the password hash on update
        user.updatePassword(newPassword, function (err) {
          if(err) {
            we.log.error('Error on save user to update password: ', err);
            return res.serverError(err);
          }

          // Reset req.session.resetPassword to indicate that the operation has been completed
          delete req.session.resetPassword;

          if (we.plugins['we-plugin-email']) {
            var appName = we.config.appName;

            var options = {
              email: user.email,
              subject: appName + ' - ' + req.__('auth.change-password.reset-password'),
              from: we.config.email.siteEmail
            };

            user = user.toJSON();

            if (!user.displayName) {
              user.displayName = user.username;
            }

            var templateVariables = {
              user: {
                name: user.username,
                displayName: user.displayName
              },
              site: {
                name: appName,
                slogan: we.config.slogan,
                url: we.config.hostname
              }
            };

            we.email.sendEmail('AuthChangePasswordEmail', options, templateVariables, function (err , emailResp) {
              if (err) {
                we.log.error('Error on send email AuthChangePasswordEmail', err, emailResp);
              }

            });
          }

          res.addMessage('success', 'auth.change-password.success');

          return res.ok();
        })
      }
    }).catch(res.queryError);
  }
};

/**
 * Load user and auth token
 * @param  {string}   uid      user id
 * @param  {string}   token    user token
 * @param  {Function} callback    callback(error, user, authToken)
 */
function loadUserAndAuthToken(we, uid, token, callback){
  we.db.models.user.findById(uid)
  .then(function (user) {
    if (!user) {
      // user not found
      return callback(null, null, null);
    }

    we.db.models.authtoken.find({ where: {
      userId: user.id,
      token: token,
      isValid: true
    }}).then(function(authToken){
      if (authToken) {
        return callback(null, user, authToken);
      }else{
        return callback(null, user, null);
      }
    });
  });
}
