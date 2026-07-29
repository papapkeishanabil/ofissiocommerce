import type {
  ProcessOrderRoute,
  ProcessOrderStatus,
  ProcessOrderTask,
} from "./process-order.types";
import { INITIAL_PROCESS_PROGRESS, PROCESS_ROUTE_PREFIX } from "./process-order.config";

export function processOrderPrefix(route: ProcessOrderRoute) {
  return PROCESS_ROUTE_PREFIX[route];
}

export function calculateProcessProgress(input: {
  route: ProcessOrderRoute;
  status: ProcessOrderStatus;
  tasks: ProcessOrderTask[];
}) {
  if (input.status === "completed") return 100;
  if (input.status === "cancelled") return 0;
  if (input.tasks.length === 0) return INITIAL_PROCESS_PROGRESS[input.route];

  const completed = input.tasks.filter((task) => task.status === "completed").length;
  const current = input.tasks.some((task) => task.status === "in_progress") ? 0.35 : 0;
  const raw = Math.round(((completed + current) / input.tasks.length) * 100);
  return Math.max(INITIAL_PROCESS_PROGRESS[input.route], Math.min(99, raw));
}

export function getCurrentStageFromTasks(tasks: ProcessOrderTask[]) {
  return (
    tasks.find((task) => task.status === "in_progress")?.stage ??
    tasks.find((task) => task.status === "pending")?.stage ??
    "completed"
  );
}

export function nextPendingTask(tasks: ProcessOrderTask[]) {
  return tasks
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .find((task) => task.status !== "completed");
}

export function isTerminalProcessStatus(status: ProcessOrderStatus) {
  return status === "completed" || status === "cancelled";
}
