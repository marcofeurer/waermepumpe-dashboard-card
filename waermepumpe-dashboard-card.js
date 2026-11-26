class DashboardCard extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; min-width: 0; }
      ::slotted(.dependency-message) { padding: 16px; }
    `;
    root.append(style, document.createElement("slot"));
  }

  static getStubConfig() {
    return {};
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TYPE);
  }

  setConfig(config) {
    const buttonConfig = structuredClone(BUTTON_CONFIG);
    applyEntityOverrides(buttonConfig.variables.entitaeten, config.entitaeten);
    configureExtras(buttonConfig, config);
    this._buttonConfig = buttonConfig;
    this._configureButtonCard();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._buttonCard) {
      this._buttonCard.hass = hass;
    }
  }

  set preview(preview) {
    this._preview = preview;
    if (this._buttonCard) {
      this._buttonCard.preview = preview;
    }
  }

  getCardSize() {
    return this._buttonCard?.getCardSize() ?? 3;
  }

  getGridOptions() {
    return { ...BUTTON_CONFIG.grid_options };
  }

  _configureButtonCard() {
    if (!customElements.get("button-card")) {
      if (!this._waitingForButtonCard) {
        this._waitingForButtonCard = true;
        this._showMessage("Installiere „Button Card“ in HACS und lade das Dashboard neu.");
        customElements.whenDefined("button-card").then(() => {
          try {
            this._configureButtonCard();
          } catch (error) {
            this._showMessage(error.message);
          }
        });
      }
      return;
    }

    const buttonCard = this._buttonCard ?? document.createElement("button-card");
    buttonCard.setConfig(this._buttonConfig);
    buttonCard.preview = this._preview ?? false;
    if (this._hass) {
      buttonCard.hass = this._hass;
    }
    if (!this._buttonCard) {
      this._buttonCard = buttonCard;
      this.replaceChildren(buttonCard);
    }
  }

  _showMessage(message) {
    const card = document.createElement("ha-card");
    card.className = "dependency-message";
    card.setAttribute("role", "status");
    card.textContent = message;
    this.replaceChildren(card);
  }
}

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function applyEntityOverrides(entities, overrides) {
  if (overrides == null) {
    return;
  }
  if (!isMapping(overrides)) {
    throw new Error("„entitaeten“ muss eine Zuordnung aus Gruppen und Entitäts-IDs sein.");
  }

  for (const [group, values] of Object.entries(overrides)) {
    if (!Object.hasOwn(entities, group)) {
      throw new Error(`Unbekannte Entitätsgruppe „${group}“.`);
    }
    if (!isMapping(values)) {
      throw new Error(`Die Entitätsgruppe „${group}“ muss eine Zuordnung sein.`);
    }
    for (const [key, entityId] of Object.entries(values)) {
      if (!Object.hasOwn(entities[group], key)) {
        throw new Error(`Unbekannte Entitätszuordnung „${group}.${key}“.`);
      }
      if (typeof entityId !== "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(entityId)) {
        throw new Error(`Ungültige Entitäts-ID für „${group}.${key}“.`);
      }
      entities[group][key] = entityId;
    }
  }
}

function configureExtras(buttonConfig, config) {
  const fields = buttonConfig.custom_fields;
  const fieldStyles = buttonConfig.styles.custom_fields;

  if (config.grafana_url == null) {
    delete fields.control_19;
    delete fieldStyles.control_19;
  } else {
    let url;
    if (typeof config.grafana_url === "string") {
      try {
        url = new URL(config.grafana_url);
      } catch {
        // Die folgende Prüfung meldet die ungültige Adresse.
      }
    }
    if (!url || !["https:", "http:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("„grafana_url“ muss eine vollständige HTTP- oder HTTPS-Adresse sein.");
    }
    fields.control_19.card.tap_action.browser_mod.data.content.url = config.grafana_url;
  }

  if (config.heizkurve == null) {
    delete fields.heating_curve_popup;
    delete fieldStyles.heating_curve_popup;
  } else {
    if (!isMapping(config.heizkurve)) {
      throw new Error("„heizkurve“ muss eine Zuordnung mit Optionen der Heizkurven-Karte sein.");
    }
    const popup = fields.heating_curve_popup.card.tap_action.browser_mod.data;
    const defaults = popup.content;
    popup.content = { ...defaults, ...config.heizkurve, type: defaults.type };
  }
}

const EDITOR_GROUPS = {
  waermepumpe: {
    label: "Wärmepumpe",
    sections: {
      "Betrieb": {
        zustand: "Zustand",
        unterstatus: "Unterstatus",
        betriebsart: "Betriebsart",
        stoerungen: "Störungen",
        heizanforderung: "Heizanforderung",
        nutzt_pv_ueberschuss: "Nutzt PV-Überschuss",
        betriebsstunden: "Betriebsstunden",
      },
      "Heizwasser und Wärmequelle": {
        vorlauf: "Vorlauftemperatur",
        ruecklauf: "Rücklauftemperatur",
        quelleneingang: "Quelleneingangstemperatur",
        quellenausgang: "Quellenausgangstemperatur",
        quellenpumpe_drehzahl: "Drehzahl der Quellenpumpe",
        umwaelzpumpe: "Umwälzpumpe",
      },
      "Verdichter und Kältekreis": {
        verdichter: "Verdichter",
        verdichter_eintritt: "Verdichter-Eintrittstemperatur",
        verdichter_austritt: "Verdichter-Austrittstemperatur",
        verdichter_leistung: "Verdichterleistung",
        hochdruck: "Hochdruck",
        niederdruck: "Niederdruck",
        ueberhitzung_ist: "Überhitzung Ist",
        ueberhitzung_soll: "Überhitzung Soll",
        expansionsventil: "Expansionsventil",
        kondensator_temperatur: "Kondensatortemperatur",
        verdampfer_temperatur: "Verdampfertemperatur",
      },
    },
  },
  heizkreis: {
    label: "Heizkreis",
    sections: {
      "Betrieb und Steuerung": {
        heizanforderung: "Heizanforderung",
        mischer: "Mischer",
        pumpe: "Heizkreispumpe",
        betriebsart: "Betriebsart",
        raumkorrektur: "Raumkorrektur",
      },
      "Messwerte und Sollwerte": {
        vorlauf: "Vorlauftemperatur Ist",
        ruecklauf: "Rücklauftemperatur",
        vorlauf_soll: "Vorlauftemperatur Soll",
        raumtemperatur_ist: "Raumtemperatur Ist",
        raumtemperatur_soll: "Raumtemperatur Soll",
        raumfeuchtigkeit: "Raumfeuchtigkeit",
      },
    },
  },
  energie: {
    label: "Energie und Stromtarif",
    fields: {
      gesamtverbrauch: "Gesamtverbrauch",
      stromtarif: "Stromtarif",
      tag: "Verbrauch heute",
      woche: "Verbrauch diese Woche",
      monat: "Verbrauch diesen Monat",
      jahr: "Verbrauch dieses Jahr",
      pv_ueberschuss: "PV-Überschuss",
    },
  },
  temperatur: {
    label: "Haus- und Aussentemperatur",
    fields: { haus_mittelwert: "Mittlere Haustemperatur", aussen: "Aussentemperatur" },
  },
  thermostate: {
    label: "Thermostate und Ferienmodus",
    fields: {
      ferienmodus: "Ferienmodus",
      bad: "Bad",
      buero: "Büro",
      dusche: "Dusche",
      gaestezimmer: "Gästezimmer",
      kueche: "Küche",
      schlafzimmer: "Schlafzimmer",
      terrassenzimmer: "Terrassenzimmer",
      toilette: "Toilette",
      ess_wohnzimmer: "Ess- und Wohnzimmer",
      sauna: "Sauna",
    },
  },
  geraete: {
    label: "Geräte",
    fields: {
      buero_klimaanlage: "Büro · Klimaanlage",
      wintergarten_heizung: "Wintergarten · Heizung",
      wintergarten_lueftung: "Wintergarten · Lüftung",
      garage_entfeuchter: "Garage · Entfeuchter",
      sauna_heizung: "Sauna · Heizung",
    },
  },
};

const SUGGESTED_DOMAINS = {
  sensor: ["sensor", "number", "input_number"],
  binary_sensor: ["binary_sensor", "input_boolean", "switch", "sensor"],
  input_number: ["input_number", "number", "sensor"],
};

class DashboardCardEditor extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    const defaults = BUTTON_CONFIG.variables.entitaeten;
    root.innerHTML = `
      <style>
        :host { display: block; min-width: 0; }
        details { margin: 0 0 12px; border: 1px solid var(--divider-color, #8195a3); border-radius: 8px; }
        summary { padding: 12px; font-weight: 600; cursor: pointer; }
        details[open] > summary { border-bottom: 1px solid var(--divider-color, #8195a3); }
        .sections { display: grid; gap: 16px; padding: 12px; }
        fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
        legend { padding: 0 0 8px; font-weight: 600; }
        .fields { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 205px), 1fr)); }
        label { display: grid; align-content: start; gap: 6px; min-width: 0; }
        input {
          box-sizing: border-box;
          width: 100%;
          min-height: 40px;
          padding: 8px 12px;
          font: inherit;
          color: inherit;
          background: var(--card-background-color, transparent);
          border: 1px solid var(--divider-color, #8195a3);
          border-radius: 8px;
        }
        input:invalid { border-color: var(--error-color, #c23b4f); }
      </style>
      ${Object.entries(EDITOR_GROUPS).map(([group, { label, fields, sections }]) => `
        <details data-group="${group}">
          <summary>${label}</summary>
          <div class="sections">
            ${Object.entries(sections ?? { "": fields }).map(([title, entries]) => `
              <fieldset${title ? "" : ` aria-label="${label}"`}>
                ${title ? `<legend>${title}</legend>` : ""}
                <div class="fields">
                  ${Object.entries(entries).map(([key, name]) => {
                    const domain = defaults[group][key].split(".")[0];
                    return `<label>${name}<input name="${key}" data-group="${group}" list="ents-${domain}" pattern="[a-z0-9_]+[.][a-z0-9_]+" placeholder="Entität suchen" autocomplete="off"></label>`;
                  }).join("")}
                </div>
              </fieldset>
            `).join("")}
          </div>
        </details>
      `).join("")}
    `;
    this._inputs = [...root.querySelectorAll("input")];
    this._lists = new Map();
    this._suggestionSignatures = new Map();
    for (const input of this._inputs) {
      const listId = input.getAttribute("list");
      const domain = listId.slice("ents-".length);
      if (!this._lists.has(domain)) {
        const list = document.createElement("datalist");
        list.id = listId;
        root.append(list);
        this._lists.set(domain, list);
      }
      input.addEventListener("change", () => this._changeEntity(input));
    }
  }

  set hass(hass) {
    const entities = new Map();
    for (const [id, { attributes }] of Object.entries(hass?.states ?? {})) {
      const domain = id.split(".")[0];
      if (!entities.has(domain)) entities.set(domain, []);
      entities.get(domain).push({ id, name: String(attributes?.friendly_name || id) });
    }
    for (const [domain, list] of this._lists) {
      const domains = SUGGESTED_DOMAINS[domain] ?? [domain];
      const matches = domains.flatMap(candidate => entities.get(candidate) ?? []);
      const signature = JSON.stringify(matches);
      if (this._suggestionSignatures.get(domain) === signature) continue;
      this._suggestionSignatures.set(domain, signature);
      const options = document.createDocumentFragment();
      matches.sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
      for (const { id, name } of matches) {
        const option = document.createElement("option");
        option.value = id;
        option.label = name;
        options.append(option);
      }
      list.replaceChildren(options);
    }
  }

  setConfig(config) {
    applyEntityOverrides(structuredClone(BUTTON_CONFIG.variables.entitaeten), config.entitaeten);
    this._config = config;
    for (const input of this._inputs) {
      const value = config.entitaeten?.[input.dataset.group]?.[input.name] ?? "";
      if (input.value !== value) input.value = value;
    }
  }

  _changeEntity(input) {
    input.value = input.value.trim();
    if (!input.reportValidity()) return;
    const group = input.dataset.group;
    const key = input.name;
    const assigned = this._config.entitaeten ?? {};
    const current = assigned[group] ?? {};
    if (input.value === (current[key] ?? "")) return;

    const updated = { ...current };
    if (input.value) {
      updated[key] = input.value;
    } else {
      delete updated[key];
    }
    const entitaeten = { ...assigned };
    if (Object.keys(updated).length) {
      entitaeten[group] = updated;
    } else {
      delete entitaeten[group];
    }
    const config = { ...this._config, entitaeten };
    this.setConfig(config);
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
}

const READING_LAYOUT = {
  top: 394,
  height: 138,
  source: { x: 44, width: 138, rowTop: 423, rowHeight: 38, columns: 1 },
  compressor: { x: 194, width: 312, rowTop: 423, rowHeight: 20, columns: 2 },
  heatPump: { x: 518, width: 138, rowTop: 423, rowHeight: 38, columns: 1 },
};

function readingHitArea({ x, width, rowTop, rowHeight, columns }, row, column = 0) {
  const columnWidth = width / columns;
  return [
    { position: "absolute" },
    { left: `${(x + columnWidth * column) / 1000 * 100}%` },
    { top: `${(rowTop + rowHeight * row) / 1080 * 100}%` },
    { width: `${columnWidth / 1000 * 100}%` },
    { height: `${rowHeight / 1080 * 100}%` },
    { "z-index": 7 },
    { "pointer-events": "auto" },
  ];
}

// Lovelace-Konfiguration der zugrunde liegenden Button Card.
const BUTTON_CONFIG = {
  "type": "custom:button-card",
  "variables": {
    "reading_layout": READING_LAYOUT,
    "entitaeten": {
      "waermepumpe": {
        "zustand": "sensor.beispiel_waermepumpe_zustand",
        "unterstatus": "sensor.beispiel_waermepumpe_unterstatus",
        "betriebsart": "sensor.beispiel_waermepumpe_betriebsart",
        "stoerungen": "sensor.beispiel_waermepumpe_stoerungen",
        "heizanforderung": "binary_sensor.beispiel_waermepumpe_heizanforderung",
        "nutzt_pv_ueberschuss": "binary_sensor.beispiel_waermepumpe_nutzt_pv_ueberschuss",
        "vorlauf": "sensor.beispiel_waermepumpe_vorlauf",
        "ruecklauf": "sensor.beispiel_waermepumpe_ruecklauf",
        "quelleneingang": "sensor.beispiel_waermepumpe_quelleneingang",
        "quellenausgang": "sensor.beispiel_waermepumpe_quellenausgang",
        "quellenpumpe_drehzahl": "sensor.beispiel_waermepumpe_quellenpumpe_drehzahl",
        "umwaelzpumpe": "sensor.beispiel_waermepumpe_umwaelzpumpe",
        "verdichter": "sensor.beispiel_waermepumpe_verdichter",
        "verdichter_eintritt": "sensor.beispiel_waermepumpe_verdichter_eintritt",
        "verdichter_austritt": "sensor.beispiel_waermepumpe_verdichter_austritt",
        "verdichter_leistung": "sensor.beispiel_waermepumpe_verdichter_leistung",
        "betriebsstunden": "sensor.beispiel_waermepumpe_betriebsstunden",
        "hochdruck": "sensor.beispiel_waermepumpe_hochdruck",
        "niederdruck": "sensor.beispiel_waermepumpe_niederdruck",
        "ueberhitzung_ist": "sensor.beispiel_waermepumpe_ueberhitzung_ist",
        "ueberhitzung_soll": "sensor.beispiel_waermepumpe_ueberhitzung_soll",
        "expansionsventil": "sensor.beispiel_waermepumpe_expansionsventil",
        "kondensator_temperatur": "sensor.beispiel_waermepumpe_kondensator_temperatur",
        "verdampfer_temperatur": "sensor.beispiel_waermepumpe_verdampfer_temperatur"
      },
      "heizkreis": {
        "heizanforderung": "sensor.beispiel_heizkreis_heizanforderung",
        "mischer": "sensor.beispiel_heizkreis_mischer",
        "pumpe": "binary_sensor.beispiel_heizkreis_pumpe",
        "vorlauf": "sensor.beispiel_heizkreis_vorlauf",
        "ruecklauf": "sensor.beispiel_heizkreis_ruecklauf",
        "vorlauf_soll": "sensor.beispiel_heizkreis_vorlauf_soll",
        "betriebsart": "select.beispiel_heizkreis_betriebsart",
        "raumkorrektur": "number.beispiel_heizkreis_raumkorrektur",
        "raumtemperatur_ist": "sensor.beispiel_heizkreis_raumtemperatur_ist",
        "raumtemperatur_soll": "sensor.beispiel_heizkreis_raumtemperatur_soll",
        "raumfeuchtigkeit": "sensor.beispiel_heizkreis_raumfeuchtigkeit"
      },
      "energie": {
        "gesamtverbrauch": "sensor.beispiel_energie_gesamtverbrauch",
        "stromtarif": "input_number.beispiel_energie_stromtarif",
        "tag": "sensor.beispiel_energie_tag",
        "woche": "sensor.beispiel_energie_woche",
        "monat": "sensor.beispiel_energie_monat",
        "jahr": "sensor.beispiel_energie_jahr",
        "pv_ueberschuss": "sensor.beispiel_energie_pv_ueberschuss"
      },
      "temperatur": {
        "haus_mittelwert": "sensor.beispiel_temperatur_haus_mittelwert",
        "aussen": "sensor.beispiel_temperatur_aussen"
      },
      "thermostate": {
        "ferienmodus": "input_boolean.beispiel_thermostate_ferienmodus",
        "bad": "climate.beispiel_thermostate_bad",
        "buero": "climate.beispiel_thermostate_buero",
        "dusche": "climate.beispiel_thermostate_dusche",
        "gaestezimmer": "climate.beispiel_thermostate_gaestezimmer",
        "kueche": "climate.beispiel_thermostate_kueche",
        "schlafzimmer": "climate.beispiel_thermostate_schlafzimmer",
        "terrassenzimmer": "climate.beispiel_thermostate_terrassenzimmer",
        "toilette": "climate.beispiel_thermostate_toilette",
        "ess_wohnzimmer": "climate.beispiel_thermostate_ess_wohnzimmer",
        "sauna": "climate.beispiel_thermostate_sauna"
      },
      "geraete": {
        "buero_klimaanlage": "climate.beispiel_geraete_buero_klimaanlage",
        "wintergarten_heizung": "climate.beispiel_geraete_wintergarten_heizung",
        "wintergarten_lueftung": "climate.beispiel_geraete_wintergarten_lueftung",
        "garage_entfeuchter": "humidifier.beispiel_geraete_garage_entfeuchter",
        "sauna_heizung": "climate.beispiel_geraete_sauna_heizung"
      }
    }
  },
  "entity": "[[[ return variables.entitaeten.waermepumpe.zustand; ]]]",
  "triggers_update": [
    "[[[ return variables.entitaeten.waermepumpe.quelleneingang; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.quellenausgang; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.vorlauf; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.ruecklauf; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.verdichter_eintritt; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.verdichter_austritt; ]]]",
    "[[[ return variables.entitaeten.energie.gesamtverbrauch; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.betriebsstunden; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.verdichter_leistung; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.zustand; ]]]",
    "[[[ return variables.entitaeten.heizkreis.heizanforderung; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.zustand; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.stoerungen; ]]]",
    "[[[ return variables.entitaeten.heizkreis.heizanforderung; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.heizanforderung; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.nutzt_pv_ueberschuss; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.verdichter; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.verdichter; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.umwaelzpumpe; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.quellenpumpe_drehzahl; ]]]",
    "[[[ return variables.entitaeten.energie.stromtarif; ]]]",
    "[[[ return variables.entitaeten.energie.tag; ]]]",
    "[[[ return variables.entitaeten.energie.woche; ]]]",
    "[[[ return variables.entitaeten.energie.monat; ]]]",
    "[[[ return variables.entitaeten.energie.jahr; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.unterstatus; ]]]",
    "[[[ return variables.entitaeten.temperatur.haus_mittelwert; ]]]",
    "[[[ return variables.entitaeten.temperatur.aussen; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.betriebsart; ]]]",
    "[[[ return variables.entitaeten.heizkreis.mischer; ]]]",
    "[[[ return variables.entitaeten.heizkreis.pumpe; ]]]",
    "[[[ return variables.entitaeten.heizkreis.vorlauf; ]]]",
    "[[[ return variables.entitaeten.heizkreis.ruecklauf; ]]]",
    "[[[ return variables.entitaeten.heizkreis.vorlauf_soll; ]]]",
    "[[[ return variables.entitaeten.energie.pv_ueberschuss; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.hochdruck; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.niederdruck; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.ueberhitzung_ist; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.ueberhitzung_soll; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.expansionsventil; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.kondensator_temperatur; ]]]",
    "[[[ return variables.entitaeten.waermepumpe.verdampfer_temperatur; ]]]"
  ],
  "show_icon": false,
  "show_name": false,
  "show_state": false,
  "custom_fields": {
    "dashboard": [
      "[[[",
      "const ids = variables.entitaeten;",
      "const themedSvg = (()=>{",
      "",
      "const base = (function dashboard(states) {",
      "",
      "  const raw=id=>states[id]?.state;",
      "  const valid=v=>v!=null&&!['','unknown','unavailable','none'].includes(String(v).trim());",
      "  const num=(id,attr)=>{",
      "    const v=attr ? states[id]?.attributes?.[attr] : raw(id);",
      "    return valid(v) ? parseFloat(String(v).replace(',','.')) : NaN;",
      "  };",
      "  const fmt=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('de-CH',{minimumFractionDigits:d,maximumFractionDigits:d}).replace('.',','):'—';",
      "  const stateLabels={[ids.waermepumpe.zustand]:{\"auto_cool\":\"Kühlen\",\"auto_heat\":\"Heizen\",\"defrost\":\"Abtauen\",\"error\":\"Fehler\",\"flow\":\"Vorlauf\",\"inflow\":\"Nachlauf\",\"pump_down\":\"Pump-Down-Vorgang\",\"shutdown\":\"Herunterfahren\",\"source_flush\":\"Quellenspülung\",\"standby\":\"Standby\"},[ids.waermepumpe.unterstatus]:{\"bivalent_lock\":\"Bivalente Sperre\",\"compressor_delay\":\"Kompressorverzögerung\",\"compressor_post_run\":\"Kompressornachlauf\",\"compressor_stop\":\"Kompressorstopp\",\"counterflow_valve\":\"Gegenstromventil\",\"defrost\":\"Abtauen\",\"defrost_end\":\"Abtauende\",\"defrost_initialization\":\"Abtauinitialisierung\",\"defrost_monitoring\":\"Abtauüberwachung\",\"defrost_pre_flow\":\"Abtauvorlauf\",\"defrost_venting\":\"Abtaulüfter\",\"drip\":\"Abtropfen\",\"electric_defrost\":\"Elektrisches Abtauen\",\"flushing\":\"Spülen\",\"locked\":\"Gesperrt\",\"lubrication_pulse\":\"Schmierimpuls\",\"mixer_open\":\"Mischer offen\",\"none\":\"-\",\"oil_preheating\":\"Ölvorwärmung\",\"open\":\"Öffnen\",\"preheat_flow\":\"Vorlauf Aufheizen\",\"pressure_equalization\":\"Druckausgleich\",\"pump_post_run\":\"Pumpennachlauf\",\"pump_pre_run\":\"Pumpenvorlauf\",\"random_delay\":\"Zufallsverzögerung\",\"reduced_speed\":\"Reduzierte Geschwindigkeit\",\"return_flow_off\":\"Rücklauf aus\",\"snow_detection\":\"Schneeerkennung\",\"switch_heating_cooling\":\"Umschalten Heizen/Kühlen\",\"wait_for_compressor\":\"Warten auf Kompressor\",\"zone_valve\":\"Zonenventil\"},[ids.heizkreis.heizanforderung]:{\"flow_off\":\"Aus (Rücklauftemperatur)\",\"inflow_off\":\"Aus (Vorlauftemperatur)\",\"off\":\"Aus\",\"on\":\"Ein\",\"outdoor_off\":\"Aus (Außentemperatur)\",\"room_off\":\"Aus (Raumtemperatur)\",\"temporary_off\":\"Aus (Vorrang)\"},[ids.waermepumpe.betriebsart]:{\"auto\":\"Automatik\",\"auto_cool\":\"Kühlen\",\"auto_heat\":\"Heizen\",\"setup\":\"Einrichtung\",\"standby\":\"Standby\",\"summer\":\"nur Warmwasser\"}};",
      "      const textState=id=>raw(id)==='none'&&stateLabels[id]?.none?stateLabels[id].none:valid(raw(id))?(stateLabels[id]?.[String(raw(id))]||String(raw(id))):'Nicht verfügbar';",
      "  const esc=v=>String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&apos;'}[c]));",
      "  const short=(v,n)=>String(v).length>n?String(v).slice(0,n-1)+'…':String(v);",
      "  const t=(x,y,v,size=16,color='#243C4A',weight=400,anchor='start')=>`<text x=\"${x}\" y=\"${y}\" font-size=\"${size <= 14 ? size + 1.5 : size <= 16 ? size + 1 : size}\" fill=\"${color}\" font-weight=\"${weight}\" text-anchor=\"${anchor}\">${esc(v)}</text>`;",
      "  const rect=(x,y,w,h,fill='#FFFFFF',stroke='#DCE5EB',r=18)=>`<rect x=\"${x}\" y=\"${y}\" width=\"${w}\" height=\"${h}\" rx=\"${r}\" fill=\"${fill}\" stroke=\"${stroke}\"/>`;",
      "  const temp=id=>fmt(num(id))+' °C';",
      "  const unit=(id,fallback,d)=>valid(raw(id)) ? (Number.isInteger(d) ? (Number.isFinite(num(id)) ? num(id).toFixed(d) : '—') : String(raw(id)))+' '+(states[id]?.attributes?.unit_of_measurement||fallback) : '—';",
      "  const gauge=(cx,id,title,color,sub)=>{",
      "    const n=num(id), v=Number.isFinite(n)?Math.max(0,Math.min(100,n)):0, c=2*Math.PI*49;",
      "    return `<circle cx=\"${cx}\" cy=\"273\" r=\"49\" fill=\"none\" stroke=\"#EAF0F4\" stroke-width=\"10\"/>",
      "      <circle cx=\"${cx}\" cy=\"273\" r=\"49\" fill=\"none\" stroke=\"${color}\" stroke-width=\"10\" stroke-dasharray=\"${v*c/100} ${c}\" transform=\"rotate(-90 ${cx} 273)\"/>`",
      "      +t(cx,279,Number.isFinite(n)?fmt(n,0)+' %':'—',27,'#243C4A',700,'middle')",
      "      +t(cx,343,title,15,'#526978',600,'middle')+t(cx,365,sub||'Drehzahl / Ansteuerung',11,'#83939F',400,'middle');",
      "  };",
      "  const readingLayout=variables.reading_layout;",
      "  const panel=(x,width,title)=>rect(x,readingLayout.top,width,readingLayout.height,'#F7FAFC')",
      "    +t(x+12,417,title,12,'#526978',700);",
      "  const pair=({ x, width, rowTop, rowHeight },title,label1,id1,label2,id2)=>{",
      "    const reading=(label,id,row)=>{",
      "      const y=rowTop+rowHeight*row;",
      "      return t(x+12,y+12,label,11,'#526978')+t(x+width-12,y+32,temp(id),17,'#243C4A',600,'end');",
      "    };",
      "    return panel(x,width,title)+reading(label1,id1,0)+reading(label2,id2,1)",
      "      +t(x+12,516,'Δ '+fmt(num(id1)-num(id2))+' K',11,'#6F8493');",
      "  };",
      "  const alarm=raw(ids.waermepumpe.stoerungen);",
      "  const ok=valid(alarm) && Number(alarm)===0;",
      "  const unknown=!valid(alarm)||!Number.isFinite(Number(alarm));",
      "  const alarmColor=unknown?'#748696':ok?'#188E65':'#C23B4F';",
      "  const alarmDetails=(states[ids.waermepumpe.stoerungen]?.attributes?.alarms||[]).map(a=>[a.number,a.text].filter(Boolean).join(': ')).join(' · ');",
      "      const alarmText=unknown?'Alarmstatus unbekannt':ok?'Keine Störung':alarm+' aktive Meldung(en)'+(alarmDetails?': '+alarmDetails:'');",
      "  const req=raw(ids.waermepumpe.heizanforderung);",
      "  const solar=raw(ids.waermepumpe.nutzt_pv_ueberschuss);",
      "  const mode=solar==='on'?'PV-Überschuss aktiv':req==='on'?'Wärmeanforderung aktiv':req==='off'?'Keine Wärmeanforderung':'Betrieb nicht verfügbar';",
      "      const systemMode=raw(ids.waermepumpe.betriebsart);",
      "      const summer=systemMode==='summer';",
      "      const winter=systemMode==='auto_heat';",
      "      let out=`<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1080\" style=\"display:block;width:100%;height:auto\" role=\"img\" aria-label=\"Wärmepumpe Übersicht\">",
      "    <rect width=\"1000\" height=\"1080\" rx=\"25\" fill=\"#EFF4F7\"/>",
      "    <g font-family=\"Arial, sans-serif\">`;",
      "  out+=t(26,39,'WÄRMEPUMPE',25,'#243C4A',700)+t(26,60,'Anlage · Temperaturen · Energie',12,'#738897');",
      "  out+=t(971,32,'AUSSEN  '+temp(ids.temperatur.aussen),18,'#52768C',600,'end')+t(971,56,'HAUS  '+temp(ids.temperatur.haus_mittelwert),18,'#52768C',600,'end');",
      "  out+=rect(24,80,312,66)+t(42,101,'WÄRMEPUMPE',10,'#7A8C99',700)+t(42,128,short(textState(ids.waermepumpe.zustand),24),20,'#243C4A',600);",
      "  out+=rect(348,80,328,66,ok?'#EAF7F0':unknown?'#F7FAFC':'#FFF0F1')+`<title>${esc(alarmText)}</title>`;",
      "  out+=t(366,101,'ANLAGENSTATUS',10,alarmColor,700)+t(366,126,ok?'✓ Keine Störung':unknown?'Status unbekannt':'! '+alarm+' Meldung(en)',19,alarmColor,600);",
      "",
      "      out+=rect(710,80,266,66)+t(728,98,'HEIZKREIS',10,'#7A8C99',700);",
      "      const heatingState = textState(ids.heizkreis.heizanforderung);",
      "      // Show the sensor's own state/reason without inventing code meanings.",
      "      const reasonLine = (value,y,size) => {",
      "        let line=t(728,y,value,size,'#243C4A',600);",
      "        if(value.length*size*0.56>194) line=line.replace('<text ', '<text textLength=\"194\" lengthAdjust=\"spacingAndGlyphs\" ');",
      "        return line;",
      "      };",
      "      if(heatingState.length<=20){",
      "        out+=reasonLine(heatingState,128,20);",
      "      }else{",
      "        const spaces=[...heatingState.matchAll(/\\s+/g)].map(match=>match.index);",
      "        const split=spaces.length?spaces.reduce((best,pos)=>Math.abs(pos-heatingState.length/2)<Math.abs(best-heatingState.length/2)?pos:best):Math.ceil(heatingState.length/2);",
      "        out+=reasonLine(heatingState.slice(0,split).trim(),116,14);",
      "        out+=reasonLine(heatingState.slice(split).trim(),134,14);",
      "      }",
      "",
      "      if (summer) {",
      "        out += '<g transform=\"translate(945 113)\" fill=\"none\" stroke=\"#E9A23B\" stroke-width=\"2.2\" stroke-linecap=\"round\" aria-label=\"Sommermodus\"><circle r=\"6\" fill=\"#E9A23B\"/>';",
      "        for (let angle=0;angle<360;angle+=45) out += '<path d=\"M0 -11 V-15\" transform=\"rotate('+angle+')\"/>';",
      "        out += '</g>';",
      "      } else if (winter) {",
      "        out += '<g transform=\"translate(945 113)\" fill=\"none\" stroke=\"#369DCB\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-label=\"Wintermodus\">';",
      "        for (let angle=0;angle<360;angle+=60) out += '<path d=\"M0 0 V-15 M-4 -11 L0 -7 L4 -11\" transform=\"rotate('+angle+')\"/>';",
      "        out += '</g>';",
      "      }",
      "",
      "  out+=rect(24,164,652,516)+t(44,194,'ANTRIEBE & TEMPERATUREN',13,'#526978',700);",
      "  out+=gauge(140,ids.waermepumpe.quellenpumpe_drehzahl,'Quellenpumpe','#299BC1');",
      "  out+=gauge(350,ids.waermepumpe.verdichter,'Verdichter','#1C9A81','Relative Drehzahl in %');",
      "  out+=gauge(560,ids.waermepumpe.umwaelzpumpe,'Heizungspumpe','#D88359');",
      "  out+=pair(readingLayout.source,'QUELLKREIS','Eintritt',ids.waermepumpe.quelleneingang,'Austritt',ids.waermepumpe.quellenausgang);",
      "",
      "      const verdichterRows=[",
      "        [['Ein',fmt(num(ids.waermepumpe.verdichter_eintritt))+' °C'],['Aus',fmt(num(ids.waermepumpe.verdichter_austritt))+' °C']],",
      "        [['HD',fmt(num(ids.waermepumpe.hochdruck),2)+' bar'],['ND',fmt(num(ids.waermepumpe.niederdruck),2)+' bar']],",
      "        [['Ist-ÜH',fmt(num(ids.waermepumpe.ueberhitzung_ist))+' K'],['Soll-ÜH',fmt(num(ids.waermepumpe.ueberhitzung_soll))+' K']],",
      "        [['Ventil',fmt(num(ids.waermepumpe.expansionsventil),0)],['Kond.',fmt(num(ids.waermepumpe.kondensator_temperatur))+' °C']],",
      "        [['Verd.',fmt(num(ids.waermepumpe.verdampfer_temperatur))+' °C'],null]",
      "      ];",
      "      const { x, width, rowTop, rowHeight, columns }=readingLayout.compressor;",
      "      const columnWidth=width/columns;",
      "      const dividerX=x+columnWidth;",
      "      const dividers=[`M${dividerX} ${rowTop} V${rowTop+rowHeight*verdichterRows.length}`];",
      "      out+=panel(x,width,'VERDICHTER');",
      "      verdichterRows.forEach((row,i)=>{",
      "        const top=rowTop+i*rowHeight;",
      "        if(i>0) dividers.push(`M${x+12} ${top} H${x+width-12}`);",
      "        row.forEach((entry,column)=>{",
      "          if(!entry) return;",
      "          const [label,value]=entry;",
      "          const left=x+columnWidth*column;",
      "          out+=t(left+12,top+15,label,12,'#526978',600)",
      "            +t(left+columnWidth-12,top+15,value,17.5,'#243C4A',700,'end');",
      "        });",
      "      });",
      "      out+=`<path d=\"${dividers.join(' ')}\" stroke=\"#DCE5EB\" stroke-width=\"1\"/>`;",
      "  out+=pair(readingLayout.heatPump,'WÄRMEPUMPE','Vorlauf',ids.waermepumpe.vorlauf,'Rücklauf',ids.waermepumpe.ruecklauf);",
      "  out+=rect(44,543,612,43,'#F0F6FA','#E4ECF1',12)+t(59,569,mode,16,'#426E86',600);",
      "  out+=t(44,613,'ANLAGENBETRIEB',10,'#83939F',700)+t(44,636,short(textState(ids.waermepumpe.betriebsart),39),17,'#243C4A',600);",
      "      const surplusId=ids.energie.pv_ueberschuss;",
      "      const surplusRaw=raw(surplusId);",
      "      const surplusValue=valid(surplusRaw)?String(surplusRaw).trim():'—';",
      "      const surplusUnit=states[surplusId]?.attributes?.unit_of_measurement || '';",
      "      const surplusText=valid(surplusRaw)?(surplusValue+' '+surplusUnit).trim():'—';",
      "      out+=t(656,613,'ÜBERSCHUSS',10,'#83939F',700,'end')+t(656,636,short(surplusText,24),17,'#243C4A',600,'end');",
      "  out+=t(44,660,'Unterstatus: '+short(textState(ids.waermepumpe.unterstatus),48),11,'#738897');",
      "  if(raw(ids.waermepumpe.zustand)==='auto_heat')out+=t(503,568,'Heizbetrieb',12,'#CB723A',600,'end');",
      "",
      "",
      "  out+=rect(24,700,464,212)+t(44,728,'ENERGIE & KOSTEN',13,'#526978',700);",
      "  out+=t(310,750,'kWh',10,'#83939F',600,'end')+t(463,750,'CHF',10,'#83939F',600,'end');",
      "  const tariff=num(ids.energie.stromtarif);",
      "  const rows=[['Heute','tag'],['Gestern','tag','last_period'],['Woche','woche'],['Vorwoche','woche','last_period'],['Monat','monat'],['Vormonat','monat','last_period'],['Jahr','jahr'],['Vorjahr','jahr','last_period']];",
      "  rows.forEach(([name,key,attr],i)=>{",
      "    const energyId=ids.energie[key], u=states[energyId]?.attributes?.unit_of_measurement, energyFactor=({kWh:1,Wh:0.001,MWh:1000,J:1/3600000,kJ:1/3600,MJ:1/3.6})[u];",
      "    const n=num(energyId,attr)*(energyFactor??(u?NaN:1)),y=772+i*17;",
      "    if(i%2===0)out+=rect(36,y-15,440,17,'#F5F8FA','none',4);",
      "    out+=t(44,y,name,13,'#627987')+t(310,y,fmt(n),13,'#243C4A',600,'end')+t(463,y,fmt(n*tariff,2),13,'#243C4A',600,'end');",
      "  });",
      "  const metric=(x,y,title,value,caption)=>rect(x,y,224,97)+t(x+16,y+25,title,11,'#738897',700)+t(x+16,y+58,short(value,19),22,'#243C4A',700)+t(x+16,y+80,caption,10,'#83939F');",
      "  out+=metric(512,700,'AKTUELLE LEISTUNG',unit(ids.waermepumpe.verdichter_leistung,'W',0),'Elektrische Leistungsaufnahme');",
      "  out+=metric(752,700,'GESAMTVERBRAUCH',unit(ids.energie.gesamtverbrauch,'kWh',2),'Kumulierte elektrische Energie');",
      "  out+=metric(512,815,'BETRIEBSSTUNDEN',unit(ids.waermepumpe.betriebsstunden,'h',0),'Gesamte Laufzeit');",
      "  out+=metric(752,815,'ZUSTAND SEIT',(valid(raw(ids.waermepumpe.zustand))&&states[ids.waermepumpe.zustand]?.last_changed?fmt(Math.max(0,(Date.now()-new Date(states[ids.waermepumpe.zustand].last_changed).getTime())/60000),0)+' min':'—'),'Seit Statuswechsel in HA');",
      "  out+=rect(24,935,952,120)+t(44,958,'BEDIENUNG & AUSWERTUNG',13,'#526978',700);",
      "  const labels=[['Einstellungen','Wärmepumpe'],['Temperaturen','Haus'],['Klimaanlage','Büro'],['Heizung','Wintergarten'],['Lüftung','Wintergarten'],['Entfeuchter','Garage'],['Heizung','Sauna']];",
      "  labels.forEach(([a,b],i)=>{const x=93+i*136;out+=t(x,1034,a,12,'#526978',600,'middle')+t(x,1050,b,11,'#83939F',400,'middle');});",
      "  return out+'</g></svg>';",
      "})(states);",
      "const heating = ((entity) => {",
      "",
      "",
      "const num = id => {",
      "  const raw = states[id]?.state;",
      "  if (raw == null || String(raw).trim() === '') return NaN;",
      "  return Number(String(raw).replace(',', '.'));",
      "};",
      "const fmt = v => Number.isFinite(v) ? v.toFixed(1).replace('.', ',') : '—';",
      "const vl = num(ids.heizkreis.vorlauf);",
      "const rl = num(ids.heizkreis.ruecklauf);",
      "const target = num(ids.heizkreis.vorlauf_soll);",
      "const active = states[ids.heizkreis.pumpe]?.state === 'on';",
      "const pumpState = states[ids.heizkreis.pumpe]?.state;",
      "const label = pumpState === 'on' ? 'Pumpe aktiv' : pumpState === 'off' ? 'Pumpe aus' : 'Pumpe —';",
      "const anchors = [",
      "    { temperature: 25, color: [  0,  70, 200] },",
      "    { temperature: 26, color: [  0,  81, 202] },",
      "    { temperature: 27, color: [  0, 108, 207] },",
      "    { temperature: 28, color: [  0, 142, 213] },",
      "    { temperature: 29, color: [  0, 169, 218] },",
      "    { temperature: 30, color: [  0, 180, 220] },",
      "    { temperature: 31, color: [  0, 180, 207] },",
      "    { temperature: 32, color: [  0, 180, 172] },",
      "    { temperature: 33, color: [  0, 180, 128] },",
      "    { temperature: 34, color: [  0, 180,  93] },",
      "    { temperature: 35, color: [  0, 180,  80] },",
      "    { temperature: 36, color: [ 14, 183,  72] },",
      "    { temperature: 37, color: [ 52, 190,  52] },",
      "    { temperature: 38, color: [ 98, 200,  28] },",
      "    { temperature: 39, color: [136, 207,   8] },",
      "    { temperature: 40, color: [150, 210,   0] },",
      "    { temperature: 41, color: [166, 212,   0] },",
      "    { temperature: 42, color: [202, 216,   0] },",
      "    { temperature: 43, color: [236, 219,   0] },",
      "    { temperature: 44, color: [245, 219,   0] },",
      "    { temperature: 45, color: [248, 189,   0] },",
      "    { temperature: 46, color: [253, 146,   0] },",
      "    { temperature: 47, color: [255, 125,   0] },",
      "    { temperature: 48, color: [252, 105,   3] },",
      "    { temperature: 49, color: [248,  85,   7] },",
      "    { temperature: 50, color: [244,  65,  10] },",
      "    { temperature: 51, color: [241,  50,  13] },",
      "    { temperature: 52, color: [238,  40,  16] },",
      "    { temperature: 53, color: [236,  32,  18] },",
      "    { temperature: 54, color: [234,  26,  19] },",
      "    { temperature: 55, color: [232,  20,  20] }",
      "  ];",
      "const color = t => {",
      "  if (!Number.isFinite(t)) return '#929CA5';",
      "  t = Math.max(25, Math.min(55, t));",
      "  const i = Math.min(anchors.length - 2, Math.floor(t - 25));",
      "  const a = anchors[i], b = anchors[i+1], f = t-a.temperature;",
      "  return 'rgb(' + a.color.map((v,j) => Math.round(v+(b.color[j]-v)*f)).join(',') + ')';",
      "};",
      "let pumpSvg = (() => {",
      "  const pumpSize = \"clamp(35px, 5.0vmin, 75px)\";",
      "  const active = states[ids.heizkreis.pumpe]?.state === 'on';",
      "  const rotorColor = active ? '#00C853' : '#666666';",
      "  const animation = active ? 'pump-spin 1.4s linear infinite' : 'none';",
      "",
      "  const raw = entity?.state;",
      "  const position = entity?.attributes?.position_percent;",
      "    const s = position != null && Number.isFinite(Number(position)) ? Number(position) : raw === 'open' ? 1 : raw === 'closed' ? -1 : raw === 'off' ? 0 : raw == null || raw === '' ? NaN : Number(raw);",
      "",
      "  let mixerColor = '#A0A7AE';",
      "      let mixerSymbol = `<rect x=\"27\" y=\"82\" width=\"3.5\" height=\"12\" rx=\"1\"/><rect x=\"33.5\" y=\"82\" width=\"3.5\" height=\"12\" rx=\"1\"/>`;",
      "      const clockwiseArrow = `<path d=\"M26 94 A9 9 0 1 1 41 88\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M37 85 L41 92 L45 85 Z\" fill=\"currentColor\"/>`;",
      "      if (!Number.isFinite(s)) {",
      "        mixerSymbol = '<rect x=\"26\" y=\"86.5\" width=\"12\" height=\"3\" rx=\"1\"/>';",
      "      } else if (s > 0) {",
      "        mixerColor = '#FF4D4D';",
      "        mixerSymbol = `<g style=\"color:${mixerColor};\">${clockwiseArrow}</g>`;",
      "      } else if (s < 0) {",
      "        mixerColor = '#00BFFF';",
      "        mixerSymbol = `<g transform=\"translate(64 0) scale(-1 1)\" style=\"color:${mixerColor};\">${clockwiseArrow}</g>`;",
      "      }",
      "",
      "return `",
      "    <svg",
      "      xmlns=\"http://www.w3.org/2000/svg\"",
      "      viewBox=\"0 0 64 112\"",
      "      aria-hidden=\"true\"",
      "      style=\"width:${pumpSize};height:auto;display:block;overflow:visible;\"",
      "    >",
      "      <!-- Rohr zwischen Pumpe und Mischer -->",
      "      <path",
      "        d=\"M32 53 V73\"",
      "        fill=\"none\"",
      "        stroke=\"#555D65\"",
      "        stroke-width=\"12\"",
      "      />",
      "      <path",
      "        d=\"M32 53 V73\"",
      "        fill=\"none\"",
      "        stroke=\"#A0A8B0\"",
      "        stroke-width=\"8\"",
      "      />",
      "      <path",
      "        d=\"M29.5 55 V71\"",
      "        fill=\"none\"",
      "        stroke=\"#D0D5DA\"",
      "        stroke-width=\"1.5\"",
      "      />",
      "      <rect",
      "        x=\"24\" y=\"60\" width=\"16\" height=\"6\" rx=\"1.5\"",
      "        fill=\"#858D95\"",
      "        stroke=\"#555D65\"",
      "        stroke-width=\"1\"",
      "      />",
      "",
      "      <!-- Pumpenanschluss -->",
      "      <path",
      "        d=\"M26 4 H38 V15 H26 Z\"",
      "        fill=\"#969EA6\"",
      "        stroke=\"#555D65\"",
      "        stroke-width=\"1.5\"",
      "        stroke-linejoin=\"round\"",
      "      />",
      "      <rect",
      "        x=\"23\" y=\"1\" width=\"18\" height=\"5\" rx=\"1.5\"",
      "        fill=\"#B2B8BE\"",
      "        stroke=\"#555D65\"",
      "        stroke-width=\"1.5\"",
      "      />",
      "",
      "      <!-- Pumpengehäuse -->",
      "      <circle",
      "        cx=\"32\" cy=\"32\" r=\"24\"",
      "        fill=\"#9199A1\"",
      "        stroke=\"#555D65\"",
      "        stroke-width=\"2\"",
      "      />",
      "      <circle",
      "        cx=\"32\" cy=\"32\" r=\"21.5\"",
      "        fill=\"none\"",
      "        stroke=\"#BCC2C8\"",
      "        stroke-width=\"1\"",
      "      />",
      "      <path",
      "        d=\"M11 31 A21 21 0 0 1 32 11\"",
      "        fill=\"none\"",
      "        stroke=\"#E0E4E8\"",
      "        stroke-width=\"2\"",
      "        stroke-linecap=\"round\"",
      "      />",
      "      <circle",
      "        cx=\"32\" cy=\"32\" r=\"18\"",
      "        fill=\"#282E34\"",
      "        stroke=\"#59626B\"",
      "        stroke-width=\"2\"",
      "      />",
      "",
      "      <!-- Schrauben -->",
      "      <g fill=\"#D0D5DA\" stroke=\"#555D65\" stroke-width=\"0.8\">",
      "        <circle cx=\"17\" cy=\"17\" r=\"2\"/>",
      "        <circle cx=\"47\" cy=\"17\" r=\"2\"/>",
      "        <circle cx=\"17\" cy=\"47\" r=\"2\"/>",
      "        <circle cx=\"47\" cy=\"47\" r=\"2\"/>",
      "      </g>",
      "      <path",
      "        d=\"M16 17 H18 M46 17 H48 M16 47 H18 M46 47 H48\"",
      "        fill=\"none\"",
      "        stroke=\"#626A72\"",
      "        stroke-width=\"1\"",
      "      />",
      "",
      "      <!-- Nur der Rotor dreht sich -->",
      "      <g",
      "        class=\"pump-rotor\"",
      "        fill=\"${rotorColor}\"",
      "        style=\"animation:${animation};\"",
      "      >",
      "        <path d=\"M30 29 C20 25 20 16 28 15 C35 14 39 20 34 29 Z\"/>",
      "        <path",
      "          d=\"M30 29 C20 25 20 16 28 15 C35 14 39 20 34 29 Z\"",
      "          transform=\"rotate(120 32 32)\"",
      "        />",
      "        <path",
      "          d=\"M30 29 C20 25 20 16 28 15 C35 14 39 20 34 29 Z\"",
      "          transform=\"rotate(240 32 32)\"",
      "        />",
      "        <circle cx=\"32\" cy=\"32\" r=\"5\"/>",
      "        <circle cx=\"32\" cy=\"32\" r=\"2\" fill=\"#D5D9DD\"/>",
      "      </g>",
      "",
      "      <!-- Mischeranschlüsse: oben zur Pumpe, unten Vorlauf, rechts Rücklauf -->",
      "   <path d=\"M32 100 V112\" fill=\"none\" stroke=\"#555D65\" stroke-width=\"12\"/>",
      "   <path d=\"M32 100 V112\" fill=\"none\" stroke=\"#FF7070\" stroke-width=\"8\"/>",
      "   <path d=\"M44 88 H60\" fill=\"none\" stroke=\"#555D65\" stroke-width=\"12\"/>",
      "   <path d=\"M44 88 H60\" fill=\"none\" stroke=\"#48BFE8\" stroke-width=\"8\"/>",
      "   <g fill=\"#A4ACB4\" stroke=\"#555D65\" stroke-width=\"1\">",
      "     <rect x=\"24\" y=\"107\" width=\"16\" height=\"5\" rx=\"1\"/>",
      "     <rect x=\"56\" y=\"80\" width=\"5\" height=\"16\" rx=\"1\"/>",
      "   </g>",
      "   <!-- Mischergehäuse -->",
      "      <circle",
      "        cx=\"32\" cy=\"88\" r=\"19\"",
      "        fill=\"#9199A1\"",
      "        stroke=\"#555D65\"",
      "        stroke-width=\"2\"",
      "      />",
      "      <circle",
      "        cx=\"32\" cy=\"88\" r=\"16.5\"",
      "        fill=\"none\"",
      "        stroke=\"#BCC2C8\"",
      "        stroke-width=\"1\"",
      "      />",
      "      <circle",
      "        cx=\"32\" cy=\"88\" r=\"14\"",
      "        fill=\"#282E34\"",
      "        stroke=\"#59626B\"",
      "        stroke-width=\"1.5\"",
      "      />",
      "",
      "      <!-- Bewegungsanzeige des Mischers -->",
      "      <g fill=\"${mixerColor}\">",
      "        ${mixerSymbol}",
      "      </g>",
      "    </svg>",
      "  `;",
      " })();",
      "pumpSvg = pumpSvg.replace(/style=\"width:[^\"]*\"/, 'x=\"30\" y=\"200\" width=\"80\" height=\"140\"');",
      "const fins = Array.from({length:10}, (_,i) => {",
      "  const t = Number.isFinite(vl) && Number.isFinite(rl) ? vl+(rl-vl)*i/9 : Number.isFinite(vl) ? vl : rl;",
      "  return '<rect x=\"'+(39+i*12.5)+'\" y=\"35\" width=\"11\" height=\"48\" rx=\"4\" fill=\"'+color(t)+'\" stroke=\"#355B65\" stroke-width=\"0.7\"/><path d=\"M'+(42+i*12.5)+' 40 V77\" stroke=\"white\" opacity=\"0.3\" stroke-width=\"1.5\"/>';",
      "}).join('');",
      "return `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 400\" style=\"display:block;width:100%;height:auto\" role=\"img\" aria-label=\"Heizkreis mit Pumpe und Mischer\">",
      "  <rect x=\"2\" y=\"2\" width=\"196\" height=\"396\" rx=\"20\" fill=\"#F7FAFC\" fill-opacity=\"0.95\" stroke=\"#DCE4EB\"/>",
      "  <g font-family=\"Arial, sans-serif\" text-anchor=\"middle\">",
      "    <text x=\"100\" y=\"21\" font-size=\"11\" font-weight=\"700\" fill=\"#526574\" letter-spacing=\"1.4\">HEIZKREIS</text>",
      "    <g transform=\"translate(-7.5 0)\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\">",
      "      <path d=\"M70 377 V90\" stroke=\"#F4C5C9\" stroke-width=\"9\"/>",
      "      <path d=\"M145 90 V377\" stroke=\"#BCDDEF\" stroke-width=\"9\"/>",
      "      <path d=\"M70 377 V90\" stroke=\"#DF626C\" stroke-width=\"3\"/>",
      "      <path d=\"M145 90 V377\" stroke=\"#369DCB\" stroke-width=\"3\"/>",
      "      <path d=\"M145 310 H105\" stroke=\"#369DCB\" stroke-width=\"6\"/>",
      "    </g>",
      "    <rect x=\"34\" y=\"30\" width=\"134\" height=\"59\" rx=\"7\" fill=\"#74858D\" stroke=\"#465D68\" stroke-width=\"1.5\"/>",
      "    ${fins}",
      "    <path d=\"M40 33 H162 M40 86 H162\" stroke=\"#D1E1E3\" stroke-width=\"2\"/>",
      "    <rect x=\"63\" y=\"43.5\" width=\"75\" height=\"31\" rx=\"6\" fill=\"#FFFFFF\" fill-opacity=\"0.5\"/>",
      "    <text x=\"100\" y=\"56\" font-size=\"8.5\" fill=\"#526574\">VORLAUF SOLL</text>",
      "    <text x=\"100\" y=\"70\" font-size=\"13\" font-weight=\"700\" fill=\"#243743\">${fmt(target)} °C</text>",
      "    <rect x=\"13\" y=\"110\" width=\"83\" height=\"44\" rx=\"9\" fill=\"#FFFFFF\" stroke=\"#E7DADD\"/>",
      "    <rect x=\"104\" y=\"110\" width=\"83\" height=\"44\" rx=\"9\" fill=\"#FFFFFF\" stroke=\"#D6E5EF\"/>",
      "    <text x=\"54.5\" y=\"125\" font-size=\"10\" fill=\"#A23F4A\">VORLAUF</text>",
      "    <text x=\"145.5\" y=\"125\" font-size=\"10\" fill=\"#28749A\">RÜCKLAUF</text>",
      "    <text x=\"54.5\" y=\"143\" font-size=\"15\" font-weight=\"700\" fill=\"#283B48\">${fmt(vl)} °C</text>",
      "    <text x=\"145.5\" y=\"143\" font-size=\"15\" font-weight=\"700\" fill=\"#283B48\">${fmt(rl)} °C</text>",
      "    <rect x=\"79\" y=\"165\" width=\"43\" height=\"22\" rx=\"11\" fill=\"#FFFFFF\" stroke=\"#DCE4EB\"/>",
      "    <text x=\"100\" y=\"180\" font-size=\"11\" fill=\"#526574\">Δ ${fmt(vl-rl)} K</text>",
      "    <g transform=\"translate(-7.5 0)\">",
      "    <g fill=\"#DF626C\"><path d=\"M70 96 l-5 7 h10 Z\"/><path d=\"M70 187 l-5 7 h10 Z\"/><path d=\"M70 346 l-5 7 h10 Z\"/></g>",
      "    <g fill=\"#369DCB\"><path d=\"M145 104 l-5 -7 h10 Z\"/><path d=\"M145 196 l-5 -7 h10 Z\"/><path d=\"M145 272 l-5 -7 h10 Z\"/><path d=\"M145 353 l-5 -7 h10 Z\"/></g>",
      "    ${pumpSvg}",
      "    <text x=\"107.5\" y=\"365\" font-size=\"9.5\" fill=\"${active ? '#168C58' : '#657785'}\">${label}</text>",
      "    </g>",
      "    <!-- Platz für den Heizkurven-Knopf im Karten-Overlay -->",
      "  </g>",
      "</svg>`;",
      "",
      "",
      "})(states[ids.heizkreis.mischer]);",
      "const nested = heating.replace(/<svg\\b/, '<svg x=\"710\" y=\"156\" width=\"266\" height=\"532\"').replace(/style=\"display:block;width:100%;height:auto\"/, \"\");",
      "return base.replace(/<svg\\b/, '<svg width=\"1000\" height=\"1080\"').replace(\"</svg>\", nested+\"</svg>\");",
      "",
      "})();",
      "if (!hass.themes?.darkMode) return themedSvg;",
      "return (function applyTheme(svg,map){",
      " return svg.replace(/<[a-zA-Z][^>]*>/g,tag=>{",
      "  const isText=/^<text\\b/.test(tag);",
      "  return tag.replace(/(fill|stroke)=\"(#[a-fA-F0-9]{6})\"/g,(match,attr,hex)=>{",
      "   const key=hex.toUpperCase();",
      "   if(isText){",
      "    if(['#188E65','#168C58'].includes(key))return attr+'=\"var(--modern-positive)\"';",
      "    if(['#C23B4F','#A23F4A','#B15662','#E34D56'].includes(key))return attr+'=\"var(--modern-hot)\"';",
      "    if(['#28749A','#387EA6','#008EBF','#009BD0'].includes(key))return attr+'=\"var(--modern-cool)\"';",
      "   }",
      "   // Keep white light reflections on pumps and storage tanks.",
      "   if(key==='#FFFFFF'&&!/^<rect\\b/.test(tag))return match;",
      "   // Keep grey hardware and coloured flow/temperature indicators intact.",
      "   const token=map[key];",
      "   return token ? attr+'=\"var('+token+')\"' : match;",
      "  });",
      " });",
      "})(themedSvg, {\"#EFF4F7\":\"--modern-bg\",\"#FFFFFF\":\"--modern-card\",\"#F7FAFC\":\"--modern-surface\",\"#F5F8FA\":\"--modern-surface\",\"#F0F6FA\":\"--modern-surface\",\"#EDF4F8\":\"--modern-surface\",\"#DCE5EB\":\"--modern-border\",\"#DCE4EB\":\"--modern-border\",\"#E4ECF1\":\"--modern-border\",\"#E7DADD\":\"--modern-border\",\"#D6E5EF\":\"--modern-border\",\"#243C4A\":\"--modern-text\",\"#243743\":\"--modern-text\",\"#283B48\":\"--modern-text\",\"#526978\":\"--modern-secondary\",\"#738897\":\"--modern-secondary\",\"#83939F\":\"--modern-secondary\",\"#526574\":\"--modern-secondary\",\"#71808D\":\"--modern-secondary\",\"#82919D\":\"--modern-secondary\",\"#657785\":\"--modern-secondary\",\"#7A8C99\":\"--modern-secondary\",\"#627987\":\"--modern-secondary\",\"#6F8493\":\"--modern-secondary\",\"#748696\":\"--modern-secondary\",\"#EAF0F4\":\"--modern-track\",\"#EAF7F0\":\"--modern-success-bg\",\"#FFF0F1\":\"--modern-error-bg\",\"#E8F5FC\":\"--modern-info-bg\",\"#C6E1F0\":\"--modern-border\",\"#426E86\":\"--modern-accent\",\"#52768C\":\"--modern-accent\",\"#247796\":\"--modern-accent\"});",
      "]]]"
    ].join("\n"),
    "heating_curve_popup": {
      "card": {
        "type": "custom:button-card",
        "name": "Heizkurve",
        "icon": "mdi:chart-bell-curve",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "custom_fields": {
          "curve_icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" role=\"img\" aria-label=\"Heizkurve öffnen\" style=\"display:block;width:100%;height:100%;overflow:visible;\"> <path d=\"M4 3V20H21\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> <path d=\"M7 16L11 12L15 13L20 6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> </svg>"
        },
        "tap_action": {
          "action": "fire-dom-event",
          "browser_mod": {
            "service": "browser_mod.popup",
            "data": {
              "title": "Heizkurve",
              "size": "wide",
              "initial_style": "wide",
              "hide_header": false,
              "content": {
                "type": "custom:keba-keenergy-heizkurve-card",
                "title": "Heizkurve KeEnergy",
                "auto_lock_minutes": 10
              }
            }
          }
        },
        "hold_action": {
          "action": "none"
        },
        "double_tap_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "padding": "18%"
            },
            {
              "border-radius": "50%"
            },
            {
              "box-shadow": "none"
            },
            {
              "cursor": "pointer"
            },
            {
              "background": "var(--wp-curve-bg)"
            },
            {
              "border": "1px solid var(--wp-curve-border)"
            },
            {
              "color": "var(--wp-curve-icon)"
            }
          ],
          "grid": [
            {
              "grid-template-areas": "\"curve_icon\""
            },
            {
              "grid-template-columns": "1fr"
            },
            {
              "grid-template-rows": "1fr"
            },
            {
              "align-items": "center"
            },
            {
              "justify-items": "center"
            }
          ],
          "custom_fields": {
            "curve_icon": [
              {
                "display": "flex"
              },
              {
                "align-items": "center"
              },
              {
                "justify-content": "center"
              },
              {
                "width": "100%"
              },
              {
                "height": "100%"
              },
              {
                "min-width": 0
              },
              {
                "min-height": 0
              },
              {
                "line-height": 0
              },
              {
                "pointer-events": "none"
              }
            ]
          }
        },
        "extra_styles": ":host { display:block !important; width:100%; height:100%; } #aspect-ratio, #card, #container { width:100%; height:100%; }"
      },
      "do_not_eval": true
    },
    "control_0": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.zustand; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_1": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.stoerungen; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_2": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.heizkreis.heizanforderung; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_3": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.temperatur.aussen; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_4": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.temperatur.haus_mittelwert; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_5": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.quelleneingang; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_6": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.quellenausgang; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_7": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.verdichter_eintritt; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_8": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.verdichter_austritt; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_9": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.vorlauf; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_10": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.ruecklauf; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_11": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.betriebsart; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_12": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.unterstatus; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_14": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.verdichter_leistung; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_15": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.energie.gesamtverbrauch; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_16": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.betriebsstunden; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_17": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.zustand; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "control_18": {
      "card": {
        "type": "custom:button-card",
        "icon": "mdi:cog",
        "show_name": false,
        "show_state": false,
        "tap_action": {
          "action": "fire-dom-event",
          "browser_mod": {
            "data": {
              "browser_id": "THIS",
              "content": {
                "cards": [
                  {
                    "type": "entities",
                    "title": "Thermostate",
                    "show_header_toggle": false,
                    "entities": [
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.ferienmodus; ]]]",
                        "name": "Ferienmodus",
                        "icon": "mdi:bag-suitcase"
                      },
                      {
                        "type": "divider"
                      },
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.bad; ]]]",
                        "name": "Bad"
                      },
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.buero; ]]]",
                        "name": "Büro"
                      },
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.dusche; ]]]",
                        "name": "Dusche"
                      },
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.gaestezimmer; ]]]",
                        "name": "Gästezimmer"
                      },
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.kueche; ]]]",
                        "name": "Küche"
                      },
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.schlafzimmer; ]]]",
                        "name": "Schlafzimmer"
                      },
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.terrassenzimmer; ]]]",
                        "name": "Terrassenzimmer"
                      },
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.toilette; ]]]",
                        "name": "Toilette"
                      },
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.ess_wohnzimmer; ]]]",
                        "name": "Ess/Wohnzimmer"
                      },
                      {
                        "entity": "[[[ return variables.entitaeten.thermostate.sauna; ]]]",
                        "name": "Sauna"
                      },
                      {
                        "type": "custom:hui-element",
                        "entity": "[[[ return variables.entitaeten.heizkreis.betriebsart; ]]]",
                        "show_icon": false,
                        "show_name": false,
                        "show_state": false,
                        "triggers_update": [
                          "[[[ return variables.entitaeten.heizkreis.betriebsart; ]]]",
                          "[[[ return variables.entitaeten.heizkreis.raumkorrektur; ]]]",
                          "[[[ return variables.entitaeten.heizkreis.heizanforderung; ]]]",
                          "[[[ return variables.entitaeten.heizkreis.raumtemperatur_ist; ]]]",
                          "[[[ return variables.entitaeten.heizkreis.raumfeuchtigkeit; ]]]",
                          "[[[ return variables.entitaeten.heizkreis.raumtemperatur_soll; ]]]",
                          "[[[ return variables.entitaeten.waermepumpe.stoerungen; ]]]"
                        ],
                        "tap_action": {
                          "action": "none"
                        },
                        "styles": {
                          "card": [
                            {
                              "padding": "0"
                            },
                            {
                              "border-radius": "22px"
                            },
                            {
                              "background": "var(--card-background-color)"
                            },
                            {
                              "box-shadow": "none"
                            },
                            {
                              "overflow": "hidden"
                            },
                            {
                              "border": "none"
                            },
                            {
                              "box-shadow": "none"
                            },
                            {
                              "background": "transparent"
                            },
                            {
                              "border-radius": "0"
                            }
                          ],
                          "grid": [
                            {
                              "grid-template-areas": "\"face\""
                            },
                            {
                              "grid-template-columns": "1fr"
                            }
                          ],
                          "custom_fields": {
                            "face": [
                              {
                                "width": "100%"
                              }
                            ],
                            "minus": [
                              {
                                "position": "absolute"
                              },
                              {
                                "left": "39%"
                              },
                              {
                                "top": "32.56410256410256%"
                              },
                              {
                                "width": "9%"
                              },
                              {
                                "height": "9.230769230769232%"
                              },
                              {
                                "z-index": 2
                              }
                            ],
                            "plus": [
                              {
                                "position": "absolute"
                              },
                              {
                                "left": "52%"
                              },
                              {
                                "top": "32.56410256410256%"
                              },
                              {
                                "width": "9%"
                              },
                              {
                                "height": "9.230769230769232%"
                              },
                              {
                                "z-index": 2
                              }
                            ],
                            "prev": [
                              {
                                "position": "absolute"
                              },
                              {
                                "left": "39%"
                              },
                              {
                                "top": "59.743589743589745%"
                              },
                              {
                                "width": "9%"
                              },
                              {
                                "height": "9.230769230769232%"
                              },
                              {
                                "z-index": 2
                              }
                            ],
                            "next": [
                              {
                                "position": "absolute"
                              },
                              {
                                "left": "52%"
                              },
                              {
                                "top": "59.743589743589745%"
                              },
                              {
                                "width": "9%"
                              },
                              {
                                "height": "9.230769230769232%"
                              },
                              {
                                "z-index": 2
                              }
                            ]
                          }
                        },
                        "custom_fields": {
                          "face": [
                            "[[[[[",
                            "const modeState=states[variables.entitaeten.heizkreis.betriebsart];",
                            "const presetLabels={\"off\": \"Aus\", \"night\": \"Absenken\", \"reduced\": \"Absenken\", \"auto\": \"Zeitprogramm\", \"day\": \"Tag\", \"normal\": \"Tag\", \"party\": \"Party\", \"holiday\": \"Urlaub\", \"vacation\": \"Urlaub\"};",
                            "const requestLabels={\"flow_off\": \"Aus (Rücklauftemperatur)\", \"inflow_off\": \"Aus (Vorlauftemperatur)\", \"off\": \"Aus\", \"on\": \"Ein\", \"outdoor_off\": \"Aus (Außentemperatur)\", \"room_off\": \"Aus (Raumtemperatur)\", \"temporary_off\": \"Aus (Vorrang)\"};",
                            "const eg=modeState;",
                            "const a={",
                            "  current_temperature:states[variables.entitaeten.heizkreis.raumtemperatur_ist]?.state,",
                            "  offset:states[variables.entitaeten.heizkreis.raumkorrektur]?.state,",
                            "  preset:presetLabels[modeState?.state]||modeState?.state,",
                            "  status:requestLabels[states[variables.entitaeten.heizkreis.heizanforderung]?.state]||states[variables.entitaeten.heizkreis.heizanforderung]?.state||'—',",
                            "  temperature:states[variables.entitaeten.heizkreis.raumtemperatur_soll]?.state",
                            "};",
                            "",
                            "const available=eg && !['unknown','unavailable'].includes(eg.state);",
                            "const esc=v=>String(v ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));",
                            "const numeric=v=>v!==null && v!==undefined && v!=='' && Number.isFinite(Number(v));",
                            "const fmt=v=>numeric(v)?Number(v).toFixed(1).replace('.',','):'—';",
                            "const off=numeric(a.offset)?Number(a.offset):null;",
                            "const accent=available?'#05bac5':'#82929e';",
                            "const alarm=states[variables.entitaeten.waermepumpe.stoerungen]?.state;",
                            "const alarmKnown=alarm!==undefined && !['unknown','unavailable',''].includes(alarm);",
                            "const fault=alarmKnown && Number.isFinite(Number(alarm)) && Number(alarm)>0;",
                            "const hk=states[variables.entitaeten.heizkreis.heizanforderung]?.state ?? a.status;",
                            "const active=available && hk==='on';",
                            "const ledColor=fault?'#ef4444':active?'#22c55e':'var(--divider-color)';",
                            "const ledLabel=fault?'Störung Wärmepumpe':active?'Heizkreis aktiv':'Heizkreis nicht aktiv';",
                            "let ticks='';",
                            "for(let i=0;i<=10;i++){",
                            " const angle=(-150+i*12)*Math.PI/180;",
                            " const x=200+122*Math.cos(angle),y=199+122*Math.sin(angle);",
                            " const on=available && off!==null && Math.abs(off-(-2.5+i*.5))<.26;",
                            " ticks+=`<circle cx=\"${x}\" cy=\"${y}\" r=\"${on?6:3.5}\" fill=\"${on?'#22c55e':'var(--divider-color)'}\"/>`;",
                            "}",
                            "const icons=[",
                            "  '<path d=\"M0 -12 V0 M-8 -8 A12 12 0 1 0 8 -8\"/>',",
                            "  '<path d=\"M0 -12 A12 12 0 1 0 0 12 A15 15 0 0 1 0 -12 Z\"/>',",
                            "  '<circle r=\"12\"/><path d=\"M0 -8 V0 H7\"/>',",
                            "  '<circle r=\"5.5\"/><path d=\"M0 -9V-12 M0 9V12 M-9 0H-12 M9 0H12 M-6.4 -6.4L-8.5 -8.5 M6.4 -6.4L8.5 -8.5 M-6.4 6.4L-8.5 8.5 M6.4 6.4L8.5 8.5\"/>'",
                            "];",
                            "const modes=['Aus','Absenken','Zeitprogramm','Tag'];",
                            "let labels='';",
                            "for(let i=0;i<4;i++){",
                            " const angles=[145,113,90,67];",
                            " const angle=angles[i]*Math.PI/180;",
                            " const x=i===3 ? 200+133*Math.cos(angle)-3 : 200+104*Math.cos(angle), y=199+104*Math.sin(angle);",
                            " const lx=200+133*Math.cos(angle), ly=199+133*Math.sin(angle);",
                            " const on=available && a.preset===modes[i];",
                            " labels+=`<g transform=\"translate(${x} ${y})\" fill=\"none\" stroke=\"var(--secondary-text-color)\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\">${icons[i]}</g><circle cx=\"${lx}\" cy=\"${ly}\" r=\"4\" fill=\"${on?'#22c55e':'var(--divider-color)'}\"/>`;",
                            "}",
                            "return `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 400 390\" style=\"display:block;width:100%;height:auto;font-family:Arial,sans-serif\">",
                            "<text x=\"200\" y=\"28\" text-anchor=\"middle\" fill=\"var(--primary-text-color)\" font-size=\"18\" font-weight=\"700\">Wärmepumpen-Fernbedienung OI420</text>",
                            "<text x=\"200\" y=\"48\" text-anchor=\"middle\" fill=\"var(--secondary-text-color)\" font-size=\"11\">Raumkorrektur · Heizkreis 1</text>",
                            "<circle cx=\"200\" cy=\"199\" r=\"133\" fill=\"none\" stroke=\"var(--divider-color)\" stroke-width=\"5\"/>",
                            "${ticks}",
                            "<text x=\"103\" y=\"157\" text-anchor=\"middle\" fill=\"var(--secondary-text-color)\" font-size=\"12\">−2,5</text>",
                            "<text x=\"200\" y=\"94\" text-anchor=\"middle\" fill=\"var(--secondary-text-color)\" font-size=\"12\">0</text>",
                            "<text x=\"297\" y=\"157\" text-anchor=\"middle\" fill=\"var(--secondary-text-color)\" font-size=\"12\">+2,5</text>",
                            "<text x=\"200\" y=\"197\" text-anchor=\"middle\" fill=\"${accent}\" font-size=\"24\" font-weight=\"700\">${available?fmt(a.current_temperature):'—'} °C</text>",
                            "<text x=\"200\" y=\"219\" text-anchor=\"middle\" fill=\"${accent}\" font-size=\"15\">${numeric(states[variables.entitaeten.heizkreis.raumfeuchtigkeit]?.state)? Number(states[variables.entitaeten.heizkreis.raumfeuchtigkeit].state).toFixed(0):'—'} % rF</text>",
                            "${labels}",
                            "<g transform=\"translate(285.5 258)\" fill=\"none\" stroke=\"var(--secondary-text-color)\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <path d=\"M-4 -12 C-10 -8 -10 -4 -4 0 S2 8 -4 12 M4 -12 C-2 -8 -2 -4 4 0 S10 8 4 12\"/> </g>",
                            "<g class=\"${fault?'eg-status-fault':''}\" fill=\"none\" stroke=\"${ledColor}\" stroke-linecap=\"round\">",
                            "<title>${ledLabel}</title>",
                            "<path d=\"M313 269 A133 133 0 0 1 305 281\" stroke-width=\"7\"/>",
                            "</g>",
                            "<text x=\"200\" y=\"353\" text-anchor=\"middle\" fill=\"var(--primary-text-color)\" font-size=\"14\" font-weight=\"700\">${available?esc(a.preset):'Nicht verfügbar'}</text>",
                            "<text x=\"200\" y=\"376\" text-anchor=\"middle\" fill=\"var(--secondary-text-color)\" font-size=\"11\">${available?esc(a.status)+' · Raum-Soll '+fmt(a.temperature)+' °C':'KeEnergy-Verbindung / aktuelle Heizkreisdaten prüfen'}</text>",
                            "</svg>`;",
                            "",
                            "]]]]]"
                          ].join("\n"),
                          "minus": {
                            "card": {
                              "type": "custom:button-card",
                              "variables": {
                                "ziel": "[[[ return variables.entitaeten.heizkreis.raumkorrektur; ]]]"
                              },
                              "icon": "mdi:minus",
                              "name": "Kälter",
                              "show_name": false,
                              "tap_action": {
                                "action": "call-service",
                                "service": "number.set_value",
                                "service_data": {
                                  "entity_id": "[[[ return variables.entitaeten.heizkreis.raumkorrektur; ]]]",
                                  "value": [
                                    "[[[[[[",
                                    "const e=states[variables.ziel];",
                                    "if(!e||['unknown','unavailable'].includes(e.state))throw new Error('KeEnergy-Raumkorrektur ist nicht verfügbar. Entität aktivieren.');",
                                    "const v=Number(e.state),lo=Math.max(-2.5,Number(e.attributes.min??-2.5)),hi=Math.min(2.5,Number(e.attributes.max??2.5));",
                                    "if(!Number.isFinite(v))throw new Error('Ungültige Raumkorrektur');",
                                    "return Math.min(hi,Math.max(lo,Math.round((v+(-0.5))*100)/100));",
                                    "]]]]]]"
                                  ].join("\n")
                                }
                              },
                              "hold_action": {
                                "action": "none"
                              },
                              "extra_styles": ":host { display:block!important; position:relative; width:100%!important; height:100%!important; max-width:none!important; } #aspect-ratio, #card { display:block!important; position:absolute!important; inset:0; width:100%!important; height:100%!important; padding:0!important; } #container { width:100%; height:100%; }",
                              "styles": {
                                "card": [
                                  {
                                    "width": "100%"
                                  },
                                  {
                                    "height": "100%"
                                  },
                                  {
                                    "padding": "0"
                                  },
                                  {
                                    "border-radius": "50%"
                                  },
                                  {
                                    "background": "var(--secondary-background-color)"
                                  },
                                  {
                                    "border": "1px solid var(--divider-color)"
                                  },
                                  {
                                    "box-shadow": "none"
                                  }
                                ],
                                "icon": [
                                  {
                                    "width": "60%"
                                  },
                                  {
                                    "color": "var(--primary-text-color)"
                                  }
                                ]
                              }
                            }
                          },
                          "plus": {
                            "card": {
                              "type": "custom:button-card",
                              "variables": {
                                "ziel": "[[[ return variables.entitaeten.heizkreis.raumkorrektur; ]]]"
                              },
                              "icon": "mdi:plus",
                              "name": "Wärmer",
                              "show_name": false,
                              "tap_action": {
                                "action": "call-service",
                                "service": "number.set_value",
                                "service_data": {
                                  "entity_id": "[[[ return variables.entitaeten.heizkreis.raumkorrektur; ]]]",
                                  "value": [
                                    "[[[[[[",
                                    "const e=states[variables.ziel];",
                                    "if(!e||['unknown','unavailable'].includes(e.state))throw new Error('KeEnergy-Raumkorrektur ist nicht verfügbar. Entität aktivieren.');",
                                    "const v=Number(e.state),lo=Math.max(-2.5,Number(e.attributes.min??-2.5)),hi=Math.min(2.5,Number(e.attributes.max??2.5));",
                                    "if(!Number.isFinite(v))throw new Error('Ungültige Raumkorrektur');",
                                    "return Math.min(hi,Math.max(lo,Math.round((v+(0.5))*100)/100));",
                                    "]]]]]]"
                                  ].join("\n")
                                }
                              },
                              "hold_action": {
                                "action": "none"
                              },
                              "extra_styles": ":host { display:block!important; position:relative; width:100%!important; height:100%!important; max-width:none!important; } #aspect-ratio, #card { display:block!important; position:absolute!important; inset:0; width:100%!important; height:100%!important; padding:0!important; } #container { width:100%; height:100%; }",
                              "styles": {
                                "card": [
                                  {
                                    "width": "100%"
                                  },
                                  {
                                    "height": "100%"
                                  },
                                  {
                                    "padding": "0"
                                  },
                                  {
                                    "border-radius": "50%"
                                  },
                                  {
                                    "background": "var(--secondary-background-color)"
                                  },
                                  {
                                    "border": "1px solid var(--divider-color)"
                                  },
                                  {
                                    "box-shadow": "none"
                                  }
                                ],
                                "icon": [
                                  {
                                    "width": "60%"
                                  },
                                  {
                                    "color": "var(--primary-text-color)"
                                  }
                                ]
                              }
                            }
                          },
                          "prev": {
                            "card": {
                              "type": "custom:button-card",
                              "variables": {
                                "ziel": "[[[ return variables.entitaeten.heizkreis.betriebsart; ]]]"
                              },
                              "icon": "mdi:chevron-left",
                              "name": "Vorige Betriebsart",
                              "show_name": false,
                              "tap_action": {
                                "action": "call-service",
                                "service": "select.select_option",
                                "service_data": {
                                  "entity_id": "[[[ return variables.entitaeten.heizkreis.betriebsart; ]]]",
                                  "option": [
                                    "[[[[[[",
                                    "const e=states[variables.ziel];",
                                    "if(!e||['unknown','unavailable'].includes(e.state))throw new Error('KeEnergy-Betriebsart ist nicht verfügbar.');",
                                    "const offered=e.attributes.options||[];",
                                    "const aliases=[['off'],['night','reduced'],['auto'],['day','normal']];",
                                    "const cycle=aliases.map(group=>group.find(value=>offered.includes(value))).filter(Boolean);",
                                    "if(!cycle.length)throw new Error('Keine passenden OI420-Betriebsarten vorhanden.');",
                                    "const i=cycle.indexOf(e.state),base=i<0?0:i;",
                                    "return cycle[(base+(-1)+cycle.length)%cycle.length];",
                                    "]]]]]]"
                                  ].join("\n")
                                }
                              },
                              "hold_action": {
                                "action": "none"
                              },
                              "extra_styles": ":host { display:block!important; position:relative; width:100%!important; height:100%!important; max-width:none!important; } #aspect-ratio, #card { display:block!important; position:absolute!important; inset:0; width:100%!important; height:100%!important; padding:0!important; } #container { width:100%; height:100%; }",
                              "styles": {
                                "card": [
                                  {
                                    "width": "100%"
                                  },
                                  {
                                    "height": "100%"
                                  },
                                  {
                                    "padding": "0"
                                  },
                                  {
                                    "border-radius": "50%"
                                  },
                                  {
                                    "background": "var(--secondary-background-color)"
                                  },
                                  {
                                    "border": "1px solid var(--divider-color)"
                                  },
                                  {
                                    "box-shadow": "none"
                                  }
                                ],
                                "icon": [
                                  {
                                    "width": "60%"
                                  },
                                  {
                                    "color": "var(--primary-text-color)"
                                  }
                                ]
                              }
                            }
                          },
                          "next": {
                            "card": {
                              "type": "custom:button-card",
                              "variables": {
                                "ziel": "[[[ return variables.entitaeten.heizkreis.betriebsart; ]]]"
                              },
                              "icon": "mdi:chevron-right",
                              "name": "Nächste Betriebsart",
                              "show_name": false,
                              "tap_action": {
                                "action": "call-service",
                                "service": "select.select_option",
                                "service_data": {
                                  "entity_id": "[[[ return variables.entitaeten.heizkreis.betriebsart; ]]]",
                                  "option": [
                                    "[[[[[[",
                                    "const e=states[variables.ziel];",
                                    "if(!e||['unknown','unavailable'].includes(e.state))throw new Error('KeEnergy-Betriebsart ist nicht verfügbar.');",
                                    "const offered=e.attributes.options||[];",
                                    "const aliases=[['off'],['night','reduced'],['auto'],['day','normal']];",
                                    "const cycle=aliases.map(group=>group.find(value=>offered.includes(value))).filter(Boolean);",
                                    "if(!cycle.length)throw new Error('Keine passenden OI420-Betriebsarten vorhanden.');",
                                    "const i=cycle.indexOf(e.state),base=i<0?0:i;",
                                    "return cycle[(base+(1)+cycle.length)%cycle.length];",
                                    "]]]]]]"
                                  ].join("\n")
                                }
                              },
                              "hold_action": {
                                "action": "none"
                              },
                              "extra_styles": ":host { display:block!important; position:relative; width:100%!important; height:100%!important; max-width:none!important; } #aspect-ratio, #card { display:block!important; position:absolute!important; inset:0; width:100%!important; height:100%!important; padding:0!important; } #container { width:100%; height:100%; }",
                              "styles": {
                                "card": [
                                  {
                                    "width": "100%"
                                  },
                                  {
                                    "height": "100%"
                                  },
                                  {
                                    "padding": "0"
                                  },
                                  {
                                    "border-radius": "50%"
                                  },
                                  {
                                    "background": "var(--secondary-background-color)"
                                  },
                                  {
                                    "border": "1px solid var(--divider-color)"
                                  },
                                  {
                                    "box-shadow": "none"
                                  }
                                ],
                                "icon": [
                                  {
                                    "width": "60%"
                                  },
                                  {
                                    "color": "var(--primary-text-color)"
                                  }
                                ]
                              }
                            }
                          }
                        },
                        "extra_styles": [
                          "",
                          "@keyframes eg-status-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.15; } }",
                          ".eg-status-fault { animation: eg-status-blink 1s linear infinite; }",
                          ""
                        ].join("\n"),
                        "update_timer": "1s",
                        "card_type": "custom:button-card",
                        "variables": {
                          "entitaeten": "[[[ return variables.entitaeten; ]]]"
                        }
                      }
                    ]
                  }
                ],
                "type": "vertical-stack"
              },
              "size": "normal",
              "title": "WP Einstellungen"
            },
            "service": "browser_mod.popup"
          }
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "aspect-ratio": "1"
            },
            {
              "padding": "18%"
            },
            {
              "border-radius": "14px"
            },
            {
              "background": "var(--wp-control-bg)"
            },
            {
              "border": "1px solid var(--wp-control-border)"
            },
            {
              "box-shadow": "none"
            }
          ],
          "icon": [
            {
              "width": "100%"
            },
            {
              "color": "var(--wp-control-icon)"
            }
          ]
        }
      }
    },
    "control_19": {
      "card": {
        "type": "custom:button-card",
        "icon": "mdi:home-thermometer",
        "show_name": false,
        "show_state": false,
        "tap_action": {
          "action": "fire-dom-event",
          "browser_mod": {
            "data": {
              "browser_id": "THIS",
              "content": {
                "aspect_ratio": "100%",
                "type": "iframe"
              },
              "hide_header": false,
              "scroll": true,
              "size": "fullscreen",
              "title": "Temperaturen Haus"
            },
            "service": "browser_mod.popup"
          }
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "aspect-ratio": "1"
            },
            {
              "padding": "18%"
            },
            {
              "border-radius": "14px"
            },
            {
              "background": "var(--wp-control-bg)"
            },
            {
              "border": "1px solid var(--wp-control-border)"
            },
            {
              "box-shadow": "none"
            }
          ],
          "icon": [
            {
              "width": "100%"
            },
            {
              "color": "var(--wp-control-icon)"
            }
          ]
        }
      }
    },
    "control_20": {
      "card": {
        "type": "custom:button-card",
        "icon": "mdi:air-conditioner",
        "show_name": false,
        "show_state": false,
        "tap_action": {
          "action": "fire-dom-event",
          "browser_mod": {
            "data": {
              "browser_id": "THIS",
              "content": {
                "entity": "[[[ return variables.entitaeten.geraete.buero_klimaanlage; ]]]",
                "features": [
                  {
                    "type": "climate-hvac-modes"
                  },
                  {
                    "style": "buttons",
                    "type": "climate-preset-modes"
                  }
                ],
                "type": "thermostat"
              },
              "hide_header": false,
              "size": "normal",
              "title": "Thermostat"
            },
            "service": "browser_mod.popup"
          }
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "aspect-ratio": "1"
            },
            {
              "padding": "18%"
            },
            {
              "border-radius": "14px"
            },
            {
              "background": "var(--wp-control-bg)"
            },
            {
              "border": "1px solid var(--wp-control-border)"
            },
            {
              "box-shadow": "none"
            }
          ],
          "icon": [
            {
              "width": "100%"
            },
            {
              "color": "var(--wp-control-icon)"
            }
          ]
        }
      }
    },
    "control_21": {
      "card": {
        "type": "custom:button-card",
        "icon": "mdi:hvac",
        "show_name": false,
        "show_state": false,
        "tap_action": {
          "action": "fire-dom-event",
          "browser_mod": {
            "data": {
              "browser_id": "THIS",
              "content": {
                "entity": "[[[ return variables.entitaeten.geraete.wintergarten_heizung; ]]]",
                "features": [
                  {
                    "style": "buttons",
                    "type": "climate-hvac-modes"
                  }
                ],
                "type": "thermostat"
              },
              "hide_header": false,
              "size": "normal",
              "title": "Thermostat"
            },
            "service": "browser_mod.popup"
          }
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "aspect-ratio": "1"
            },
            {
              "padding": "18%"
            },
            {
              "border-radius": "14px"
            },
            {
              "background": "var(--wp-control-bg)"
            },
            {
              "border": "1px solid var(--wp-control-border)"
            },
            {
              "box-shadow": "none"
            }
          ],
          "icon": [
            {
              "width": "100%"
            },
            {
              "color": "var(--wp-control-icon)"
            }
          ]
        }
      }
    },
    "control_22": {
      "card": {
        "type": "custom:button-card",
        "icon": "mdi:fan",
        "show_name": false,
        "show_state": false,
        "tap_action": {
          "action": "fire-dom-event",
          "browser_mod": {
            "data": {
              "browser_id": "THIS",
              "content": {
                "entity": "[[[ return variables.entitaeten.geraete.wintergarten_lueftung; ]]]",
                "features": [
                  {
                    "style": "buttons",
                    "type": "climate-hvac-modes"
                  }
                ],
                "type": "thermostat"
              },
              "hide_header": false,
              "size": "normal",
              "title": "Thermostat"
            },
            "service": "browser_mod.popup"
          }
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "aspect-ratio": "1"
            },
            {
              "padding": "18%"
            },
            {
              "border-radius": "14px"
            },
            {
              "background": "var(--wp-control-bg)"
            },
            {
              "border": "1px solid var(--wp-control-border)"
            },
            {
              "box-shadow": "none"
            }
          ],
          "icon": [
            {
              "width": "100%"
            },
            {
              "color": "var(--wp-control-icon)"
            }
          ]
        }
      }
    },
    "control_23": {
      "card": {
        "type": "custom:button-card",
        "icon": "mdi:air-humidifier",
        "show_name": false,
        "show_state": false,
        "tap_action": {
          "action": "fire-dom-event",
          "browser_mod": {
            "data": {
              "browser_id": "THIS",
              "content": {
                "entity": "[[[ return variables.entitaeten.geraete.garage_entfeuchter; ]]]",
                "features": [
                  {
                    "style": "buttons",
                    "type": "humidifier-toggle"
                  }
                ],
                "type": "humidifier"
              },
              "hide_header": false,
              "size": "normal",
              "title": "Thermostat"
            },
            "service": "browser_mod.popup"
          }
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "aspect-ratio": "1"
            },
            {
              "padding": "18%"
            },
            {
              "border-radius": "14px"
            },
            {
              "background": "var(--wp-control-bg)"
            },
            {
              "border": "1px solid var(--wp-control-border)"
            },
            {
              "box-shadow": "none"
            }
          ],
          "icon": [
            {
              "width": "100%"
            },
            {
              "color": "var(--wp-control-icon)"
            }
          ]
        }
      }
    },
    "control_24": {
      "card": {
        "type": "custom:button-card",
        "icon": "mdi:hvac",
        "show_name": false,
        "show_state": false,
        "tap_action": {
          "action": "fire-dom-event",
          "browser_mod": {
            "data": {
              "browser_id": "THIS",
              "content": {
                "entity": "[[[ return variables.entitaeten.geraete.sauna_heizung; ]]]",
                "features": [
                  {
                    "style": "buttons",
                    "type": "climate-hvac-modes"
                  }
                ],
                "type": "thermostat"
              },
              "hide_header": false,
              "size": "normal",
              "title": "Thermostat"
            },
            "service": "browser_mod.popup"
          }
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "aspect-ratio": "1"
            },
            {
              "padding": "18%"
            },
            {
              "border-radius": "14px"
            },
            {
              "background": "var(--wp-control-bg)"
            },
            {
              "border": "1px solid var(--wp-control-border)"
            },
            {
              "box-shadow": "none"
            }
          ],
          "icon": [
            {
              "width": "100%"
            },
            {
              "color": "var(--wp-control-icon)"
            }
          ]
        }
      }
    },
    "history_source_pump": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.quellenpumpe_drehzahl; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_compressor": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.verdichter; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_rpm": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.verdichter; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_heating_pump": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.umwaelzpumpe; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_hk_target": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.heizkreis.vorlauf_soll; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_hk_flow": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.heizkreis.vorlauf; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_hk_return": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.heizkreis.ruecklauf; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_hk_pump": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.heizkreis.pumpe; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_mixer": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.heizkreis.mischer; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_energy_0": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.energie.tag; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_energy_1": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.energie.tag; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_energy_2": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.energie.woche; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_energy_3": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.energie.woche; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_energy_4": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.energie.monat; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_energy_5": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.energie.monat; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_energy_6": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.energie.jahr; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_energy_7": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.energie.jahr; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "history_surplus": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.energie.pv_ueberschuss; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "verdichter_history_1_0": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.hochdruck; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "verdichter_history_1_1": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.niederdruck; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "verdichter_history_2_0": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.ueberhitzung_ist; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "verdichter_history_2_1": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.ueberhitzung_soll; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "verdichter_history_3_0": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.expansionsventil; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "verdichter_history_3_1": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.kondensator_temperatur; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    },
    "verdichter_history_4_0": {
      "card": {
        "type": "custom:button-card",
        "entity": "[[[ return variables.entitaeten.waermepumpe.verdampfer_temperatur; ]]]",
        "show_name": false,
        "show_icon": false,
        "show_state": false,
        "styles": {
          "card": [
            {
              "width": "100%"
            },
            {
              "height": "100%"
            },
            {
              "background": "transparent"
            },
            {
              "border": "none"
            },
            {
              "padding": 0
            },
            {
              "box-shadow": "none"
            },
            {
              "position": "absolute"
            },
            {
              "inset": 0
            },
            {
              "pointer-events": "auto"
            },
            {
              "cursor": "pointer"
            }
          ]
        },
        "tap_action": {
          "action": "more-info"
        },
        "hold_action": {
          "action": "none"
        },
        "extra_styles": [
          ":host { display:block !important; position:relative; width:100% !important; max-width:none !important; height:100% !important; pointer-events:auto !important; }",
          "#aspect-ratio { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; }",
          "#card { display:block !important; position:absolute !important; inset:0; width:100% !important; height:100% !important; padding:0 !important; pointer-events:auto !important; }",
          "#container { width:100%; height:100%; }"
        ].join("\n")
      }
    }
  },
  "styles": {
    "card": [
      {
        "padding": 0
      },
      {
        "border": "[[[ return hass.themes?.darkMode ? \"1px solid var(--modern-border)\" : \"1px solid #DCE5EB\"; ]]]"
      },
      {
        "border-radius": "24px"
      },
      {
        "background": "[[[ return hass.themes?.darkMode ? \"var(--modern-bg)\" : \"#EFF4F7\"; ]]]"
      },
      {
        "box-shadow": "none"
      },
      {
        "width": "100%"
      },
      {
        "overflow": "hidden"
      },
      {
        "--wp-control-bg": "[[[ return hass.themes?.darkMode ? '#253341' : '#EDF4F8'; ]]]"
      },
      {
        "--wp-control-border": "[[[ return hass.themes?.darkMode ? '#3B4B58' : '#DCE5EB'; ]]]"
      },
      {
        "--wp-control-icon": "[[[ return hass.themes?.darkMode ? '#65BDE3' : '#426E86'; ]]]"
      },
      {
        "--wp-curve-bg": "[[[ return hass.themes?.darkMode ? '#253341' : '#E6F2F1'; ]]]"
      },
      {
        "--wp-curve-border": "[[[ return hass.themes?.darkMode ? '#3B4B58' : '#C9E2DD'; ]]]"
      },
      {
        "--wp-curve-icon": "[[[ return hass.themes?.darkMode ? '#65BDE3' : '#087F82'; ]]]"
      }
    ],
    "grid": [
      {
        "display": "block"
      },
      {
        "width": "100%"
      },
      {
        "min-width": 0
      },
      {
        "position": "relative"
      }
    ],
    "custom_fields": {
      "dashboard": [
        {
          "display": "block"
        },
        {
          "position": "relative"
        },
        {
          "width": "100%"
        },
        {
          "min-width": 0
        },
        {
          "line-height": 0
        },
        {
          "pointer-events": "none"
        }
      ],
      "control_0": [
        {
          "position": "absolute"
        },
        {
          "left": "18%"
        },
        {
          "top": "10.462962962962962%"
        },
        {
          "width": "31.2%"
        },
        {
          "height": "6.111111111111111%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        },
        {
          "pointer-events": "auto"
        },
        {
          "z-index": 5
        }
      ],
      "control_1": [
        {
          "position": "absolute"
        },
        {
          "left": "51.2%"
        },
        {
          "top": "10.462962962962962%"
        },
        {
          "width": "32.8%"
        },
        {
          "height": "6.111111111111111%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        },
        {
          "pointer-events": "auto"
        },
        {
          "z-index": 5
        }
      ],
      "control_2": [
        {
          "position": "absolute"
        },
        {
          "left": "84.3%"
        },
        {
          "top": "10.462962962962962%"
        },
        {
          "width": "26.6%"
        },
        {
          "height": "6.111111111111111%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        },
        {
          "pointer-events": "auto"
        },
        {
          "z-index": 5
        }
      ],
      "control_3": [
        {
          "position": "absolute"
        },
        {
          "left": "87%"
        },
        {
          "top": "2.2222222222222223%"
        },
        {
          "width": "22%"
        },
        {
          "height": "2.2222222222222223%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        },
        {
          "pointer-events": "auto"
        },
        {
          "z-index": 5
        }
      ],
      "control_4": [
        {
          "position": "absolute"
        },
        {
          "left": "87%"
        },
        {
          "top": "4.722222222222222%"
        },
        {
          "width": "22%"
        },
        {
          "height": "2.4074074074074074%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        },
        {
          "pointer-events": "auto"
        },
        {
          "z-index": 5
        }
      ],
      "control_5": readingHitArea(READING_LAYOUT.source, 0),
      "control_6": readingHitArea(READING_LAYOUT.source, 1),
      "control_7": readingHitArea(READING_LAYOUT.compressor, 0),
      "control_8": readingHitArea(READING_LAYOUT.compressor, 0, 1),
      "control_9": readingHitArea(READING_LAYOUT.heatPump, 0),
      "control_10": readingHitArea(READING_LAYOUT.heatPump, 1),
      "control_11": [
        {
          "position": "absolute"
        },
        {
          "left": "22.2%"
        },
        {
          "top": "57.407407407407405%"
        },
        {
          "width": "35.6%"
        },
        {
          "height": "5.185185185185185%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "control_12": [
        {
          "position": "absolute"
        },
        {
          "left": "27.4%"
        },
        {
          "top": "60.879629629629626%"
        },
        {
          "width": "46%"
        },
        {
          "height": "2.5%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        },
        {
          "pointer-events": "auto"
        },
        {
          "z-index": 5
        }
      ],
      "control_14": [
        {
          "position": "absolute"
        },
        {
          "left": "62.4%"
        },
        {
          "top": "69.30555555555556%"
        },
        {
          "width": "22.4%"
        },
        {
          "height": "8.981481481481483%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        },
        {
          "pointer-events": "auto"
        },
        {
          "z-index": 5
        }
      ],
      "control_15": [
        {
          "position": "absolute"
        },
        {
          "left": "86.4%"
        },
        {
          "top": "69.30555555555556%"
        },
        {
          "width": "22.4%"
        },
        {
          "height": "8.981481481481483%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        },
        {
          "pointer-events": "auto"
        },
        {
          "z-index": 5
        }
      ],
      "control_16": [
        {
          "position": "absolute"
        },
        {
          "left": "62.4%"
        },
        {
          "top": "79.95370370370371%"
        },
        {
          "width": "22.4%"
        },
        {
          "height": "8.981481481481483%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        },
        {
          "pointer-events": "auto"
        },
        {
          "z-index": 5
        }
      ],
      "control_17": [
        {
          "position": "absolute"
        },
        {
          "left": "86.4%"
        },
        {
          "top": "79.95370370370371%"
        },
        {
          "width": "22.4%"
        },
        {
          "height": "8.981481481481483%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        },
        {
          "pointer-events": "auto"
        },
        {
          "z-index": 5
        }
      ],
      "control_18": [
        {
          "position": "absolute"
        },
        {
          "left": "9.3%"
        },
        {
          "top": "92.12962962962963%"
        },
        {
          "width": "5.2%"
        },
        {
          "height": "auto"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        }
      ],
      "control_19": [
        {
          "position": "absolute"
        },
        {
          "left": "22.9%"
        },
        {
          "top": "92.12962962962963%"
        },
        {
          "width": "5.2%"
        },
        {
          "height": "auto"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        }
      ],
      "control_20": [
        {
          "position": "absolute"
        },
        {
          "left": "36.5%"
        },
        {
          "top": "92.12962962962963%"
        },
        {
          "width": "5.2%"
        },
        {
          "height": "auto"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        }
      ],
      "control_21": [
        {
          "position": "absolute"
        },
        {
          "left": "50.1%"
        },
        {
          "top": "92.12962962962963%"
        },
        {
          "width": "5.2%"
        },
        {
          "height": "auto"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        }
      ],
      "control_22": [
        {
          "position": "absolute"
        },
        {
          "left": "63.7%"
        },
        {
          "top": "92.12962962962963%"
        },
        {
          "width": "5.2%"
        },
        {
          "height": "auto"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        }
      ],
      "control_23": [
        {
          "position": "absolute"
        },
        {
          "left": "77.3%"
        },
        {
          "top": "92.12962962962963%"
        },
        {
          "width": "5.2%"
        },
        {
          "height": "auto"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        }
      ],
      "control_24": [
        {
          "position": "absolute"
        },
        {
          "left": "90.9%"
        },
        {
          "top": "92.12962962962963%"
        },
        {
          "width": "5.2%"
        },
        {
          "height": "auto"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 2
        }
      ],
      "history_source_pump": [
        {
          "position": "absolute"
        },
        {
          "left": "7%"
        },
        {
          "top": "19.444444444444443%"
        },
        {
          "width": "14%"
        },
        {
          "height": "13.425925925925926%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_compressor": [
        {
          "position": "absolute"
        },
        {
          "left": "28%"
        },
        {
          "top": "19.444444444444443%"
        },
        {
          "width": "14%"
        },
        {
          "height": "12.962962962962962%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_rpm": [
        {
          "position": "absolute"
        },
        {
          "left": "28%"
        },
        {
          "top": "32.407407407407405%"
        },
        {
          "width": "14%"
        },
        {
          "height": "2.962962962962963%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_heating_pump": [
        {
          "position": "absolute"
        },
        {
          "left": "49%"
        },
        {
          "top": "19.444444444444443%"
        },
        {
          "width": "14%"
        },
        {
          "height": "15.925925925925926%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_hk_target": [
        {
          "position": "absolute"
        },
        {
          "left": "75.522%"
        },
        {
          "top": "18.13888888888889%"
        },
        {
          "width": "17.822%"
        },
        {
          "height": "7.26574074074074%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_hk_flow": [
        {
          "position": "absolute"
        },
        {
          "left": "72.729%"
        },
        {
          "top": "27.99074074074074%"
        },
        {
          "width": "11.039%"
        },
        {
          "height": "5.4185185185185185%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_hk_return": [
        {
          "position": "absolute"
        },
        {
          "left": "84.832%"
        },
        {
          "top": "27.99074074074074%"
        },
        {
          "width": "11.039%"
        },
        {
          "height": "5.4185185185185185%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_hk_pump": [
        {
          "position": "absolute"
        },
        {
          "left": "75.655%"
        },
        {
          "top": "39.68981481481482%"
        },
        {
          "width": "8.645%"
        },
        {
          "height": "8.127777777777778%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_mixer": [
        {
          "position": "absolute"
        },
        {
          "left": "75.655%"
        },
        {
          "top": "48.92592592592593%"
        },
        {
          "width": "8.645%"
        },
        {
          "height": "7.26574074074074%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_energy_0": [
        {
          "position": "absolute"
        },
        {
          "left": "3.6%"
        },
        {
          "top": "70.09259259259258%"
        },
        {
          "width": "29.5%"
        },
        {
          "height": "1.574074074074074%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_energy_1": [
        {
          "position": "absolute"
        },
        {
          "left": "3.6%"
        },
        {
          "top": "71.66666666666666%"
        },
        {
          "width": "29.5%"
        },
        {
          "height": "1.574074074074074%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_energy_2": [
        {
          "position": "absolute"
        },
        {
          "left": "3.6%"
        },
        {
          "top": "73.24074074074073%"
        },
        {
          "width": "29.5%"
        },
        {
          "height": "1.574074074074074%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_energy_3": [
        {
          "position": "absolute"
        },
        {
          "left": "3.6%"
        },
        {
          "top": "74.81481481481481%"
        },
        {
          "width": "29.5%"
        },
        {
          "height": "1.574074074074074%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_energy_4": [
        {
          "position": "absolute"
        },
        {
          "left": "3.6%"
        },
        {
          "top": "76.38888888888889%"
        },
        {
          "width": "29.5%"
        },
        {
          "height": "1.574074074074074%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_energy_5": [
        {
          "position": "absolute"
        },
        {
          "left": "3.6%"
        },
        {
          "top": "77.96296296296296%"
        },
        {
          "width": "29.5%"
        },
        {
          "height": "1.574074074074074%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_energy_6": [
        {
          "position": "absolute"
        },
        {
          "left": "3.6%"
        },
        {
          "top": "79.53703703703704%"
        },
        {
          "width": "29.5%"
        },
        {
          "height": "1.574074074074074%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_energy_7": [
        {
          "position": "absolute"
        },
        {
          "left": "3.6%"
        },
        {
          "top": "81.1111111111111%"
        },
        {
          "width": "29.5%"
        },
        {
          "height": "1.574074074074074%"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "heating_curve_popup": [
        {
          "position": "absolute"
        },
        {
          "left": "92.4%"
        },
        {
          "top": "59.4%"
        },
        {
          "width": "4.0%"
        },
        {
          "height": "3.7037037037%"
        },
        {
          "z-index": 8
        },
        {
          "pointer-events": "auto"
        }
      ],
      "history_surplus": [
        {
          "position": "absolute"
        },
        {
          "left": "54%"
        },
        {
          "top": "57.407407407407405%"
        },
        {
          "width": "24%"
        },
        {
          "height": "5.185185185185185%"
        },
        {
          "transform": "translate(-50%, -50%)"
        },
        {
          "z-index": 5
        },
        {
          "pointer-events": "auto"
        }
      ],
      "verdichter_history_1_0": readingHitArea(READING_LAYOUT.compressor, 1),
      "verdichter_history_1_1": readingHitArea(READING_LAYOUT.compressor, 1, 1),
      "verdichter_history_2_0": readingHitArea(READING_LAYOUT.compressor, 2),
      "verdichter_history_2_1": readingHitArea(READING_LAYOUT.compressor, 2, 1),
      "verdichter_history_3_0": readingHitArea(READING_LAYOUT.compressor, 3),
      "verdichter_history_3_1": readingHitArea(READING_LAYOUT.compressor, 3, 1),
      "verdichter_history_4_0": readingHitArea(READING_LAYOUT.compressor, 4)
    }
  },
  "tap_action": {
    "action": "none"
  },
  "hold_action": {
    "action": "none"
  },
  "extra_styles": [
    ".pump-rotor {",
    "  transform-box: view-box;",
    "  transform-origin: 32px 32px;",
    "}",
    "",
    "@keyframes pump-spin {",
    "  from {",
    "    transform: rotate(0deg);",
    "  }",
    "  to {",
    "    transform: rotate(360deg);",
    "  }",
    "}",
    "",
    "",
    ":host { display: block; width: 100%; }",
    "#container { display: block; width: 100%; min-width: 0; }",
    "#dashboard { display: block; width: 100%; line-height: 0; }",
    "#dashboard > svg { display: block; width: 100% !important; height: auto !important; max-width: none; }",
    ":host {",
    "  --modern-bg: #111820;",
    "  --modern-card: #1C2732;",
    "  --modern-surface: #253341;",
    "  --modern-border: #3B4B58;",
    "  --modern-text: #E6EDF3;",
    "  --modern-secondary: #A4B5C4;",
    "  --modern-accent: #65BDE3;",
    "  --modern-track: #3B4B58;",
    "  --modern-positive: #60AF97;",
    "  --modern-hot: #E18C94;",
    "  --modern-cool: #6BB5D7;",
    "  --modern-success-bg: #1B3B38;",
    "  --modern-error-bg: #3B2C36;",
    "  --modern-info-bg: #1A3B49;",
    "}",
    ""
  ].join("\n"),
  "grid_options": {
    "columns": "full",
    "rows": "auto"
  },
  "update_timer": "1s"
};

const CARD_TYPE = "waermepumpe-dashboard-card";
const EDITOR_TYPE = `${CARD_TYPE}-editor`;

if (!customElements.get(CARD_TYPE)) {
  customElements.define(EDITOR_TYPE, DashboardCardEditor);
  customElements.define(CARD_TYPE, DashboardCard);
  window.customCards ??= [];
  window.customCards.push({
    type: CARD_TYPE,
    name: "Wärmepumpe und Heizkreis",
    description: "Betrieb, Live-Messwerte, Heizkreis, Thermostate und Stromverbrauch der Wärmepumpe.",
  });
}
