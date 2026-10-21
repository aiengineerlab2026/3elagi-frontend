import React from "react";
import { HomeDoctorSummary } from "@/components/home/HomeDoctorSummary";
import type { DoctorDashboardMetrics } from "@/hooks/useDoctorDashboard";

interface Props {
  metrics: DoctorDashboardMetrics;
}

/** Today's overview metrics — quick actions live under the greeting in the hero column. */
export function DoctorActionsMetricsPanel({ metrics }: Props) {
  return <HomeDoctorSummary metrics={metrics} variant="card" />;
}
