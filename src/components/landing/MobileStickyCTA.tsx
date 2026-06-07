import { useEffect, useState } from "react";

export function MobileStickyCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`md:hidden fixed bottom-0 inset-x-0 z-30 px-4 pb-4 pt-3 bg-gradient-to-t from-sand-soft via-sand-soft/95 to-transparent pointer-events-none transition-all duration-500 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      <a
        href="#criar"
        className="press pointer-events-auto flex items-center justify-center rounded-full bg-coral px-6 py-4 text-base font-bold text-white shadow-coral-lg"
      >
        Criar meu roteiro ☀️
      </a>
    </div>
  );
}
