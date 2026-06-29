import { redirect } from "next/navigation";
import { ROUTES } from "@/config/constants";

// The map is now a tab on the board itself (BoardTabs). Keep this route as a
// permanent redirect so old links / the dashboard shortcut still land correctly.
export default function VolunteerBoardMapPage() {
  redirect(ROUTES.volunteerBoard);
}
