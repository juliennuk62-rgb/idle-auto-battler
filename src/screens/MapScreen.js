// MapScreen — carte du monde pixel art avec 6 zones biomes cliquables.
// Zones débloquées = colorées + cliquables. Verrouillées = grisées.
// Clic sur zone débloquée → lance le combat dans ce biome.

import { WorldSystem } from '../systems/WorldSystem.js';
import { attachGuideButton } from '../ui/GuideModal.js';

// Positions des zones sur la carte (en % de l'image, responsive).
// À ajuster une fois que l'image réelle est générée.
// Positions calibrées sur la carte pixel art générée par l'utilisateur.
// Coordonnées en % de l'image (responsive).
const ZONE_POSITIONS = {
  forest: { x: 22, y: 78, label: 'Forêt' },
  caves:  { x: 35, y: 48, label: 'Grottes' },
  ruins:  { x: 42, y: 22, label: 'Ruines' },
  hell:   { x: 72, y: 18, label: 'Enfer' },
  snow:   { x: 55, y: 65, label: 'Neige' },
  temple: { x: 92, y: 32, label: 'Temple' },
};

// Le donjon est maintenant accessible depuis le menu principal, pas la carte.

export class MapScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen map-screen';
    this.el.innerHTML = `
      <div class="map-header">
        <button class="map-back-btn" id="map-back">← Menu</button>
        <span class="map-title">CARTE DU MONDE</span>
        <div id="map-guide"></div>
      </div>
      <div class="map-container" id="map-container">
        <img src="assets/sprites/map/world_map.png" class="map-image" alt="Carte du monde"
             onerror="this.style.display='none'" />
        <div class="map-zones" id="map-zones"></div>
      </div>
    `;

    this.el.querySelector('#map-back').addEventListener('click', () => {
      this.onNavigate('menu');
    });

    attachGuideButton(this.el.querySelector('#map-guide'), 'map');
  }

  show() {
    document.body.append(this.el);
    this._renderZones();
  }

  hide() {
    this.el.remove();
  }

  /**
   * Dessine des lignes pointillées SVG entre les zones consécutives.
   * Les chemins cleared sont verts, les chemins locked sont gris.
   */
  _renderPaths(container) {
    const order = ['forest', 'caves', 'ruins', 'hell', 'snow', 'temple'];
    const zones = WorldSystem.getAllZones();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'map-paths-svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    for (let i = 0; i < order.length - 1; i++) {
      const from = ZONE_POSITIONS[order[i]];
      const to = ZONE_POSITIONS[order[i + 1]];
      if (!from || !to) continue;

      const fromZone = zones.find(z => z.id === order[i]);
      const toZone = zones.find(z => z.id === order[i + 1]);
      const isActive = fromZone?.cleared;
      const isNew = fromZone?.cleared && !toZone?.cleared && toZone?.unlocked;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      line.setAttribute('class', `map-path ${isActive ? 'active' : 'inactive'} ${isNew ? 'new' : ''}`);
      svg.append(line);
    }

    container.append(svg);
  }

  _renderZones() {
    const container = this.el.querySelector('#map-zones');
    container.innerHTML = '';

    // Dessine les chemins (pointillés SVG) entre les zones connectées.
    this._renderPaths(container);

    const zones = WorldSystem.getAllZones();
    for (const zone of zones) {
      const pos = ZONE_POSITIONS[zone.id];
      if (!pos) continue;

      const div = document.createElement('div');
      div.className = `map-zone ${zone.unlocked ? 'unlocked' : 'locked'} ${zone.cleared ? 'cleared' : ''}`;
      div.style.left = `${pos.x}%`;
      div.style.top = `${pos.y}%`;
      div.innerHTML = `
        <div class="map-zone-dot"></div>
        <div class="map-zone-label">${pos.label}</div>
        ${zone.cleared ? '<div class="map-zone-check">✓</div>' : ''}
        ${!zone.unlocked ? '<div class="map-zone-lock">🔒</div>' : ''}
        ${zone.bestWave > 0 ? `<div class="map-zone-wave">W${zone.bestWave}</div>` : ''}
      `;

      if (zone.unlocked) {
        div.addEventListener('click', () => {
          this.onNavigate('combat', { biomeId: zone.id });
        });
      }

      container.append(div);
    }

    // Le donjon est dans le menu principal, pas sur la carte.
  }
}
