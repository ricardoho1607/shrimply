export type OrsonMessageBlock = { type: 'text'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

const cells = (line: string): string[] => {
  const source = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const result: string[] = [];
  let cell = '';
  for (let index = 0; index < source.length; index++) {
    if (source[index] === '\\' && source[index+1] === '|') { cell += '|'; index++; }
    else if (source[index] === '|') { result.push(cell.trim()); cell = ''; }
    else cell += source[index];
  }
  result.push(cell.trim());
  return result;
};

// Parse tables as data only. Every cell is rendered as text, never HTML.
// Partial or malformed tables remain readable text while streaming.
export const parseOrsonMessageBlocks = (text: string): OrsonMessageBlock[] => {
  const lines = text.split('\n'), blocks: OrsonMessageBlock[] = [];
  let pending: string[] = [], inCode = false;
  const flush = () => { if (pending.length) { blocks.push({type:'text',text:pending.join('\n')}); pending=[]; } };
  for (let index = 0; index < lines.length; index++) {
    if (/^\s*```/.test(lines[index])) inCode = !inCode;
    const headers = cells(lines[index]);
    const divider = index+1 < lines.length ? cells(lines[index+1]) : [];
    if (!inCode && headers.length >= 2 && divider.length === headers.length
      && divider.every(cell => /^:?-{3,}:?$/.test(cell))) {
      const rows: string[][] = [];
      let cursor = index+2;
      while (cursor < lines.length && lines[cursor].includes('|') && cells(lines[cursor]).length === headers.length) {
        rows.push(cells(lines[cursor++]));
      }
      if (rows.length) {
        flush(); blocks.push({type:'table',headers,rows}); index=cursor-1; continue;
      }
    }
    pending.push(lines[index]);
  }
  flush();
  return blocks;
};
