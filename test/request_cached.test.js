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

describe('Making a new request', function () {

  before(function () {
    cimpress_client_request.credential_cache.flushAll();
    jwtDecodeStub = sinon
      .stub(jwt, 'decode')
      .callsFake(function () { return "abcd" });
  });

  after(function () {
    jwtDecodeStub.restore();
  });

  var config = {
    bearer: "12345"
  };

  var testUrl = 'http://www.example.com';

  it('Should respect cache control headers and store the response in the cache', function (done) {
    var beginningKeys = cimpress_client_request.credential_cache.keys();

    var scope = nock(testUrl)
      .get('/')
      .reply(function (uri, requestBody) {
        expect(this.req.headers).to.not.be.null;
        expect(this.req.headers['authorization']).to.not.be.undefined;
        expect(this.req.headers['authorization']).to.equal('Bearer ' + config.bearer);
        return [200, 'I\'m a reply body!', { 'Cache-Control': 'public, max-age=10', }];
      });

    request({
      method: 'GET',
      auth: config,
      url: testUrl
    }, function (err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      var endingKeys = cimpress_client_request.credential_cache.keys();
      expect(endingKeys.length).to.be.greaterThan(beginningKeys.length);
      done();
    });
  });

  it('Shouldn\'t add a new entry when a response already exists in the cache', function (done) {
    var beginningKeys = cimpress_client_request.credential_cache.keys();
    request({
      method: 'GET',
      auth: config,
      url: testUrl
    }, function (err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).not.to.equal(401);
      var endingKeys = cimpress_client_request.credential_cache.keys();
      expect(endingKeys.length).to.equal(beginningKeys.length);
      done();
    });
  });

  it('Shouldn\'t add a new entry when a response status code is an error', function (done) {
    cimpress_client_request.credential_cache.flushAll();
    var beginningKeys = cimpress_client_request.credential_cache.keys();

    nock(testUrl)
      .get('/')
      .reply(function (uri, requestBody) {
        return [404, 'I\'m a reply body!', { 'Cache-Control': 'public, max-age=10', }];
      });

    request({
      method: 'GET',
      auth: config,
      url: testUrl
    }, function (err, res, body) {
      expect(err).to.be.null;
      expect(res.statusCode).to.equal(404);
      var endingKeys = cimpress_client_request.credential_cache.keys();
      expect(endingKeys.length).to.equal(beginningKeys.length);
      done();
    });
  });
});
