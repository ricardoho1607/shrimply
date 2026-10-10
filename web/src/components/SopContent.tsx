import type {
  SopContent,
  SopContentSection,
} from "../../../shared/sop/contracts";
import { sopText } from "../../../shared/sop/uiCopy";

export function SopContentView({
  content,
  language,
  onResolve,
  idPrefix = "sop-document",
}: {
  content?: SopContent;
  language: string;
  onResolve?: (target: string) => void;
  idPrefix?: string;
}) {
  const ui = (text: string) => sopText(text, language);
  if (!content) return null;
  return (
    <>
      {!!content.omissions.length && (
        <div className="sop-draft-note" role="alert">
          <strong>{ui("Source content still needs review")}</strong>
          <ul role="list">
            {content.omissions.map((item, i) => (
              <li key={i}>
                {onResolve ? (
                  <button
                    className="sop-warning-link"
                    onClick={() => onResolve(`sop-omission-${i}`)}
                  >
                    {item} →
                  </button>
                ) : (
                  item
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {content.sections.map((section, index) => (
        <section
          className="sop-procedure"
          id={`${idPrefix}-${section.id}`}
          key={section.id}
        >
          <h3 className="sop-procedure-title">
            <span>{String(index + 1).padStart(2, "0")}</span>
            {section.title}
          </h3>
          {!!section.sourcePages.length && (
            <p className="sop-procedure-scope">
              {ui("Source pages")}: {section.sourcePages.join(", ")}
            </p>
          )}
          {section.body && <p className="sop-prose">{section.body}</p>}
          {section.tables.map((table, i) => (
            <div
              className="sop-table-scroll"
              tabIndex={0}
              role="region"
              aria-label={table.title}
              key={i}
            >
              <table className="sop-reference-table">
                <caption>{table.title}</caption>
                <thead>
                  <tr>
                    {table.columns.map((column, j) => (
                      <th scope="col" key={j}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, j) => (
                    <tr key={j}>
                      {row.cells.map((cell, k) =>
                        k === 0 ? (
                          <th scope="row" key={k}>
                            {cell}
                          </th>
                        ) : (
                          <td key={k}>{cell}</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </>
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
  const current = content || { sections: [], omissions: [] };
  let nextSection = current.sections.length + 1;
  while (
    current.sections.some((section) => section.id === `section-${nextSection}`)
  )
    nextSection += 1;
  const sectionChange = (index: number, patch: Partial<SopContentSection>) =>
    onChange({
      ...current,
      sections: current.sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    });
  return (
    <section className="sop-card" id="sop-procedure-editor" tabIndex={-1}>
      <h3>{ui("2. Procedure")}</h3>
      <p>
        {ui(
          "Write the methods staff should follow. Keep source tables and reference values here; set automatic checks below.",
        )}
      </p>
      {!current.sections.length && (
        <p className="sop-help">
          {ui(
            "No procedure content yet. Add the full instructions and reference tables staff need. Checks below do not replace the procedure.",
          )}
        </p>
      )}
      {current.omissions.map((item, index) => (
        <div
          className="sop-omission-editor"
          key={index}
          id={`sop-omission-${index}`}
        >
          <label className="sop-field">
            {ui("Unresolved source omission")} {index + 1}
            <textarea
              value={item}
              onChange={(e) =>
                onChange({
                  ...current,
                  omissions: current.omissions.map((old, i) =>
                    i === index ? e.target.value : old,
                  ),
                })
              }
            />
          </label>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...current,
                omissions: current.omissions.filter((_, i) => i !== index),
              })
            }
          >
            {ui("Mark omission resolved")}
          </button>
        </div>
      ))}
      {current.sections.map((section, index) => (
        <details className="sop-document-editor-section" key={section.id}>
          <summary>
            {index + 1}. {section.title}
          </summary>
          <label className="sop-field">
            {ui("Section title")}
            <input
              value={section.title}
              onChange={(e) => sectionChange(index, { title: e.target.value })}
            />
          </label>
          <label className="sop-field">
            {ui("Method and guidance")}
            <textarea
              rows={10}
              value={section.body}
              onChange={(e) => sectionChange(index, { body: e.target.value })}
            />
          </label>
          <label className="sop-field">
            {ui("Source pages")}
            <input
              defaultValue={section.sourcePages.join(", ")}
              onBlur={(e) =>
                sectionChange(index, {
                  sourcePages: e.target.value
                    .split(/[, ]+/)
                    .filter(Boolean)
                    .map(Number),
                })
              }
            />
          </label>
          {section.tables.map((table, tableIndex) => {
            const patchTable = (patch: Partial<typeof table>) =>
              sectionChange(index, {
                tables: section.tables.map((old, i) =>
                  i === tableIndex ? { ...old, ...patch } : old,
                ),
              });
            return (
              <details key={tableIndex}>
                <summary>
                  {table.title} · {table.rows.length} {ui("rows")}
                </summary>
                <label className="sop-field">
                  {ui("Table title")}
                  <input
                    value={table.title}
                    onChange={(e) => patchTable({ title: e.target.value })}
                  />
                </label>
                <div className="sop-table-scroll">
                  <table className="sop-reference-table">
                    <thead>
                      <tr>
                        {table.columns.map((column, columnIndex) => (
                          <th key={columnIndex}>
                            <input
                              aria-label={`${ui("Column heading")} ${columnIndex + 1}`}
                              value={column}
                              onChange={(e) =>
                                patchTable({
                                  columns: table.columns.map((old, i) =>
                                    i === columnIndex ? e.target.value : old,
                                  ),
                                })
                              }
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.cells.map((cell, columnIndex) => (
                            <td key={columnIndex}>
                              <textarea
                                aria-label={`${table.title}: ${ui("row")} ${rowIndex + 1}, ${table.columns[columnIndex]}`}
                                value={cell}
                                onChange={(e) =>
                                  patchTable({
                                    rows: table.rows.map((oldRow, i) =>
                                      i === rowIndex
                                        ? {
                                            cells: oldRow.cells.map((old, j) =>
                                              j === columnIndex
                                                ? e.target.value
                                                : old,
                                            ),
                                          }
                                        : oldRow,
                                    ),
                                  })
                                }
                              />
                            </td>
                          ))}
                          <td>
                            <button
                              type="button"
                              onClick={() =>
                                patchTable({
                                  rows: table.rows.filter(
                                    (_, i) => i !== rowIndex,
                                  ),
                                })
                              }
                            >
                              {ui("Remove row")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    patchTable({
                      rows: [
                        ...table.rows,
                        { cells: table.columns.map(() => "") },
                      ],
                    })
                  }
                >
                  {ui("Add row")}
                </button>
              </details>
            );
          })}
          <button
            type="button"
            onClick={() =>
              sectionChange(index, {
                tables: [
                  ...section.tables,
                  {
                    title: ui("Reference table"),
                    columns: [ui("Parameter"), ui("Source value"), ui("Notes")],
                    rows: [{ cells: ["", "", ""] }],
                  },
                ],
              })
            }
          >
            {ui("Add reference table")}
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...current,
                sections: current.sections.filter((_, i) => i !== index),
              })
            }
          >
            {ui("Remove section")}
          </button>
        </details>
      ))}
      <button
        type="button"
        onClick={() =>
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
          })
        }
      >
        {ui("Add document section")}
      </button>
    </section>
  );
}
