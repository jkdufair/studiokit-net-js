"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.fetchData = fetchData;
exports.fetchDataRecurring = fetchDataRecurring;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [fetchData, fetchDataRecurring].map(_regenerator2.default.mark);

//import { call, put } from 'redux-saga/effects'
//import { fooService } from '../services'
//import createAction, { actions } from '../actions'

function fetchData() {
  return _regenerator2.default.wrap(function fetchData$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
        case "end":
          return _context.stop();
      }
    }
  }, _marked[0], this);
}

function fetchDataRecurring(period) {
  return _regenerator2.default.wrap(function fetchDataRecurring$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
        case "end":
          return _context2.stop();
      }
    }
  }, _marked[1], this);
}