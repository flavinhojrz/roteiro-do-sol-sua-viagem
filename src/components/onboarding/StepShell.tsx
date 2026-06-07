import type { ReactNode } from "react";
import { SunBurst, Waves } from "@/components/landing/SunWaveDecor";

export function StepShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-sky overflow-hidden">
      <SunBurst className="pointer-events-none absolute -top-16 -right-16 w-72 h-72 md:w-96 md:h-96 opacity-50 animate-sun-pulse" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 w-[110%] h-24 md:h-32 animate-wave-drift" />
      <div className="relative mx-auto max-w-2xl px-5 md:px-8 pt-8 md:pt-14 pb-32 md:pb-20">
        {children}
      </div>
    </div>
  );
}
