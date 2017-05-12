/**
 * This test calls an API that expects a client credentials grant.
 */
var cimpress_client_request = require('../'),
  request = cimpress_client_request,
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus"),
  nock = require('nock'),
  sinon = require('sinon'),
  jwt = require('jsonwebtoken');

var jwtDecodeStub;

describe('When a request comes back with a non-200 or 401 response', function () {

  before(function() {
    jwtDecodeStub = sinon
      .stub(jwt, 'decode')
      .callsFake(function () { return "abcd" });
  });

  beforeEach(function() {
    cimpress_client_request.credential_cache.flushAll();
  });

  after(function () {
    jwtDecodeStub.restore();
  });

  var config = {
    bearer: "12345"
  };

  var testUrl = 'http://www.example.com';

  it('Should be properly passed to the client', function(done) {
    var scope = nock(testUrl)
    .get('/')
    .reply(404, 'Not Found');

    request({
      auth: config,
      url: testUrl
    }, function(err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).to.equal(404);
      done();
    });
  });
});
