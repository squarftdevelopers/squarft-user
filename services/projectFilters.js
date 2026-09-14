import { parseProjectPriceAmount } from './projectDisplay';

export const BUDGET_MIN = 2000000;
export const BUDGET_MAX = 50000000;
export const AREA_MIN = 0;
export const AREA_MAX = 5000;
export const LOCATION_RADIUS_KM = 10;

export const normalizeFilterText = (value) => String(value ?? '').toLowerCase().trim();

export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const latitude1 = Number(lat1);
  const longitude1 = Number(lon1);
  const latitude2 = Number(lat2);
  const longitude2 = Number(lon2);

  if (![latitude1, longitude1, latitude2, longitude2].every(Number.isFinite)) return null;

  const earthRadiusKm = 6371;
  const dLat = (latitude2 - latitude1) * Math.PI / 180;
  const dLon = (longitude2 - longitude1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(latitude1 * Math.PI / 180) * Math.cos(latitude2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const getSearchText = (project) => [
  project.name,
  project.title,
  project.project_name,
  project.property_name,
  project.area,
  project.city,
  project.location,
  project.pincode,
  project.category,
  project.property_type,
  project.property_subtype,
  project.propertySubtype,
  project.sub_type,
  project.type,
  project.amenities,
  project.world_class_amenities,
  project.features,
  project.highlights,
  ...(Array.isArray(project.available_subtypes) ? project.available_subtypes : []),
  ...(Array.isArray(project.available_configurations) ? project.available_configurations : []),
  ...getNestedUnits(project).flatMap((unit) => [
    unit?.configuration,
    unit?.inventory_type,
    unit?.property_type,
    unit?.title,
    unit?.amenities,
  ]),
].flatMap((value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value.name, value.label, value.title, value.category];
  return value;
}).map(normalizeFilterText).filter(Boolean).join(' ');

const getNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const number = Number(String(value).replace(/[^0-9.]/g, ''));
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
};

export const getNestedUnits = (project) => [
  ...(Array.isArray(project.variants) ? project.variants : []),
  ...(Array.isArray(project.floorPlans) ? project.floorPlans : []),
  ...(Array.isArray(project.floor_plans) ? project.floor_plans : []),
  ...(Array.isArray(project.properties) ? project.properties : []),
  ...(Array.isArray(project.units) ? project.units : []),
  ...(Array.isArray(project.inventory) ? project.inventory : []),
  ...(Array.isArray(project.inventory_units) ? project.inventory_units : []),
  ...(Array.isArray(project.inventory_configurations) ? project.inventory_configurations : []),
];

const firstProjectPrice = (...values) => {
  for (const value of values) {
    const amount = parseProjectPriceAmount(value);
    if (amount) return amount;
  }
  return null;
};

const collectVariantPrices = (project) => getNestedUnits(project)
  .flatMap((unit) => [
    unit?.price,
    unit?.base_price,
    unit?.price_from,
    unit?.min_price,
    unit?.price_to,
    unit?.max_price,
    unit?.priceRange,
    unit?.price_range,
  ])
  .map(parseProjectPriceAmount)
  .filter(Boolean);

export const getProjectPriceRange = (project) => {
  const variantPrices = collectVariantPrices(project);
  const min = firstProjectPrice(
    project.price_from,
    project.min_price,
    project.budgetMin,
    project.priceMin,
    project.base_price,
    project.property_min_price,
    project.inventory_min_price,
    project.inventoryMinPrice,
    project.display_price,
    project.priceRange,
    project.price_range,
    project.priceINR,
    project.price,
  ) ?? (variantPrices.length ? Math.min(...variantPrices) : null);
  const max = firstProjectPrice(
    project.price_to,
    project.max_price,
    project.budgetMax,
    project.priceMax,
    project.property_max_price,
    project.inventory_max_price,
    project.inventoryMaxPrice,
    project.display_price,
    project.priceRange,
    project.price_range,
    project.priceINR,
    project.price,
  ) ?? (variantPrices.length ? Math.max(...variantPrices) : min);
  return { min, max };
};

export const getSortPrice = (project) => {
  const priceRange = getProjectPriceRange(project);
  return priceRange.min || priceRange.max || null;
};

export const getCreatedTime = (project) => {
  const value = project.created_at || project.createdAt || project.updated_at || project.updatedAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

export const getProjectArea = (project) => getNumber(
  project.total_area_sqft,
  project.area_sqft,
  project.areaSqft,
  project.total_area,
  project.carpet_area,
  ...getNestedUnits(project).flatMap((unit) => [unit?.area_sqft, unit?.area, unit?.carpet_area, unit?.min_area_sqft]),
);

const SEARCH_PROPERTY_TYPES = [
  ['apartment', ['apartment', 'apartments', 'flat', 'flats']],
  ['villa', ['villa', 'villas', 'bungalow', 'bungalows']],
  ['plot', ['plot', 'plots', 'land']],
  ['shop', ['shop', 'shops']],
  ['showroom', ['showroom', 'showrooms']],
  ['office', ['office', 'offices']],
  ['rowhouse', ['rowhouse', 'rowhouses', 'row house', 'row houses', 'townhouse', 'townhouses']],
];

const SEARCH_STOP_WORDS = new Set(['in', 'at', 'near', 'with', 'and', 'for', 'the', 'a', 'an', 'property', 'properties', 'project', 'projects', 'under', 'below', 'upto', 'up', 'to', 'above', 'over', 'less', 'than', 'more', 'within']);

const parseIndianAmount = (amount, unit) => {
  const value = Number(String(amount).replace(/,/g, ''));
  if (!Number.isFinite(value) || value <= 0) return null;
  const normalizedUnit = String(unit || '').toLowerCase();
  if (/^(l|lac|lakh)/.test(normalizedUnit)) return value * 100000;
  if (/^(cr|crore)/.test(normalizedUnit)) return value * 10000000;
  return value >= 100000 ? value : null;
};

export const parseProjectKeywordSearch = (value = '') => {
  const query = normalizeFilterText(value).replace(/\s+/g, ' ');
  const propertyTypes = SEARCH_PROPERTY_TYPES
    .filter(([, aliases]) => aliases.some((alias) => new RegExp(`\\b${alias.replace(/ /g, '\\s+')}\\b`, 'i').test(query)))
    .map(([type]) => type);
  const bhkMatch = query.match(/\b([1-5])\s*\+?\s*(?:bhk|bedroom|bed)\b/i);
  const areaMatch = query.match(/\b([\d,]+)\s*(?:sq\.?\s*(?:ft|feet)|square\s*(?:ft|feet|foot))\b/i);
  const areaSqft = areaMatch ? Number(String(areaMatch[1]).replace(/,/g, '')) : null;
  const amountPattern = '(?:₹\\s*)?([\\d,.]+)\\s*(l|lac|lakh|lakhs|cr|crore|crores)\\b';
  const budgetMatch = query.match(new RegExp(`\\b(?:under|below|upto|up to|less than|within)\\s*${amountPattern}`, 'i'))
    || query.match(new RegExp(`\\b${amountPattern}`, 'i'));
  const minimumBudgetMatch = query.match(new RegExp(`\\b(?:above|over|more than)\\s*${amountPattern}`, 'i'));
  const maxBudget = budgetMatch ? parseIndianAmount(budgetMatch[1], budgetMatch[2]) : null;
  const minBudget = minimumBudgetMatch ? parseIndianAmount(minimumBudgetMatch[1], minimumBudgetMatch[2]) : null;

  let remaining = query
    .replace(/\b[1-5]\s*\+?\s*(?:bhk|bedroom|bed)\b/gi, ' ')
    .replace(/\b[\d,]+\s*(?:sq\.?\s*(?:ft|feet)|square\s*(?:ft|feet|foot))\b/gi, ' ')
    .replace(new RegExp(`\\b(?:under|below|upto|up to|less than|within|above|over|more than)?\\s*${amountPattern}`, 'gi'), ' ');
  SEARCH_PROPERTY_TYPES.forEach(([, aliases]) => aliases.forEach((alias) => {
    remaining = remaining.replace(new RegExp(`\\b${alias.replace(/ /g, '\\s+')}\\b`, 'gi'), ' ');
  }));
  const terms = remaining
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !SEARCH_STOP_WORDS.has(term));

  return {
    query,
    propertyTypes,
    bhk: bhkMatch?.[1] || null,
    areaSqft: Number.isFinite(areaSqft) && areaSqft > 0 ? areaSqft : null,
    minBudget,
    maxBudget,
    terms,
  };
};

export const matchesPropertyType = (project, selectedTypes = []) => {
  if (selectedTypes.length === 0) return true;

  if (Array.isArray(project.available_subtypes) && project.available_subtypes.length > 0) {
    const subtypes = project.available_subtypes.map(normalizeFilterText);
    return selectedTypes.some((type) => {
      const selected = normalizeFilterText(type);
      return subtypes.some((subtype) => subtype === selected || subtype === `${selected}s` || `${subtype}s` === selected);
    });
  }

  const units = getNestedUnits(project);
  if (units.length > 0) {
    const unitTypes = units
      .flatMap((unit) => [unit?.property_type, unit?.property_subtype, unit?.sub_type, unit?.type, unit?.inventory_type, unit?.subType])
      .filter(Boolean)
      .map(normalizeFilterText);

    if (unitTypes.length > 0) {
      return selectedTypes.some((type) => {
        const selected = normalizeFilterText(type);
        return unitTypes.some((unitType) => unitType === selected || unitType === `${selected}s` || `${unitType}s` === selected);
      });
    }
  }

  const projectTypes = [
    project.property_type,
    project.property_subtype,
    project.propertySubtype,
    project.category,
    project.type,
  ].filter(Boolean).map(normalizeFilterText);

  return selectedTypes.some((type) => {
    const selected = normalizeFilterText(type);
    return projectTypes.some((projectType) => projectType === selected || projectType === `${selected}s` || `${projectType}s` === selected);
  });
};

export const getBhkValues = (project) => {
  const values = new Set();
  const fields = [
    project.bedrooms,
    project.bhk,
    project.bhk_config,
    project.configuration,
    project.configurations,
    project.configs,
    ...(Array.isArray(project.available_configurations) ? project.available_configurations : []),
    project.property_subtype,
    project.propertySubtype,
    project.sub_type,
    ...(Array.isArray(project.subTypes) ? project.subTypes : []),
    ...getNestedUnits(project).flatMap((unit) => [
      unit?.bedrooms,
      unit?.bhk,
      unit?.configuration,
      unit?.property_subtype,
      unit?.sub_type,
      unit?.type,
      unit?.title,
    ]),
  ];

  fields.forEach((field) => {
    const text = normalizeFilterText(field);
    if (!text) return;

    const matches = text.match(/\d+\+?(?=\s*(?:bhk|bed|bedroom)\b)/g) || [];
    matches.forEach((match) => values.add(match.trim()));

    if (text.includes('bhk')) {
      const looseMatches = text.match(/\d+\+?/g) || [];
      looseMatches.forEach((match) => values.add(match.trim()));
    }

    const plainNumber = Number(text);
    if (Number.isFinite(plainNumber) && plainNumber > 0) values.add(String(plainNumber));
  });

  return values;
};

export const matchesBhk = (project, selectedSubTypes = []) => {
  if (selectedSubTypes.length === 0) return true;

  const bhkValues = getBhkValues(project);
  return selectedSubTypes.some((subType) => {
    const selected = normalizeFilterText(subType).replace(/\s*bhk/g, '').trim();
    const selectedNumber = parseFloat(selected);
    const selectedIsPlus = selected.includes('+');

    return [...bhkValues].some((value) => {
      const bhkNumber = parseFloat(value);
      if (!Number.isFinite(bhkNumber)) return false;
      if (selectedIsPlus) return bhkNumber >= selectedNumber;
      return bhkNumber === selectedNumber;
    });
  });
};

export const getPossessionStatuses = (project) => {
  const values = [
    project.possessionStatus,
    project.possession_status,
    project.possession,
    project.possession_date,
    project.expected_possession_date,
    project.expectedPossessionDate,
    ...getNestedUnits(project).flatMap((unit) => [unit?.possessionStatus, unit?.possession_status, unit?.possession, unit?.possession_date]),
  ];

  const statuses = new Set();

  values.forEach((value) => {
    const text = normalizeFilterText(value);
    if (!text) return;

    if (text.includes('ready') || text.includes('immediate') || text.includes('completed')) {
      statuses.add('Ready to Move');
      return;
    }

    if (text.includes('under') || text.includes('construction') || text.includes('upcoming') || text.includes('pending') || text.includes('year')) {
      statuses.add('Under Construction');
      return;
    }

    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      statuses.add(parsedDate.getTime() <= Date.now() ? 'Ready to Move' : 'Under Construction');
    }
  });

  return statuses;
};

export const getPossessionStatus = (project) => {
  const statuses = getPossessionStatuses(project);
  if (statuses.size > 0) return [...statuses][0];

  const text = normalizeFilterText(project.possessionStatus || project.possession_status || project.possession || project.possession_date);
  if (!text) return '';
  if (text.includes('ready') || text.includes('immediate')) return 'Ready to Move';
  if (text.includes('under') || text.includes('construction')) return 'Under Construction';
  return project.possessionStatus || project.possession_status || project.possession || project.possession_date;
};

export function isReraApproved(item = {}) {
  if (item?.rera && typeof item.rera === 'object' && item.rera.is_approved !== undefined) {
    return Boolean(item.rera.is_approved);
  }

  if (item?.rera && typeof item.rera === 'object' && item.rera.approved !== undefined) {
    return Boolean(item.rera.approved);
  }

  if (item?.rera_approved !== undefined) return Boolean(item.rera_approved);
  if (item?.reraApproved !== undefined) return Boolean(item.reraApproved);
  if (item?.rea_approved !== undefined) return Boolean(item.rea_approved);
  if (item?.is_rea_approved !== undefined) return Boolean(item.is_rea_approved);
  if (typeof item?.rera === 'boolean') return item.rera;
  if (typeof item?.rera_status === 'string') return item.rera_status.toLowerCase() === 'approved';
  if (typeof item?.rea_status === 'string') return item.rea_status.toLowerCase() === 'approved';

  return Boolean(item?.rera_id || item?.reraId || item?.rera_number || item?.reraNumber);
}

export const applyProjectFilters = (projects = [], filter = {}, options = {}) => {
  const radiusKm = options.radiusKm || LOCATION_RADIUS_KM;

  return projects.filter((project) => {
    if (filter.branchId && String(project.branch_id || '').toLowerCase() !== String(filter.branchId).toLowerCase()) return false;
    const searchText = getSearchText(project);

    if (filter.locationCoordinates) {
      const projectLat = project.latitude ?? project.lat ?? project.project_latitude;
      const projectLng = project.longitude ?? project.lng ?? project.lon ?? project.project_longitude;
      const distance = calculateDistanceKm(
        filter.locationCoordinates.latitude,
        filter.locationCoordinates.longitude,
        projectLat,
        projectLng,
      );

      if (distance === null || distance > radiusKm) return false;
    } else if (filter.address) {
      const query = normalizeFilterText(filter.address);
      if (query && !searchText.includes(query)) return false;
    }

    if (filter.searchQuery) {
      const keywordSearch = parseProjectKeywordSearch(filter.searchQuery);
      if (keywordSearch.bhk && !matchesBhk(project, [`${keywordSearch.bhk} BHK`])) return false;
      if (keywordSearch.propertyTypes.length > 0 && !matchesPropertyType(project, keywordSearch.propertyTypes)) return false;

      const priceRange = getProjectPriceRange(project);
      if (keywordSearch.minBudget && (!priceRange.max || priceRange.max < keywordSearch.minBudget)) return false;
      if (keywordSearch.maxBudget && (!priceRange.min || priceRange.min > keywordSearch.maxBudget)) return false;

      if (keywordSearch.areaSqft) {
        const projectArea = getProjectArea(project);
        if (!projectArea || projectArea < keywordSearch.areaSqft * 0.9 || projectArea > keywordSearch.areaSqft * 1.1) return false;
      }

      if (keywordSearch.terms.some((term) => !searchText.includes(term))) return false;
    }

    if (!matchesPropertyType(project, filter.propertyTypes || [])) return false;
    if (!matchesBhk(project, filter.propertySubTypes || [])) return false;

    const priceRange = getProjectPriceRange(project);
    const budget = filter.budgetRange || [BUDGET_MIN, BUDGET_MAX];
    const budgetLowerActive = budget[0] > BUDGET_MIN;
    const budgetUpperActive = budget[1] < BUDGET_MAX;
    if ((budgetLowerActive || budgetUpperActive) && (!priceRange.min || !priceRange.max)) return false;
    if (budgetLowerActive && priceRange.max < budget[0]) return false;
    if (budgetUpperActive && priceRange.min > budget[1]) return false;

    const projectArea = getProjectArea(project);
    const area = filter.areaRange || [AREA_MIN, AREA_MAX];
    const areaLowerActive = area[0] > AREA_MIN;
    const areaUpperActive = area[1] < AREA_MAX;
    if ((areaLowerActive || areaUpperActive) && !projectArea) return false;
    if (areaLowerActive && projectArea < area[0]) return false;
    if (areaUpperActive && projectArea > area[1]) return false;

    if ((filter.possessionStatus || []).length > 0) {
      const statuses = getPossessionStatuses(project);
      if (!filter.possessionStatus.some((status) => statuses.has(status) || status === getPossessionStatus(project))) return false;
    }

    if (filter.reraOnly && !isReraApproved(project)) return false;

    return true;
  });
};

export const hasActiveProjectFilters = (filter = {}) => Boolean(
  filter.address
  || filter.locationCoordinates
  || filter.searchQuery
  || (filter.tags || []).length
  || (filter.propertyTypes || []).length
  || (filter.propertySubTypes || []).length
  || (filter.possessionStatus || []).length
  || filter.reraOnly
  || (filter.budgetRange && (filter.budgetRange[0] > BUDGET_MIN || filter.budgetRange[1] < BUDGET_MAX))
  || (filter.areaRange && (filter.areaRange[0] > AREA_MIN || filter.areaRange[1] < AREA_MAX))
);
