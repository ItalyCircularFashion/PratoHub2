# PRATO TEXTILE — SITO UNICO FINALE (baseline integrata WP01–WP06)

Questa **non** è una raccolta di sei versioni. È **un unico progetto web**: un solo `index.html`, una sola applicazione JS e CSS, una cartella `public/` con un modello GLB, e gli strumenti di sviluppo necessari.

## Apri il sito

1. Estrai **tutto** lo ZIP in una cartella.
2. Installa **Node.js** 20.19+ o 22.12+ (consigliata la versione LTS corrente).
3. Su Windows: doppio clic su `AVVIA_WINDOWS.bat`. Su macOS/Linux: `sh AVVIA_MAC_LINUX.sh`.
4. Il terminale indica l'indirizzo del sito, normalmente `http://localhost:5173/`. Aprilo nel browser.

Per avviare manualmente:

```bash
npm install
npm run dev
```

`npm install` necessita di collegamento Internet la prima volta. **Non** aprire `index.html` con doppio clic: gli import JavaScript ESM e il caricamento degli asset richiedono il server Vite.

## Cosa è integrato

- Homepage editoriale con identità visiva originale, sezione filiera e navigazione.
- **Three.js**: unico WebGL canvas che si sposta dall'hero al Textile Lab.
- Visualizzazione volumetrica dei fili d'ordito e trama; tela 1/1 e saia 2/2.
- Progressione manuale formazione tessuto e selezione delle lavorazioni.
- Telaio dimostrativo 3D con subbi, lamelle guardaordito, licci, pettine e pinze.
- Simulazione cinematica semplificata, arresto per rottura, riparazione e riavvio manuale, regolazione velocità.
- **GSAP + ScrollTrigger**: ingressi editoriali e 5 inquadrature interattive della camera.
- **Blender**: script di generazione di asset GLB, con struttura statica importata tramite GLTFLoader. Il file `.blend` richiede l'esecuzione di Blender e non è incluso.
- Due aree strutturali: **networking B2B** e **magazine tessile/sostenibilità**. Contenuti e directory rimangono placeholder dichiarati.
- Supporto reduced motion, menu accessibile, tastiera e fallback CSS in assenza di WebGL.

## Struttura — un solo sito

```
PratoTextile_Sito_Finale/
├── index.html                  # UNICO ingresso del sito
├── styles.css                  # stile condiviso di TUTTE le sezioni
├── src/
│   ├── main.js                 # avvio app, navigazione, animazioni e controlli
│   ├── fabric.js               # generazione tessuto 3D
│   ├── loom.js                 # cinematismi macchina 3D
│   ├── kinematics.js           # matematica cinematici/armature
│   └── asset-loader.js         # import GLB nel render 3D
├── public/models/loom-frame.glb
├── blender/                    # sorgenti di modellazione; non richiesti per l'esecuzione
├── tools/                      # rigenerazione GLB alternativa
├── tests/                      # test logica cinematici
├── package.json
├── vite.config.js
└── AVVIA_WINDOWS.bat / AVVIA_MAC_LINUX.sh
```

## Verifica

```bash
npm run test
npm run build
npm run preview
```

I test Node della logica cinematica non richiedono dipendenze. In questo ambiente il registro npm non è raggiungibile (errore DNS EAI_AGAIN): **build Vite e rendering WebGL non sono quindi collaudati**. Consulta `QA_REPORT.md` per l'evidenza esatta e la checklist manuale.

## Pubblicazione

Dopo build riuscita, la cartella `dist/` contiene i file statici pronti da caricare su hosting statico. La `base: './'` di Vite supporta i sottopercorsi, compresi siti GitHub Pages.

## Ambito e limiti

Questo è un **sito unico e una baseline finale consolidata**, NON un portale B2B già online né un gemello digitale industriale. Non sono presenti backend, pubblicazione di aziende reali o notizie correnti. I cinematismi e le geometrie del telaio sono schematici, non calibrati su macchine reali. Le dipendenze devono essere installate prima dell'uso.
