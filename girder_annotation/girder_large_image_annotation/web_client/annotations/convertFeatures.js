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
    const heatmap = heatmapLayer.createFeature('heatmap', {
        style: {
            radius: record.radius || 25,
            blurRadius: 0,
            gaussian: true,
            color: {
                0: record.zeroColor || {r: 0, g: 0, b: 0, a: 0},
                1: record.maxColor || {r: 1, g: 1, b: 0, a: 1}
            }
        },
        position: (d) => ({x: d[0], y: d[1], z: d[2]}),
        intensity: (d) => d[3] || 0,
        maxIntensity: null,
        minIntensity: 0,
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
    const heatmap = heatmapLayer.createFeature('heatmap', {
        style: {
            radius: record.radius || 25,
            blurRadius: 0,
            gaussian: true,
            color: {
                0: record.zeroColor || {r: 0, g: 0, b: 0, a: 0},
                1: record.maxColor || {r: 1, g: 1, b: 0, a: 1}
            }
        },
        position: (d, i) => ({
            x: x0 + dx * (i % record.gridWidth),
            y: y0 + dy * Math.floor(i / record.gridWidth),
            z: z}),
        intensity: (d) => d || 0,
        maxIntensity: null,
        minIntensity: 0,
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
