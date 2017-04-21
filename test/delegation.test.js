/**
 * This test calls an API that expects a delegated token.
 */
var cimpress_client_request = require('../'),
  request = cimpress_client_request,
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus");

describe('Auth0 v1 delegation', function () {

  beforeEach(function() {
    cimpress_client_request.credential_cache.flushAll();
  });

  var config = {
    target_id: "ixwhEFzC5TcFViYmi5xzVevRtx2mSjyG",
    refresh_token: process.env.CIMPRESS_IO_REFRESH_TOKEN
  };

  it('Should make a successful request against the backing API', function(done) {

    request({
      auth: config,
      url: process.env.API_THAT_SUPPORTS_DELEGATION
    }, function(err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      done();
    });
  });

  it('should make a successful request against a backing API without a provided target_id', function (done) {
    request({
      auth: { refresh_token: config.refresh_token },
      url: process.env.API_THAT_SUPPORTS_DELEGATION
    }, function(err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      done();
    })
  });
});
