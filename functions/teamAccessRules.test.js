const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("Firestore denies client-side invite and membership approval mutations", () => {
  const rules = read("firestore.rules");
  assert.match(rules, /match \/companyInvites\/\{inviteId\}\s*\{\s*allow read, write: if false;/);
  assert.match(rules, /match \/securityRateLimits\/\{limitId\}\s*\{\s*allow read, write: if false;/);
  assert.match(rules, /match \/joinRequests\/\{requestId\}[\s\S]*?allow create: if false;[\s\S]*?allow update: if false;/);
  assert.match(rules, /changedKeys\(\)\.hasAny\(\[\s*'ownerId',\s*'teamMembers',\s*'pendingInvites',\s*'isVerified'/);
});

test("company membership requires reciprocal company and user records", () => {
  const rules = read("firestore.rules");
  assert.match(rules, /teamMembers\.hasAny\(\[request\.auth\.uid\]\)[\s\S]*?userDoc\(\)\.data\.companyId == companyId/);
  assert.match(rules, /match \/companies\/\{companyId\}[\s\S]*?allow read: if signedIn\(\)[\s\S]*?isCompanyMember\(companyId\)/);
  assert.match(rules, /allow create: if signedIn\(\)[\s\S]*?userDoc\(\)\.data\.companyId == null[\s\S]*?request\.resource\.data\.ownerId == request\.auth\.uid/);
  assert.match(rules, /resource\.data\.companyId == null \|\| resource\.data\.companyId == request\.resource\.data\.companyId/);
});

test("server-managed summaries are readable by farm members but never writable by clients", () => {
  const rules = read("firestore.rules");
  assert.match(rules, /match \/summaries\/\{summaryId\}[\s\S]*?allow read: if isFounderAdmin\(\) \|\| hasCompanyPermission\(companyId, 'viewFarm'\);[\s\S]*?allow write: if false;/);
});

test("join requests use one transactional record per user", () => {
  const source = read("functions/teamAccess.js");
  assert.match(source, /collection\("joinRequests"\)\.doc\(uid\)/);
  assert.match(source, /runTransaction[\s\S]*?transaction\.get\(requestRef\)[\s\S]*?transaction\.set\(requestRef/);
});

test("mobile and web join decisions use trusted callables", () => {
  for (const clientPath of ["context/AuthContext.tsx", "web/src/contexts/AuthContext.tsx"]) {
    const source = read(clientPath);
    assert.match(source, /createCompanyJoinRequest/);
    assert.match(source, /processCompanyJoinRequest/);
    assert.match(source, /httpsCallable\(firebaseFunctions, ['"]acceptCompanyInvite['"]\)/);
    assert.doesNotMatch(source, /addDoc\(collection\(db, ['"]joinRequests['"]/);
    assert.doesNotMatch(source, /batch\.update\(doc\(db, ['"]joinRequests['"]/);
  }
});

test("team operations can use the existing public callable during IAM rollout", () => {
  const source = read("functions/teamAccess.js");
  assert.match(source, /TEAM_ACCESS_OPERATIONS = Object\.freeze/);
  assert.match(source, /return handler\.run\(\{ \.\.\.request, data: operationData \}\)/);
});

test("legacy invite secrets are no longer created or logged by the mobile client", () => {
  const source = read("context/AuthContext.tsx");
  assert.doesNotMatch(source, /Math\.random\(\).*invite/i);
  assert.doesNotMatch(source, /Invite link:/);
  assert.match(source, /createCompanyInvite/);
});
