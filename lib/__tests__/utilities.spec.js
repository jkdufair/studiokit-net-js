'use strict';

var _utilities = require('../utilities');

var _utilities2 = _interopRequireDefault(_utilities);

var _mocha = require('mocha');

var _chai = require('chai');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _mocha.describe)('Utilities', function () {
	(0, _mocha.it)('Should locate an object by key', function () {
		var obj = (0, _utilities2.default)({ foo: { bar: { baz: 'quux' } } }, 'foo.bar');
		(0, _chai.expect)(obj).to.deep.equal({ baz: 'quux' });
	});

	(0, _mocha.it)('Should return the entire object if the path is not found', function () {
		var srcObj = { foo: { bar: { baz: 'quux' } } };
		var obj = (0, _utilities2.default)(srcObj, 'none.of.these');
		(0, _chai.expect)(obj).to.deep.equal(srcObj);
	});

	(0, _mocha.it)('Should return the entire object if the path is not found and the object is modified', function () {
		var srcObj = { foo: { bar: { baz: 'quux' } } };
		var obj = (0, _utilities2.default)(srcObj, 'none.of.these');
		srcObj = { helter: 'skelter' };
		(0, _chai.expect)(obj).to.deep.equal({ foo: { bar: { baz: 'quux' } } });
	});

	(0, _mocha.it)('Should return the correct object even with a leading dot', function () {
		var obj = (0, _utilities2.default)({ foo: 'bar' }, '.foo');
		(0, _chai.expect)(obj).to.equal('bar');
	});
});