# Plano — Landing Page "Roteiro do Sol"

Landing page estática, leve e tropical para um produto de roteiros turísticos em Natal/RN. Sem backend nesta etapa — apenas frontend visual com o botão "Criar meu roteiro" como CTA principal (sem ação funcional ainda).

## Identidade visual (design tokens em `src/styles.css`)

Substituir a paleta default por tokens tropicais (em oklch, mas mapeando as cores do brief):

- `--sand` (#FFF3D6) → background base
- `--sun` (#FFB703) → accent / sol
- `--sea` (#00A6D6) → primary
- `--aqua` (#4ECDC4) → secondary
- `--coral` (#FF7A59) → destaque CTA
- `--ink` (#123047) → foreground
- branco puro para cards

Fonte: **Nunito Sans** (corpo) + **Poppins** (display), carregadas via `<link>` no `__root.tsx` head e mapeadas em `@theme` como `--font-sans` e `--font-display`.

Detalhes globais:

- Cantos arredondados (radius padrão ~1rem, cards 1.5rem)
- Sombras suaves coloridas (tom azul/areia, baixa opacidade)
- Gradientes suaves areia → azul claro
- Ilustrações SVG inline de sol, ondas e coqueiros (decorativas, `aria-hidden`)

## Estrutura de arquivos

```
src/routes/index.tsx              → monta a landing
src/components/landing/
  Header.tsx
  Hero.tsx                        → inclui FloatingPlaceCards
  HowItWorks.tsx
  PlacesPreview.tsx               → grid desktop / scroll horizontal mobile
  FinalCTA.tsx
  Footer.tsx
  MobileStickyCTA.tsx             → barra fixa visível só em mobile
  SunWaveDecor.tsx                → SVG decorativo reutilizável
src/assets/places/                → 4 imagens geradas (ponta-negra, genipabu, parque-dunas, forte-reis-magos)
src/styles.css                    → tokens da paleta + fontes
src/routes/__root.tsx             → <link> Google Fonts + meta SEO
```

## Seções

1. **Header** — logo "☀️ Roteiro do Sol", nav (Como funciona, Explorar exemplos, Entrar) + botão coral "Criar meu roteiro". Em mobile: logo + botão CTA compacto, demais links em menu hamburguer (Sheet do shadcn).

2. **Hero** — duas colunas no desktop, empilhado no mobile.
   - Esquerda: H1 "Descubra Natal na sua vibe", subtítulo, CTA coral grande, microcopy "Leva menos de 2 minutos para começar ☀️".
   - Direita: composição com 3 mini-cards flutuantes (Ponta Negra, Genipabu, Parque das Dunas) com animação `float` suave (CSS keyframes, offsets diferentes), fundo com SVG de sol e ondas.

3. **Como funciona** — 3 cards horizontais com ícone (lucide: Sparkles, Map, Heart), título e descrição. Botão "Começar agora" abaixo.

4. **Prévia dos lugares** — 4 cards (imagem, nome, tags com emoji, descrição). Grid 2x2 (desktop) / `overflow-x-auto snap` (mobile).

5. **Chamada final** — seção com gradiente areia → azul claro, título, subtítulo, CTA coral grande, decor de ondas no topo/base.

6. **Footer** — minimalista: logo + ©, links secundários.

7. **MobileStickyCTA** — `fixed bottom-0`, só `md:hidden`, botão coral "Criar meu roteiro" com leve elevação.

## Microinterações

- `@keyframes float` (translateY ±6px, 6s ease-in-out infinite) nos cards do hero, com `animation-delay` escalonado.
- Hover nos cards: `translate-y-[-4px]` + sombra mais forte, `transition-all duration-300`.
- Botões: scale 1.02 no hover, shadow colorido.
- Fade-in suave no scroll para seções (CSS `animation-fade-in` já disponível, aplicado por seção).

## SEO

No `index.tsx` `head()`: title "Roteiro do Sol — Descubra Natal na sua vibe", description curta, og:title/description, og:image (usar imagem do hero/Ponta Negra). H1 único no Hero. Alt descritivo em todas imagens.

## Imagens

Gerar 4 fotos estilo turismo ensolarado em `src/assets/places/` via imagegen (fast quality, 1024x768 jpg):

- Ponta Negra (Morro do Careca ao pôr do sol)
- Genipabu (dunas com buggy)
- Parque das Dunas (mata atlântica verde)
- Forte dos Reis Magos (forte histórico com mar ao fundo)

## Fora de escopo nesta etapa

- Fluxo real de "Criar meu roteiro" (apenas botões visuais)
- Páginas /como-funciona, /explorar, /entrar (links âncora `#` por enquanto)
- Backend / persistência

Confirma para eu construir?
