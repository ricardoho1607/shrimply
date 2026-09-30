const { randomUUID } = require("node:crypto");
const { authorizeAgent, validId, fail } = require("./orsonActionAuth");
const { planCommands, hash, clean } = require("./orsonCommandPlan");
const MAX_ROWS = 30;
const publicOperation = (op) => ({
  id: op.id,
  revision: op.revision,
  state: op.state,
  rows: op.rows.map(({ basis, ...row }) => row),
  expiresAt: op.expiresAt,
  receipts: op.receipts || [],
});
const groupCommands = (commands) => {
  const groups = new Map();
  for (const c of commands) {
    // All commands for a pond share one atomic group; source side effects stay together.
    const key = c.pondId
      ? `pond:${c.pondId}`
      : c.itemId
        ? `inventory:${c.itemType}:${c.itemId}`
        : `ledger:${c.type}:${c.recordId || c.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  return [...groups.values()];
};
function createOperationService(db) {
  const refFor = (companyId, id) =>
    db
      .collection("companies")
      .doc(companyId)
      .collection("orsonOperations")
      .doc(id);
  const checkOwner = (op, uid) => {
    if (!op || op.uid !== uid)
      fail("Operation unavailable.", "permission-denied");
  };
  async function checkAccess(auth, op, tx) {
    // Saved commands describe already-committed history. Rechecking them can
    // make an otherwise valid current draft inaccessible after an action is
    // removed or renamed in a later contract version.
    for (const row of Array.isArray(op.rows) ? op.rows : []) {
      if (!row.valid) continue;
      const command = row.command;
      const { ORSON_ACTIONS } = require("./orsonAgentContract");
      const action = command && ORSON_ACTIONS[command.type];
      if (!action)
        fail(
          "This draft contains an unsupported action. Prepare it again before saving.",
          "failed-precondition",
        );
      auth.require(action.permission);
      if (command.pondId) {
        const ref = auth.base.collection("ponds").doc(command.pondId);
        const snap = await (tx ? tx.get(ref) : ref.get());
        let pond = snap.data();
        if (!pond && command.type === "start_cycle") {
          const physicalRef = auth.base
            .collection("physicalPonds")
            .doc(command.pondId);
          pond = (await (tx ? tx.get(physicalRef) : physicalRef.get())).data();
        }
        auth.checkPond(pond);
      }
    }
  }
  async function get({ uid, companyId, operationId }) {
    if (!validId(operationId)) fail("Invalid operation ID.");
    const auth = await authorizeAgent(db, uid, companyId);
    const op = (await refFor(companyId, operationId).get()).data();
    checkOwner(op, uid);
    await checkAccess(auth, op);
    return publicOperation(op);
  }
  async function prepare({
    uid,
    companyId,
    operationId = randomUUID(),
    revision,
    commands,
    discard = false,
  }) {
    if (!validId(operationId)) fail("Invalid operation ID.");
    if (
      !discard &&
      (!Array.isArray(commands) ||
        !commands.length ||
        commands.length > MAX_ROWS ||
        JSON.stringify(commands).length > 100000)
    )
      fail("Provide between 1 and 30 entries.");
    return db.runTransaction(async (tx) => {
      const auth = await authorizeAgent(db, uid, companyId, tx),
        ref = refFor(companyId, operationId);
      const old = (await tx.get(ref)).data();
      if (old) {
        checkOwner(old, uid);
        await checkAccess(auth, old, tx);
        if (old.revision !== revision)
          fail("The draft changed. Reload it before editing.", "aborted");
        if (old.state === "completed" || old.state === "discarded")
          fail("This operation is already closed.");
      }
      if (discard) {
        if (!old) fail("Operation unavailable.");
        const op = { ...old, state: "discarded", revision: old.revision + 1 };
        tx.set(ref, op);
        return publicOperation(op);
      }
      const saved = new Set(
        (old?.receipts || [])
          .filter((r) => r.status === "saved")
          .flatMap((r) => r.rowIds),
      );
      const ids = new Set();
      for (const c of commands) {
        if (!c || !validId(c.id) || ids.has(c.id) || saved.has(c.id))
          fail("Entries must have unique, unsaved row IDs.");
        if (
          !c.values ||
          typeof c.values !== "object" ||
          Array.isArray(c.values) ||
          Object.values(c.values).some(
            (v) => !["string", "number"].includes(typeof v),
          ) ||
          (c.allocations !== undefined &&
            (!Array.isArray(c.allocations) ||
              c.allocations.some(
                (a) =>
                  !a ||
                  typeof a.inventoryFeedId !== "string" ||
                  !["number", "string"].includes(typeof a.quantityKg),
              )))
        )
          fail("Entry fields must contain text or numbers.");
        ids.add(c.id);
      }
      const rows = [];
      for (const command of commands) {
        if (
          commands.length !== 1 &&
          ["void_inventory_purchase", "delete_inventory_item"].includes(
            command.type,
          )
        ) {
          rows.push({
            command: clean(command),
            title: "Review entry",
            target: "",
            valid: false,
            error:
              command.type === "void_inventory_purchase"
                ? "Void one inventory purchase per confirmed operation."
                : "Delete one inventory item per confirmed operation.",
            warnings: [],
            effects: [],
          });
          continue;
        }
        try {
          const plan = await planCommands({
            auth,
            commands: [command],
            operationId,
            transaction: tx,
          });
          rows.push({ ...plan.rows[0], basis: plan.basis });
        } catch (error) {
          if (["permission-denied", "unauthenticated"].includes(error.code))
            throw error;
          rows.push({
            command: clean(command),
            title: "Review entry",
            target: "",
            valid: false,
            error: error.code
              ? error.message
              : "This entry could not be validated.",
            warnings: [],
            effects: [],
          });
        }
      }
      const op = {
        id: operationId,
        uid,
        companyId,
        revision: (old?.revision || 0) + 1,
        state: "draft",
        rows,
        receipts: (old?.receipts || []).filter((r) => r.status === "saved"),
        savedCommands: [
          ...(old?.savedCommands || []),
          ...(old?.rows || [])
            .filter((r) => saved.has(r.command.id))
            .map((r) => r.command),
        ],
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        createdAt: old?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      tx.set(ref, op);
      return publicOperation(op);
    });
  }
  async function confirm({
    uid,
    companyId,
    operationId,
    revision,
    selectedRowIds,
  }) {
    if (
      !validId(operationId) ||
      !Array.isArray(selectedRowIds) ||
      !selectedRowIds.length ||
      new Set(selectedRowIds).size !== selectedRowIds.length
    )
      fail("Select entries to save.");
    const ref = refFor(companyId, operationId);
    // Prevalidate selected groups together, bind the exact selection to this revision.
    const prepared = await db.runTransaction(async (tx) => {
      const auth = await authorizeAgent(db, uid, companyId, tx),
        op = (await tx.get(ref)).data();
      checkOwner(op, uid);
      await checkAccess(auth, op, tx);
      if (op.revision !== revision)
        fail("The draft changed. Review the current version.", "aborted");
      const selectionHash = hash([...selectedRowIds].sort());
      if (op.selectionHash) {
        if (op.selectionHash !== selectionHash)
          fail("This confirmation already has a different selection.");
        return op;
      }
      if (op.state === "discarded" || op.expiresAt < Date.now())
        fail("This draft expired or was discarded. Prepare a new draft.");
      const selected = selectedRowIds.map((id) =>
        op.rows.find((r) => r.command.id === id),
      );
      if (selected.some((row) => !row?.valid))
        fail("Resolve the selected entries before saving.");
      for (const reviewed of selected) {
        const current = await planCommands({
          auth,
          commands: [reviewed.command],
          operationId,
          transaction: tx,
        });
        if (current.basis !== reviewed.basis)
          fail(
            "Records changed. Refresh and review the draft before saving.",
            "aborted",
          );
      }
      const groups = [];
      for (const commands of groupCommands(selected.map((r) => r.command))) {
        const plan = await planCommands({
          auth,
          commands,
          operationId,
          transaction: tx,
        });
        // Compare the reviewed effects/values as well as domain conflict fingerprints.
        for (const row of plan.rows) {
          const reviewed = op.rows.find((r) => r.command.id === row.command.id);
          if (
            hash([row.before, row.effects]) !==
            hash([reviewed.before, reviewed.effects])
          )
            fail(
              "Records or costs changed. Refresh and review the draft before saving.",
              "aborted",
            );
        }
        groups.push({
          id: hash(commands.map((c) => c.id)).slice(0, 32),
          commands,
          basis: plan.basis,
        });
      }
      const next = { ...op, selectionHash, groups };
      tx.set(ref, next);
      return next;
    });
    for (const group of prepared.groups || []) {
      try {
        await db.runTransaction(async (tx) => {
          const auth = await authorizeAgent(db, uid, companyId, tx),
            op = (await tx.get(ref)).data();
          checkOwner(op, uid);
          if (op.revision !== revision || op.state === "discarded")
            fail("The draft changed.", "aborted");
          if (
            op.receipts.some(
              (r) => r.groupId === group.id && r.status === "saved",
            )
          )
            return;
          if (op.expiresAt < Date.now()) fail("The draft expired.");
          const plan = await planCommands({
            auth,
            commands: group.commands,
            operationId,
            transaction: tx,
          });
          if (plan.basis !== group.basis)
            fail(
              "Records changed since review. Refresh the remaining entries.",
              "aborted",
            );
          for (const write of plan.writes) {
            const target = auth.base.collection(write.collection).doc(write.id);
            if (write.delete) tx.delete(target);
            else tx.set(target, write.values, { merge: !write.replace });
          }
          const receipt = {
            groupId: group.id,
            rowIds: group.commands.map((c) => c.id),
            status: "saved",
            message: `Saved ${group.commands.length} ${group.commands.length === 1 ? "entry" : "entries"}.`,
            links: plan.links,
            savedAt: Date.now(),
          };
          const receipts = [
            ...op.receipts.filter((r) => r.groupId !== group.id),
            receipt,
          ];
          tx.update(ref, {
            receipts,
            state: op.rows.every((row) =>
              receipts.some(
                (r) =>
                  r.status === "saved" && r.rowIds.includes(row.command.id),
              ),
            )
              ? "completed"
              : "partial",
            updatedAt: Date.now(),
          });
        });
      } catch (error) {
        // Store an unsuccessful result only after fresh authorization; no domain write occurred.
        await db.runTransaction(async (tx) => {
          await authorizeAgent(db, uid, companyId, tx);
          const op = (await tx.get(ref)).data();
          checkOwner(op, uid);
          if (
            op.revision !== revision ||
            op.receipts.some(
              (r) => r.groupId === group.id && r.status === "saved",
            )
          )
            return;
          tx.update(ref, {
            state: "partial",
            receipts: [
              ...op.receipts.filter((r) => r.groupId !== group.id),
              {
                groupId: group.id,
                rowIds: group.commands.map((c) => c.id),
                status: "failed",
                message: error.code
                  ? error.message
                  : "Unable to save this entry. Check its status before retrying.",
              },
            ],
          });
        });
      }
    }
    return get({ uid, companyId, operationId });
  }
  return { prepare, confirm, get };
}
module.exports = { createOperationService, groupCommands, publicOperation };
