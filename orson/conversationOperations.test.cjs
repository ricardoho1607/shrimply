const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  linkOperationToReply,
  upsertReplyWithOperations,
  unlinkedDraftOperationIds,
} = require('./conversationOperations.ts');

test('saved cards stay with their reply as new messages arrive', () => {
  const reply = { id: 'reply-1', type: 'ai', message: '' };
  const withCard = linkOperationToReply([{ id: 'user-1', type: 'user' }], reply, 'saved-1');
  const streamed = upsertReplyWithOperations(withCard, { ...reply, message: 'Draft ready' });
  const final = upsertReplyWithOperations(streamed, { ...reply, message: 'Review the card' });
  const later = [...final, { id: 'user-2', type: 'user', message: 'Next question' }];
  assert.deepEqual(later.map((message) => message.id), ['user-1', 'reply-1', 'user-2']);
  assert.deepEqual(later[1].operationIds, ['saved-1']);
  assert.equal(later[1].message, 'Review the card');
  assert.deepEqual(linkOperationToReply(later, reply, 'saved-1')[1].operationIds, ['saved-1']);
});

test('new chat hides old saved cards but keeps unsaved drafts reachable', () => {
  const operations = [
    { id: 'saved-1', state: 'completed' },
    { id: 'draft-1', state: 'draft' },
  ];
  assert.deepEqual(unlinkedDraftOperationIds([{ id: 'reply', operationIds: ['draft-1', 'saved-1'] }], operations), []);
  assert.deepEqual(unlinkedDraftOperationIds([{ id: 'welcome' }], operations), ['draft-1']);
});
