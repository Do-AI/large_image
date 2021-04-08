/**
 * Create a color table that can be used for a heatmap.
 *
 * @param record: the heatmap or griddata heatmap annotation element.
 * @param values: a list of data values.
 * @returns: an object with:
 *      color: a color object that can be passed to the heatmap.
 *      min: the minIntensity for the heatmap.
 *      max: the maxIntensity for the heatmap.
 */
function heatmapColorTable(record, values) {
    let range0 = 0;
    let range1 = 1;
    if (record.normalizeRange !== true) {
        range0 = range1 = values[0] || 0;
        for (let i = 1; i < values.length; i += 1) {
            let val = values[i] || 0;
            if (val < range0) {
                range0 = val;
            }
            if (val > range1) {
                range1 = val;
            }
        }
    }
    let color = {
        0: {r: 0, g: 0, b: 0, a: 0},
        1: {r: 1, g: 1, b: 0, a: 1}
    };
    let rangeMin, rangeMax;
    if (record.colorRange && record.rangeValues) {
        for (let i = 0; i < record.colorRange.length && i < record.rangeValues.length; i += 1) {
            let val = (record.rangeValues[i] - range0) / ((range1 - range0) || 1);
            if (rangeMin === undefined || val < rangeMin) {
                rangeMin = val;
            }
            if (rangeMax === undefined || val < rangeMax) {
                rangeMax = val;
            }
            color[val] = record.colorRange[i];
        }
    }
    return {
        color: color,
        min: record.normalizeRange === true || rangeMin === undefined ? 0 : rangeMin,
        max: record.normalizeRange === true || rangeMax === undefined ? range1 : rangeMax
    };
}

/**
 * Convert a heatmap annotation to a geojs feature.
 *
 * @param record: the heatmap annotation element.
 * @param properties: a property map of additional data, such as the original
 *      annotation id.
 * @param layer: the layer where this may be added.
 */
function convertHeatmap(record, properties, layer) {
    /* Heatmaps need to be in their own layer */
    const map = layer.map();
    const heatmapLayer = map.createLayer('feature', {features: ['heatmap']});
    const colorTable = heatmapColorTable(record, record.points.map((d) => d[3]));
    const heatmap = heatmapLayer.createFeature('heatmap', {
        style: {
            radius: record.radius || 25,
            blurRadius: 0,
            gaussian: true,
            color: colorTable.color
        },
        position: (d) => ({x: d[0], y: d[1], z: d[2]}),
        intensity: (d) => d[3] || 0,
        minIntensity: colorTable.min,
        maxIntensity: colorTable.max,
        updateDelay: 100
    }).data(record.points);
    heatmap._ownLayer = true;
    return [heatmap];
}

/**
 * Convert a griddata heatmap annotation to a geojs feature.
 *
 * @param record: the griddata heatmap annotation element.
 * @param properties: a property map of additional data, such as the original
 *      annotation id.
 * @param layer: the layer where this may be added.
 */
function convertGridToHeatmap(record, properties, layer) {
    /* Heatmaps need to be in their own layer */
    const map = layer.map();
    const heatmapLayer = map.createLayer('feature', {features: ['heatmap']});
    const x0 = (record.origin || [0, 0, 0])[0] || 0;
    const y0 = (record.origin || [0, 0, 0])[1] || 0;
    const z = (record.origin || [0, 0, 0])[2] || 0;
    const dx = (record.dx || 1);
    const dy = (record.dy || 1);
    const colorTable = heatmapColorTable(record, record.values);
    const heatmap = heatmapLayer.createFeature('heatmap', {
        style: {
            radius: record.radius || 25,
            blurRadius: 0,
            gaussian: true,
            color: colorTable.color
        },
        position: (d, i) => ({
            x: x0 + dx * (i % record.gridWidth),
            y: y0 + dy * Math.floor(i / record.gridWidth),
            z: z}),
        intensity: (d) => d || 0,
        minIntensity: colorTable.min,
        maxIntensity: colorTable.max,
        updateDelay: 100
    }).data(record.values);
    heatmap._ownLayer = true;
    return [heatmap];
}

const converters = {
    griddata_heatmap: convertGridToHeatmap,
    heatmap: convertHeatmap
};

export default function convertFeatures(json, properties = {}, layer) {
    try {
        var features = [];
        json.forEach((element) => {
            const func = converters[element.type + '_' + element.interpretation] || converters[element.type];
            if (func) {
                features = features.concat(func(element, properties, layer));
            }
        });
        return features;
    } catch (err) {
        console.error(err);
    }
}
