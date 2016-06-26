var assert = require('assert');
var request = require('supertest');
var helpers = require('we-test-tools').helpers;
var stubs = require('we-test-tools').stubs;
var _ = require('lodash');
var http;
var we;

describe('classifier-id-stringFeature', function () {
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
    it('get /classifier-id-string route should find one classifier-id-string', function(done){
      request(http)
      .get('/classifier-id-string')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        assert.equal(200, res.status);
        assert(res.body.classifier-id-string);
        assert( _.isArray(res.body.classifier-id-string) , 'classifier-id-string not is array');
        assert(res.body.meta);

        done();
      });
    });
  });
  describe('create', function () {
    it('post /classifier-id-string create one classifier-id-string record');
  });
  describe('findOne', function () {
    it('get /classifier-id-string/:id should return one classifier-id-string');
  });
  describe('update', function () {
    it('put /classifier-id-string/:id should upate and return classifier-id-string');
  });
  describe('destroy', function () {
    it('delete /classifier-id-string/:id should delete one classifier-id-string')
  });
});
