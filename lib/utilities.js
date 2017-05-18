'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var byString = function byString(o, s) {
	s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
	s = s.replace(/^\./, ''); // strip a leading dot
	var a = s.split('.');
	for (var i = 0, n = a.length; i < n; ++i) {
		var k = a[i];
		if (k in o) {
			o = o[k];
		} else {
			return o;
		}
	}
	return o;
};

exports.default = byString;