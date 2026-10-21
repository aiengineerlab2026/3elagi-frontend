import { useCallback, useState } from "react";
import { fetchMyAppointments } from "@/domains/appointments/api";
import {
  fetchAccountProfile,
  type AccountProfile,
} from "@/domains/auth/profile-api";
import { resolveAccessToken } from "@/domains/auth/session";
import { fetchMyConsultations, type DoctorConsultation } from "@/domains/consultations/api";
import { fetchUnreadNotificationCount } from "@/domains/notifications/api";
import { countUpcomingVideoCalls } from "@/domains/appointments/upcomingVideoCalls";

export type DoctorDashboardMetrics = {
  appointmentsToday: number;
  upcomingVideoCalls: number;
  openConsultations: number;
  unreadNotifications: number;
};

const EMPTY_METRICS: DoctorDashboardMetrics = {
  appointmentsToday: 0,
  upcomingVideoCalls: 0,
  openConsultations: 0,
  unreadNotifications: 0,
};

function isToday(date: string): boolean {
  return date === new Date().toISOString().slice(0, 10);
}

export function useDoctorDashboard(accessToken: string | null, role: string | null) {
  const [metrics, setMetrics] = useState<DoctorDashboardMetrics>(EMPTY_METRICS);
  const [consultations, setConsultations] = useState<DoctorConsultation[]>([]);
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const token = resolveAccessToken(accessToken);
    if (!token || role?.toLowerCase() !== "doctor") return;
    try {
      const [appointments, consultationList, profile, unreadNotifications] =
        await Promise.all([
          fetchMyAppointments(token),
          fetchMyConsultations(token).catch(() => [] as DoctorConsultation[]),
          fetchAccountProfile(token, role),
          fetchUnreadNotificationCount(token).catch(() => 0),
        ]);

      const appointmentsToday = appointments.filter(
        (item) => isToday(item.date) && item.status !== "cancelled",
      ).length;
      const upcomingVideoCalls = countUpcomingVideoCalls(appointments);
      const openConsultations = consultationList.filter((c) => c.status === "open").length;

      setMetrics({
        appointmentsToday,
        upcomingVideoCalls,
        openConsultations,
        unreadNotifications,
      });
      setConsultations(consultationList.filter((c) => c.status === "open"));
      setAccount(profile);
    } finally {
      setLoading(false);
    }
  }, [accessToken, role]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return {
    metrics,
    consultations,
    account,
    setAccount,
    loading,
    refreshing,
    load,
    refresh,
  };
}
