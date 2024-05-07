const mapContainer = d3.select("body > #map-container");
const { width, height } = mapContainer.node().getBoundingClientRect();
let global_data = [];

// map settings
const tileSize = 256 / window.devicePixelRatio;
const tilesUrl = (x, y, z) => {
	return `tiles/${z}/${x}/${y}.jpg`;
};
const mapboxTilesUrl = (x, y, z) => {
	return `https://api.mapbox.com/styles/v1/iosonosempreio/clv6veu0c00nd01qrfhbj3bpo/tiles/${z}/${x}/${y}?access_token=${mapbox_access_token}`;
};
const scaleExtent = [1 << 12, 1 << 25];
const initialScale = scaleExtent[0];
const initialCenter = [11.647, 42.416];

const projection = d3
	.geoMercator()
	.scale(1 / (2 * Math.PI))
	.translate([0, 0]);

const render = d3.geoPath(projection);

// simulation settings
const iterations = 4;
const simulation = d3
	.forceSimulation(global_data)
	.force(
		"x",
		d3.forceX((d) => d.x)
	)
	.force(
		"y",
		d3.forceY((d) => d.y)
	)
	.force(
		"collide",
		d3.forceCollide().radius((d) => d.r).iterations(8)
	)
	.stop();

const svg = mapContainer.append("svg").attr("viewBox", [0, 0, width, height]);

const tile = d3
	.tile()
	.extent([
		[0, 0],
		[width, height],
	])
	.tileSize(tileSize);

const tileCustom = d3
	.tile()
	.extent([
		[0, 0],
		[width, height],
	])
	.tileSize(tileSize);

const zoom = d3
	.zoom()
	.scaleExtent(scaleExtent)
	.extent([
		[0, 0],
		[width, height],
	])
	.on("zoom", ({ transform }) => zoomed(transform));

// mapbox tiles used as reference
const g = svg.append("g").attr("pointer-events", "none");
let image = g.selectAll(".image");

// custom tiles created with qgis
const gCustom = svg.append("g").attr("pointer-events", "none");
let imageCustom = gCustom.selectAll(".imageCustom");

const gPlaces = svg.append("g");
let place = gPlaces.selectAll(".place");

const locations_data = d3.csv("locations_obfuscated.csv").then((locations_data) => {
	global_data = locations_data;
	global_data.forEach((d) => {
		const projected_points = projection([d.longitude, d.latitude]);
		d.x = projected_points[0];
		d.y = projected_points[1];
		d.r = 5;
	});

	place = place
		.data(global_data, (d) => d.place)
		.join("g")
		.classed("place", true);
	place.append("circle").attr("r", 4);

	simulation.nodes(global_data);
	simulation.on("tick", () => {
		console.log(simulation.alpha());
		place.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
	});
	simulation.tick(iterations);
	place.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

	return locations_data;
});

svg.call(zoom).call(
	zoom.transform,
	d3.zoomIdentity
		.translate(width / 2, height / 2)
		.scale(-initialScale)
		.translate(...projection(initialCenter))
		.scale(-1)
);

function zoomed(transform) {
	simulation.stop();
	const tiles = tile(transform);

	image = image
		.data(tiles, (d) => d)
		.join("image")
		.attr("class", "image")
		// .attr("xlink:href", (d) => mapboxTilesUrl(...d))
		.attr("x", ([x]) => (x + tiles.translate[0]) * tiles.scale)
		.attr("y", ([, y]) => (y + tiles.translate[1]) * tiles.scale)
		.attr("width", tiles.scale)
		.attr("height", tiles.scale);

	imageCustom = imageCustom
		.data(tiles, (d) => d)
		.join("image")
		.attr("class", "imageCustom")
		.attr("xlink:href", (d) => tilesUrl(...d))
		.attr("onerror", "this.style.display='none'")
		.attr("x", ([x]) => (x + tiles.translate[0]) * tiles.scale)
		.attr("y", ([, y]) => (y + tiles.translate[1]) * tiles.scale)
		.attr("width", tiles.scale)
		.attr("height", tiles.scale);

	projection.scale(transform.k / (2 * Math.PI)).translate([transform.x, transform.y]);

	// const places_projected = place.data().map((d) => {
	// 	const projected_points = projection([d.longitude, d.latitude]);
	// 	d.x = projected_points[0];
	// 	d.y = projected_points[1];
	// 	return { ...d, x: d.x, y: d.y };
	// });
	// place.data(places_projected, (d) => d.place);

	global_data.forEach((d) => {
		const projected_points = projection([d.longitude, d.latitude]);
		d.x = projected_points[0];
		d.y = projected_points[1];
	});
	simulation.nodes(global_data);
	simulation.tick(iterations);
	place.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
}
