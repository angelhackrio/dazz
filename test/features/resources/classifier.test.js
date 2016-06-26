var assert = require('assert');
var request = require('supertest');
var helpers = require('we-test-tools').helpers;
var stubs = require('we-test-tools').stubs;
var _ = require('lodash');
var http;
var we;

describe('classifierFeature', function () {
  var salvedPage, salvedUser, salvedUserPassword;
  var authenticatedRequest;

  before(function (done) {
    http = helpers.getHttp();
    we = helpers.getWe();

    var userStub = stubs.userStub();
    helpers.createUser(userStub, function(err, user) {
      if (err) throw err;

      salvedUser = user;
      salvedUserPassword = userStub.password;

      // login user and save the browser
      authenticatedRequest = request.agent(http);
      authenticatedRequest.post('/login')
      .set('Accept', 'application/json')
      .send({
        email: salvedUser.email,
        password: salvedUserPassword
      })
      .expect(200)
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) throw err;

        done();
      });

    });
  });

  describe('find', function () {
    it('get /classifier route should find one classifier', function(done){
      request(http)
      .get('/classifier')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        assert.equal(200, res.status);
        assert(res.body.classifier);
        assert( _.isArray(res.body.classifier) , 'classifier not is array');
        assert(res.body.meta);

        done();
      });
    });
  });
  describe('create', function () {
    it('post /classifier create one classifier record');
  });
  describe('findOne', function () {
    it('get /classifier/:id should return one classifier');
  });
  describe('update', function () {
    it('put /classifier/:id should upate and return classifier');
  });
  describe('destroy', function () {
    it('delete /classifier/:id should delete one classifier')
  });
});
