"use client";
import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PARTNER_TYPES, PARTNER_TYPE_LABELS } from "@/config/constants";
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
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartnerInput>({
    resolver: zodResolver(partnerSchema) as unknown as Resolver<PartnerInput>,
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
        return;
      }
      if (mode === "create") reset();
      router.refresh();
      onDone?.();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="p-name">Name*</Label>
        <Input id="p-name" {...register("name")} />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="p-type">Type</Label>
        <select id="p-type" className={SELECT} {...register("type")}>
          {PARTNER_TYPES.map((t) => (
            <option key={t} value={t}>
              {PARTNER_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="p-cn">Contact name</Label>
        <Input id="p-cn" {...register("contactName")} />
      </div>
      <div>
        <Label htmlFor="p-cp">Contact phone</Label>
        <Input id="p-cp" {...register("contactPhone")} />
      </div>
      <div>
        <Label htmlFor="p-ce">Contact email</Label>
        <Input id="p-ce" {...register("contactEmail")} />
        {errors.contactEmail && (
          <p className="mt-1 text-xs text-destructive">
            {errors.contactEmail.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="p-addr">Address</Label>
        <Input id="p-addr" {...register("address")} />
      </div>
      <div>
        <Label htmlFor="p-city">City</Label>
        <Input id="p-city" {...register("city")} />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Add partner" : "Save"}
      </Button>
    </form>
  );
}
