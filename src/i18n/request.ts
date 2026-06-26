// src/i18n/request.ts
// Wave 0 stub — minimal getRequestConfig so withNextIntl plugin can resolve this file.
// Full implementation (cookie-based locale detection + message loading) in Plan 07-01.
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  return {
    locale: "en",
    messages: {},
  };
});
