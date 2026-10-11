"use strict";
const { checkDefinition } = require("./service");
const {
  emptySopStep,
  SOP_STAGES,
} = require("../shared/orsonDomain/sop/contracts");
const { validateSopContent } = require("../shared/orsonDomain/sop/content");
const { validateSop } = require("../shared/orsonDomain/sop/engine");
const { applySourceRecurrence } = require("./sourceRecurrence");

// A malformed AI workflow must not discard an otherwise readable document or
// become an executable rule. Keep its instructions as explicitly manual checks.
function prepareGeneratedSopDraft(generated) {
  generated = applySourceRecurrence(generated);
  try {
    const definition = checkDefinition(generated, true);
    return { definition, warnings: validateSop(definition) };
  } catch (error) {
    if (
      error?.code !== "invalid-argument" ||
      typeof generated?.title !== "string" ||
      !generated.title.trim() ||
      generated.title.length > 200 ||
      typeof generated.description !== "string" ||
      generated.description.length > 10000 ||
      !["en", "id", "vi", "th", "zh"].includes(generated.language) ||
      validateSopContent(generated?.content).some(
        (item) => !item.startsWith("Resolve omitted source content:"),
      ) ||
      !Array.isArray(generated?.steps) ||
      !generated.steps.length ||
      generated.steps.length > 60 ||
      generated.steps.some(
        (step) =>
          typeof step?.title !== "string" ||
          !step.title.trim() ||
          step.title.length > 200 ||
          typeof step.instructions !== "string",
      ) ||
      generated.content.omissions.length >= 100
    )
      throw error;
    console.warn("Generated SOP automation requires manual review", {
      validation: String(error.message).slice(0, 2000),
    });
    const notes = {
      en: "Some AI workflow rules need review. Valid pond-record checks and source schedules have been kept; unsupported rules require manual evidence. Review the measurements, schedules and follow-up rules before removing this note and approving the SOP.",
      id: "AI belum dapat memvalidasi semua aturan. Pemeriksaan catatan kolam dan jadwal yang valid tetap disimpan; aturan yang belum didukung memerlukan bukti manual. Atur pengukuran, jadwal, dan tindak lanjut sebelum menghapus catatan ini dan menyetujui SOP.",
      vi: "Một số quy tắc AI cần rà soát. Kiểm tra dữ liệu ao và lịch hợp lệ được giữ lại; quy tắc chưa hỗ trợ cần bằng chứng thủ công. Cấu hình số đo, lịch và xử lý tiếp theo trước khi xóa ghi chú và duyệt SOP.",
      th: "กฎ AI บางข้อยังต้องตรวจทาน การตรวจข้อมูลบ่อและกำหนดเวลาที่ถูกต้องยังคงอยู่ กฎที่ไม่รองรับต้องใช้หลักฐานด้วยตนเอง กำหนดการวัด ตารางเวลา และการติดตามก่อนลบหมายเหตุและอนุมัติ SOP",
      zh: "部分AI规则需要审核。有效的池塘记录检查和计划已保留；不支持的规则需要人工证据。请配置测量、时间安排和后续处理，再删除此说明并批准SOP。",
    };
    const note = notes[generated.language] || notes.en;
    const definition = checkDefinition(
      {
        ...generated,
        content: {
          ...generated.content,
          omissions: [...generated.content.omissions, note],
        },
        steps: generated.steps.map((step, index) => {
          // Validate each rule independently. An unsupported field elsewhere in
          // the PDF must not remove this rule's valid data binding or schedule.
          try {
            return checkDefinition({
              title: generated.title,
              description: "",
              language: generated.language,
              steps: [{ ...step, dependsOn: [], onPass: [], onFail: [] }],
            }, true).steps[0];
          } catch {
            // Preserve readable instructions below, with approval blocked by
            // the omission note. Invalid graph edges are never executable.
          }
          const manual = emptySopStep(`step-${index + 1}`);
          const candidate = {
            ...manual,
            title: step.title,
            instructions: step.instructions,
            scope: ["pond", "block", "company"].includes(step.scope)
              ? step.scope
              : "pond",
            stages:
              Array.isArray(step.stages) &&
              step.stages.length &&
              step.stages.every((stage) => SOP_STAGES.includes(stage))
                ? step.stages
                : [...SOP_STAGES],
            trigger: { ...manual.trigger, kind: "manual" },
            check: {
              ...manual.check,
              field: "manual",
              unit: "",
              basis: "",
              operator: "narrative",
              exactTime: false,
              rubric: step.instructions.trim() || step.title,
            },
            correctiveInstructions:
              typeof step.correctiveInstructions === "string"
                ? step.correctiveInstructions
                : "",
            requireNotes: true,
          };
          // A bad measurement/branch must not erase an otherwise valid H-/DOC schedule.
          const timed = { ...candidate, trigger: step.trigger };
          if (
            step.trigger &&
            validateSop({
              title: generated.title,
              description: "",
              language: generated.language,
              steps: [timed],
            }).length === 0
          )
            candidate.trigger = step.trigger;
          return candidate;
        }),
      },
      true,
    );
    return { definition, warnings: validateSop(definition) };
  }
}

module.exports = { prepareGeneratedSopDraft };
