"use strict";
const fs = require("node:fs");
function loadSopModelKey() {
  if (process.env.MODEL_API_KEY) return process.env.MODEL_API_KEY;
  if (!process.env.SOP_CALIBRATION_ENV)
    throw new Error(
      "Set MODEL_API_KEY or SOP_CALIBRATION_ENV to an authorized local key file.",
    );
  const text = fs.readFileSync(process.env.SOP_CALIBRATION_ENV, "utf8");
  const value =
    text
      .match(/^MODEL_API_KEY\s*=\s*([^\r\n]+)/m)?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, "") ||
    (!text.trim().includes("\n") && !text.trim().includes("=")
      ? text.trim()
      : "");
  if (!value) throw new Error("MODEL_API_KEY is unavailable.");
  return value;
}
module.exports = { loadSopModelKey };
