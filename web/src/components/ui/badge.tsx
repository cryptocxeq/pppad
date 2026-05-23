import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-primary)]/15 text-[#a8b0ff]",
        secondary:
          "border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
        destructive:
          "border-transparent bg-[var(--color-destructive)]/15 text-[#ff8a8d]",
        warning:
          "border-transparent bg-[var(--color-warning)]/15 text-[#ffc971]",
        success:
          "border-transparent bg-[var(--color-success)]/15 text-[#5cdb94]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
