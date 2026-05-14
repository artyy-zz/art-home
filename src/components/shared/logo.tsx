import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href,
  className,
  inverse = false,
}: {
  href: string;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "overflow-hidden rounded-full p-1 shadow-[0_10px_20px_rgba(0,0,0,0.08)]",
          inverse
            ? "border border-white/12 bg-white/10"
            : "border border-black/10 bg-white/80",
        )}
      >
        <Image
          src="/images/brand/logo.jpg"
          alt="Mobileria Art Home logo"
          width={46}
          height={46}
          className="h-11 w-11 rounded-full object-cover"
        />
      </span>
      <span
        className={cn(
          "font-display text-2xl leading-none tracking-[0.12em]",
          inverse ? "text-white" : "text-[var(--color-foreground)]",
        )}
      >
        Art Home
      </span>
    </Link>
  );
}
