import "server-only";

import type {
  ProcessOrder,
  ProcessOrderEvent,
  ProcessOrderItem,
  ProcessOrderTask,
} from "@/features/process-orders/process-order.types";
import type { ProcessOrderRepository } from "../repository.types";

type ProcessOrderGlobal = typeof globalThis & {
  __ofissioProcessOrders?: Map<string, ProcessOrder>;
  __ofissioProcessOrderItems?: Map<string, ProcessOrderItem>;
  __ofissioProcessOrderTasks?: Map<string, ProcessOrderTask>;
  __ofissioProcessOrderEvents?: Map<string, ProcessOrderEvent>;
};

const processGlobal = globalThis as ProcessOrderGlobal;
const processOrders =
  processGlobal.__ofissioProcessOrders ??
  (processGlobal.__ofissioProcessOrders = new Map<string, ProcessOrder>());
const processOrderItems =
  processGlobal.__ofissioProcessOrderItems ??
  (processGlobal.__ofissioProcessOrderItems = new Map<string, ProcessOrderItem>());
const processOrderTasks =
  processGlobal.__ofissioProcessOrderTasks ??
  (processGlobal.__ofissioProcessOrderTasks = new Map<string, ProcessOrderTask>());
const processOrderEvents =
  processGlobal.__ofissioProcessOrderEvents ??
  (processGlobal.__ofissioProcessOrderEvents = new Map<string, ProcessOrderEvent>());

export const mockProcessOrderRepository: ProcessOrderRepository = {
  async createProcessOrder(input) {
    processOrders.set(input.processOrder.id, input.processOrder);
    return input.processOrder;
  },
  async createProcessOrderItems(input) {
    for (const item of input.items) processOrderItems.set(item.id, item);
    return input.items;
  },
  async createProcessOrderTasks(input) {
    for (const task of input.tasks) processOrderTasks.set(task.id, task);
    return input.tasks;
  },
  async listProcessOrders(input = {}) {
    return [...processOrders.values()]
      .filter((order) => (input.companyId ? order.companyId === input.companyId : true))
      .filter((order) => (input.processRoute ? order.processRoute === input.processRoute : true))
      .filter((order) => (input.processStatus ? order.processStatus === input.processStatus : true))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },
  async getProcessOrderById(input) {
    const order = processOrders.get(input.processOrderId);
    if (!order) return null;
    if (input.companyId && order.companyId !== input.companyId) return null;
    return order;
  },
  async getProcessOrderByOrderId(input) {
    return (
      [...processOrders.values()].find(
        (order) =>
          order.ofissioOrderId === input.ofissioOrderId &&
          (!input.companyId || order.companyId === input.companyId),
      ) ?? null
    );
  },
  async updateProcessOrder(input) {
    const current = processOrders.get(input.processOrderId);
    if (!current || (input.companyId && current.companyId !== input.companyId)) return null;
    const next = { ...current, ...input.patch, updatedAt: new Date().toISOString() };
    processOrders.set(next.id, next);
    return next;
  },
  async updateTaskStatus(input) {
    const task = processOrderTasks.get(input.taskId);
    if (!task || task.processOrderId !== input.processOrderId) return null;
    const order = processOrders.get(input.processOrderId);
    if (!order || (input.companyId && order.companyId !== input.companyId)) return null;
    const now = new Date().toISOString();
    const next = {
      ...task,
      status: input.status,
      notes: input.notes ?? task.notes,
      startedAt:
        input.status === "in_progress" && !task.startedAt ? now : task.startedAt,
      completedAt: input.status === "completed" ? now : task.completedAt,
      updatedAt: now,
    };
    processOrderTasks.set(next.id, next);
    return next;
  },
  async addProcessOrderEvent(input) {
    processOrderEvents.set(input.event.id, input.event);
    return input.event;
  },
  async listProcessOrderEvents(input) {
    return [...processOrderEvents.values()]
      .filter((event) => event.processOrderId === input.processOrderId)
      .filter((event) => (input.companyId ? event.companyId === input.companyId : true))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },
  async listProcessOrderTasks(input) {
    return [...processOrderTasks.values()]
      .filter((task) => task.processOrderId === input.processOrderId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
  async listProcessOrderItems(input) {
    return [...processOrderItems.values()].filter(
      (item) => item.processOrderId === input.processOrderId,
    );
  },
};
