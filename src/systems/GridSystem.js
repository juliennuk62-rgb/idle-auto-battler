// GridSystem — grille 2D pour le combat tour par tour en donjon.
// Gère la structure de données, le pathfinding BFS, le calcul de portée
// Manhattan, et la ligne de vue Bresenham.

import { GRID, TERRAIN } from '../data/dungeonConfig.js';

export class GridSystem {
  constructor() {
    this.cols = GRID.cols;
    this.rows = GRID.rows;
    this.cellSize = GRID.cellSize;
    this.originX = GRID.originX;
    this.originY = GRID.originY;

    // cells[row][col] = { terrain, occupant, tempTerrain, tempDuration }
    this.cells = [];
    this._initCells();
  }

  _initCells() {
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          terrain: 'normal',
          occupant: null,
          tempTerrain: null,   // terrain temporaire (mur de glace, feu, etc.)
          tempDuration: 0,
        });
      }
      this.cells.push(row);
    }
  }

  /** Réinitialise la grille (nouvelle salle). */
  reset() { this._initCells(); }

  // ─── Coordonnées ──────────────────────────────────────────────────────

  /** Centre pixel d'une cellule. */
  cellToPixel(col, row) {
    return {
      x: this.originX + col * this.cellSize + this.cellSize / 2,
      y: this.originY + row * this.cellSize + this.cellSize / 2,
    };
  }

  /** Cellule sous un point pixel (ou null si hors grille). */
  pixelToCell(x, y) {
    const col = Math.floor((x - this.originX) / this.cellSize);
    const row = Math.floor((y - this.originY) / this.cellSize);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return { col, row };
  }

  inBounds(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  // ─── Occupants ────────────────────────────────────────────────────────

  getOccupant(col, row) {
    if (!this.inBounds(col, row)) return null;
    return this.cells[row][col].occupant;
  }

  setOccupant(col, row, fighter) {
    if (!this.inBounds(col, row)) return;
    this.cells[row][col].occupant = fighter;
  }

  clearOccupant(col, row) {
    if (!this.inBounds(col, row)) return;
    this.cells[row][col].occupant = null;
  }

  moveOccupant(fromCol, fromRow, toCol, toRow) {
    const fighter = this.getOccupant(fromCol, fromRow);
    if (!fighter) return;
    this.clearOccupant(fromCol, fromRow);
    this.setOccupant(toCol, toRow, fighter);
    fighter.gridCol = toCol;
    fighter.gridRow = toRow;
  }

  // ─── Terrain ──────────────────────────────────────────────────────────

  getTerrain(col, row) {
    if (!this.inBounds(col, row)) return TERRAIN.wall;
    const cell = this.cells[row][col];
    const tid = cell.tempTerrain || cell.terrain;
    return TERRAIN[tid] || TERRAIN.normal;
  }

  setTerrain(col, row, terrainId) {
    if (!this.inBounds(col, row)) return;
    this.cells[row][col].terrain = terrainId;
  }

  setTempTerrain(col, row, terrainId, duration) {
    if (!this.inBounds(col, row)) return;
    this.cells[row][col].tempTerrain = terrainId;
    this.cells[row][col].tempDuration = duration;
  }

  /** Tick les terrains temporaires (appelé à chaque nouveau round). */
  tickTempTerrain() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (cell.tempTerrain && cell.tempDuration > 0) {
          cell.tempDuration--;
          if (cell.tempDuration <= 0) {
            cell.tempTerrain = null;
          }
        }
      }
    }
  }

  isWalkable(col, row) {
    if (!this.inBounds(col, row)) return false;
    const terrain = this.getTerrain(col, row);
    return terrain.walkable && !this.getOccupant(col, row);
  }

  getMoveCost(col, row) {
    return this.getTerrain(col, row).moveCost ?? 1;
  }

  // ─── BFS — cases accessibles avec PM ─────────────────────────────────

  /**
   * Retourne toutes les cases accessibles depuis (startCol, startRow)
   * avec un budget de PM donné. Chaque résultat contient { col, row, cost, path }.
   */
  getReachableCells(startCol, startRow, pm) {
    const result = [];
    const visited = new Map(); // "col,row" → cost
    const queue = [{ col: startCol, row: startRow, cost: 0, path: [] }];
    visited.set(`${startCol},${startRow}`, 0);

    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // cardinal

    while (queue.length > 0) {
      const current = queue.shift();

      for (const [dc, dr] of dirs) {
        const nc = current.col + dc;
        const nr = current.row + dr;
        if (!this.inBounds(nc, nr)) continue;

        const moveCost = this.getMoveCost(nc, nr);
        const totalCost = current.cost + moveCost;
        if (totalCost > pm) continue;

        const terrain = this.getTerrain(nc, nr);
        if (!terrain.walkable) continue;

        // Case occupée = BLOQUANTE. On ne peut ni s'y arrêter ni la traverser.
        // Il faut contourner les unités (alliées et ennemies).
        const occupant = this.getOccupant(nc, nr);
        if (occupant) continue;

        const key = `${nc},${nr}`;
        const prev = visited.get(key);
        if (prev !== undefined && prev <= totalCost) continue;
        visited.set(key, totalCost);

        const newPath = [...current.path, { col: nc, row: nr }];
        result.push({ col: nc, row: nr, cost: totalCost, path: newPath });
        queue.push({ col: nc, row: nr, cost: totalCost, path: newPath });
      }
    }

    return result;
  }

  // ─── Portée Manhattan ─────────────────────────────────────────────────

  /**
   * Cases à portée Manhattan [minRange, maxRange] depuis (col, row).
   * needsLOS = true → filtre par ligne de vue.
   */
  getCellsInRange(fromCol, fromRow, minRange, maxRange, needsLOS = false) {
    const result = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const dist = Math.abs(c - fromCol) + Math.abs(r - fromRow);
        if (dist < minRange || dist > maxRange) continue;
        if (needsLOS && !this.hasLineOfSight(fromCol, fromRow, c, r)) continue;
        result.push({ col: c, row: r, distance: dist });
      }
    }
    return result;
  }

  /** Distance Manhattan entre deux cellules. */
  manhattan(c1, r1, c2, r2) {
    return Math.abs(c1 - c2) + Math.abs(r1 - r2);
  }

  // ─── Ligne de vue (Bresenham) ─────────────────────────────────────────

  hasLineOfSight(fromCol, fromRow, toCol, toRow) {
    // Bresenham's line algorithm
    let x0 = fromCol, y0 = fromRow;
    const x1 = toCol, y1 = toRow;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      // On skip la case de départ et d'arrivée pour le check LdV
      if ((x0 !== fromCol || y0 !== fromRow) && (x0 !== toCol || y0 !== toRow)) {
        const terrain = this.getTerrain(x0, y0);
        if (terrain.losBlocking) return false;
      }

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx)  { err += dx; y0 += sy; }
    }

    return true;
  }

  // ─── AoE shapes ───────────────────────────────────────────────────────

  /**
   * Retourne les cellules affectées par une AoE.
   * @param {string} shape — 'single', 'cross', 'circle', 'line', 'cone'
   * @param {number} centerCol, centerRow — point de ciblage
   * @param {number} size — rayon (circle), longueur (line), etc.
   * @param {number} dirCol, dirRow — direction pour line/cone (normalisée)
   */
  getAoeCells(shape, centerCol, centerRow, size, dirCol = 0, dirRow = 0) {
    const cells = [];

    switch (shape) {
      case 'single':
        cells.push({ col: centerCol, row: centerRow });
        break;

      case 'cross':
        cells.push({ col: centerCol, row: centerRow });
        for (let i = 1; i <= size; i++) {
          cells.push({ col: centerCol + i, row: centerRow });
          cells.push({ col: centerCol - i, row: centerRow });
          cells.push({ col: centerCol, row: centerRow + i });
          cells.push({ col: centerCol, row: centerRow - i });
        }
        break;

      case 'circle':
        for (let r = -size; r <= size; r++) {
          for (let c = -size; c <= size; c++) {
            if (Math.abs(r) + Math.abs(c) <= size) {
              cells.push({ col: centerCol + c, row: centerRow + r });
            }
          }
        }
        break;

      case 'line':
        for (let i = 0; i <= size; i++) {
          cells.push({
            col: centerCol + dirCol * i,
            row: centerRow + dirRow * i,
          });
        }
        break;

      case 'cone':
        // Cône de largeur croissante dans une direction
        for (let i = 1; i <= size; i++) {
          // Case centrale de la ligne
          const mc = centerCol + dirCol * i;
          const mr = centerRow + dirRow * i;
          cells.push({ col: mc, row: mr });
          // Cases latérales (perpendiculaires)
          const perpC = dirRow; // perpendiculaire
          const perpR = -dirCol;
          for (let w = 1; w <= Math.floor(i / 2); w++) {
            cells.push({ col: mc + perpC * w, row: mr + perpR * w });
            cells.push({ col: mc - perpC * w, row: mr - perpR * w });
          }
        }
        break;
    }

    // Filtre les cellules hors grille
    return cells.filter(c => this.inBounds(c.col, c.row));
  }

  // ─── Voisins ──────────────────────────────────────────────────────────

  getNeighbors(col, row) {
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    return dirs
      .map(([dc, dr]) => ({ col: col + dc, row: row + dr }))
      .filter(n => this.inBounds(n.col, n.row));
  }

  /** Vérifie si deux cellules sont adjacentes (Manhattan = 1). */
  isAdjacent(c1, r1, c2, r2) {
    return this.manhattan(c1, r1, c2, r2) === 1;
  }
}
