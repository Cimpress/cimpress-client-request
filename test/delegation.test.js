/**
 * This test calls an API that expects a delegated token.
 */
var cimpress_client_request = require('../'),
  request = cimpress_client_request,
  expect = require("chai").expect,
  chai = require("chai"),
  assert = require("assert-plus"),
  nock = require('nock'),
  sinon = require('sinon'),
  jwt = require('jsonwebtoken');

describe('Auth0 v1 delegation', function () {

  var refreshToken = "12345678";
  var url = "https://testing.com";
  var authV1Token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ";
  var callingClientId = "abcd";
  var v1AuthServer = "https://v1auth.com";
  var jwtDecodeStub;

  before(function() {
    jwtDecodeStub = sinon
      .stub(jwt, 'decode')
      .callsFake(function () { return "abcd" });
  });

  beforeEach(function () {
    cimpress_client_request.credential_cache.flushAll();

    nock('https://cimpress.auth0.com')
      .post('/delegation')
      .reply(function (uri, requestBody) {
        expect(requestBody.client_id).to.equal('QkxOvNz4fWRFT6vcq79ylcIuolFz2cwN');
        expect(requestBody.target).to.equal(callingClientId);
        expect(requestBody.refresh_token).to.equal(refreshToken);
        return [200, { 'id_token': authV1Token }];
      });

    nock(url)
      .get('/')
      .twice()
      .reply(function (uri, requestBody) {
        if (this.req.headers && this.req.headers['authorization']) {
          expect(this.req.headers).to.not.be.null;
          expect(this.req.headers['authorization']).to.not.be.undefined;
            expect(this.req.headers['authorization']).to.be.equal('Bearer ' + authV1Token);
            return [200, 'v1 supported!'];
        } else {
          return [401, 'v2 not supported', { 'www-authenticate': 'Bearer realm="' + v1AuthServer + '", scope="client_id=' + callingClientId + ' service=' + url + '"' }];
        }
      });
  });

  after(function () {
    jwtDecodeStub.restore();
  });

  var config = {
    target_id: callingClientId,
    refresh_token: refreshToken
  };

  it('Should make a successful request against the backing API', function (done) {
    request({
      auth: config,
      url: url
    }, function (err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      done();
    });
  });

  it('Should make a successful request against a backing API without a provided target_id', function (done) {
    request({
      auth: { refresh_token: config.refresh_token },
      url: url
    }, function (err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      done();
    })
  });
});
