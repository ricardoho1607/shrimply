import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { SopContent, SopContentSection } from "../../shared/sop/contracts";
import { sopText } from "../../shared/sop/uiCopy";
import { SopEditorAnchor } from "./SopEditorNavigation";

export function SopContentView({
  content,
  language,
  onResolve,
}: {
  content?: SopContent;
  language: string;
  onResolve?: (target: string) => void;
}) {
  const ui = (text: string) => sopText(text, language);
  if (!content) return null;
  return (
    <View>
      {!!content.omissions.length && (
        <View style={styles.notice}>
          <Text style={styles.heading}>
            {ui("Source content still needs review")}
          </Text>
          {content.omissions.map((item, i) =>
            onResolve ? (
              <TouchableOpacity
                key={i}
                accessibilityRole="button"
                onPress={() => onResolve(`sop-omission-${i}`)}
                style={styles.button}
              >
                <Text style={styles.label}>{item} →</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.text} key={i}>
                {item}
              </Text>
            ),
          )}
        </View>
      )}
      {content.sections.map((section, index) => (
        <View style={styles.section} key={section.id}>
          <Text accessibilityRole="header" style={styles.heading}>
            {index + 1}. {section.title}
          </Text>
          {!!section.sourcePages.length && (
            <Text style={styles.text}>
              {ui("Source pages")}: {section.sourcePages.join(", ")}
            </Text>
          )}
          {!!section.body && <Text style={styles.text}>{section.body}</Text>}
          {section.tables.map((table, i) => (
            <View key={i}>
              <Text accessibilityRole="header" style={styles.heading}>
                {table.title}
              </Text>
              {table.rows.map((row, j) => (
                <View key={j} style={styles.row}>
                  {row.cells.map((cell, k) => (
                    <Text key={k} style={styles.text}>
                      <Text style={styles.label}>{table.columns[k]}: </Text>
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
export function SopContentEditor({
  content,
  language,
  onChange,
}: {
  content?: SopContent;
  language: string;
  onChange: (content: SopContent) => void;
}) {
  const ui = (text: string) => sopText(text, language);
  const [open, setOpen] = useState("");
  const current = content || { sections: [], omissions: [] };
  let nextSection = current.sections.length + 1;
  while (
    current.sections.some((section) => section.id === `section-${nextSection}`)
  )
    nextSection += 1;
  const patch = (index: number, value: Partial<SopContentSection>) =>
    onChange({
      ...current,
      sections: current.sections.map((section, i) =>
        i === index ? { ...section, ...value } : section,
      ),
    });
  const input = (
    label: string,
    value: string,
    change: (text: string) => void,
    multiline = false,
    id?: string,
  ) => (
    <SopEditorAnchor id={id}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={styles.input}
        multiline={multiline}
        value={value}
        onChangeText={change}
      />
    </SopEditorAnchor>
  );
  const button = (title: string, action: () => void) => (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.button}
      onPress={action}
    >
      <Text style={styles.label}>{title}</Text>
    </TouchableOpacity>
  );
  return (
    <SopEditorAnchor id="sop-procedure-editor">
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>
          {ui("2. Procedure")}
        </Text>
        <Text style={styles.text}>
          {ui(
            "Write the methods staff should follow. Keep source tables and reference values here; set automatic checks below.",
          )}
        </Text>
        {!current.sections.length && (
          <Text style={styles.text}>
            {ui(
              "No procedure content yet. Add the full instructions and reference tables staff need. Checks below do not replace the procedure.",
            )}
          </Text>
        )}
        {current.omissions.map((item, index) => (
          <View key={index}>
            {input(
              `${ui("Unresolved source omission")} ${index + 1}`,
              item,
              (text) =>
                onChange({
                  ...current,
                  omissions: current.omissions.map((old, i) =>
                    i === index ? text : old,
                  ),
                }),
              true,
              `sop-omission-${index}`,
            )}
            {button(ui("Mark omission resolved"), () =>
              onChange({
                ...current,
                omissions: current.omissions.filter((_, i) => i !== index),
              }),
            )}
          </View>
        ))}
        {current.sections.map((section, index) => (
          <View style={styles.section} key={section.id}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: open === section.id }}
              style={styles.button}
              onPress={() => setOpen(open === section.id ? "" : section.id)}
            >
              <Text style={styles.label}>
                {index + 1}. {section.title}
              </Text>
            </TouchableOpacity>
            {open === section.id && (
              <>
                {input(ui("Section title"), section.title, (title) =>
                  patch(index, { title }),
                )}
                {input(
                  ui("Method and guidance"),
                  section.body,
                  (body) => patch(index, { body }),
                  true,
                )}
                <View>
                  <Text style={styles.label}>{ui("Source pages")}</Text>
                  <TextInput
                    accessibilityLabel={ui("Source pages")}
                    style={styles.input}
                    defaultValue={section.sourcePages.join(", ")}
                    onEndEditing={(event) =>
                      patch(index, {
                        sourcePages: event.nativeEvent.text
                          .split(/[, ]+/)
                          .filter(Boolean)
                          .map(Number),
                      })
                    }
                  />
                </View>
                {section.tables.map((table, tableIndex) => {
                  const patchTable = (value: Partial<typeof table>) =>
                    patch(index, {
                      tables: section.tables.map((old, i) =>
                        i === tableIndex ? { ...old, ...value } : old,
                      ),
                    });
                  return (
                    <View key={tableIndex}>
                      {input(ui("Table title"), table.title, (title) =>
                        patchTable({ title }),
                      )}
                      {table.columns.map((column, k) => (
                        <View key={k}>
                          {input(
                            `${ui("Column heading")} ${k + 1}`,
                            column,
                            (text) =>
                              patchTable({
                                columns: table.columns.map((old, i) =>
                                  i === k ? text : old,
                                ),
                              }),
                          )}
                        </View>
                      ))}
                      {table.rows.map((row, j) => (
                        <View key={j} style={styles.row}>
                          {row.cells.map((cell, k) => (
                            <View key={k}>
                              {input(
                                `${table.title}: ${ui("row")} ${j + 1}, ${table.columns[k]}`,
                                cell,
                                (text) =>
                                  patchTable({
                                    rows: table.rows.map((oldRow, i) =>
                                      i === j
                                        ? {
                                            cells: oldRow.cells.map((old, l) =>
                                              l === k ? text : old,
                                            ),
                                          }
                                        : oldRow,
                                    ),
                                  }),
                                true,
                              )}
                            </View>
                          ))}
                          {button(ui("Remove row"), () =>
                            patchTable({
                              rows: table.rows.filter((_, i) => i !== j),
                            }),
                          )}
                        </View>
                      ))}
                      {button(ui("Add row"), () =>
                        patchTable({
                          rows: [
                            ...table.rows,
                            { cells: table.columns.map(() => "") },
                          ],
                        }),
                      )}
                    </View>
                  );
                })}
                {button(ui("Add reference table"), () =>
                  patch(index, {
                    tables: [
                      ...section.tables,
                      {
                        title: ui("Reference table"),
                        columns: [
                          ui("Parameter"),
                          ui("Source value"),
                          ui("Notes"),
                        ],
                        rows: [{ cells: ["", "", ""] }],
                      },
                    ],
                  }),
                )}
                {button(ui("Remove section"), () =>
                  onChange({
                    ...current,
                    sections: current.sections.filter((_, i) => i !== index),
                  }),
                )}
              </>
            )}
          </View>
        ))}
        {button(ui("Add document section"), () =>
          onChange({
            ...current,
            sections: [
              ...current.sections,
              {
                id: `section-${nextSection}`,
                title: ui("Procedure section"),
                body: "",
                sourcePages: [],
                tables: [],
              },
            ],
          }),
        )}
      </View>
    </SopEditorAnchor>
  );
}
const styles = StyleSheet.create({
  section: {
    borderTopWidth: 1,
    borderTopColor: "#dce6ec",
    paddingTop: 16,
    marginTop: 16,
  },
  heading: {
    fontSize: 19,
    fontWeight: "600",
    color: "#0F4C75",
    marginBottom: 12,
  },
  text: { fontSize: 15, color: "#526b7d", lineHeight: 24, marginBottom: 8 },
  label: { fontSize: 15, color: "#18344b", fontWeight: "600" },
  row: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#dce6ec",
    borderRadius: 8,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbdde8",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#18344b",
    marginVertical: 8,
    minHeight: 44,
  },
  button: {
    padding: 14,
    backgroundColor: "#f2f7fa",
    borderRadius: 8,
    marginVertical: 8,
  },
  notice: { padding: 14, backgroundColor: "#fff3ed", borderRadius: 8 },
});
