import { latLngToCell, cellToLatLng, gridDisk } from 'h3-js';

const H3_RESOLUTION = 9;

export class H3Engine {
  private geofencedCells: Set<string>;

  constructor() {
    this.geofencedCells = new Set<string>();
  }

  /**
   * Converts latitude and longitude to an H3 cell index string.
   */
  public getCell(lat: number, lng: number): string {
    return latLngToCell(lat, lng, H3_RESOLUTION);
  }

  /**
   * Returns the center latitude and longitude of a given H3 cell.
   */
  public getLatLng(cell: string): [number, number] {
    return cellToLatLng(cell);
  }

  /**
   * Generates a disk of cells around a center cell with a given radius (k).
   */
  public getDisk(centerCell: string, k: number): string[] {
    return gridDisk(centerCell, k);
  }

  /**
   * Adds a cell to the O(1) HashSet lookup for geofencing or violation checks.
   */
  public addGeofencedCell(cell: string): void {
    this.geofencedCells.add(cell);
  }

  /**
   * Removes a cell from the HashSet.
   */
  public removeGeofencedCell(cell: string): void {
    this.geofencedCells.delete(cell);
  }

  /**
   * O(1) lookup to check if a cell is inside the HashSet.
   */
  public isGeofenced(cell: string): boolean {
    return this.geofencedCells.has(cell);
  }
  
  /**
   * Clear all geofenced cells
   */
  /**
   * Returns all currently geofenced cells.
   */
  public getGeofencedCells(): string[] {
    return Array.from(this.geofencedCells);
  }
}
