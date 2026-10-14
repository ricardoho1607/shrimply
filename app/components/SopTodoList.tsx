import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { SopTask } from "../../shared/sop/contracts";
import {
  isPondReadingTask,
  sopTaskStatus,
  sopTaskUrgent,
  sopWorkItems,
} from "../../shared/sop/presentation";
import { sopText, sopTaskTitle } from "../../shared/sop/uiCopy";

type Props = {
  tasks: SopTask[];
  language: string;
  timeZone: string;
  clock: number;
  pending: string[];
  onOpen: (task: SopTask) => void;
  onPond: (pondId: string) => void;
  onReadings: (pondId: string) => void;
};
function Action({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, primary && styles.primary]}
    >
      <Text style={[styles.actionText, primary && { color: "white" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
function Details({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.action}
      >
        <Text style={styles.actionText}>
          {label} {open ? "−" : "+"}
        </Text>
      </TouchableOpacity>
      {open && children}
    </View>
  );
}
function TaskCard({
  task,
  ...props
}: Omit<Props, "tasks"> & { task: SopTask }) {
  const ui = (text: string) => sopText(text, props.language);
  const finished = ["completed", "waived", "cancelled"].includes(task.status);
  return (
    <View style={styles.card}>
      <Text style={styles.pond}>{task.target.name}</Text>
      <Text style={styles.title}>
        {sopTaskTitle(task.title, task.purpose, props.language)}
      </Text>
      <Text style={styles.status}>{ui(sopTaskStatus(task))}</Text>
      <Text style={styles.text}>
        {!finished && task.dueAt < props.clock ? ui("Past due") : ui("Due")} ·{" "}
        {new Date(task.dueAt).toLocaleString(props.language, {
          timeZone: props.timeZone,
        })}
      </Text>
      {sopTaskUrgent(task) && !finished && (
        <Text style={styles.attention}>{ui("Urgent — do this first")}</Text>
      )}
      {props.pending.includes(task.id) && (
        <Text style={styles.text}>{ui("Waiting to save")}</Text>
      )}
      <Action
        primary
        label={ui(
          isPondReadingTask(task)
            ? "Enter readings"
            : finished
              ? "View task"
              : "Open task",
        )}
        onPress={() =>
          isPondReadingTask(task)
            ? props.onReadings(task.target.pondId)
            : props.onOpen(task)
        }
      />
      <Details label={ui("Instructions and details")}>
        <Text style={styles.text}>{task.instructions}</Text>
        <Text style={styles.text}>
          {ui("Parameter result:")} {ui(task.result)}
        </Text>
        <Text style={styles.text}>
          {ui("Status")}: {ui(task.status)}
        </Text>
        {isPondReadingTask(task) && (
          <Action label={ui("Open task")} onPress={() => props.onOpen(task)} />
        )}
        {!!task.target.pondId && !isPondReadingTask(task) && (
          <Action
            label={ui("Open pond")}
            onPress={() => props.onPond(task.target.pondId)}
          />
        )}
      </Details>
    </View>
  );
}
export function SopTodoList({ tasks, ...props }: Props) {
  const ui = (text: string) => sopText(text, props.language);
  return (
    <View>
      {sopWorkItems(tasks, props.clock).map((item) =>
        item.kind === "task" ? (
          <TaskCard key={item.id} task={item.tasks[0]} {...props} />
        ) : (
          <View key={item.id} style={[styles.card, styles.readings]}>
            <Text style={styles.pond}>{item.tasks[0].target.name}</Text>
            <Text style={styles.title}>{ui("Record pond readings")}</Text>
            <Text style={styles.text}>
              {item.tasks.length} {ui("readings to enter")}
            </Text>
            <Text style={styles.text}>
              {ui("Save pond readings to finish these tasks automatically.")}
            </Text>
            <Text style={styles.text}>
              {item.tasks[0].dueAt < props.clock ? ui("Past due") : ui("Due")} ·{" "}
              {new Date(item.tasks[0].dueAt).toLocaleString(props.language, {
                timeZone: props.timeZone,
              })}
            </Text>
            {item.tasks.some((task) => props.pending.includes(task.id)) && (
              <Text style={styles.text}>{ui("Waiting to save")}</Text>
            )}
            <Action
              primary
              label={ui("Enter readings")}
              onPress={() => props.onReadings(item.tasks[0].target.pondId)}
            />
            <Details label={`${ui("View each check")} · ${item.tasks.length}`}>
              {item.tasks.map((task) => (
                <TaskCard key={task.id} task={task} {...props} />
              ))}
            </Details>
          </View>
        ),
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#dce6ec",
    borderRadius: 14,
    backgroundColor: "white",
    marginBottom: 16,
  },
  readings: { borderColor: "#b8d4e5" },
  pond: { fontSize: 16, fontWeight: "700", color: "#0F4C75", marginBottom: 8 },
  title: {
    fontSize: 21,
    lineHeight: 29,
    fontWeight: "700",
    color: "#18344b",
    marginBottom: 8,
  },
  text: { fontSize: 16, lineHeight: 24, color: "#526b7d", marginBottom: 12 },
  status: { fontSize: 15, color: "#0F4C75", marginBottom: 10 },
  attention: {
    fontSize: 16,
    fontWeight: "700",
    color: "#a83229",
    marginBottom: 12,
  },
  action: {
    minHeight: 48,
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c9dae6",
    marginBottom: 10,
  },
  primary: { backgroundColor: "#0F4C75", borderColor: "#0F4C75" },
  actionText: { fontSize: 16, fontWeight: "600", color: "#0F4C75" },
});
