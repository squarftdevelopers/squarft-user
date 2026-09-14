import { expect, test } from '@jest/globals';
import { applyProjectFilters, calculateDistanceKm, parseProjectKeywordSearch } from '../services/projectFilters';

const projects = [
  {
    id: 'aurum',
    name: 'Aurum Heights',
    city: 'Indore',
    area: 'Vijay Nagar',
    location: 'Vijay Nagar, Indore, 452010',
    latitude: 22.7531,
    longitude: 75.8934,
    property_type: 'apartment',
    available_subtypes: ['apartment'],
    available_configurations: ['2 BHK', '3 BHK'],
    price_from: 4200000,
    price_to: 9800000,
    total_area: 1250,
    possession_status: 'under_construction',
    rera_approved: true,
  },
  {
    id: 'emerald',
    name: 'Emerald Courtyard Villas',
    city: 'Indore',
    area: 'Nipania',
    location: 'Nipania, Indore, 452016',
    latitude: 22.7639,
    longitude: 75.9241,
    property_type: 'villa',
    available_subtypes: ['villa'],
    available_configurations: ['3 BHK', '4 BHK'],
    price_from: 12500000,
    price_to: 21500000,
    total_area: 3100,
    possession_status: 'in_3_years',
    rera_approved: true,
  },
  {
    id: 'metro',
    name: 'Metro Square Shops',
    city: 'Indore',
    area: 'Super Corridor',
    location: 'Super Corridor, Indore, 452005',
    latitude: 22.7204,
    longitude: 75.8074,
    property_type: 'commercial',
    available_subtypes: ['shop', 'showroom', 'office'],
    available_configurations: ['Retail Shop', 'Showroom', 'Office Studio'],
    price_from: 1800000,
    price_to: 7600000,
    total_area: 650,
    possession_status: 'under_construction',
    rera_approved: true,
  },
  {
    id: 'palm',
    name: 'Palm Grove Rowhouses',
    city: 'Bhopal',
    area: 'Kolar Road',
    location: 'Kolar Road, Bhopal, 462042',
    latitude: 23.1765,
    longitude: 77.4189,
    property_type: 'villa',
    available_subtypes: ['rowhouse'],
    available_configurations: ['3 BHK', '4 BHK'],
    price_from: 7200000,
    price_to: 13800000,
    total_area: 2100,
    possession_status: 'in_3_years',
    rera_approved: false,
  },
];

const defaultFilter = {
  address: '',
  locationCoordinates: null,
  searchQuery: '',
  tags: [],
  propertyTypes: [],
  propertySubTypes: [],
  budgetRange: [2000000, 50000000],
  areaRange: [0, 5000],
  possessionStatus: [],
  reraOnly: false,
};

const ids = (items) => items.map((item) => item.id);

test('filters by property type and BHK subtype', () => {
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, propertyTypes: ['Apartment'] }))).toEqual(['aurum']);
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, propertyTypes: ['Villa'], propertySubTypes: ['4 BHK'] }))).toEqual(['emerald']);
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, propertyTypes: ['Rowhouse'], propertySubTypes: ['4 BHK'] }))).toEqual(['palm']);
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, propertyTypes: ['Shop'] }))).toEqual(['metro']);
});

test('filters by budget and area range', () => {
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, budgetRange: [10000000, 25000000] }))).toEqual(['emerald', 'palm']);
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, areaRange: [0, 1000] }))).toEqual(['metro']);
});

test('filters by possession and RERA status', () => {
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, possessionStatus: ['Under Construction'] }))).toEqual(['aurum', 'emerald', 'metro', 'palm']);
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, reraOnly: true }))).toEqual(['aurum', 'emerald', 'metro']);
});

test('filters by search query and text address', () => {
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, searchQuery: '3 bhk villa in Indore' }))).toEqual(['emerald']);
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, address: 'Super Corridor' }))).toEqual(['metro']);
});

test('filters near selected location coordinates within default radius', () => {
  const selected = { latitude: 22.7533, longitude: 75.8937 };
  expect(calculateDistanceKm(selected.latitude, selected.longitude, projects[0].latitude, projects[0].longitude)).toBeLessThan(1);
  expect(ids(applyProjectFilters(projects, { ...defaultFilter, locationCoordinates: selected }))).toEqual(['aurum', 'emerald', 'metro']);
});

test('parses combined property, BHK, location, budget, area, and amenity keywords', () => {
  const keywordProjects = [
    {
      id: 'vijay-rowhouse', city: 'Indore', area: 'Vijay Nagar', available_subtypes: ['rowhouse'],
      inventory_configurations: [{ configuration: '2 BHK', inventory_type: 'rowhouse', min_price: 1200000, max_price: 1450000, min_area_sqft: 500 }],
    },
    {
      id: 'retail-shop', city: 'Indore', area: 'Palasia', available_subtypes: ['shop'],
      inventory_configurations: [{ configuration: 'Retail Shop', inventory_type: 'shop', min_price: 900000, max_price: 1400000, min_area_sqft: 320 }],
    },
    {
      id: 'vijay-plot', city: 'Indore', area: 'Vijay Nagar', available_subtypes: ['plot'],
      inventory_configurations: [{ configuration: 'Residential Plot', inventory_type: 'plot', min_price: 1600000, max_price: 1900000, min_area_sqft: 500 }],
    },
    {
      id: 'mumbai-villa', city: 'Mumbai', area: 'Andheri', available_subtypes: ['villa'], amenities: ['Swimming Pool'],
      inventory_configurations: [{ configuration: '4 BHK', inventory_type: 'villa', min_price: 18000000, max_price: 22000000, min_area_sqft: 2800 }],
    },
  ];

  expect(parseProjectKeywordSearch('Shop under 15 Lakh').maxBudget).toBe(1500000);
  expect(ids(applyProjectFilters(keywordProjects, { ...defaultFilter, searchQuery: '2BHK rowhouse in Vijay nagar' }))).toEqual(['vijay-rowhouse']);
  expect(ids(applyProjectFilters(keywordProjects, { ...defaultFilter, searchQuery: 'Shop in Indore under 15 Lakh' }))).toEqual(['retail-shop']);
  expect(ids(applyProjectFilters(keywordProjects, { ...defaultFilter, searchQuery: '500 squarefeet plots under 20 Lakh' }))).toEqual(['vijay-plot']);
  expect(ids(applyProjectFilters(keywordProjects, { ...defaultFilter, searchQuery: 'Villa in mumbai with pool' }))).toEqual(['mumbai-villa']);
});

test('branch selection excludes other branches in the same city and unassigned projects', () => {
  const list = [
    { ...projects[0], id: 'a', branch_id: 'branch-a' },
    { ...projects[0], id: 'b', branch_id: 'branch-b' },
    { ...projects[0], id: 'unassigned', branch_id: null },
  ];
  expect(applyProjectFilters(list, { branchId: 'branch-a' }).map((p) => p.id)).toEqual(['a']);
  expect(applyProjectFilters(list, { branchId: 'missing' })).toEqual([]);
  expect(applyProjectFilters(list, {})).toHaveLength(3);
  expect(applyProjectFilters(list, { branchId: 'branch-a', searchQuery: 'does-not-exist' })).toEqual([]);
});

test('current location uses the map picker radius and excludes missing coordinates', () => {
  const list = [
    { id: 'near', latitude: 22.72, longitude: 75.86 },
    { id: 'far', latitude: 23.0, longitude: 75.86 },
    { id: 'unknown' },
  ];
  expect(applyProjectFilters(list, { locationCoordinates: { latitude: 22.72, longitude: 75.86 } }).map((p) => p.id)).toEqual(['near']);
});
