const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
test('router query decoding handles valid links and malformed percent input without recursive work', () => {
 const query = require('query-string');
 assert.equal(query.parse('pond=A+B').pond,'A B');
 assert.equal(query.parse('pond=%E8%99%BE').pond,'虾');
 const malformed = '%FF'.repeat(10000);
 assert.equal(query.parse(`pond=${malformed}`).pond,malformed);
});
test('patched xcode UUID dependency preserves the native project identifier format', () => {
 const xcode = require('xcode');
 const project = xcode.project('ios/investashrimp.xcodeproj/project.pbxproj');
 project.parseSync();
 assert.match(project.generateUuid(),/^[A-F0-9]{24}$/);
 const uuid = createRequire(require.resolve('xcode'))('uuid');
 assert.equal(uuid.validate(uuid.v4()),true);
});
