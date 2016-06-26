var assert = require('assert');
var request = require('supertest');
var helpers = require('we-test-tools').helpers;
var stubs = require('we-test-tools').stubs;
var _ = require('lodash');
var http;
var we;

describe('clothFeature', function () {
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
    it('get /cloth route should find one cloth', function(done){
      request(http)
      .get('/cloth')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        assert.equal(200, res.status);
        assert(res.body.cloth);
        assert( _.isArray(res.body.cloth) , 'cloth not is array');
        assert(res.body.meta);

        done();
      });
    });
  });
  describe('create', function () {
    it('post /cloth create one cloth record');
  });
  describe('findOne', function () {
    it('get /cloth/:id should return one cloth');
  });
  describe('update', function () {
    it('put /cloth/:id should upate and return cloth');
  });
  describe('destroy', function () {
    it('delete /cloth/:id should delete one cloth')
  });
});
