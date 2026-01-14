export const REQUESTS = [
    {
        id: 1,
        lat: 40.7580,
        lng: -73.9855,
        price: 0.50,
        title: 'Times Square (NYC)',
        urgent: false,
    },
    {
        id: 2,
        lat: 51.5007,
        lng: -0.1246,
        price: 1.20,
        title: 'Big Ben (London)',
        urgent: true,
    },
    {
        id: 3,
        lat: 35.6595,
        lng: 139.7004,
        price: 2.50,
        title: 'Shibuya Crossing (Tokyo)',
        urgent: true,
    },
    {
        id: 4,
        lat: 38.7223,
        lng: -9.1393,
        price: 0.80,
        title: 'Praça do Comércio (Lisbon)',
        urgent: false,
    },
    {
        id: 5,
        lat: -22.9519,
        lng: -43.2105,
        price: 1.50,
        title: 'Christ the Redeemer (Rio)',
        urgent: false,
    },
    // NYC Cluster (spread out more)
    { id: 6, lat: 40.7484, lng: -73.9857, price: 0.75, title: 'Empire State Building', urgent: true },
    { id: 7, lat: 40.7565, lng: -73.9710, price: 0.60, title: 'Grand Central Terminal', urgent: false },
    { id: 8, lat: 40.7829, lng: -73.9654, price: 1.00, title: 'Central Park (Bethesda)', urgent: false },
    { id: 9, lat: 40.7025, lng: -74.0140, price: 2.00, title: 'Wall Street Bull', urgent: true },
    { id: 10, lat: 40.7089, lng: -73.9980, price: 0.90, title: 'City Hall Park', urgent: false },

    // Lisbon Cluster (spread out more)
    { id: 11, lat: 38.7155, lng: -9.1350, price: 0.70, title: 'Castelo de S. Jorge', urgent: false },
    { id: 12, lat: 38.6916, lng: -9.2160, price: 1.50, title: 'Belém Tower', urgent: true },

    // London Cluster (spread out more)
    { id: 13, lat: 51.5055, lng: -0.0700, price: 1.10, title: 'Tower Bridge', urgent: false },
    { id: 14, lat: 51.5194, lng: -0.1320, price: 0.95, title: 'British Museum', urgent: false },

    // Tokyo Cluster (spread out more)
    { id: 15, lat: 35.7200, lng: 139.8020, price: 2.20, title: 'Ueno Park', urgent: true },
];

// My Requests (Photos I paid for)
export const MY_REQUESTS = [
    { id: '1', location: 'Times Square', price: '€0.50', status: 'Pending', date: '2 mins ago' },
    { id: '2', location: 'Central Park', price: '€0.80', status: 'Delivered', date: '1 hour ago' },
    { id: '3', location: 'Brooklyn Bridge', price: '€0.50', status: 'Pending', date: '2 days ago' },
];

// My Jobs (Photos I took for others)
export const MY_JOBS = [
    { id: '1', location: 'Empire State', earnings: '+€0.40', status: 'Earned', date: '30 mins ago' },
    { id: '2', location: 'Grand Central', earnings: '+€0.80', status: 'Earned', date: 'Yesterday' },
    { id: '3', location: 'Bryant Park', earnings: '+€0.00', status: 'Missed', date: '3 days ago' },
];
