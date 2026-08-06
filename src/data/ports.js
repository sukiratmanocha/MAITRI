export const countries = [
    {
        code: 'IN',
        name: 'India',
        flag: '🇮🇳',
        ports: [
            { code: 'INJNP', name: 'JNPA (Nhava Sheva)', city: 'Mumbai', phase: 1 },
            { code: 'INDPA', name: 'DPA (Deendayal Port)', city: 'Kandla', phase: 1 },
            { code: 'INKDL', name: 'Kandla', city: 'Kutch', phase: 1 },
            { code: 'INBOM', name: 'Mumbai Port', city: 'Mumbai', phase: 2 },
            { code: 'INMUN', name: 'Mundra', city: 'Kutch', phase: 2 },
            { code: 'INHAZ', name: 'Hazira', city: 'Surat', phase: 2 },
            { code: 'INCOK', name: 'Cochin', city: 'Kochi', phase: 2 },
        ],
    },
    {
        code: 'AE',
        name: 'UAE',
        flag: '🇦🇪',
        ports: [
            { code: 'AEJEA', name: 'Jebel Ali', city: 'Dubai', phase: 1 },
            { code: 'AEKHL', name: 'Khalifa', city: 'Abu Dhabi', phase: 1 },
            { code: 'AEFUJ', name: 'Fujairah', city: 'Fujairah', phase: 2 },
            { code: 'AEKHF', name: 'Khor Fakkan', city: 'Sharjah', phase: 2 },
        ],
    },
];

export const portals = {
    india: [
        { name: 'MSW-Sagar Setu', type: 'Marine Portal' },
        { name: 'TOS', type: 'Terminal Operating System' },
        { name: 'ICEGATE', type: 'Customs Portal' },
    ],
    uae: [
        { name: 'DP World', type: 'Port Operator' },
        { name: 'AD Ports', type: 'Port Operator' },
        { name: 'Dubai Customs', type: 'Customs' },
        { name: 'Abu Dhabi Customs', type: 'Customs' },
        { name: 'Dubai Trade', type: 'Trade Portal' },
        { name: 'Fujairah Customs', type: 'Customs' },
        { name: 'Khor Fakkan Customs', type: 'Customs' },
    ],
};

export const roles = [
    { id: 'port_authority', label: 'Port Authority', icon: '🏗️' },
    { id: 'customs', label: 'Customs', icon: '🛃' },
    { id: 'shipping_line', label: 'Shipping Line', icon: '🚢' },
    { id: 'exporter', label: 'Exporter', icon: '📦' },
    { id: 'importer', label: 'Importer', icon: '📥' },
    { id: 'cha', label: 'CHA (Customs House Agent)', icon: '📋' },
    { id: 'mto', label: 'MTO (Multimodal Transport)', icon: '🚛' },
];

export const integrationStatus = [
    {
        id: 1,
        route: 'JNPA → Jebel Ali',
        routeReverse: 'Jebel Ali → JNPA',
        bidirectional: true,
        entities: [
            { name: 'TOS (CCS DP World)', status: 'operational' },
            { name: 'DP World', status: 'operational' },
            { name: 'Dubai Customs', status: 'operational' },
            { name: 'MSW-Sagar Setu', status: 'operational' },
            { name: 'ICEGATE', status: 'operational' },
        ],
    },
    {
        id: 2,
        route: 'JNPA → Khalifa',
        routeReverse: 'Khalifa → JNPA',
        bidirectional: true,
        entities: [
            { name: 'TOS (NSFT)', status: 'partial', note: 'One-way (NSFT → MAITRI). No reverse call from Abu Dhabi.' },
            { name: 'AD Customs', status: 'operational' },
            { name: 'MSW-Sagar Setu', status: 'operational' },
            { name: 'AD Ports', status: 'operational' },
            { name: 'ICEGATE', status: 'operational' },
            { name: 'TOS (BMCT)', status: 'partial', note: 'One-way (BMCT → MAITRI). No reverse call from Abu Dhabi.' },
        ],
    },
    {
        id: 3,
        route: 'Kandla → Jebel Ali',
        routeReverse: 'Jebel Ali → Kandla',
        bidirectional: true,
        entities: [
            { name: 'TOS (KICT)', status: 'partial', note: 'One-way. No API from KICT for MAITRI → KICT.' },
            { name: 'DP World', status: 'in_progress', note: 'UAT in progress from KICT → MAITRI.' },
            { name: 'Dubai Customs', status: 'operational' },
            { name: 'MSW-Sagar Setu', status: 'not_started', note: 'No integration between MSW and Kandla.' },
            { name: 'ICEGATE', status: 'operational' },
        ],
    },
    {
        id: 4,
        route: 'Kandla → Khalifa',
        routeReverse: 'Khalifa → Kandla',
        bidirectional: true,
        entities: [
            { name: 'TOS (KICT)', status: 'partial', note: 'One-way. No API from KICT.' },
            { name: 'AD Ports', status: 'partial', note: 'One-way. No API from KICT.' },
            { name: 'AD Customs', status: 'operational', note: 'No messages received from Abu Dhabi Customs.' },
            { name: 'MSW-Sagar Setu', status: 'not_started', note: 'No integration between MSW and Kandla.' },
        ],
    },
];
