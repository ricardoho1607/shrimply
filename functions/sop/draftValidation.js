"use strict";
const { checkDefinition } = require("./service");
const {
  emptySopStep,
  SOP_STAGES,
} = require("../shared/orsonDomain/sop/contracts");
const { validateSopContent } = require("../shared/orsonDomain/sop/content");
const { validateSop } = require("../shared/orsonDomain/sop/engine");

// A malformed AI workflow must not discard an otherwise readable document or
// become an executable rule. Keep its instructions as explicitly manual checks.
function prepareGeneratedSopDraft(generated) {
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
      en: "The AI could not create valid automatic checks. The procedure content has been kept, and its checks are manual review tasks. Configure the measurements, schedules and follow-up rules before removing this note and approving the SOP.",
      id: "AI belum dapat membuat pemeriksaan otomatis yang valid. Isi prosedur tetap disimpan, dan pemeriksaannya menjadi tugas tinjauan manual. Atur pengukuran, jadwal, dan tindak lanjut sebelum menghapus catatan ini dan menyetujui SOP.",
      vi: "AI chưa tạo được các kiểm tra tự động hợp lệ. Nội dung quy trình được giữ lại, các kiểm tra chuyển thành công việc rà soát thủ công. Cấu hình số đo, lịch và xử lý tiếp theo trước khi xóa ghi chú và duyệt SOP.",
      th: "AI ยังสร้างการตรวจสอบอัตโนมัติที่ถูกต้องไม่ได้ เนื้อหาขั้นตอนยังคงอยู่ และการตรวจสอบเป็นงานทบทวนด้วยตนเอง กำหนดการวัด ตารางเวลา และการติดตามก่อนลบหมายเหตุและอนุมัติ SOP",
      zh: "AI未能生成有效的自动检查。规程内容已保留，检查已转为人工审核任务。请配置测量、时间安排和后续处理，再删除此说明并批准SOP。",
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
          const manual = emptySopStep(`step-${index + 1}`);
          return {
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
        }),
      },
      true,
    );
    return { definition, warnings: validateSop(definition) };
  }
}

module.exports = { prepareGeneratedSopDraft };
