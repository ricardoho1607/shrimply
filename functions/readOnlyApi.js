'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('./firebaseAdmin');
const { createReadOnlyFarmApi } = require('./shared/readOnlyFarmApi');
const {
  FIXED_SITE_PROJECT_ID,
  DEFAULT_SITE_AUDIENCE,
  REQUIRED_SCOPE,
  isSiteDelegationRequest,
  verifySiteDelegatedRequest,
  createPairChallenge,
  consumePairChallenge,
  revokeLinkByUid,
  revokeLinkByPrincipal,
  getLinkForPrincipal,
  getLinkForUid,
  hasCallerSuppliedUid,
  hasForbiddenPairCompleteInputs,
} = require('./shared/siteMcpDelegation');

const siteMcpHmacSecret = defineSecret('SITE_MCP_HMAC_SECRET');

const ALLOWED_QUERY_KEYS = {
  ponds: new Set(['limit', 'cursor', 'blockId', 'block_id']),
  'pond-summary': new Set([]),
  'water-quality': new Set(['startDate', 'endDate', 'start_date', 'end_date', 'limit', 'cursor']),
  'feed-summary': new Set(['startDate', 'endDate', 'start_date', 'end_date', 'limit', 'cursor']),
  'pair-challenge': new Set([]),
  'pair-complete': new Set([]),
  'revoke-link': new Set([]),
  'link-status': new Set([]),
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const decodePondId = (rawId) => {
  try {
    const pondId = decodeURIComponent(rawId);
    if (!pondId.trim() || pondId.length > 160 || pondId.includes('/') || ['.', '..'].includes(pondId.trim())) return null;
    return pondId.trim();
  } catch (_) {
    return null;
  }
};
const hasCompanyScopeHeader = (headers = {}) => Object.keys(headers).some((key) =>
  ['companyid', 'company_id'].includes(key.toLowerCase()),
);

const mapErrorToHttpStatus = (code) => {
  switch (code) {
    case 'unauthenticated':
      return 401;
    case 'permission-denied':
      return 403;
    case 'not-found':
      return 404;
    case 'invalid-argument':
    case 'failed-precondition':
      return 400;
    case 'aborted':
    case 'already-exists':
    case 'conflict':
      return 409;
    case 'method-not-allowed':
      return 405;
    case 'unavailable':
      return 503;
    case 'resource-exhausted':
      return 429;
    default:
      return 500;
  }
};

const sendSafeError = (res, err) => {
  const candidateCode = typeof err?.code === 'string' ? err.code : 'internal';
  const status = mapErrorToHttpStatus(candidateCode);
  const code = status === 500 ? 'internal' : candidateCode;

  let message;
  if (status === 500) {
    message = 'An unexpected internal error occurred.';
  } else if (status === 503) {
    message = 'Service temporarily unavailable.';
  } else {
    message = typeof err?.message === 'string' ? err.message : 'An error occurred.';
  }

  res.status(status).json({
    error: {
      code,
      message,
    },
  });
};

const matchRoute = (cleanPath) => {
  let p = cleanPath.replace(/\/+$/, '');
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/^\/readOnlyApi(?=\/|$)/i, '');
  if (!p) p = '/';

  // Management routes
  if (/^\/api\/integrations\/v1\/(site-delegation\/pair-challenge|site-delegation\/pair-code|pairing\/challenge|pairing\/start)$/i.test(p)) {
    return { route: 'pair-challenge', allowedMethods: ['POST'], isManagement: true };
  }
  if (/^\/api\/integrations\/v1\/(site-delegation\/pair-complete|site-delegation\/pair|site-delegation\/link|pairing\/complete)$/i.test(p)) {
    return { route: 'pair-complete', allowedMethods: ['POST'], isManagement: true };
  }
  if (/^\/api\/integrations\/v1\/(site-delegation\/revoke|site-delegation\/unlink)$/i.test(p)) {
    return { route: 'revoke-link', allowedMethods: ['POST'], isManagement: true };
  }
  if (/^\/api\/integrations\/v1\/(site-delegation\/status)$/i.test(p)) {
    return { route: 'link-status', allowedMethods: ['GET'], isManagement: true };
  }

  let m = p.match(/^\/api\/integrations\/v1\/ponds$/i);
  if (m) {
    return { route: 'ponds', pondId: null, allowedMethods: ['GET'], isManagement: false };
  }

  m = p.match(/^\/api\/integrations\/v1\/ponds\/([^/]+)\/summary$/i);
  if (m) {
    const pondId = decodePondId(m[1]);
    return pondId === null
      ? { route: 'invalid-pond-id', allowedMethods: ['GET'], isManagement: false }
      : { route: 'pond-summary', pondId, allowedMethods: ['GET'], isManagement: false };
  }

  m = p.match(/^\/api\/integrations\/v1\/ponds\/([^/]+)\/water-quality$/i);
  if (m) {
    const pondId = decodePondId(m[1]);
    return pondId === null
      ? { route: 'invalid-pond-id', allowedMethods: ['GET'], isManagement: false }
      : { route: 'water-quality', pondId, allowedMethods: ['GET'], isManagement: false };
  }

  m = p.match(/^\/api\/integrations\/v1\/ponds\/([^/]+)\/feed-summary$/i);
  if (m) {
    const pondId = decodePondId(m[1]);
    return pondId === null
      ? { route: 'invalid-pond-id', allowedMethods: ['GET'], isManagement: false }
      : { route: 'feed-summary', pondId, allowedMethods: ['GET'], isManagement: false };
  }

  return null;
};

const createReadOnlyApiHandler = ({
  auth = null,
  db = null,
  farmApi = null,
  hmacSecret = process.env.SITE_MCP_HMAC_SECRET || process.env.SITE_DELEGATION_SECRET || null,
} = {}) => {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    let parsedUrl;
    try {
      parsedUrl = new URL(req.url || '/', 'http://localhost');
    } catch (_) {
      return res.status(400).json({
        error: { code: 'invalid-argument', message: 'Request URL is invalid.' },
      });
    }

    const matched = matchRoute(parsedUrl.pathname || '/');
    if (!matched) {
      return res.status(404).json({
        error: {
          code: 'not-found',
          message: 'Route not found.',
        },
      });
    }

    const allowedMethods = matched.allowedMethods || ['GET'];
    if (!allowedMethods.includes(req.method)) {
      res.setHeader('Allow', allowedMethods.join(', '));
      return res.status(405).json({
        error: {
          code: 'method-not-allowed',
          message: `Method ${req.method} is not allowed. Only ${allowedMethods.join(', ')} requests are supported.`,
        },
      });
    }

    if (matched.route === 'invalid-pond-id') {
      return res.status(400).json({
        error: { code: 'invalid-argument', message: 'Invalid pond ID.' },
      });
    }

    const resolvedDb = db || (farmApi ? null : admin.firestore());
    const resolvedFarmApi = farmApi || createReadOnlyFarmApi({ db: resolvedDb });
    const resolvedHmacSecret = hmacSecret || process.env.SITE_MCP_HMAC_SECRET || process.env.SITE_DELEGATION_SECRET;
    const resolvedAuth = auth || admin.auth();

    let uid = null;
    let principal = null;
    let authMode = null;
    let firebaseAuthTime = null;
    let delegationLink = null;

    const isSiteDelegated = isSiteDelegationRequest(req);
    if (isSiteDelegated) {
      if (hasCallerSuppliedUid(req)) {
        return res.status(400).json({
          error: {
            code: 'invalid-argument',
            message: 'A Firebase UID is never accepted from Site request inputs; user identity is derived from verified delegation link.',
          },
        });
      }

      try {
        const delegationResult = await verifySiteDelegatedRequest({
          req,
          db: resolvedDb,
          hmacSecret: resolvedHmacSecret,
          rawBody: req.rawBody,
          pathname: parsedUrl.pathname,
          query: req.query,
          requireLinkedPrincipal: matched.route !== 'pair-challenge',
        });
        principal = delegationResult.principal;
        uid = delegationResult.uid;
        delegationLink = delegationResult.link;
        authMode = 'site-delegation';
      } catch (err) {
        return sendSafeError(res, err);
      }
    } else {
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      if (!authHeader || typeof authHeader !== 'string') {
        return res.status(401).json({
          error: {
            code: 'unauthenticated',
            message: 'Missing Authorization header or Site delegation signature.',
          },
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: {
            code: 'unauthenticated',
            message: 'Invalid Authorization header format. Expected Bearer <token>.',
          },
        });
      }

      const idToken = authHeader.slice(7).trim();
      if (!idToken) {
        return res.status(401).json({
          error: {
            code: 'unauthenticated',
            message: 'Bearer token is empty.',
          },
        });
      }

      let decodedToken;
      try {
        decodedToken = await resolvedAuth.verifyIdToken(idToken, true);
      } catch (_) {
        return res.status(401).json({
          error: {
            code: 'unauthenticated',
            message: 'Invalid, expired, or revoked authentication token.',
          },
        });
      }

      uid = decodedToken?.uid;
      firebaseAuthTime = decodedToken?.auth_time;
      if (!uid) {
        return res.status(401).json({
          error: {
            code: 'unauthenticated',
            message: 'Authentication token missing user ID.',
          },
        });
      }
      authMode = 'firebase-bearer';
    }

    const query = req.query || {};

    // 1. Strictly reject caller companyId
    if (query.companyId !== undefined || query.company_id !== undefined || hasCompanyScopeHeader(req.headers)) {
      return res.status(400).json({
        error: {
          code: 'invalid-argument',
          message: 'Caller cannot specify companyId in query parameters or headers; company is derived from authenticated user.',
        },
      });
    }

    // 2. Reject repeated query parameters
    for (const [key, val] of Object.entries(query)) {
      if (Array.isArray(val)) {
        return res.status(400).json({
          error: {
            code: 'invalid-argument',
            message: `Repeated query parameter '${key}' is not allowed.`,
          },
        });
      }
    }

    // 3. Reject unknown query keys for route
    const allowed = ALLOWED_QUERY_KEYS[matched.route];
    if (allowed) {
      for (const key of Object.keys(query)) {
        if (!allowed.has(key)) {
          return res.status(400).json({
            error: {
              code: 'invalid-argument',
              message: `Unknown query parameter '${key}' for route '${matched.route}'.`,
            },
          });
        }
      }
    }

    // 4. Handle management routes
    if (matched.isManagement) {
      try {
        switch (matched.route) {
          case 'pair-challenge': {
            if (authMode !== 'site-delegation') {
              return res.status(403).json({
                error: {
                  code: 'permission-denied',
                  message: 'Firebase Bearer must never create a Site challenge; challenges must be requested via signed Site delegation.',
                },
              });
            }
            const ttlSeconds = typeof req.body?.ttlSeconds === 'number' ? req.body.ttlSeconds : undefined;
            const challenge = await createPairChallenge({ db: resolvedDb, principal, ttlSeconds });
            return res.status(200).json({
              apiVersion: 'v1',
              data: challenge,
            });
          }
          case 'pair-complete': {
            if (authMode !== 'firebase-bearer') {
              return res.status(403).json({
                error: {
                  code: 'permission-denied',
                  message: 'HMAC must never complete pairing; pair completion requires Firebase Bearer authentication.',
                },
              });
            }
            if (hasForbiddenPairCompleteInputs(req)) {
              return res.status(400).json({
                error: {
                  code: 'invalid-argument',
                  message: 'Request must not contain uid, email, or principal; identity is derived only from authenticated token and stored challenge.',
                },
              });
            }
            const rawPairCode = req.body?.pairCode ?? req.body?.code;
            if (!rawPairCode || typeof rawPairCode !== 'string' || !rawPairCode.trim()) {
              return res.status(400).json({
                error: {
                  code: 'invalid-argument',
                  message: 'Missing or invalid pairCode.',
                },
              });
            }
            if (!Number.isSafeInteger(firebaseAuthTime) || firebaseAuthTime <= 0) {
              return res.status(401).json({
                error: { code: 'unauthenticated', message: 'Authentication token is missing a valid authentication time.' },
              });
            }

            try {
              const authUser = await resolvedAuth.getUser(uid);
              if (!authUser || authUser.disabled) {
                return res.status(403).json({
                  error: { code: 'permission-denied', message: 'User account is disabled.' },
                });
              }
              const tokensValidAfterMs = Date.parse(authUser.tokensValidAfterTime || '');
              if (!Number.isFinite(tokensValidAfterMs) || firebaseAuthTime < Math.floor(tokensValidAfterMs / 1000)) {
                return res.status(401).json({
                  error: { code: 'unauthenticated', message: 'Authentication token is no longer valid for account linking.' },
                });
              }
            } catch (err) {
              if (err?.code === 'auth/user-not-found' || err?.code === 'not-found') {
                return res.status(403).json({
                  error: { code: 'permission-denied', message: 'User account not found or has been deleted.' },
                });
              }
              return sendSafeError(res, err);
            }

            const result = await consumePairChallenge({
              db: resolvedDb,
              pairCode: rawPairCode.trim(),
              uid,
              firebaseAuthTime,
            });

            return res.status(200).json({
              apiVersion: 'v1',
              data: result,
            });
          }
          case 'revoke-link': {
            let result;
            if (authMode === 'site-delegation') {
              result = await revokeLinkByPrincipal({ db: resolvedDb, principal });
            } else {
              result = await revokeLinkByUid({ db: resolvedDb, uid });
            }
            return res.status(200).json({
              apiVersion: 'v1',
              data: result,
            });
          }
          case 'link-status': {
            let result;
            if (authMode === 'site-delegation') {
              const link = await getLinkForPrincipal({ db: resolvedDb, principal });
              result = {
                linked: Boolean(link?.uid && link.active === true &&
                  Number.isFinite(link.expiresAt) && link.expiresAt > Date.now() &&
                  link.audience === DEFAULT_SITE_AUDIENCE &&
                  link.siteProjectId === FIXED_SITE_PROJECT_ID &&
                  (Array.isArray(link.scope) ? link.scope : []).includes(REQUIRED_SCOPE)),
              };
            } else {
              const link = await getLinkForUid({ db: resolvedDb, uid });
              result = {
                linked: Boolean(link?.principal && link.active === true &&
                  Number.isFinite(link.expiresAt) && link.expiresAt > Date.now() &&
                  link.audience === DEFAULT_SITE_AUDIENCE &&
                  link.siteProjectId === FIXED_SITE_PROJECT_ID &&
                  (Array.isArray(link.scope) ? link.scope : []).includes(REQUIRED_SCOPE)),
              };
            }
            return res.status(200).json({
              apiVersion: 'v1',
              data: result,
            });
          }
          default:
            return res.status(404).json({
              error: {
                code: 'not-found',
                message: 'Route not found.',
              },
            });
        }
      } catch (err) {
        return sendSafeError(res, err);
      }
    }

    // 5. Existing farm API parameter validations
    // Reject ambiguous aliases
    if (query.blockId !== undefined && query.block_id !== undefined) {
      return res.status(400).json({
        error: {
          code: 'invalid-argument',
          message: 'Ambiguous query parameters: specify either blockId or block_id, not both.',
        },
      });
    }
    if (query.startDate !== undefined && query.start_date !== undefined) {
      return res.status(400).json({
        error: {
          code: 'invalid-argument',
          message: 'Ambiguous query parameters: specify either startDate or start_date, not both.',
        },
      });
    }
    if (query.endDate !== undefined && query.end_date !== undefined) {
      return res.status(400).json({
        error: {
          code: 'invalid-argument',
          message: 'Ambiguous query parameters: specify either endDate or end_date, not both.',
        },
      });
    }

    // Validate query parameter types
    if (query.limit !== undefined) {
      const parsedLimit = Number(query.limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          error: {
            code: 'invalid-argument',
            message: 'Query parameter limit must be an integer between 1 and 100.',
          },
        });
      }
    }

    const startDateVal = query.startDate ?? query.start_date;
    if (startDateVal !== undefined && (!startDateVal || !ISO_DATE_REGEX.test(String(startDateVal)))) {
      return res.status(400).json({
        error: {
          code: 'invalid-argument',
          message: 'startDate must be in YYYY-MM-DD format.',
        },
      });
    }

    const endDateVal = query.endDate ?? query.end_date;
    if (endDateVal !== undefined && (!endDateVal || !ISO_DATE_REGEX.test(String(endDateVal)))) {
      return res.status(400).json({
        error: {
          code: 'invalid-argument',
          message: 'endDate must be in YYYY-MM-DD format.',
        },
      });
    }

    const limit = query.limit !== undefined ? Number(query.limit) : undefined;
    if (query.cursor !== undefined && (typeof query.cursor !== 'string' || !query.cursor.trim() || query.cursor.length > 4096)) {
      return res.status(400).json({
        error: { code: 'invalid-argument', message: 'cursor must be a non-empty string of at most 4096 characters.' },
      });
    }
    const rawBlockId = query.blockId ?? query.block_id;
    if (rawBlockId !== undefined && (typeof rawBlockId !== 'string' || !rawBlockId.trim() || rawBlockId.length > 160 || rawBlockId.includes('/'))) {
      return res.status(400).json({
        error: { code: 'invalid-argument', message: 'blockId must be a valid non-empty ID.' },
      });
    }
    const cursor = query.cursor === undefined ? undefined : query.cursor;
    const blockId = rawBlockId === undefined ? undefined : rawBlockId.trim();
    const startDate = startDateVal ? String(startDateVal) : undefined;
    const endDate = endDateVal ? String(endDateVal) : undefined;

    // Reject disabled or deleted Firebase Auth users on delegated calls
    if (authMode === 'site-delegation' && resolvedAuth && typeof resolvedAuth.getUser === 'function') {
      try {
        const authUser = await resolvedAuth.getUser(uid);
        if (authUser?.disabled) {
          return res.status(403).json({
            error: {
              code: 'permission-denied',
              message: 'User account is disabled.',
            },
          });
        }
        const tokensValidAfterMs = Date.parse(authUser?.tokensValidAfterTime || '');
        if (!Number.isFinite(tokensValidAfterMs) ||
            !Number.isSafeInteger(delegationLink?.firebaseAuthTime) ||
            delegationLink.firebaseAuthTime < Math.floor(tokensValidAfterMs / 1000)) {
          return res.status(403).json({
            error: {
              code: 'permission-denied',
              message: 'Firebase session was revoked after this Site link was created.',
            },
          });
        }
      } catch (err) {
        if (err?.code === 'auth/user-not-found' || err?.code === 'not-found') {
          return res.status(403).json({
            error: {
              code: 'permission-denied',
              message: 'User account not found or has been deleted.',
            },
          });
        }
        return sendSafeError(res, err);
      }
    }

    try {
      let data;
      let meta;

      switch (matched.route) {
        case 'ponds': {
          const result = await resolvedFarmApi.listPonds({
            uid,
            limit,
            cursor,
            blockId,
          });
          data = result.items;
          meta = {
            limit: result.limit,
            nextCursor: result.nextCursor,
            cursorRevision: result.cursorRevision,
            hasMore: result.hasMore,
          };
          break;
        }
        case 'pond-summary': {
          const result = await resolvedFarmApi.getPondSummary({
            uid,
            pondId: matched.pondId,
          });
          data = result;
          meta = {
            pondId: matched.pondId,
          };
          break;
        }
        case 'water-quality': {
          const result = await resolvedFarmApi.getWaterQualityRecords({
            uid,
            pondId: matched.pondId,
            limit,
            cursor,
            startDate,
            endDate,
          });
          data = result.items;
          meta = {
            pondId: result.pondId,
            startDate: result.startDate,
            endDate: result.endDate,
            limit: result.limit,
            nextCursor: result.nextCursor,
            cursorRevision: result.cursorRevision,
            hasMore: result.hasMore,
            dataCoverage: result.dataCoverage,
          };
          break;
        }
        case 'feed-summary': {
          const result = await resolvedFarmApi.getFeedSummary({
            uid,
            pondId: matched.pondId,
            limit,
            cursor,
            startDate,
            endDate,
          });
          data = result.items;
          meta = {
            pondId: result.pondId,
            startDate: result.startDate,
            endDate: result.endDate,
            limit: result.limit,
            nextCursor: result.nextCursor,
            cursorRevision: result.cursorRevision,
            hasMore: result.hasMore,
            totalFeedKg: result.totalFeedKg,
            unit: result.unit,
            dataCoverage: result.dataCoverage,
          };
          break;
        }
        default:
          return res.status(404).json({
            error: {
              code: 'not-found',
              message: 'Route not found.',
            },
          });
      }

      return res.status(200).json({
        apiVersion: 'v1',
        data,
        meta,
      });
    } catch (err) {
      return sendSafeError(res, err);
    }
  };
};

const readOnlyApi = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 30,
    cors: false,
    secrets: [siteMcpHmacSecret],
  },
  (req, res) => createReadOnlyApiHandler({ hmacSecret: siteMcpHmacSecret.value() })(req, res),
);

module.exports = {
  readOnlyApi,
  createReadOnlyApiHandler,
  matchRoute,
  mapErrorToHttpStatus,
  sendSafeError,
  ALLOWED_QUERY_KEYS,
};
