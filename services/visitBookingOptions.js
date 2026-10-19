import { getProjectPropertyCardConfig } from "./propertyConfiguration.js";

export function buildVisitOptions(project) {
    const rawOptions = project?.floorPlans?.length ? project.floorPlans : (project?.variants || []);
    // A project-panel project has one inventory row per physical unit. Show
    // each configuration once, rather than exposing every duplicate unit.
    const configuredOptions = rawOptions.filter((option) => String(option?.configuration || '').trim());
    const options = configuredOptions.length > 0 ? configuredOptions : rawOptions;
    const grouped = new Map();

    options.forEach((option) => {
        const label = getProjectPropertyCardConfig(option) || option.title || option.type || "Property";
        const key = label.trim().toLowerCase();
        const existing = grouped.get(key);
        const linkedPropertyId = option.property_id || option.source_property_id || (!option.configuration ? option.id : null);

        if (!existing) {
            grouped.set(key, {
                ...option,
                title: label,
                property_id: linkedPropertyId,
                unitCount: 1,
            });
            return;
        }

        existing.unitCount += 1;
        // Prefer a representative that is linked to a bookable property.
        if (!existing.property_id && linkedPropertyId) {
            existing.property_id = linkedPropertyId;
        }
    });

    const result = [...grouped.values()];
    const propertyIds = new Set(result.map(option => option.property_id).filter(Boolean));
    for (const property of project?.resaleProperties || []) {
        const propertyId = property.property_id || property.id;
        if (!propertyId || propertyIds.has(propertyId)) continue;
        result.push({
            ...property, property_id: propertyId, isResale: true, unitCount: 1,
            image: property.cover_image || property.image,
            area_sqft: property.total_area_sqft || property.area_sqft,
            title: property.title || getProjectPropertyCardConfig(property) || 'Resale property',
        });
        propertyIds.add(propertyId);
    }
    return result.map(option => ({...option, visitKey: String(option.property_id || option.title)}));
}

