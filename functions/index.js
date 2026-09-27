const admin = require("./firebaseAdmin");
const { assertCompanyMemberForCallable } = require("./shared/companyAccess");

admin.initializeApp();

Object.assign(exports, require("./testerRequests"));
Object.assign(exports, require("./verificationEmail"));
Object.assign(exports, require("./teamAccess"));
Object.assign(exports, require("./orson"));
Object.assign(exports, require("./adminMetrics"));
Object.assign(exports, require("./orsonLearning")({
  admin,
  assertCompanyMemberForCallable,
}));
Object.assign(exports, require("./adminIntelligence")({ admin }));
Object.assign(exports, require("./operationalNotifications")({ admin, assertCompanyMemberForCallable }));
Object.assign(exports, require("./billing"));

Object.assign(exports, require('./diseasePrivacy'));

Object.assign(exports, require('./orsonAgent'));
