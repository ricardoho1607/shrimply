const { ORSON_ACTIONS } = require("./orsonAgentContract");
const { fail } = require("./orsonActionAuth");
const values = [
  ...new Set(Object.values(ORSON_ACTIONS).flatMap((action) => action.fields)),
];
const extractionSchema = {
  type: "OBJECT",
  properties: {
    error: { type: "STRING" },
    commands: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          type: { type: "STRING", enum: Object.keys(ORSON_ACTIONS) },
          date: { type: "STRING" },
          pondId: { type: "STRING" },
          itemId: { type: "STRING" },
          itemType: { type: "STRING", enum: ["feed", "additive"] },
          recordId: { type: "STRING" },
          values: {
            type: "OBJECT",
            properties: Object.fromEntries(
              values.map((key) => [key, { type: "STRING" }]),
            ),
          },
          allocations: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                inventoryFeedId: { type: "STRING" },
                quantityKg: { type: "NUMBER" },
              },
              required: ["inventoryFeedId", "quantityKg"],
            },
          },
        },
        required: ["id", "type", "date", "values"],
      },
    },
  },
};
function parseCsv(text) {
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n")) {
      row.push(value);
      value = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else if (c !== "\r" || quoted) value += c;
  }
  if (quoted) fail("CSV has an unclosed quoted field.");
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  if (rows.length > 201) fail("Upload at most 200 CSV rows.");
  return rows;
}
module.exports = { extractionSchema, parseCsv };
