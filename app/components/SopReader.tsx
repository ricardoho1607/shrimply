import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SopContentView } from "./SopContent";
import type { SopDocument } from "../../shared/sop/client";
import type { SopAttachment } from "../../shared/sop/contracts";
import { sopText } from "../../shared/sop/uiCopy";
import {
  sopMeasurementLabel,
  sopTargetLabel,
  sopTimingLabel,
  sopEditorIssue,
  sopIssueLinks,
  SOP_INTERFACE_LANGUAGES,
} from "../../shared/sop/editor";

export function SopReader({
  document,
  language,
  onOpen,
  onResolve,
}: {
  document: SopDocument;
  language: string;
  onOpen: (attachment: SopAttachment) => void;
  onResolve?: (target: string) => void;
}) {
  const ui = (value: string) => sopText(value, language);
  const { definition } = document;
  const [reviewOpen, setReviewOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(!!definition.content);
  const [workflowOpen, setWorkflowOpen] = useState(!definition.content);
  const reviewItems =
    document.status === "approved" ? [] : sopIssueLinks(definition);
  return (
    <View style={styles.document}>
      <Text style={styles.eyebrow}>{ui("STANDARD OPERATING PROCEDURE")}</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {definition.title}
      </Text>
      <Text style={styles.text}>
        {ui(document.status)} · {ui("revision")} {document.revision} ·{" "}
        {ui("Original language")}:{" "}
        {SOP_INTERFACE_LANGUAGES.find(
          (item) => item.code === definition.language,
        )?.name || definition.language}
      </Text>
      {document.status !== "approved" && (
        <Text style={styles.notice}>
          {ui(
            "Draft guidance. Review and approve before applying it to farm work.",
          )}
        </Text>
      )}
      {document.source && (
        <Text style={styles.text}>
          {ui("Adapted from")} {document.source.author} ·{" "}
          {document.source.versionId}
        </Text>
      )}
      {!!reviewItems.length && (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: reviewOpen }}
            style={styles.file}
            onPress={() => setReviewOpen(!reviewOpen)}
          >
            <Text style={styles.link}>
              {ui("Resolve before approval")} · {reviewItems.length}
            </Text>
          </TouchableOpacity>
          {reviewOpen &&
            reviewItems.map(({ issue, target }, index) =>
              onResolve ? (
                <TouchableOpacity
                  key={index}
                  accessibilityRole="button"
                  onPress={() => onResolve(target)}
                  style={styles.file}
                >
                  <Text style={styles.link}>
                    {sopEditorIssue(issue, language)} →
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text key={index} style={styles.text}>
                  {sopEditorIssue(issue, language)}
                </Text>
              ),
            )}
        </>
      )}
      {!!definition.description && (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: overviewOpen }}
            style={styles.file}
            onPress={() => setOverviewOpen(!overviewOpen)}
          >
            <Text style={styles.link}>{ui("Overview and review notes")}</Text>
          </TouchableOpacity>
          {overviewOpen && (
            <Text style={styles.text}>{definition.description}</Text>
          )}
        </>
      )}
      {definition.steps.some((step) =>
        step.check.field.startsWith("water."),
      ) && (
        <View style={styles.procedure}>
          <Text accessibilityRole="header" style={styles.heading}>
            {ui("Water parameter targets")}
          </Text>
          <Text style={styles.text}>
            {ui("These are SOP targets, not today’s measurements.")}
          </Text>
          {definition.steps
            .filter((step) => step.check.field.startsWith("water."))
            .map((step) => (
              <View key={step.id}>
                <Text style={styles.label}>
                  {sopMeasurementLabel(step.check.field, language)}
                </Text>
                <Text style={styles.text}>
                  {sopTargetLabel(step, language)}
                </Text>
                {step.check.operator === "present" && (
                  <Text style={styles.notice}>{ui("No limits checked")}</Text>
                )}
              </View>
            ))}
        </View>
      )}
      {!!definition.attachments?.length && (
        <>
          <Text accessibilityRole="header" style={styles.heading}>
            {ui("Source documents")}
          </Text>
          <Text style={styles.text}>
            {ui(
              "Read the source for full tables, recipes, and context. AI guidance requires review.",
            )}
          </Text>
          {definition.attachments.map((file) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={file.path}
              style={styles.file}
              onPress={() => onOpen(file)}
            >
              <Text style={styles.link}>{file.name}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
      {!definition.content && !!definition.attachments?.length && (
        <Text style={styles.notice}>
          {ui(
            "This import contains workflow rules only. Re-import the source with the updated SOP service to retain document sections and tables.",
          )}
        </Text>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: contentsOpen }}
        style={styles.file}
        onPress={() => setContentsOpen(!contentsOpen)}
      >
        <Text style={styles.link}>
          {ui("Contents")} ·{" "}
          {definition.content?.sections.length || definition.steps.length}
        </Text>
      </TouchableOpacity>
      {contentsOpen &&
        (definition.content
          ? definition.content.sections
          : definition.steps
        ).map((step, index) => (
          <Text key={step.id} style={styles.text}>
            {index + 1}. {step.title}
          </Text>
        ))}
      <SopContentView
        content={definition.content}
        language={language}
        onResolve={document.status === "draft" ? onResolve : undefined}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: workflowOpen }}
        style={styles.file}
        onPress={() => setWorkflowOpen(!workflowOpen)}
      >
        <Text style={styles.link}>
          {ui("Workflow rules")} · {definition.steps.length}
        </Text>
      </TouchableOpacity>
      {workflowOpen &&
        definition.steps.map((step, index) => (
          <View key={step.id} style={styles.procedure}>
            <Text accessibilityRole="header" style={styles.heading}>
              {index + 1}. {step.title}
            </Text>
            <Text style={styles.text}>{step.instructions}</Text>
            <Text style={styles.text}>
              {ui("Applies to")}: {ui(step.scope)} ·{" "}
              {step.stages.map(ui).join(", ")}
            </Text>
            <Text style={styles.text}>
              {ui("When")}: {sopTimingLabel(step, language)}
            </Text>
            <Text style={styles.label}>
              {sopMeasurementLabel(step.check.field, language)}
            </Text>
            <Text style={styles.text}>
              {ui("Target or check")}: {sopTargetLabel(step, language)}
            </Text>
            {step.check.operator === "present" && (
              <Text style={styles.notice}>
                {ui(
                  "No measurement limits are set. This check only requires a record.",
                )}
              </Text>
            )}
            {!!step.check.value && (
              <Text style={styles.text}>
                {ui("Required value / sequence")}: {step.check.value}
              </Text>
            )}
            {!!step.correctiveInstructions && (
              <>
                <Text style={styles.label}>
                  {ui("If the expected result is not met")}
                </Text>
                <Text style={styles.text}>{step.correctiveInstructions}</Text>
              </>
            )}
            {!!step.check.rubric && (
              <>
                <Text style={styles.label}>{ui("Required evidence")}</Text>
                <Text style={styles.text}>{step.check.rubric}</Text>
              </>
            )}
          </View>
        ))}
    </View>
  );
}
const styles = StyleSheet.create({
  document: {
    backgroundColor: "white",
    padding: 22,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dce6ec",
  },
  eyebrow: {
    color: "#3282B8",
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: "#0F4C75",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
  },
  heading: {
    color: "#0F4C75",
    fontSize: 19,
    fontWeight: "600",
    marginVertical: 16,
  },
  text: { color: "#526b7d", fontSize: 15, lineHeight: 24, marginBottom: 10 },
  label: {
    color: "#18344b",
    fontSize: 15,
    fontWeight: "600",
    marginVertical: 8,
  },
  notice: {
    color: "#8f3524",
    backgroundColor: "#fff3ed",
    padding: 14,
    borderRadius: 8,
    lineHeight: 22,
  },
  procedure: { borderTopWidth: 1, borderTopColor: "#dce6ec", marginTop: 20 },
  file: {
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#cbdde8",
    borderRadius: 8,
  },
  link: { color: "#0F4C75", fontSize: 15 },
});
