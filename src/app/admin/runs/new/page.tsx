import { redirect } from "next/navigation";
import { ROUTES } from "@/config/constants";

// New run is now the shared form sheet (NewRunSheet) on the Runs list page and
// the Overview, not a standalone page. Keep this route working for old links/
// bookmarks by sending it to Runs, where the "New run" button opens the form
// in place (same convention as /admin/surplus/new → /admin/pickups).
export default function AdminNewRunPage() {
  redirect(ROUTES.adminRuns);
}
