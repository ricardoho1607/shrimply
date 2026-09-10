'use strict';
const { hasUserPermission } = require('./permissions');
const DATASETS = Object.freeze({
  ponds: 'viewFarm', physicalPonds: 'viewFarm', blocks: 'viewFarm', cycles: 'viewFarm',
  feeds: 'viewFarm', additives: 'viewFarm', harvestRecords: 'viewFarm', labReports: 'viewFarm',
  expenses: 'viewFinance', revenues: 'viewFinance', assets: 'viewAssets',
});
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 160 && !value.includes('/') && !['.', '..'].includes(value);
const privateField = /password|secret|token|credential|api.?key|email|phone|address|latitude|longitude|download.?url|file.?url|attachment|ownerId|createdBy|updatedBy|userId|bank|accountNumber/i;
const financeField = /cost|price|profit|revenue|expense|payment|salary|wage|financial|billing|invoice|purchase|depreciation/i;
const cleanRecord = (value, canViewFinance) => {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(item => cleanRecord(item, canViewFinance));
  if (typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !privateField.test(key) && (canViewFinance || !financeField.test(key)))
    .map(([key, item]) => [key, cleanRecord(item, canViewFinance)]));
};
const tool = {
  type: 'function', name: 'read_app_records',
  description: 'Read saved records from the current Shrimply company. Ponds include samplings, feeding and water-quality histories. List a dataset to discover IDs and fields; then use documentId and field for full historical arrays. Pagination is explicit: never treat a partial page as the entire farm or a complete financial total. No writes.',
  parameters: {
    type: 'object', properties: {
      dataset: { type: 'string', enum: Object.keys(DATASETS) },
      documentId: { type: 'string', description: 'Optional exact document ID from an earlier lookup.' },
      field: { type: 'string', description: 'Optional top-level field, such as samplings, to read from a document.' },
      after: { type: 'string', description: 'Next-page document cursor returned by a list lookup.' },
      offset: { type: 'integer', minimum: 0, description: 'Array offset for a document field.' },
    }, required: ['dataset'], additionalProperties: false,
  },
};
const createOrsonAppDataReader = ({ db, company, user, uid, companyId }) => {
  const allowed = permission => hasUserPermission({ company: { ...company, id: companyId }, user, uid, permission });
  const canViewFinance = allowed('viewFinance');
  const execute = async (name, args) => {
    if (name !== tool.name || !args || !Object.hasOwn(DATASETS, args.dataset) || !allowed(DATASETS[args.dataset])) throw new Error('Not permitted');
    if (args.documentId !== undefined && !validId(args.documentId)) throw new Error('Invalid document');
    if (args.after !== undefined && !validId(args.after)) throw new Error('Invalid cursor');
    if (args.offset !== undefined && (!Number.isInteger(args.offset) || args.offset < 0)) throw new Error('Invalid offset');
    if (args.field !== undefined && (typeof args.field !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]{0,80}$/.test(args.field))) throw new Error('Invalid field');
    const ref = args.dataset === 'assets' ? db.collection('assets') : db.collection('companies').doc(companyId).collection(args.dataset);
    if (args.documentId) {
      const snap = await ref.doc(args.documentId).get();
      if (!snap.exists) return { status: 'not_found' };
      if (args.dataset === 'assets' && snap.data().companyId !== companyId) throw new Error('Not permitted');
      const data = cleanRecord(snap.data(), canViewFinance);
      if (args.field && !Object.hasOwn(data, args.field)) return { status: 'field_unavailable', fields: Object.keys(data) };
      let value = args.field ? data[args.field] : data;
      let nextOffset = null;
      if (Array.isArray(value)) {
        const offset = args.offset || 0;
        const all = value;
        value = all.slice(offset, offset + 30);
        nextOffset = offset + value.length < all.length ? offset + value.length : null;
      }
      if (JSON.stringify(value).length > 24000) return { status: 'select_field', fields: Object.keys(data), message: 'Document is large. Request one field at a time; array fields support pagination.' };
      return { status: 'ok', dataset: args.dataset, id: snap.id, field: args.field || null, data: value, nextOffset, complete: nextOffset === null };
    }
    let query = args.dataset === 'assets' ? ref.where('companyId', '==', companyId) : ref;
    query = query.orderBy('__name__');
    if (args.after) query = query.startAfter(args.after);
    const snap = await query.limit(11).get();
    const docs = snap.docs.slice(0, 10);
    const records = docs.map(doc => {
      const data = cleanRecord(doc.data(), canViewFinance);
      return { id: doc.id, fields: Object.keys(data), data: Object.fromEntries(Object.entries(data).filter(([, v]) => v === null || typeof v !== 'object').map(([k, v]) => [k, typeof v === 'string' && v.length > 600 ? { preview: v.slice(0, 600), truncated: true } : v])) };
    });
    return { status: 'ok', dataset: args.dataset, records, documentDetailsOmitted: true, nextCursor: snap.docs.length > 10 ? docs.at(-1).id : null, complete: snap.docs.length <= 10 };
  };
  return { tools: [{ ...tool, parameters: { ...tool.parameters, properties: { ...tool.parameters.properties, dataset: { type: 'string', enum: Object.keys(DATASETS).filter(key => allowed(DATASETS[key])) } } } }], execute };
};
module.exports = { createOrsonAppDataReader, cleanRecord };
