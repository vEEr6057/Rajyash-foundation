import "server-only";
import { ROUTES, type RunSlot } from "@/config/constants";

export interface NotificationCopy {
  title: string;
  body: string;
  url: string;
}

export type CopyEventName =
  | "pickup/created"
  | "pickup/claimed"
  | "pickup/status_changed"
  | "pickup/cancelled"
  | "run/assigned"
  | "run/completed";

export interface CopyContext {
  pickupId?: string;
  toStatus?: string;
  // Run context (B3): run/assigned (driver) + run/completed (admins).
  runId?: string;
  slot?: RunSlot;
  runDate?: Date | string;
}

// The three app locales (mirrors i18n/request SUPPORTED_LOCALES). Kept local so the
// Inngest runtime never pulls next-intl/cookies in for notification copy.
type Loc = "en" | "gu" | "hi";
function normLocale(locale: string | undefined): Loc {
  return locale === "gu" || locale === "hi" ? locale : "en";
}

const DATE_TAG: Record<Loc, string> = { en: "en-IN", gu: "gu-IN", hi: "hi-IN" };

// Slot labels match the app catalogs' admin.runs.slotMorning/slotNight exactly.
const SLOT_LABEL: Record<Loc, Record<RunSlot, string>> = {
  en: { morning: "Morning drive", night: "Night drive" },
  gu: { morning: "સવારની ડ્રાઇવ", night: "રાત્રિ ડ્રાઇવ" },
  hi: { morning: "सुबह ड्राइव", night: "रात ड्राइव" },
};

/** "Morning drive · 4 Jul 2026" style run descriptor, localized. */
function runWhen(loc: Loc, slot: RunSlot | undefined, runDate: Date | string | undefined): string {
  const label = SLOT_LABEL[loc][slot ?? "morning"];
  if (!runDate) return label;
  const date = typeof runDate === "string" ? new Date(runDate) : runDate;
  if (Number.isNaN(date.getTime())) return label;
  const when = date.toLocaleDateString(DATE_TAG[loc], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${label} · ${when}`;
}

interface TitleBody {
  title: string;
  body: string;
}

interface LocaleStrings {
  pickupCreated: TitleBody;
  pickupClaimed: TitleBody;
  status: Record<"en_route" | "picked_up" | "delivered", TitleBody>;
  statusFallback: TitleBody;
  pickupCancelled: TitleBody;
  runAssigned: (when: string) => TitleBody;
  runCompleted: (when: string) => TitleBody;
}

/**
 * Hand-written 6-event × title+body copy per locale (B3). Faithful GU/HI in the same
 * register as the app message catalogs. Not next-intl — the Inngest runtime resolves
 * copy from this table so it stays free of the request-scoped i18n machinery.
 */
const COPY: Record<Loc, LocaleStrings> = {
  en: {
    pickupCreated: {
      title: "New pickup nearby",
      body: "A donor just posted surplus food. Tap to claim it.",
    },
    pickupClaimed: {
      title: "Your pickup was claimed",
      body: "A volunteer is on the way to collect your donation.",
    },
    status: {
      en_route: {
        title: "Volunteer en route",
        body: "Your volunteer is heading to the pickup.",
      },
      picked_up: {
        title: "Food picked up",
        body: "Your donation has been collected and is on its way.",
      },
      delivered: {
        title: "Delivered — thank you!",
        body: "Your donation reached people in need.",
      },
    },
    statusFallback: {
      title: "Pickup updated",
      body: "Your pickup status changed.",
    },
    pickupCancelled: {
      title: "Pickup cancelled",
      body: "Your pickup request was cancelled.",
    },
    runAssigned: (when) => ({
      title: "You're assigned to a run",
      body: `${when}. Tap to see your stops.`,
    }),
    runCompleted: (when) => ({
      title: "Run completed",
      body: `${when} — all stops done.`,
    }),
  },
  gu: {
    pickupCreated: {
      title: "નજીકમાં નવું પિકઅપ",
      body: "એક દાતાએ હમણાં જ વધારાનું ભોજન પોસ્ટ કર્યું. દાવો કરવા ટૅપ કરો.",
    },
    pickupClaimed: {
      title: "તમારું પિકઅપ લેવાયું",
      body: "એક સ્વયંસેવક તમારું દાન લેવા આવી રહ્યા છે.",
    },
    status: {
      en_route: {
        title: "સ્વયંસેવક રસ્તામાં",
        body: "તમારા સ્વયંસેવક પિકઅપ તરફ આવી રહ્યા છે.",
      },
      picked_up: {
        title: "ભોજન ઉઠાવ્યું",
        body: "તમારું દાન એકત્ર થયું છે અને રસ્તામાં છે.",
      },
      delivered: {
        title: "પહોંચાડ્યું — આભાર!",
        body: "તમારું દાન જરૂરિયાતમંદ લોકો સુધી પહોંચ્યું.",
      },
    },
    statusFallback: {
      title: "પિકઅપ અપડેટ થયું",
      body: "તમારા પિકઅપની સ્થિતિ બદલાઈ.",
    },
    pickupCancelled: {
      title: "પિકઅપ રદ થયું",
      body: "તમારી પિકઅપ વિનંતી રદ કરવામાં આવી.",
    },
    runAssigned: (when) => ({
      title: "તમને એક રન સોંપાયો",
      body: `${when}. તમારા સ્ટૉપ જોવા ટૅપ કરો.`,
    }),
    runCompleted: (when) => ({
      title: "રન પૂર્ણ થયો",
      body: `${when} — બધા સ્ટૉપ પૂરા થયા.`,
    }),
  },
  hi: {
    pickupCreated: {
      title: "पास में नया पिकअप",
      body: "एक दाता ने अभी बचा हुआ भोजन पोस्ट किया. दावा करने के लिए टैप करें.",
    },
    pickupClaimed: {
      title: "आपका पिकअप ले लिया गया",
      body: "एक स्वयंसेवक आपका दान लेने आ रहा है.",
    },
    status: {
      en_route: {
        title: "स्वयंसेवक रास्ते में",
        body: "आपका स्वयंसेवक पिकअप की ओर आ रहा है.",
      },
      picked_up: {
        title: "भोजन उठा लिया",
        body: "आपका दान एकत्र हो गया है और रास्ते में है.",
      },
      delivered: {
        title: "पहुँचा दिया — धन्यवाद!",
        body: "आपका दान ज़रूरतमंद लोगों तक पहुँचा.",
      },
    },
    statusFallback: {
      title: "पिकअप अपडेट हुआ",
      body: "आपके पिकअप की स्थिति बदली.",
    },
    pickupCancelled: {
      title: "पिकअप रद्द",
      body: "आपका पिकअप अनुरोध रद्द कर दिया गया.",
    },
    runAssigned: (when) => ({
      title: "आपको एक रन सौंपा गया",
      body: `${when}. अपने स्टॉप देखने के लिए टैप करें.`,
    }),
    runCompleted: (when) => ({
      title: "रन पूरा हुआ",
      body: `${when} — सभी स्टॉप पूरे.`,
    }),
  },
};

/**
 * Per-event, recipient-locale title/body/url (B3). Falls back to 'en' for any unknown
 * locale. URL is language-agnostic (a route). GU/HI copy is escaped by the email channel
 * before interpolation, same as English.
 */
export function buildCopy(
  eventName: CopyEventName,
  ctx: CopyContext,
  locale: string = "en",
): NotificationCopy {
  const loc = normLocale(locale);
  const s = COPY[loc];
  switch (eventName) {
    case "pickup/created":
      return { ...s.pickupCreated, url: ROUTES.pickup(ctx.pickupId ?? "") };
    case "pickup/claimed":
      return { ...s.pickupClaimed, url: ROUTES.pickup(ctx.pickupId ?? "") };
    case "pickup/status_changed": {
      const tb = s.status[ctx.toStatus as keyof typeof s.status] ?? s.statusFallback;
      return { ...tb, url: ROUTES.pickup(ctx.pickupId ?? "") };
    }
    case "pickup/cancelled":
      return { ...s.pickupCancelled, url: ROUTES.pickup(ctx.pickupId ?? "") };
    case "run/assigned":
      return {
        ...s.runAssigned(runWhen(loc, ctx.slot, ctx.runDate)),
        url: ROUTES.driverRun,
      };
    case "run/completed":
      return {
        ...s.runCompleted(runWhen(loc, ctx.slot, ctx.runDate)),
        url: ROUTES.adminRun(ctx.runId ?? ""),
      };
    default:
      return { title: "Notification", body: "", url: ROUTES.home };
  }
}
