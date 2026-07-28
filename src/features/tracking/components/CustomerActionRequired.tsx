import { Headset, PenLine, Upload, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type {
  CustomerAction,
  CustomerTrackingOrder,
} from "@/features/tracking/tracking.types";

import { RepeatOrderButton } from "./RepeatOrderButton";

interface CustomerActionRequiredProps {
  order: CustomerTrackingOrder;
}

export function CustomerActionRequired({ order }: CustomerActionRequiredProps) {
  const actions = order.actionRequired;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-ink">Action required</h2>
        <Badge tone={actions.some((action) => action.required) ? "amber" : "neutral"}>
          {actions.some((action) => action.required) ? "Ada aksi" : "Opsional"}
        </Badge>
      </div>

      <div className="mt-4 space-y-3">
        {actions.map((action) => (
          <ActionRow key={action.id} action={action} order={order} />
        ))}
      </div>
    </section>
  );
}

function ActionRow({
  action,
  order,
}: {
  action: CustomerAction;
  order: CustomerTrackingOrder;
}) {
  if (action.type === "REPEAT_ORDER") {
    return (
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3">
        <ActionText action={action} />
        <div className="mt-3">
          <RepeatOrderButton order={order} compact />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-brand-700">
          {iconForAction(action.type)}
        </span>
        <div className="min-w-0 flex-1">
          <ActionText action={action} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            disabled
            aria-disabled
          >
            Placeholder
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionText({ action }: { action: CustomerAction }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-ink">{action.label}</p>
        {action.required && <Badge tone="amber">Wajib</Badge>}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        {action.description}
      </p>
    </div>
  );
}

function iconForAction(type: CustomerAction["type"]) {
  switch (type) {
    case "APPROVE_ARTWORK":
      return <Wand2 className="h-4 w-4" />;
    case "REQUEST_REVISION":
      return <PenLine className="h-4 w-4" />;
    case "UPLOAD_PO":
      return <Upload className="h-4 w-4" />;
    case "CONTACT_SALES":
      return <Headset className="h-4 w-4" />;
    case "REPEAT_ORDER":
      return <Wand2 className="h-4 w-4" />;
  }
}
