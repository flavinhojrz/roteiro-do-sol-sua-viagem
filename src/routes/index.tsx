import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PlacesPreview } from "@/components/landing/PlacesPreview";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { MobileStickyCTA } from "@/components/landing/MobileStickyCTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Roteiro do Sol — Descubra Natal na sua vibe" },
      {
        name: "description",
        content:
          "Monte um roteiro personalizado de Natal/RN com praias, passeios e experiências que combinam com seu jeito de viajar.",
      },
      { property: "og:title", content: "Roteiro do Sol — Descubra Natal na sua vibe" },
      {
        property: "og:description",
        content: "Praias, passeios e experiências em Natal/RN, do seu jeito.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-sand-soft text-ink">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <PlacesPreview />
        <FinalCTA />
      </main>
      <Footer />
      <MobileStickyCTA />
    </div>
  );
}
