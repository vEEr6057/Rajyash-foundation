"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/constants";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../actions/notificationActions";

export function useNotifications() {
  const qc = useQueryClient();
  const feed = useQuery({
    queryKey: QUERY_KEYS.notifications,
    queryFn: async () => {
      const r = await listNotifications();
      return r.ok ? r.items : [];
    },
  });
  const unread = useQuery({
    queryKey: QUERY_KEYS.unreadCount,
    queryFn: async () => {
      const r = await getUnreadCount();
      return r.ok ? r.count : 0;
    },
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
  };
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });
  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: invalidate,
  });
  return {
    items: feed.data ?? [],
    unreadCount: unread.data ?? 0,
    isLoading: feed.isLoading,
    markAll,
    markOne,
  };
}
