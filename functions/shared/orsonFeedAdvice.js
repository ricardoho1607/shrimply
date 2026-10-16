'use strict';

const NUMBER = '\\d+(?:[.,]\\d+)?(?:\\s*[-–—]\\s*\\d+(?:[.,]\\d+)?)?';
const AMOUNT = `${NUMBER}\\s*(?:kg\\b|g\\b|grams?\\b|kilograms?\\b|kilogram\\b|tonnes?\\b|tons?\\b|%)`;
const patterns = [
  new RegExp(`\\b(?:give|offer|allocate|dispense|provide|use|recommend|berikan|beri|sarankan)\\b[^.!?]{0,90}?${AMOUNT}`, 'i'),
  new RegExp(`\\b(?:hold|keep|maintain|limit|cap|target|pertahankan|batasi)\\b[^.!?]{0,70}?${AMOUNT}`, 'i'),
  new RegExp(`\\b(?:increase|reduce|cut|lower|raise|adjust|kurangi|naikkan)\\b[^.!?]{0,30}\\b(?:feed|feeding|ration|pakan)\\b[^.!?]{0,55}?${AMOUNT}`, 'i'),
  new RegExp(`\\b(?:feed|pakan)\\s+(?!was\\b|is\\b|recorded\\b|given\\b|allocated\\b|allocation\\b|pressure\\b)(?:[^.!?]{0,35}?)${AMOUNT}`, 'gi'),
  new RegExp(`(?:tomorrow|next (?:meal|feeding)|besok)\\s*[:=]\\s*${AMOUNT}`, 'i'),
  new RegExp(`${AMOUNT}[^.!?]{0,35}\\b(?:is|would be|seems)\\s+(?:safe|fine|good|appropriate|recommended)\\b`, 'i'),
];

const unsafeFeedAmount = paragraph => {
  const plain = paragraph.normalize('NFKC').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.global) {
      for (const match of plain.matchAll(pattern)) {
        // "Expected feed 36 kg" is a calculation, not an instruction to feed.
        if (!/\b(?:expected|estimated|model|actual|recorded|logged)\s*$/i.test(plain.slice(0, match.index))) return true;
      }
    } else if (pattern.test(plain)) return true;
  }
  return new RegExp(`^(?:[-*]\\s*)?${AMOUNT}`, 'i').test(plain)
    && !/\b(?:recorded|logged|was|given|allocated|calculated|calculation|formula|tercatat|dicatat)\b/i.test(plain);
};

const feedClarification = question => {
  if (/\b(?:pakan|kolam|tambak|berapa|besok)\b/i.test(question)) return 'Saya belum bisa menetapkan jumlah pakan yang andal dari data ini. Bagaimana hasil anco terakhir dan protokol pakan yang berlaku?';
  if (/[\u4e00-\u9fff]/u.test(question)) return '现有记录不足以确定可靠的投喂量。最近料台的情况如何，适用的投喂方案是什么？';
  if (/[\u0e00-\u0e7f]/u.test(question)) return 'ข้อมูลนี้ยังไม่พอที่จะกำหนดปริมาณอาหารที่เชื่อถือได้ ผลตรวจยอครั้งล่าสุดเป็นอย่างไร และใช้แนวทางให้อาหารใดอยู่?';
  if (/tiếng việt|[ạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/iu.test(question)) return 'Dữ liệu này chưa đủ để xác định lượng thức ăn đáng tin cậy. Kết quả kiểm tra sàng ăn gần nhất và quy trình cho ăn đang áp dụng là gì?';
  return 'I can’t set a reliable feed amount from these records. What do the latest feed trays show, and what feeding protocol applies?';
};

const guardFeedAdvice = (text, question) => {
  let blocked = false;
  const result = String(text || '').split(/(\n[ \t]*\n)/).map(part => {
    if (!unsafeFeedAmount(part)) return part;
    blocked = true;
    return feedClarification(question);
  }).join('');
  return { text: result, blocked };
};

// A paragraph is checked before any of it reaches the client. In particular,
// a quantity split over deltas or a single newline cannot bypass this check.
const createFeedAdviceStream = (onTextDelta, question) => {
  let pending = '', streamed = '', blocked = false;
  const emit = async text => { if (text) { streamed += text; await onTextDelta?.(text); } };
  return {
    async push(delta) {
      pending += delta;
      let boundary;
      while ((boundary = /\n[ \t]*\n/.exec(pending))) {
        const end = boundary.index + boundary[0].length;
        const checked = guardFeedAdvice(pending.slice(0, end), question);
        blocked ||= checked.blocked;
        await emit(checked.text);
        pending = pending.slice(end);
      }
    },
    async finish(finalText) {
      const checked = guardFeedAdvice(finalText, question);
      blocked ||= checked.blocked;
      // The provider may return a completed answer without emitting deltas.
      if (!streamed) await emit(checked.text);
      else if (checked.text.startsWith(streamed)) await emit(checked.text.slice(streamed.length));
      pending = '';
      return { text: checked.text, blocked };
    },
  };
};

module.exports = { guardFeedAdvice, createFeedAdviceStream, unsafeFeedAmount };
