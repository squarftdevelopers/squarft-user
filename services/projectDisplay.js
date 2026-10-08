const EMPTY_VALUES = new Set(['none', 'null', 'undefined', 'n/a', 'na']);

export function cleanProjectText(value) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!text || EMPTY_VALUES.has(text.toLowerCase())) return '';
    return text;
}

export function maskProjectName(value) {
    const name = cleanProjectText(value);
    if (!name) return '';
    return `${name.slice(0, 4)}****`;
}

const firstValue = (...values) => values.find((value) => {
    if (value === null || value === undefined || value === '') return false;
    return cleanProjectText(value) !== '';
});

const addUniquePart = (parts, value) => {
    const text = cleanProjectText(value);
    if (!text) return;

    const lower = text.toLowerCase();
    if (parts.some((part) => part.toLowerCase() === lower || part.toLowerCase().includes(lower))) return;
    parts.push(text);
};

export function buildProjectAddress(project = {}) {
    const parts = [];
    const fullAddress = firstValue(
        project.full_address,
        project.project_address,
        project.address,
        project.address_line,
        project.address_line_1
    );

    addUniquePart(parts, fullAddress || project.location);
    addUniquePart(parts, project.locality);
    addUniquePart(parts, project.area);
    addUniquePart(parts, project.city);
    addUniquePart(parts, project.state);
    addUniquePart(parts, project.pincode || project.pin_code || project.zipcode);

    return parts.join(', ');
}

export function parseProjectPriceAmount(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;

    const text = cleanProjectText(value).toLowerCase().replace(/,/g, '');
    if (!text || text.includes('request')) return null;

    const match = text.match(/\d+(?:\.\d+)?/);
    if (!match) return null;

    const number = Number(match[0]);
    if (!Number.isFinite(number) || number <= 0) return null;

    const suffixText = text.slice(match.index + match[0].length).trim();
    if (/^(cr|crore|crores)\b/.test(suffixText) || /\d(?:\.\d+)?\s*(cr|crore|crores)\b/.test(text)) {
        return number * 10000000;
    }
    if (/^(l|lac|lakh|lakhs)\b/.test(suffixText) || /\d(?:\.\d+)?\s*(l|lac|lakh|lakhs)\b/.test(text)) {
        return number * 100000;
    }
    return number;
}

export function formatProjectPriceAmount(value) {
    const amount = parseProjectPriceAmount(value);
    if (!amount) return '';

    if (amount >= 10000000) {
        const crores = amount / 10000000;
        return `₹${Number.isInteger(crores) ? crores.toFixed(0) : crores.toFixed(1)} Cr`;
    }

    if (amount >= 100000) {
        const lakhs = amount / 100000;
        return `₹${Number.isInteger(lakhs) ? lakhs.toFixed(0) : lakhs.toFixed(1)} L`;
    }

    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

const firstPriceAmount = (...values) => {
    for (const value of values) {
        const amount = parseProjectPriceAmount(value);
        if (amount) return amount;
    }
    return null;
};

const collectVariantPrices = (variants) => {
    if (!Array.isArray(variants)) return [];
    return variants
        .flatMap((variant) => [
            variant?.price_from,
            variant?.min_price,
            variant?.base_price,
            variant?.price,
            variant?.price_to,
            variant?.max_price,
        ])
        .map(parseProjectPriceAmount)
        .filter(Boolean);
};

export function buildProjectPrice(project = {}) {
    const min = firstPriceAmount(
        project.property_min_price,
        project.lowest_property_price,
        project.display_price_from,
        project.inventory_min_price,
        project.price_from,
        project.min_price,
        project.price_min,
        project.budget_min,
        project.budgetMin,
        project.starting_from,
        project.starting_price,
        project.base_price
    );
    const max = firstPriceAmount(
        project.property_max_price,
        project.highest_property_price,
        project.display_price_to,
        project.inventory_max_price,
        project.price_to,
        project.max_price,
        project.price_max,
        project.budget_max,
        project.budgetMax
    );

    if (min && max && min !== max) return `${formatProjectPriceAmount(min)} - ${formatProjectPriceAmount(max)}`;
    if (min) return formatProjectPriceAmount(min);
    if (max) return formatProjectPriceAmount(max);

    const variantPrices = collectVariantPrices(project.variants);
    if (variantPrices.length > 0) {
        const variantMin = Math.min(...variantPrices);
        const variantMax = Math.max(...variantPrices);
        return variantMin !== variantMax
            ? `${formatProjectPriceAmount(variantMin)} - ${formatProjectPriceAmount(variantMax)}`
            : formatProjectPriceAmount(variantMin);
    }

    const displayPrice = firstValue(
        project.display_price,
        project.price_display,
        project.formatted_price,
        project.price_range,
        project.priceRange,
        project.priceINR,
        project.price,
        project.avgPricePerSqft,
        project.avg_price_per_sqft
    );

    return cleanProjectText(displayPrice);
}

export function normalizeProject(project = {}, index = 0, prefix = 'project') {
    const id = project.id ?? project.project_id ?? project.slug ?? `${prefix}-${index}`;
    const name = cleanProjectText(project.name)
        || cleanProjectText(project.title)
        || cleanProjectText(project.project_name)
        || cleanProjectText(project.projectTitle)
        || 'Project';
    const location = buildProjectAddress(project);
    const price = buildProjectPrice(project);
    const image = project.cover_image_url
        ?? project.image_url
        ?? project.cover_image
        ?? project.image
        ?? project.imageMain
        ?? null;

    return {
        ...project,
        id,
        title: name,
        name,
        location: location || cleanProjectText(project.location),
        display_location: location || cleanProjectText(project.location),
        address: location || cleanProjectText(project.address),
        image,
        image_url: image,
        price_from: project.property_min_price ?? project.price_from ?? project.min_price ?? project.priceFrom ?? project.starting_from ?? project.starting_price,
        price_to: project.property_max_price ?? project.price_to ?? project.max_price ?? project.priceTo,
        priceINR: price || cleanProjectText(project.priceINR),
        priceRange: price || cleanProjectText(project.priceRange || project.price_range),
        display_price: price,
    };
}

export function normalizeProjectList(payload, prefix = 'project') {
    const list = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.data)
            ? payload.data
            : (payload?.data?.projects || payload?.projects || []));
    return list.map((project, index) => normalizeProject(project, index, prefix));
}
