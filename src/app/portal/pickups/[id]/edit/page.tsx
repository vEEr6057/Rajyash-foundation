import { redirect } from "next/navigation";
import { ROUTES } from "@/config/constants";

// Edit pickup is now the shared form sheet (EditPickupSheet), opened from the
// "Edit" button on the pickup detail page — not a standalone page. Keep this
// route working for old links/bookmarks by sending it to the detail page,
// where "Edit" opens the form in place (same convention as the other
// */new → list-page redirects added alongside this).
export default async function EditPickupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(ROUTES.pickup(id));
}
