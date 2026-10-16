import { Check, Circle, TriangleAlert } from "lucide-react";

import { formatTrackingDate } from "@/features/tracking/tracking.service";
import type { OrderTimelineStage } from "@/features/tracking/tracking.types";
import { stageStateLabel } from "@/features/tracking/tracking-utils";
import styles from "./OrderStageStepper.module.css";

interface OrderStageStepperProps {
  stages: OrderTimelineStage[];
}

export function OrderStageStepper({ stages }: OrderStageStepperProps) {
  if (stages.length === 0) return null;
  const activeIndex = stages.findIndex(stage => stage.state === "blocked" || stage.state === "current");
  const activeStage = stages[activeIndex];
  const allCompleted = stages.every(stage => stage.state === "completed");
  return <section className={styles.panel} aria-label="Tahapan pesanan">
    <header className={styles.header}><h2>Tahapan pesanan</h2><p>{activeStage ? `Tahap ${activeIndex + 1} dari ${stages.length}: ${stageStateLabel(activeStage.state)}` : allCompleted ? `Semua ${stages.length} tahap selesai` : `${stages.length} tahap`}</p></header>
    <div className={styles.viewport} role="region" aria-label="Progress tahapan pesanan, geser untuk melihat tahap lainnya" tabIndex={0}>
      <ol className={styles.track} style={{ minWidth: `${stages.length * 104}px` }}>
        {stages.map((stage, index) => <li className={styles.stage} key={stage.id} aria-current={stage.state === "current" || stage.state === "blocked" ? "step" : undefined}>
          {index < stages.length - 1 && <span className={styles.connector} data-reached={stage.state === "completed"} aria-hidden="true" />}
          <span className={styles.node} data-state={stage.state} aria-hidden="true">{stage.state === "completed" ? <Check size={16} /> : stage.state === "blocked" ? <TriangleAlert size={16} /> : stage.state === "current" ? <span className={styles.dot} /> : <Circle size={12} />}</span>
          <div><p className={styles.label}>{stage.label}</p><p className={styles.state}>{stageStateLabel(stage.state)}{stage.state === "completed" && stage.completedAt ? ` · ${formatTrackingDate(stage.completedAt)}` : ""}</p>
            {stage.state === "current" && typeof stage.completedQty === "number" && typeof stage.totalQty === "number" && <p className={styles.quantity}>{stage.completedQty} / {stage.totalQty} pcs selesai</p>}
          </div>
        </li>)}
      </ol>
    </div>
    {stages.length > 2 && <p className={styles.hint}>Geser ke samping untuk melihat seluruh tahapan.</p>}
  </section>;
}
