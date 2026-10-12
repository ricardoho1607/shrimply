const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { sopText, sopTaskTitle } = require("./uiCopy.ts");
const root = path.resolve(__dirname, "../..");
const languages = ["id", "vi", "th", "zh"];
const dictionary = fs
  .readFileSync(path.join(__dirname, "uiCopy.ts"), "utf8")
  .match(/const rows = `([\s\S]*?)`;/)[1]
  .trim()
  .split("\n")
  .filter(Boolean);
const keys = new Set(dictionary.map((row) => row.split("|")[0]));

test("every SOP interface entry has all four translations", () => {
  for (const row of dictionary) {
    const [key, ...translations] = row.split("|");
    assert.equal(translations.length, 4, key);
    assert.ok(
      translations.every((value) => value.trim()),
      key,
    );
  }
});

test("mobile and web SOP interface calls have translation coverage", () => {
  for (const file of [
    "app/components/SopScreen.tsx",
    "app/components/SopReader.tsx",
    "app/components/SopContent.tsx",
    "app/components/SopFlowPreview.tsx",
    "app/components/SopTodoList.tsx",
    "app/components/SopObservationTimes.tsx",
    "web/src/components/SopReader.tsx",
    "web/src/components/SopContent.tsx",
    "web/src/components/SopFlowPreview.tsx",
    "web/src/components/SopTodoList.tsx",
    "web/src/components/SopObservationTimes.tsx",
    "web/src/components/SopAdoptionDialog.tsx",
    "web/src/components/SopManagerDecision.tsx",
    "web/src/app/dashboard/todo/page.tsx",
    "web/src/app/dashboard/sops/page.tsx",
  ]) {
    const sf = ts.createSourceFile(
      file,
      fs.readFileSync(path.join(root, file), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ["ui", "sopText"].includes(node.expression.getText(sf)) &&
        ts.isStringLiteral(node.arguments[0])
      )
        assert.ok(
          keys.has(node.arguments[0].text),
          `${file}: ${node.arguments[0].text}`,
        );
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
});

test("server command errors and existing notification messages are translated", () => {
  for (const file of [
    "functions/sop/service.js",
    "functions/sop/runtime.js",
    "functions/sop/ai.js",
    "functions/sop/withdrawal.js",
    "shared/sop/engine.ts",
    "app/hooks/useSopPush.ts",
  ]) {
    const sf = ts.createSourceFile(
      file,
      fs.readFileSync(path.join(root, file), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node) {
      const error =
        ts.isCallExpression(node) &&
        node.expression.getText(sf) === "fail" &&
        node.arguments[1];
      const notification =
        ts.isPropertyAssignment(node) &&
        ["title", "message", "explanation", "reason", "name"].includes(
          node.name.getText(sf),
        ) &&
        node.initializer;
      const value = error || notification;
      if (value && ts.isStringLiteral(value) && value.text.includes(" ")) {
        for (const language of languages)
          assert.notEqual(
            sopText(value.text, language),
            value.text,
            `${file}: ${value.text} (${language})`,
          );
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
});

test("only generated task prefixes change language; farm text stays exact", () => {
  const source = "Periksa_DO: lakukan sesuai SOP asli";
  for (const language of languages) {
    assert.equal(
      sopTaskTitle(`Corrective action: ${source}`, "corrective", language),
      `${sopText("Corrective action", language)}: ${source}`,
    );
    assert.equal(
      sopTaskTitle(`Recheck: ${source}`, "recheck", language),
      `${sopText("Recheck", language)}: ${source}`,
    );
    assert.equal(
      sopTaskTitle(`Recheck: ${source}`, "manual", language),
      `Recheck: ${source}`,
    );
    assert.equal(sopTaskTitle(source, "routine", language), source);
    assert.equal(sopTaskTitle(source, undefined, language), source);
    assert.equal(sopTaskTitle(source, "corrective", language), source);
  }
  assert.equal(
    sopTaskTitle(`Recheck: ${source}`, "recheck", "en"),
    `Recheck: ${source}`,
  );
});
