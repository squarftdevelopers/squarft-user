const cleanValue = (value) => String(value ?? '').trim();

const toTitleCase = (value) => cleanValue(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const CONFIG_SUBTYPES = new Set(['apartment', 'rowhouse', 'villa']);

const getBedroomLabel = (property = {}) => {
    const bedrooms = Number(property.bedrooms);
    return Number.isInteger(bedrooms) && bedrooms > 0 ? `${bedrooms} BHK` : '';
};

const getConfigurationLabel = (property = {}) => {
    const configuration = cleanValue(property.configuration)
        .replace(/^(\d+)\s*bhk$/i, '$1 BHK')
        .replace(/^(\d+)\s*rk$/i, '$1 RK');
    return configuration;
};

export const getPropertySubtypeLabel = (property = {}) => {
    const subtype = cleanValue(property.sub_type || property.property_subtype);
    return subtype ? toTitleCase(subtype) : '';
};

export const getProjectPropertyCardConfig = (property = {}) => {
    const subtype = cleanValue(property.sub_type || property.property_subtype || property.property_type || property.type).toLowerCase();
    const subtypeLabel = subtype ? toTitleCase(subtype) : '';
    const configuration = getConfigurationLabel(property);

    if (CONFIG_SUBTYPES.has(subtype)) {
        // Inventory from the Project Panel has an explicit configuration.
        // It is the buyer's choice (for example 2 BHK), so it always takes
        // precedence over an internal or descriptive inventory title.
        const configLabel = configuration || getBedroomLabel(property) || cleanValue(property.description);
        if (configLabel && subtypeLabel && configLabel.toLowerCase().includes(subtypeLabel.toLowerCase())) {
            return configLabel;
        }
        return [configLabel, subtypeLabel].filter(Boolean).join(' • ');
    }

    return configuration || subtypeLabel;
};
