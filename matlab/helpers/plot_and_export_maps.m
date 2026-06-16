function plot_and_export_maps(latGrid, lonGrid, dataGrid, towers, titleText, colorbarLabel, outFile)
%PLOT_AND_EXPORT_MAPS Draw a contour heatmap and save it to disk.

fig = figure("Color", "w", "Position", [80, 60, 1200, 900]);
gx = geoaxes(fig, "Position", [0.08, 0.10, 0.74, 0.82]);
geobasemap(gx, "streets-light");
hold(gx, "on");
geoscatter(gx, latGrid(:), lonGrid(:), 10, dataGrid(:), "filled", ...
	"MarkerFaceAlpha", 0.35, "MarkerEdgeAlpha", 0.08);
geoscatter(gx, towers.Latitude, towers.Longitude, 28, [0.02, 0.02, 0.02], "^", "filled");
hold(gx, "off");

title(gx, titleText, "Color", [0, 0, 0], "FontSize", 17, "FontWeight", "bold");
gx.FontSize = 14;
gx.LineWidth = 1.1;
if isprop(gx, "FontColor")
	gx.FontColor = [0, 0, 0];
end
if isprop(gx, "LatitudeAxis") && isprop(gx.LatitudeAxis, "Color")
	gx.LatitudeAxis.Color = [0, 0, 0];
end
if isprop(gx, "LongitudeAxis") && isprop(gx.LongitudeAxis, "Color")
	gx.LongitudeAxis.Color = [0, 0, 0];
end
if isprop(gx, "Toolbar") && ~isempty(gx.Toolbar)
	gx.Toolbar.Visible = "off";
end

cb = colorbar(gx);
cb.Label.String = colorbarLabel;
cb.Label.Color = [0, 0, 0];
cb.Color = [0, 0, 0];
cb.FontSize = 13;

exportgraphics(fig, outFile, "Resolution", 300);
close(fig);
end
