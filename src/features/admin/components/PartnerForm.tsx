"use client";
import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormField, FormSelect, FormActions } from "@/components/forms";
import { PARTNER_TYPES } from "@/config/constants";
import { partnerSchema, type PartnerInput } from "../validations/partner";
import { createPartner, updatePartner } from "../actions/adminActions";

const SELECT =
  "rj-field h-11 w-full rounded-lg border border-input bg-surface px-3 text-[15px]";
const ERR = "mt-1 text-xs text-destructive";

export function PartnerForm({
  mode,
  partnerId,
  defaults,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  partnerId?: string;
  defaults?: Partial<PartnerInput>;
  onDone?: () => void;
  // A FormSheet host passes its `close` so Cancel dismisses the sheet.
  onCancel?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
  } = useForm<PartnerInput>({
    resolver: zodResolver(partnerSchema) as unknown as Resolver<PartnerInput>,
    mode: "onTouched",
    defaultValues: {
      name: "",
      type: "restaurant",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      address: "",
      city: "",
      ...defaults,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setErr(null);
    start(async () => {
      const res =
        mode === "create"
          ? await createPartner(values)
          : await updatePartner(partnerId!, values);
      if (!res.ok) {
        setErr(res.message);
        toast.error(res.message);
        return;
      }
      toast.success(mode === "create" ? tCommon("toast.saved") : tCommon("toast.updated"));
      if (mode === "create") reset();
      router.refresh();
      onDone?.();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormField control={control} name="name" id="p-name" label={t("partners.form.name")} errorClassName={ERR} />
      <FormSelect
        control={control}
        name="type"
        id="p-type"
        label={t("partners.form.type")}
        className={SELECT}
        errorClassName={ERR}
        options={PARTNER_TYPES.map((pt) => ({ value: pt, label: tCommon(`partnerType.${pt}`) }))}
      />
      <FormField control={control} name="contactName" id="p-cn" label={t("partners.form.contactName")} errorClassName={ERR} />
      <FormField
        control={control}
        name="contactPhone"
        id="p-cp"
        label={t("partners.form.contactPhone")}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        errorClassName={ERR}
      />
      <FormField
        control={control}
        name="contactEmail"
        id="p-ce"
        label={t("partners.form.contactEmail")}
        type="email"
        inputMode="email"
        autoComplete="email"
        errorClassName={ERR}
      />
      <FormField control={control} name="address" id="p-addr" label={t("partners.form.address")} errorClassName={ERR} />
      <FormField control={control} name="city" id="p-city" label={t("partners.form.city")} errorClassName={ERR} />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <FormActions
        onCancel={onCancel}
        cancelLabel={tCommon("buttons.cancel")}
        submitLabel={
          mode === "create"
            ? t("partners.form.addButton")
            : t("partners.form.saveButton")
        }
        pending={pending}
      />
    </form>
  );
}
