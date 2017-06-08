'use strict';

var _fetchService = require('./fetchService');

describe('Path construction', function () {
	var constructPath = _fetchService.__RewireAPI__.__get__('constructPath');
	test('Should not add a question mark to a path without query params', function () {
		var path = constructPath({ path: 'http://abc.xyz/api/foo' });
		expect(path).toEqual('http://abc.xyz/api/foo');
	});

	test('Should add a single query param', function () {
		var path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz'
			}
		});
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz');
	});

	test('Should add mulitple query params', function () {
		var path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz',
				quux: 'wawa'
			}
		});
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz&quux=wawa');
	});

	test('Should encode params', function () {
		var path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz',
				$foo: '/bar'
			}
		});
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz&%24foo=%2Fbar');
	});

	test('Should prepend baseUrl via config', function () {
		var existingApiRoot = (0, _fetchService.getApiRoot)();
		(0, _fetchService.setApiRoot)('http://abc.xyz');
		var path = constructPath({ path: '/api/foo' });
		expect(path).toEqual('http://abc.xyz/api/foo');
		(0, _fetchService.setApiRoot)(existingApiRoot);
	});
});

describe('doFetch', function () {
	test('Require config.path', function () {
		expect(function () {
			var gen = (0, _fetchService.doFetch)();
			gen.next();
		}).toThrow(/Cannot read property 'path' of undefined/);
	});

	test('Require config.path 2', function () {
		expect(function () {
			var gen = (0, _fetchService.doFetch)({});
			gen.next();
		}).toThrow(/'config.path' is required/);
	});

	test('Basic GET', function () {
		var _fetch = global.fetch;
		global.fetch = jest.fn(function () {});
		var gen = (0, _fetchService.doFetch)({ path: 'http://www.google.com' });
		var response = gen.next();
		expect(response.value.CALL.args).toEqual(['http://www.google.com', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json; charset=utf-8'
			}
		}]);
		global.fetch = _fetch;
	});

	test('Basic POST w/ headers', function () {
		var _fetch = global.fetch;
		global.fetch = jest.fn(function () {});
		var gen = (0, _fetchService.doFetch)({ path: 'http://www.google.com', method: 'POST', body: { foo: 'bar' } });
		var response = gen.next();
		expect(response.value.CALL.args).toEqual(['http://www.google.com', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=utf-8'
			},
			body: JSON.stringify({ foo: 'bar' })
		}]);
		global.fetch = _fetch;
	});

	test('Basic GET w/ headers & form urlencoded', function () {
		var _fetch = global.fetch;
		global.fetch = jest.fn(function () {});
		var gen = (0, _fetchService.doFetch)({
			path: 'http://www.google.com',
			method: 'POST',
			body: 'foo=bar&baz=quux',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
		});
		var response = gen.next();
		expect(response.value.CALL.args).toEqual(['http://www.google.com', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: 'foo=bar&baz=quux'
		}]);
		global.fetch = _fetch;
	});

	test('Basic GET test empty response from server', function () {
		var _fetch = global.fetch;
		global.fetch = jest.fn(function () {});
		var gen = (0, _fetchService.doFetch)({ path: 'http://www.google.com' });
		var response = gen.next();
		var response2 = gen.next();
		expect(response2.value.CALL.fn()).toEqual(null);
		global.fetch = _fetch;
	});

	test('Basic GET test non-empty response from server', function () {
		var _fetch = global.fetch;
		global.fetch = jest.fn(function () {});
		var gen = (0, _fetchService.doFetch)({ path: 'http://www.google.com' });
		var response = gen.next();
		var response2 = gen.next({ json: function json() {
				return { foo: 'bar' };
			} });
		expect(response2.value.CALL.fn()).toEqual({ foo: 'bar' });
		global.fetch = _fetch;
	});
});