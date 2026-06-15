function plot_and_export_maps(latGrid, lonGrid, dataGrid, towers, titleText, colorbarLabel, outFile)
%PLOT_AND_EXPORT_MAPS Draw a contour heatmap and save it to disk.

fig = figure("Color", "w", "Position", [60, 60, 960, 720]);
contourf(lonGrid, latGrid, dataGrid, 24, "LineStyle", "none");
hold on;
plot(towers.Longitude, towers.Latitude, "k^", "MarkerFaceColor", "w", "MarkerSize", 5);
hold off;
axis tight;
xlabel("Longitude (deg)");
ylabel("Latitude (deg)");
title(titleText);
cb = colorbar;
cb.Label.String = colorbarLabel;
grid on;

exportgraphics(fig, outFile, "Resolution", 300);
close(fig);
end
