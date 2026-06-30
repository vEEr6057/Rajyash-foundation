import { redirect } from "next/navigation";
import { ROUTES } from "@/config/constants";

// Log surplus is now a popup (LogSurplusSheet) on the Pickups page and the Overview,
// not a standalone page. Keep this route working for old links/bookmarks by sending
// it to Pickups, where the "Log surplus" button opens the form in place.
export default function AdminSurplusNewPage() {
  redirect(ROUTES.adminPickups);
}
