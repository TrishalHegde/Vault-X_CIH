export interface Route {
  id: string;
  name: string;
  waypoints: [number, number][]; // [lat, lng]
}

// Waypoints roughly tracing shipping lanes around India
export const MARITIME_ROUTES: Route[] = [
  {
    id: 'ROUTE-MUM-KOCHI',
    name: 'Mumbai to Kochi',
    waypoints: [
      [18.9220, 72.8347], // Mumbai
      [17.0, 72.5],
      [15.0, 73.0],
      [12.9259, 74.7937], // Mangalore (passing)
      [11.0, 75.5],
      [9.9312, 76.2673]   // Kochi
    ]
  },
  {
    id: 'ROUTE-KOCHI-CHENNAI',
    name: 'Kochi to Chennai',
    waypoints: [
      [9.9312, 76.2673],  // Kochi
      [8.0, 76.5],        // South of India
      [5.5, 78.0],        // South of Sri Lanka
      [6.0, 81.5],
      [8.0, 82.5],
      [11.0, 81.0],
      [13.0827, 80.2707]  // Chennai
    ]
  },
  {
    id: 'ROUTE-CHENNAI-HALDIA',
    name: 'Chennai to Haldia',
    waypoints: [
      [13.0827, 80.2707], // Chennai
      [15.0, 81.5],
      [17.6868, 83.2185], // Visakhapatnam
      [20.2662, 86.6796], // Paradip
      [21.6013, 88.0837]  // Haldia
    ]
  },
  {
    id: 'ROUTE-KANDLA-MUMBAI',
    name: 'Kandla to Mumbai',
    waypoints: [
      [23.0116, 70.2185], // Kandla
      [22.0, 69.0],
      [20.5, 70.5],
      [18.9220, 72.8347]  // Mumbai
    ]
  }
];
