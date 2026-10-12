"use client";
import Link from "next/link";
import type { SopTask } from "../../../shared/sop/contracts";
import {
  isPondReadingTask,
  sopTaskStatus,
  sopTaskUrgent,
  sopWorkItems,
} from "../../../shared/sop/presentation";
import { sopText, sopTaskTitle } from "../../../shared/sop/uiCopy";

type Props = {
  tasks: SopTask[];
  language: string;
  timeZone: string;
  clock: number;
  pending: string[];
  members: { id: string; name: string }[];
  onOpen: (task: SopTask) => void;
};
function TaskCard({
  task,
  ...props
}: Omit<Props, "tasks"> & { task: SopTask }) {
  const ui = (text: string) => sopText(text, props.language);
  const finished = ["completed", "waived", "cancelled"].includes(task.status);
  const due = new Date(task.dueAt).toLocaleString(props.language, {
    timeZone: props.timeZone,
  });
  return (
    <article className="sop-card todo-task-card">
      <p className="todo-pond-name">{task.target.name}</p>
      <div className="todo-task-heading">
        <h3>{sopTaskTitle(task.title, task.purpose, props.language)}</h3>
        <span className="sop-status">{ui(sopTaskStatus(task))}</span>
      </div>
      <p className="todo-deadline">
        {!finished && task.dueAt < props.clock ? ui("Past due") : ui("Due")} ·{" "}
        {due}
      </p>
      {sopTaskUrgent(task) && !finished && (
        <p className="todo-attention">{ui("Urgent — do this first")}</p>
      )}
      {props.pending.includes(task.id) && (
        <p role="status">{ui("Waiting to save")}</p>
      )}
      <div className="sop-toolbar">
        {isPondReadingTask(task) ? (
          <Link
            className="sop-button sop-primary"
            href={`/dashboard/ponds/detail?id=${encodeURIComponent(task.target.pondId)}`}
          >
            {ui("Enter readings")}
          </Link>
        ) : (
          <button className="sop-primary" onClick={() => props.onOpen(task)}>
            {ui(finished ? "View task" : "Open task")}
          </button>
        )}
        <details className="todo-task-details">
          <summary>{ui("Instructions and details")}</summary>
          <p className="sop-prose">{task.instructions}</p>
          <p>
            {ui("Responsible person")}:{" "}
            {props.members.find((m) => m.id === task.assigneeId)?.name ||
              ui("Assigned staff")}
          </p>
          <p>
            {ui("Parameter result:")} {ui(task.result)}
          </p>
          <p>
            {ui("Status")}: {ui(task.status)}
          </p>
          {isPondReadingTask(task) && (
            <button onClick={() => props.onOpen(task)}>
              {ui("Open task")}
            </button>
          )}
          {task.adoptionId && (
            <Link className="sop-button" href="/dashboard/sops">
              {ui("Read farm guide")}
            </Link>
          )}
          {task.target.pondId && !isPondReadingTask(task) && (
            <Link
              className="sop-button"
              href={`/dashboard/ponds/detail?id=${encodeURIComponent(task.target.pondId)}`}
            >
              {ui("Open pond")}
            </Link>
          )}
        </details>
      </div>
    </article>
  );
}
export function SopTodoList({ tasks, ...props }: Props) {
  const ui = (text: string) => sopText(text, props.language);
  return (
    <div className="todo-work-list">
      {sopWorkItems(tasks, props.clock).map((item) =>
        item.kind === "task" ? (
          <TaskCard key={item.id} task={item.tasks[0]} {...props} />
        ) : (
          <article key={item.id} className="sop-card todo-reading-card">
            <p className="todo-pond-name">{item.tasks[0].target.name}</p>
            <h3>{ui("Record pond readings")}</h3>
            <p>
              {item.tasks.length} {ui("readings to enter")}
            </p>
            <p>
              {ui("Save pond readings to finish these tasks automatically.")}
            </p>
            <p className="todo-deadline">
              {item.tasks[0].dueAt < props.clock ? ui("Past due") : ui("Due")} ·{" "}
              {new Date(item.tasks[0].dueAt).toLocaleString(props.language, {
                timeZone: props.timeZone,
              })}
            </p>
            {item.tasks.some((task) => props.pending.includes(task.id)) && (
              <p role="status">{ui("Waiting to save")}</p>
            )}
            <Link
              className="sop-button sop-primary"
              href={`/dashboard/ponds/detail?id=${encodeURIComponent(item.tasks[0].target.pondId)}`}
            >
              {ui("Enter readings")}
            </Link>
            <details className="todo-reading-checks">
              <summary>
                {ui("View each check")} · {item.tasks.length}
              </summary>
              {item.tasks.map((task) => (
                <TaskCard key={task.id} task={task} {...props} />
              ))}
            </details>
          </article>
        ),
      )}
    </div>
  );
}
