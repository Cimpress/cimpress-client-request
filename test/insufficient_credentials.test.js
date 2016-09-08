/**
 * This test calls an API that expects a client credentials grant.
 */
var cimpress_client_request = require('../'),
  request = cimpress_client_request,
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus");

describe('Insufficient credentials', function () {

  beforeEach(function() {
    cimpress_client_request.credential_cache.flushAll();
  });

  var config = {
    authorization_server: "https://cimpress-dev.auth0.com/oauth/token",
    audience: "https://development.api.cimpress.io/",
    client_id: process.env.CIMPRESS_IO_CLIENT_ID,
    client_secret: process.env.CIMPRESS_IO_CLIENT_SECRET
  };

  it('Should fail if v2 auth fails and v1 creds aren\'t available', function(done) {

    request({
      auth: config,
      url: process.env.API_THAT_SUPPORTS_DELEGATION
    }, function(err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).to.equal(401);
      done();
    });
  });
});
