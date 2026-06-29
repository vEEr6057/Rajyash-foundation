"use client";
import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PARTNER_TYPES } from "@/config/constants";
import {
  partnerSchema,
  type PartnerInput,
  createPartner,
  updatePartner,
} from "@/features/admin";

const SELECT =
  "rj-field h-11 w-full rounded-lg border border-input bg-surface px-3 text-[15px]";

export function PartnerForm({
  mode,
  partnerId,
  defaults,
  onDone,
}: {
  mode: "create" | "edit";
  partnerId?: string;
  defaults?: Partial<PartnerInput>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
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
      <div>
        <Label htmlFor="p-name">{t("partners.form.name")}</Label>
        <Input id="p-name" {...register("name")} />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="p-type">{t("partners.form.type")}</Label>
        <select id="p-type" className={SELECT} {...register("type")}>
          {PARTNER_TYPES.map((pt) => (
            <option key={pt} value={pt}>
              {tCommon(`partnerType.${pt}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="p-cn">{t("partners.form.contactName")}</Label>
        <Input id="p-cn" {...register("contactName")} />
      </div>
      <div>
        <Label htmlFor="p-cp">{t("partners.form.contactPhone")}</Label>
        <Input id="p-cp" type="tel" inputMode="tel" autoComplete="tel" {...register("contactPhone")} />
      </div>
      <div>
        <Label htmlFor="p-ce">{t("partners.form.contactEmail")}</Label>
        <Input id="p-ce" type="email" inputMode="email" autoComplete="email" {...register("contactEmail")} />
        {errors.contactEmail && (
          <p className="mt-1 text-xs text-destructive">
            {errors.contactEmail.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="p-addr">{t("partners.form.address")}</Label>
        <Input id="p-addr" {...register("address")} />
      </div>
      <div>
        <Label htmlFor="p-city">{t("partners.form.city")}</Label>
        <Input id="p-city" {...register("city")} />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending
          ? tCommon("buttons.loading")
          : mode === "create"
            ? t("partners.form.addButton")
            : t("partners.form.saveButton")}
      </Button>
    </form>
  );
}
