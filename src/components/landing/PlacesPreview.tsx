import pontaNegra from "@/assets/places/ponta-negra.jpg";
import genipabu from "@/assets/places/genipabu.jpg";
import parqueDunas from "@/assets/places/parque-dunas.jpg";
import forte from "@/assets/places/forte-reis-magos.jpg";

const places = [
  {
    img: pontaNegra,
    name: "Ponta Negra",
    tags: ["🌊 Praia", "📸 Fotos", "🌅 Fim de tarde"],
    desc: "Um clássico para sentir Natal logo de cara.",
  },
  {
    img: genipabu,
    name: "Genipabu",
    tags: ["🚙 Bate-volta", "🏄 Aventura", "🏜️ Dunas"],
    desc: "Dunas, buggy e visual marcante para a viagem.",
  },
  {
    img: parqueDunas,
    name: "Parque das Dunas",
    tags: ["🌿 Natureza", "🧘 Descanso", "👨‍👩‍👧 Família"],
    desc: "Um respiro verde no meio de Natal.",
  },
  {
    img: forte,
    name: "Forte dos Reis Magos",
    tags: ["🏛️ História", "🎭 Cultura", "📸 Fotos"],
    desc: "Um pedaço da história potiguar com vista para o mar.",
  },
];

export function PlacesPreview() {
  return (
    <section id="lugares" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl text-ink">
            Alguns lugares que podem aparecer no seu roteiro
          </h2>
          <p className="mt-4 text-ink/65 text-lg">
            Esses são só alguns exemplos. O seu roteiro muda conforme sua vibe.
          </p>
        </div>

        <div className="mt-12 flex md:grid md:grid-cols-2 gap-5 md:gap-8 overflow-x-auto snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0 md:overflow-visible pb-4 md:pb-0">
          {places.map((p) => (
            <article
              key={p.name}
              className="group shrink-0 w-[85%] md:w-auto snap-start bg-white rounded-3xl overflow-hidden shadow-soft hover:-translate-y-1.5 transition-transform duration-300"
            >
              <div className="relative h-56 md:h-72 overflow-hidden">
                <img
                  src={p.img}
                  alt={p.name}
                  width={1024}
                  height={768}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-6">
                <h3 className="font-display font-bold text-xl md:text-2xl text-ink">
                  {p.name}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full bg-sand px-3 py-1 text-xs font-semibold text-ink/75"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-ink/65 leading-relaxed">{p.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
