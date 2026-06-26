// src/features/public/components/HowItWorks.tsx
// Server component — static, i18n content. Uses landing.* flat keys.
import { getTranslations } from "next-intl/server";

export async function HowItWorks() {
  const t = await getTranslations("landing");

  const steps = [
    {
      num: 1,
      title: t("step1Title"),
      body: t("step1Desc"),
      icon: "🍽️",
    },
    {
      num: 2,
      title: t("step2Title"),
      body: t("step2Desc"),
      icon: "🚗",
    },
    {
      num: 3,
      title: t("step3Title"),
      body: t("step3Desc"),
      icon: "🤝",
    },
  ] as const;

  return (
    <section id="how" className="py-20 px-6">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-primary">
          {t("howEyebrow")}
        </p>
        <h2 className="font-display mb-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
          {t("howTitle")}
        </h2>
        <p className="mb-12 text-center text-sm text-muted-foreground">
          {t("howSub")}
        </p>

        <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map(({ num, title, body, icon }) => (
            <li key={num} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold font-display text-lg">
                  {num}
                </div>
                <span className="text-2xl">{icon}</span>
              </div>
              <h3 className="font-display font-semibold text-foreground text-lg">
                {title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
