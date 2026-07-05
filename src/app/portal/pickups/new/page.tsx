import { redirect } from "next/navigation";
import { ROUTES } from "@/config/constants";

// Post-a-pickup is now the shared form sheet (PostPickupSheet) on the donor
// dashboard and My Pickups, not a standalone page. Keep this route working for
// old links/bookmarks by sending it to the dashboard, where the "Post a
// pickup" button opens the form in place (same convention as
// /admin/surplus/new → /admin/pickups, /admin/runs/new → /admin/runs).
export default function NewPickupPage() {
  redirect(ROUTES.portalDashboard);
}
