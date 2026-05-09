import Image from "next/image";
import { cn } from "@/lib/utils";

export function PlaceholderMedia({
  label,
  className,
  src,
  priority = false,
}: {
  label: string;
  className?: string;
  src?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "grain-overlay relative overflow-hidden rounded-[24px] border border-white/10 bg-[#201b16]",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={label}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 42vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      ) : (
        <>
          <div className="industrial-grid absolute inset-0 opacity-35" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#2b251f_0%,#201b16_44%,#7b654d_100%)]" />
        </>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,14,10,0.08)_0%,rgba(18,14,10,0.68)_100%)]" />
      <div className="relative flex h-full min-h-[220px] items-end p-4 sm:p-6">
        <div>
          <span className="text-[11px] uppercase tracking-[0.26em] text-white/72">
            Art Home
          </span>
          <p className="mt-2 max-w-xs break-words font-display text-2xl leading-none text-white sm:text-3xl">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
