# Prato Textile — Verifica della baseline unificata

Data: 11 novembre 2026.

## Convalide superate

- **Una sola applicazione:** un solo `index.html`; nessuna cartella WP01...WP06; moduli UI/Three/GSAP integrati nel progetto master.
- **Logica testata:** `npm test` — **4 test PASS** (fase pinze, battuta, normalizzazione e armature tela/saia).
- **Sintassi:** `node --check` — PASS per ogni sorgente JS e per la configurazione Vite.
- **Referenze:** ID HTML univoci, link locali ancorati a sezioni esistenti, aria-pressed coerenti — PASS.
- **Asset 3D:** file `public/models/loom-frame.glb` presente e parse trimesh — **17 geometrie**.
- **Pipeline asset:** path del GLB coerente in asset-loader, script Blender e generatore Python.
- **Layout statico:** verifica headless del solo HTML+CSS, viewport **1440 px e 390 px**, senza overflow orizzontale. Fallback grafico visibile anche in assenza di JavaScript.

## Gate ancora da superare prima del deploy

- **`npm install` non riuscito** in questo ambiente: il registro npm ha risposto con errore DNS `EAI_AGAIN`. Nessuna dipendenza installata.
- Non è stato quindi possibile eseguire `npm run build` con Vite né la simulazione WebGL Three.js / GSAP nel browser.
- L'ambiente blocca inoltre la navigazione browser a `file://`. Il test statico è stato svolto caricando HTML e CSS direttamente in una pagina headless, non avviando il server Vite.
- Script Blender consegnato, **non eseguito**, quindi il `.blend` è da generare in Blender.
- Cinematica dimostrativa e geometrie NON validate con dati dimensionali di una specifica macchina industriale.

## Checklist per collaudo in ambiente Node

1. `npm install`, `npm test`, `npm run build`, `npm run dev`.
2. Controlla in DevTools che non compaiano errori e che il GLB venga caricato.
3. Esamina il tessuto 3D in homepage, poi **Vista telaio 3D** nel Textile Lab.
4. Prova i cinque punti camera, le armature tela 1/1 e saia 2/2, lo slider di formazione.
5. Simula rottura: il telaio deve fermarsi. **Riannoda** non deve riavviare. **Riavvia manualmente** sì.
6. Verifica velocità 0,25×–2×, desktop/mobile, focus tastiera e riduzione movimento.
7. Misura FPS, memory e comportamento su browser reali prima della pubblicazione.
