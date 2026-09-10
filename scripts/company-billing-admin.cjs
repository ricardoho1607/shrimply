#!/usr/bin/env node
'use strict';

// Explicit project + immutable Firestore createTime cutoff. Dry-run by default.
// Reuses the operator's existing Firebase CLI login; never prints credentials.
const { getAccessToken, getGlobalDefaultAccount } = require('firebase-tools/lib/auth');

const eligibleCompanies = (companies, cutoff) => companies.filter(company => {
  const created = Date.parse(company.createTime);
  if (!Number.isFinite(created)) throw new Error(`Missing server createTime: ${company.name}`);
  return created <= cutoff;
});

async function connect(projectId) {
  if (!/^[a-z][a-z0-9-]+$/.test(projectId || '')) throw new Error('An explicit --project ID is required.');
  const account = getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Sign in with Firebase CLI first.');
  const token = await getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const root = `projects/${projectId}/databases/(default)/documents`;
  const request = async (relative, options = {}) => {
    const response = await fetch(`https://firestore.googleapis.com/v1/${root}${relative}`, {
      ...options,
      headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    });
    if (response.status === 404 && !options.method) return null;
    if (!response.ok) throw new Error(`Firestore ${response.status} at ${relative.split('?')[0]}`);
    return response.json();
  };
  const list = async (collectionPath, transaction) => {
    const documents = [];
    let pageToken;
    do {
      const result = await request(`/${collectionPath}?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}${transaction ? `&transaction=${encodeURIComponent(transaction)}` : ''}`);
      documents.push(...(result?.documents || []));
      pageToken = result?.nextPageToken;
    } while (pageToken);
    return documents;
  };
  return { root, request, list };
}

async function main() {
  const arg = key => process.argv.find(value => value.startsWith(`--${key}=`))?.slice(key.length + 3);
  const projectId = arg('project');
  const cutoffText = arg('before');
  const cutoff = Date.parse(cutoffText);
  if (!Number.isFinite(cutoff) || cutoff > Date.now()) throw new Error('--before must be a fixed ISO timestamp in the past.');
  const apply = process.argv.includes('--apply');
  const { root, request, list } = await connect(projectId);
  const all = await list('companies');
  const cohort = eligibleCompanies(all, cutoff);
  const targets = [];
  for (const company of cohort) {
    const id = company.name.split('/').at(-1);
    const existing = await request(`/companies/${encodeURIComponent(id)}/subscriptionGrants/current`);
    if (existing && (existing.fields?.kind?.stringValue !== 'lifetime' || existing.fields?.status?.stringValue !== 'active')) {
      throw new Error(`Conflicting grant on company ${id}; no grants have been written.`);
    }
    targets.push({ id, companyName: company.fields?.companyName?.stringValue || company.fields?.name?.stringValue || id,
      createTime: company.createTime, alreadyGranted: Boolean(existing) });
  }
  if (apply) {
    for (const target of targets.filter(value => !value.alreadyGranted)) {
      await request(':commit', { method: 'POST', body: JSON.stringify({ writes: [{
        update: { name: `${root}/companies/${target.id}/subscriptionGrants/current`, fields: {
          kind: { stringValue: 'lifetime' }, status: { stringValue: 'active' },
          companyId: { stringValue: target.id }, source: { stringValue: 'existing-company-promise' },
          cohortCutoff: { timestampValue: new Date(cutoff).toISOString() },
          companyCreateTime: { timestampValue: target.createTime },
        } }, currentDocument: { exists: false },
        updateTransforms: [{ fieldPath: 'grantedAt', setToServerValue: 'REQUEST_TIME' }],
      }] }) });
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', projectId, cutoff: new Date(cutoff).toISOString(),
    eligible: targets.length, excludedNewCompanies: all.length - targets.length,
    grants: targets }, null, 2));
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { connect, eligibleCompanies };
