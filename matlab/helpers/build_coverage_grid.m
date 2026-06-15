function [latGrid, lonGrid, latVec, lonVec] = build_coverage_grid(towers, spacingM, marginM)
%BUILD_COVERAGE_GRID Build a lat/lon mesh that bounds all towers plus margin.

latMin = min(towers.Latitude);
latMax = max(towers.Latitude);
lonMin = min(towers.Longitude);
lonMax = max(towers.Longitude);

meanLat = mean([latMin, latMax]);
metersPerDegLat = 111320;
metersPerDegLon = 111320 * cosd(meanLat);

latMarginDeg = marginM / metersPerDegLat;
lonMarginDeg = marginM / metersPerDegLon;

latMin = latMin - latMarginDeg;
latMax = latMax + latMarginDeg;
lonMin = lonMin - lonMarginDeg;
lonMax = lonMax + lonMarginDeg;

latStepDeg = spacingM / metersPerDegLat;
lonStepDeg = spacingM / metersPerDegLon;

latVec = (latMin:latStepDeg:latMax).';
lonVec = lonMin:lonStepDeg:lonMax;
[lonGrid, latGrid] = meshgrid(lonVec, latVec);
end
