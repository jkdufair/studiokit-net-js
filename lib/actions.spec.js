'use strict';

var _actions = require('./actions');

describe('Utilities', function () {
	test('Basic createAction', function () {
		var action = (0, _actions.createAction)('aType', { foo: 'bar' });
		expect(action).toEqual({ type: 'aType', foo: 'bar' });
	});
});