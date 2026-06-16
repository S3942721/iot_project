%% EEET2370/2371 Topic 1 NB-IoT coverage project
% This script runs the full simulation and exports report-ready figures.

%% 1) Setup
clear;
clc;

addpath(fullfile(fileparts(mfilename("fullpath")), "helpers"));

cfg = project_config();
if ~exist(cfg.paths.figureDir, "dir")
	mkdir(cfg.paths.figureDir);
end

requiredFunctions = ["txsite", "rxsite", "sigstrength", "propagationModel"];
missingFunctions = strings(0, 1);
for i = 1:numel(requiredFunctions)
	if isempty(which(char(requiredFunctions(i))))
		missingFunctions(end + 1, 1) = requiredFunctions(i); %#ok<SAGROW>
	end
end

if ~isempty(missingFunctions)
	error("Missing required MATLAB functions: %s", strjoin(missingFunctions, ", "));
end

%% 2) Load Inputs
fprintf("Loading tower locations...\n");
towers = load_tower_locations(cfg.files.towerCsv);

%% 3) Build Transmitter Sites and Noise Model
fprintf("Creating sectorized transmitter sites...\n");
txDirectional = create_sector_sites(towers, cfg, true);
txIsotropic = create_sector_sites(towers, cfg, false);

fprintf("Computing effective noise power...\n");
noise = compute_effective_noise(cfg);

%% 4) BLER Curves and Thresholds
fprintf("Running NPDSCH BLER simulation example...\n");
bler = simulate_bler_npdsch(cfg.bler.requiredRepetitions, cfg.files.blerCacheMat, cfg.bler.snrSweepDb);

snrThresholdRep = zeros(size(cfg.bler.requiredRepetitions));
for i = 1:numel(cfg.bler.requiredRepetitions)
	snrThresholdRep(i) = snr_for_bler_target(bler.SNRdB, bler.curves(i, :), cfg.bler.targetThreshold);
end

%% 5) Adaptive Domain and Propagation Maps
fprintf("Building coverage grid and enforcing BLER threshold crossing...\n");
[latGrid, lonGrid, rssLongleyDirectional, snrLongleyDirectional, selectedMarginM] = ...
	compute_snr_map_with_threshold_crossing(towers, txDirectional, cfg, noise, min(snrThresholdRep));
cellAreaKm2 = (cfg.grid.spacingM^2) / 1e6;
fprintf("Selected grid margin: %.0f m\n", selectedMarginM);
fprintf("Directional SNR range across selected grid: [%.3f, %.3f] dB\n", ...
	min(snrLongleyDirectional, [], "all"), max(snrLongleyDirectional, [], "all"));

fprintf("Computing free-space RSS map for model sanity check...\n");
rssFreeSpaceDirectional = compute_best_server_rss( ...
	txDirectional, latGrid, lonGrid, cfg.radio.rxHeightM, "freespace");

fprintf("Computing isotropic baseline map...\n");
rssLongleyIsotropic = compute_best_server_rss( ...
	txIsotropic, latGrid, lonGrid, cfg.radio.rxHeightM, "longley-rice");

%% 6) Plot and Export Mandatory Figures
fprintf("Exporting mandatory figures...\n");
plot_tower_locations(towers, fullfile(cfg.paths.figureDir, cfg.output.towerFigure));
plot_bler_curves(bler, cfg.bler.targetThreshold, fullfile(cfg.paths.figureDir, cfg.output.blerFigure));

plot_and_export_maps( ...
	latGrid, lonGrid, rssLongleyDirectional, towers, ...
	"NB-IoT Received Signal Strength (Longley-Rice)", ...
	"RSS (dBm)", ...
	fullfile(cfg.paths.figureDir, cfg.output.rssFigure));

plot_and_export_maps( ...
	latGrid, lonGrid, snrLongleyDirectional, towers, ...
	"NB-IoT Signal-to-Noise Ratio (Longley-Rice)", ...
	"SNR (dB)", ...
	fullfile(cfg.paths.figureDir, cfg.output.snrFigure));

fprintf("Exporting 5%% BLER contour maps for repetitions 1 and 32...\n");
blerMapRep1 = interp1(bler.SNRdB, bler.curves(1, :), snrLongleyDirectional, "linear", "extrap");
blerMapRep32 = interp1(bler.SNRdB, bler.curves(2, :), snrLongleyDirectional, "linear", "extrap");

blerMapRep1 = min(max(blerMapRep1, 0), 1);
blerMapRep32 = min(max(blerMapRep32, 0), 1);

if cfg.bler.strictContourCrossing
	assert_bler_threshold_crossing(blerMapRep1, cfg.bler.targetThreshold, "Repetition 1");
	assert_bler_threshold_crossing(blerMapRep32, cfg.bler.targetThreshold, "Repetition 32");
else
	report_bler_threshold_span(blerMapRep1, cfg.bler.targetThreshold, "Repetition 1");
	report_bler_threshold_span(blerMapRep32, cfg.bler.targetThreshold, "Repetition 32");
end

plot_bler_contour( ...
	lonGrid, latGrid, blerMapRep1, towers, cfg.bler.targetThreshold, ...
	"Coverage Contour at 5% BLER (Repetition 1)", ...
	fullfile(cfg.paths.figureDir, cfg.output.contourRep1Figure));

plot_bler_contour( ...
	lonGrid, latGrid, blerMapRep32, towers, cfg.bler.targetThreshold, ...
	"Coverage Contour at 5% BLER (Repetition 32)", ...
	fullfile(cfg.paths.figureDir, cfg.output.contourRep32Figure));

%% 7) Interference Sensitivity Study
fprintf("Running interference sensitivity study...\n");
sensitivityRows = strings(numel(cfg.sensitivity.interferenceOffsetDb), 1);
for i = 1:numel(cfg.sensitivity.interferenceOffsetDb)
	offsetDb = cfg.sensitivity.interferenceOffsetDb(i);
	effectiveNoiseScenarioDbm = 10 * log10( ...
		noise.thermalW + 10^(((cfg.noise.interferenceDbm + offsetDb) - 30) / 10)) + 30;
	snrScenario = rssLongleyDirectional - effectiveNoiseScenarioDbm;
	blerScenario = interp1(bler.SNRdB, bler.curves(2, :), snrScenario, "linear", "extrap");
	blerScenario = min(max(blerScenario, 0), 1);
	coveredCells = sum(blerScenario <= cfg.bler.targetThreshold, "all");
	coveredAreaKm2 = coveredCells * cellAreaKm2;
	sensitivityRows(i) = sprintf("%+.0f,%0.6f", offsetDb, coveredAreaKm2);
end

sensitivityHeader = "InterferenceOffsetDb,CoveredAreaKm2";
write_lines(fullfile(cfg.paths.figureDir, cfg.output.sensitivityCsv), [sensitivityHeader; sensitivityRows]);

%% 8) Model Comparison and Summary Save
fprintf("Exporting model comparison summaries...\n");
deltaLongleyMinusFreespace = rssLongleyDirectional - rssFreeSpaceDirectional;
deltaDirectionalMinusIso = rssLongleyDirectional - rssLongleyIsotropic;

modelCsv = [ ...
	"Metric,Value";
	sprintf("MeanDeltaLongleyMinusFreespace_dB,%0.6f", mean(deltaLongleyMinusFreespace, "all", "omitnan"));
	sprintf("MedianDeltaLongleyMinusFreespace_dB,%0.6f", median(deltaLongleyMinusFreespace, "all", "omitnan"));
	sprintf("MeanDeltaDirectionalMinusIsotropic_dB,%0.6f", mean(deltaDirectionalMinusIso, "all", "omitnan"));
	sprintf("MedianDeltaDirectionalMinusIsotropic_dB,%0.6f", median(deltaDirectionalMinusIso, "all", "omitnan"))
	];
write_lines(fullfile(cfg.paths.figureDir, cfg.output.modelComparisonCsv), modelCsv);

summaryPath = fullfile(cfg.paths.figureDir, cfg.output.summaryMat);
save(summaryPath, ...
	"cfg", "noise", "towers", ...
	"bler", "snrThresholdRep", ...
	"rssLongleyDirectional", "snrLongleyDirectional", ...
	"rssFreeSpaceDirectional", "rssLongleyIsotropic", ...
	"blerMapRep1", "blerMapRep32", ...
	"selectedMarginM", ...
	"latGrid", "lonGrid");

assert_outputs_exist(cfg);

fprintf("Simulation completed. Output directory: %s\n", cfg.paths.figureDir);

function plot_tower_locations(towers, outFile)
fig = figure("Color", "w", "Position", [80, 60, 1200, 900]);
gx = geoaxes(fig);
geobasemap(gx, "streets");
geoscatter(gx, towers.Latitude, towers.Longitude, 30, [0.0, 0.2, 0.65], "^", "filled");
title(gx, "Tower Locations Used for NB-IoT Coverage Planning");
apply_geo_plot_style(gx, 14, [0.08, 0.10, 0.74, 0.82]);
if isprop(gx, "LatitudeAxis") && isprop(gx.LatitudeAxis, "Visible")
	gx.LatitudeAxis.Visible = "off";
end
if isprop(gx, "LongitudeAxis") && isprop(gx.LongitudeAxis, "Visible")
	gx.LongitudeAxis.Visible = "off";
end
exportgraphics(fig, outFile, "Resolution", 300);
close(fig);
end

function plot_bler_curves(bler, target, outFile)
fig = figure("Color", "w", "Position", [80, 60, 1200, 900]);
ax = axes(fig);
hold(ax, "on");
snrFine = linspace(min(bler.SNRdB), max(bler.SNRdB), 400);
blerRep1Fine = interp1(bler.SNRdB, bler.curves(1, :), snrFine, "pchip");
blerRep32Fine = interp1(bler.SNRdB, bler.curves(2, :), snrFine, "pchip");

plot(ax, snrFine, blerRep1Fine, "-", "LineWidth", 2.2, "Color", [0.09, 0.32, 0.62]);
plot(ax, snrFine, blerRep32Fine, "-", "LineWidth", 2.2, "Color", [0.85, 0.33, 0.10]);
plot(ax, bler.SNRdB, bler.curves(1, :), "o", "LineWidth", 1.5, "MarkerSize", 7, ...
	"Color", [0.09, 0.32, 0.62], "MarkerFaceColor", "none");
plot(ax, bler.SNRdB, bler.curves(2, :), "s", "LineWidth", 1.5, "MarkerSize", 7, ...
	"Color", [0.85, 0.33, 0.10], "MarkerFaceColor", "none");
yline(ax, target, "--k", "5% BLER threshold", "LineWidth", 1.3);
grid(ax, "on");
xlabel(ax, "SNR (dB)");
ylabel(ax, "BLER");
title(ax, "NPDSCH BLER vs SNR for Repetition 1 and 32");
legend(ax, "Repetition 1 (interpolated)", "Repetition 32 (interpolated)", ...
	"Repetition 1 (sim points)", "Repetition 32 (sim points)", "Location", "northeast");
ylim(ax, [0, 1]);
apply_axes_style(ax, 14, [0.10, 0.12, 0.75, 0.80]);
exportgraphics(fig, outFile, "Resolution", 300);
close(fig);
end

function plot_bler_contour(lonGrid, latGrid, blerMap, towers, level, titleText, outFile)
fig = figure("Color", "w", "Position", [80, 60, 1200, 900]);
gx = geoaxes(fig);
geobasemap(gx, "streets-light");
hold(gx, "on");

coverageMask = double(blerMap <= level);
geoscatter(gx, latGrid(:), lonGrid(:), 10, coverageMask(:), "filled", ...
	"MarkerFaceAlpha", 0.35, "MarkerEdgeAlpha", 0.08);
colormap(fig, [0.89, 0.92, 0.97; 0.19, 0.57, 0.77]);

plot_geographic_contour(gx, lonGrid, latGrid, blerMap, level, [0.85, 0.16, 0.11], 2.4);
geoscatter(gx, towers.Latitude, towers.Longitude, 26, [0.05, 0.05, 0.05], "^", "filled");

title(gx, titleText);
cb = colorbar(gx);
cb.Ticks = [0, 1];
cb.TickLabels = {"> 5% BLER", "<= 5% BLER"};
cb.Label.String = "Coverage Classification";
cb.Color = [0, 0, 0];
cb.FontSize = 13;

apply_geo_plot_style(gx, 14, [0.08, 0.10, 0.74, 0.82]);
exportgraphics(fig, outFile, "Resolution", 300);
close(fig);
end

function apply_axes_style(ax, fontSize, position)
ax.FontSize = fontSize;
ax.FontWeight = "bold";
ax.XColor = [0, 0, 0];
ax.YColor = [0, 0, 0];
ax.GridColor = [0.70, 0.70, 0.70];
ax.GridAlpha = 0.35;
ax.MinorGridAlpha = 0.20;
ax.Color = [1, 1, 1];
ax.LineWidth = 1.1;
ax.Position = position;

t = get(ax, "Title");
t.Color = [0, 0, 0];
t.FontSize = fontSize + 3;
t.FontWeight = "bold";

xl = get(ax, "XLabel");
yl = get(ax, "YLabel");
xl.Color = [0, 0, 0];
yl.Color = [0, 0, 0];
xl.FontSize = fontSize + 1;
yl.FontSize = fontSize + 1;

lg = findobj(ancestor(ax, "figure"), "Type", "Legend");
if ~isempty(lg)
	lg(1).TextColor = [0, 0, 0];
	lg(1).Color = [1, 1, 1];
	lg(1).FontSize = fontSize;
end
end

function apply_geo_plot_style(gx, fontSize, position)
gx.FontSize = fontSize;
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
gx.LineWidth = 1.1;
gx.Position = position;

t = get(gx, "Title");
t.Color = [0, 0, 0];
t.FontSize = fontSize + 3;
t.FontWeight = "bold";
end

function plot_geographic_contour(gx, lonGrid, latGrid, valueGrid, level, color, lineWidth)
lonVec = lonGrid(1, :);
latVec = latGrid(:, 1);
contours = contourc(lonVec, latVec, valueGrid, [level, level]);

idx = 1;
while idx < size(contours, 2)
	nPts = contours(2, idx);
	segment = contours(:, idx + 1:idx + nPts);
	lonSeg = segment(1, :);
	latSeg = segment(2, :);
	geoplot(gx, latSeg, lonSeg, "Color", color, "LineWidth", lineWidth);
	idx = idx + nPts + 1;
end
end

function [latGrid, lonGrid, rssGridDbm, snrGridDb, selectedMarginM] = ...
	compute_snr_map_with_threshold_crossing(towers, txSites, cfg, noise, thresholdDb)

marginCandidatesM = cfg.grid.marginCandidatesM;
if ~ismember(cfg.grid.marginM, marginCandidatesM)
	marginCandidatesM = [cfg.grid.marginM, marginCandidatesM];
end
marginCandidatesM = unique(marginCandidatesM, "stable");

for i = 1:numel(marginCandidatesM)
	marginM = marginCandidatesM(i);
	fprintf("Evaluating grid margin %.0f m...\n", marginM);
	[latGrid, lonGrid] = build_coverage_grid(towers, cfg.grid.spacingM, marginM);
	rssGridDbm = compute_best_server_rss(txSites, latGrid, lonGrid, cfg.radio.rxHeightM, "longley-rice");
	snrGridDb = rssGridDbm - noise.effectiveDbm;
    selectedMarginM = marginM;

	if min(snrGridDb, [], "all") <= thresholdDb
		return;
	end
end

warning("Current grid margins do not cross the repetition-32 5%% BLER threshold. Continuing with the configured largest margin for visualization.");
end

function assert_bler_threshold_crossing(blerMap, level, label)
minVal = min(blerMap, [], "all");
maxVal = max(blerMap, [], "all");

if ~(minVal <= level && maxVal >= level)
	error(["%s BLER map does not cross the %.2f threshold. Range is [%.4f, %.4f]. " ...
		"Adjust grid/domain settings to satisfy the brief requirement for a real contour."], ...
		label, level, minVal, maxVal);
end
end

function report_bler_threshold_span(blerMap, level, label)
minVal = min(blerMap, [], "all");
maxVal = max(blerMap, [], "all");
if ~(minVal <= level && maxVal >= level)
	warning("%s BLER map range [%.4f, %.4f] does not cross %.4f.", label, minVal, maxVal, level);
end
end

function assert_outputs_exist(cfg)
expectedOutputs = [ ...
	fullfile(cfg.paths.figureDir, cfg.output.towerFigure);
	fullfile(cfg.paths.figureDir, cfg.output.blerFigure);
	fullfile(cfg.paths.figureDir, cfg.output.rssFigure);
	fullfile(cfg.paths.figureDir, cfg.output.snrFigure);
	fullfile(cfg.paths.figureDir, cfg.output.contourRep1Figure);
	fullfile(cfg.paths.figureDir, cfg.output.contourRep32Figure);
	fullfile(cfg.paths.figureDir, cfg.output.sensitivityCsv);
	fullfile(cfg.paths.figureDir, cfg.output.modelComparisonCsv);
	fullfile(cfg.paths.figureDir, cfg.output.summaryMat)
	];

missing = strings(0, 1);
for i = 1:numel(expectedOutputs)
	if exist(expectedOutputs(i), "file") ~= 2
		missing(end + 1, 1) = expectedOutputs(i); %#ok<SAGROW>
	end
end

if ~isempty(missing)
	error("Expected output files were not generated:%s%s", newline, strjoin(missing, newline));
end
end

function write_lines(path, lines)
fid = fopen(path, "w");
if fid < 0
	error("Could not open %s for writing.", path);
end
cleanup = onCleanup(@() fclose(fid));

for i = 1:numel(lines)
	fprintf(fid, "%s\n", lines(i));
end
end
