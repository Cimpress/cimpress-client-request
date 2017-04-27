/**
 * This test calls an API that expects a client credentials grant.
 */
var cimpress_client_request = require('../'),
  request = cimpress_client_request,
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus"),
  nock = require('nock');

describe('Passing in an existing auth token', function () {

  beforeEach(function() {
    cimpress_client_request.credential_cache.flushAll();
  });

  var config = {
    bearer: "12345"
  };

  var testUrl = 'http://www.example.com';

  it('Should use that token to make a successful request', function(done) {
    var scope = nock(testUrl)
    .get('/')
    .reply(function(uri, requestBody, cb){
      expect(this.req.headers).to.not.be.null;
      expect(this.req.headers['authorization']).to.not.be.undefined;
      expect(this.req.headers['authorization']).to.equal('Bearer ' + config.bearer);
      cb(null, [200, 'I\'m a reply body!']);
    });

    request({
      auth: config,
      url: testUrl
    }, function(err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      done();
    });
  });
});
