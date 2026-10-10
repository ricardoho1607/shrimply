"use strict";
// Accept only deletion inputs; callers cannot use this endpoint for another command.
exports.createDeleteSopHandler = (command) => (request) =>
  command({
    ...request,
    data: {
      action: "deleteSop",
      companyId: request.data?.companyId,
      sopId: request.data?.sopId,
      expectedRevision: request.data?.expectedRevision,
      operationId: request.data?.operationId,
    },
  });
