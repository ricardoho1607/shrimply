require('../scripts/register-typescript.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {parseOrsonMessageBlocks}=require('./messageBlocks.ts');

test('tables keep plain values, missing values, dates and surrounding explanation',()=>{
  const blocks=parseOrsonMessageBlocks('Latest saved readings:\n\n| Pond | pH | Feed |\n| --- | ---: | --- |\n| A1 | 7.85 (2026-10-14) | 0 kg |\n| A2 | Unknown | Not recorded |\n\nCheck A2.');
  const table=blocks.find(b=>b.type==='table');
  assert.deepEqual(table.headers,['Pond','pH','Feed']);
  assert.deepEqual(table.rows,[['A1','7.85 (2026-10-14)','0 kg'],['A2','Unknown','Not recorded']]);
  assert.match(blocks[0].text,/Latest saved readings/);assert.match(blocks.at(-1).text,/Check A2/);
});
test('partial streamed tables remain text until a complete header and data row arrive',()=>{
  for(const text of ['| Pond | pH |','| Pond | pH |\n| --- | --- |','| Pond | pH |\n| --- | --- |\n| A1']) assert.deepEqual(parseOrsonMessageBlocks(text),[{type:'text',text}]);
  assert.equal(parseOrsonMessageBlocks('| Pond | pH |\n| --- | --- |\n| A1 | 7.8 |')[0].type,'table');
});
test('escaped pipes and HTML-looking cell values are text data',()=>{
  const table=parseOrsonMessageBlocks('| Pond | Note |\n| --- | --- |\n| A\\|1 | <script>alert(1)</script> |')[0];
  assert.deepEqual(table.rows,[['A|1','<script>alert(1)</script>']]);
});
test('ordinary pipe text and fenced examples are not treated as tables',()=>{
  for(const text of ['A | B\nnot a separator\n1 | 2','```\n| A | B |\n| --- | --- |\n| 1 | 2 |\n```']) assert.deepEqual(parseOrsonMessageBlocks(text),[{type:'text',text}]);
});
