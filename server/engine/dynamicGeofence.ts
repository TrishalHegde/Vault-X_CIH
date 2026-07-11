import { H3Engine } from './h3';

export interface DynamicGeofence {
  id: string;
  lat: number;
  lng: number;
  radiusK: number; // radius in terms of H3 k-rings
  active: boolean;
}

export class DynamicGeofenceManager {
  private h3Engine: H3Engine;
  private activeGeofences: Map<string, DynamicGeofence>;

  constructor(h3Engine: H3Engine) {
    this.h3Engine = h3Engine;
    this.activeGeofences = new Map<string, DynamicGeofence>();
  }

  /**
   * Adds a dynamic geofence by converting a lat/lng + radius to H3 cells
   * and storing them in the H3Engine HashSet.
   */
  public addGeofence(id: string, lat: number, lng: number, radiusK: number = 2): void {
    const centerCell = this.h3Engine.getCell(lat, lng);
    const cells = this.h3Engine.getDisk(centerCell, radiusK);

    cells.forEach(cell => {
      this.h3Engine.addGeofencedCell(cell);
    });

    this.activeGeofences.set(id, { id, lat, lng, radiusK, active: true });
  }

  /**
   * Removes a dynamic geofence.
   * Note: If geofences overlap, this simple removal might remove shared cells.
   * For production, a reference count per cell is recommended.
   */
  public removeGeofence(id: string): void {
    const gf = this.activeGeofences.get(id);
    if (!gf) return;

    const centerCell = this.h3Engine.getCell(gf.lat, gf.lng);
    const cells = this.h3Engine.getDisk(centerCell, gf.radiusK);

    cells.forEach(cell => {
      this.h3Engine.removeGeofencedCell(cell);
    });

    this.activeGeofences.delete(id);
  }

  public getActiveGeofences(): DynamicGeofence[] {
    return Array.from(this.activeGeofences.values());
  }
}
