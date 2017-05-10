'use strict';

var _rewire = require('rewire');

var _rewire2 = _interopRequireDefault(_rewire);

var _mocha = require('mocha');

var _chai = require('chai');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _mocha.describe)('Fetch middleware', function () {});

(0, _mocha.describe)('Path construction', function () {
	var app = (0, _rewire2.default)('../fetchService.js');
	var constructPath = app.__get__('constructPath');
	(0, _mocha.it)('Should not add a question mark to a path without query params', function () {
		var path = constructPath({ path: 'http://abc.xyz/api/foo' });
		(0, _chai.expect)(path).to.equal('http://abc.xyz/api/foo');
	});

	(0, _mocha.it)('Should add a single query param', function () {
		var path = constructPath({ path: 'http://abc.xyz/api/foo', queryParams: {
				bar: 'baz'
			} });
		(0, _chai.expect)(path).to.equal('http://abc.xyz/api/foo?bar=baz');
	});

	(0, _mocha.it)('Should add mulitple query params', function () {
		var path = constructPath({ path: 'http://abc.xyz/api/foo', queryParams: {
				bar: 'baz',
				quux: 'wawa'
			} });
		(0, _chai.expect)(path).to.equal('http://abc.xyz/api/foo?bar=baz&quux=wawa');
	});

	(0, _mocha.it)('Should encode params', function () {
		var path = constructPath({ path: 'http://abc.xyz/api/foo', queryParams: {
				bar: 'baz',
				'$foo': '/bar'
			} });
		(0, _chai.expect)(path).to.equal('http://abc.xyz/api/foo?bar=baz&%24foo=%2Fbar');
	});

	(0, _mocha.it)('Should prepend baseUrl via config', function () {
		app.setApiRoot('http://abc.xyz');
		var path = constructPath({ path: '/api/foo' });
		(0, _chai.expect)(path).to.equal('http://abc.xyz/api/foo');
	});
});