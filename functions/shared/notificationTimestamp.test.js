const test = require('node:test'), assert = require('node:assert/strict');
const { notificationTimestampMillis } = require('./notificationTimestamp');
test('legacy notification dates normalize to the same sortable timestamp type', () => {
 const epoch = Date.parse('2026-09-01T00:00:00Z');
 assert.equal(notificationTimestampMillis({createdAt:'2026-09-01T00:00:00Z'},new Date()),epoch);
 assert.equal(notificationTimestampMillis({timestamp:{seconds:epoch/1000}},new Date()),epoch);
 assert.equal(notificationTimestampMillis({timestamp:0},new Date()),0);
 assert.equal(notificationTimestampMillis({timestamp:'invalid'},new Date(epoch)),epoch);
});
