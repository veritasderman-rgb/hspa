// Interaktivita schématu zdravotního systému (uzly + info panel + mobile fallback list).
// Spouští se ze stránky Jak funguje (jak-funguje.html), kde je SVG schéma vloženo
// jako sekce s id="schema". Pokud je SVG/seznam absent, modul tiše neudělá nic.

const NODES = {
  mzcr: {
    label: 'MZČR',
    full: 'Ministerstvo zdravotnictví ČR',
    role: 'regulator',
    desc: 'Centrální regulátor celého systému. Vydává úhradovou vyhlášku (určuje ceny výkonů), spravuje zákon o zdravotních službách, schvaluje síť poskytovatelů a dohlíží na SÚKL, ÚZIS i výkon pojišťoven. Klíčové politické rozhodnutí o zdravotnictví jde vždy přes MZČR.',
    explainers: [
      { id: 'zakony_zdravotnictvi', label: 'Klíčové zákony zdravotnictví' },
      { id: 'dostupnost_pravni_ramec', label: 'Dostupnost péče: právní rámec' },
      { id: 'uhradova_vyhlaska', label: 'Úhradová vyhláška a dohodovací řízení' },
    ],
  },
  pojistovny: {
    label: 'Zdravotní pojišťovny',
    full: 'VZP + 6 zaměstnaneckých pojišťoven',
    role: 'payer',
    desc: 'Vybírají pojistné od zaměstnanců, zaměstnavatelů a státu (za ekonomicky neaktivní). Nakupují péči od smluvních poskytovatelů. Sazby úhrad jsou dány dohodovacím řízením a úhradovou vyhláškou — pojišťovny mají omezený prostor pro vlastní cenovou politiku. VZP pojišťuje přibližně 60 % obyvatel.',
    explainers: [
      { id: 'pojistovny', label: 'Zdravotní pojišťovny' },
      { id: 'uhradova_vyhlaska', label: 'Úhradová vyhláška a dohodovací řízení' },
    ],
  },
  poskytovatele: {
    label: 'Poskytovatelé péče',
    full: 'Nemocnice, ambulantní lékaři, ambulance',
    role: 'provider',
    desc: 'Dodávají zdravotní péči pojištěncům. Jsou financováni pojišťovnami (systémem DRG pro hospitalizace, kapitací a výkony pro ambulantní péči). Licencuje je MZČR, zřizují je stát, kraje, obce nebo soukromé subjekty. Karlovarský kraj je příkladem regionu, kde výpadek kapacit poskytovatelů přímo ovlivňuje dostupnost péče.',
    explainers: [
      { id: 'cz_drg', label: 'CZ-DRG: jak se platí za hospitalizace' },
      { id: 'szv', label: 'Seznam zdravotních výkonů' },
      { id: 'specializovana_centra', label: 'Síť specializovaných center' },
    ],
  },
  pacienti: {
    label: 'Pacienti / Pojištěnci',
    full: 'Všichni občané s trvalým pobytem v ČR',
    role: 'patient',
    desc: 'Mají ze zákona nárok na hrazenou zdravotní péči. Pojistné platí zaměstnanci (skrze zaměstnavatele) a stát (za děti, důchodce, nezaměstnané). U některých výkonů doplácejí spoluúčast (léky, poplatky). Pacientská zkušenost a výsledky péče vnímané pacientem (PROMs) jsou v ČR stále málo sledovány.',
    explainers: [
      { id: 'odpovednost_dostupnost', label: 'Kdo odpovídá za dostupnost péče' },
    ],
  },
  sukl: {
    label: 'SÚKL',
    full: 'Státní ústav pro kontrolu léčiv',
    role: 'support',
    desc: 'Reguluje bezpečnost léčiv, zdravotnických prostředků a doplňků stravy na českém trhu. Rozhoduje o registraci léků a provádí HTA (hodnocení zdravotnických technologií) pro úhradová rozhodnutí o nových lécích. Klíčový aktér v debatě o přístupu k inovativním lékům.',
    explainers: [],
  },
  uzis: {
    label: 'ÚZIS',
    full: 'Ústav zdravotnických informací a statistiky ČR',
    role: 'support',
    desc: 'Sbírá, zpracovává a publikuje zdravotní statistiku za celý systém — od hospitalizací a ambulantních kontaktů po mzdy zdravotnických pracovníků a kapacity nemocnic. Data ÚZIS jsou primárním zdrojem většiny indikátorů v tomto dashboardu. Systematické otevírání dat ÚZIS umožňuje existenci portálů jako tento.',
    explainers: [],
  },
  kraje: {
    label: 'Kraje',
    full: '14 krajů České republiky',
    role: 'support',
    desc: 'Jsou zřizovateli krajských nemocnic a zodpovídají za zajištění dostupnosti zdravotní péče na svém území (záchranná služba, síť urgentní péče). Karlovarský kraj se dlouhodobě potýká s nedostatkem lékařů i kapacit — příklad systémového selhání v regionální dostupnosti péče.',
    explainers: [
      { id: 'odpovednost_dostupnost', label: 'Kdo odpovídá za dostupnost péče' },
    ],
  },
};

const ROLE_LABELS = {
  regulator: 'Regulátor',
  payer: 'Platce',
  provider: 'Poskytovatel',
  patient: 'Pojištěnec',
  support: 'Podpůrný aktér',
};

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderPanel(nodeId) {
  const panel = document.getElementById('schemaPanel');
  const node = NODES[nodeId];
  if (!panel || !node) return;

  const explainerLinks = node.explainers.length
    ? `<div class="schema-panel-explainers">
        <h4>Více v explainérech</h4>
        <div class="chip-row">
          ${node.explainers.map(e =>
            `<a class="chip" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">${escapeHtml(e.label)}</a>`
          ).join('')}
        </div>
       </div>`
    : '';

  panel.innerHTML = `
    <div class="schema-panel-inner">
      <div class="schema-panel-role schema-role-${escapeHtml(node.role)}">${escapeHtml(ROLE_LABELS[node.role] ?? node.role)}</div>
      <h3 class="schema-panel-name">${escapeHtml(node.full)}</h3>
      <p class="schema-panel-desc">${escapeHtml(node.desc)}</p>
      ${explainerLinks}
    </div>
  `;
}

export function initSchema() {
  document.querySelectorAll('.schema-node').forEach(el => {
    const id = el.dataset.node;
    el.addEventListener('click', () => {
      document.querySelectorAll('.schema-node').forEach(n => n.classList.remove('schema-node-active'));
      el.classList.add('schema-node-active');
      renderPanel(id);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });

  const list = document.getElementById('schemaFallbackList');
  if (list) {
    list.innerHTML = Object.entries(NODES).map(([_id, n]) => `
      <li>
        <strong>${escapeHtml(n.label)}</strong> — <em>${escapeHtml(ROLE_LABELS[n.role] ?? n.role)}</em><br>
        ${escapeHtml(n.desc.slice(0, 200))}…
        ${n.explainers.length ? `<br><a href="jak-funguje.html?id=${encodeURIComponent(n.explainers[0].id)}">Více →</a>` : ''}
      </li>
    `).join('');
  }
}
