// @flow

/**
 * Given an object, return the value at the string represented by dot-separated s
 * 
 * @param {Object} o - The javascript object
 * @param {string} s - The dot-separated path (i.e. 'foo.bar.baz')
 * @returns {Object} The value at the referenced path
 */
const byString = function(o: Object, s: string): Object {
	s = s.replace(/\[(\w+)\]/g, '.$1') // convert indexes to properties
	s = s.replace(/^\./, '') // strip a leading dot
	var a = s.split('.')
	for (var i = 0, n = a.length; i < n; ++i) {
		var k = a[i]
		if (k in o) {
			o = o[k]
		} else {
			throw new Error(`Key '${s}' not found in object`)
		}
	}
	return o
}

export default byString
