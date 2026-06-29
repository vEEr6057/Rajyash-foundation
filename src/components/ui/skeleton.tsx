import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rj-shimmer rounded-md bg-secondary", className)} {...props} />
  );
}
