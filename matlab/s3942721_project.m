%% EEET2370/2371 Topic 1 NB-IoT coverage project
% This script runs the full simulation and exports report-ready figures.

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

fprintf("Loading tower locations...\n");
towers = load_tower_locations(cfg.files.towerCsv);

fprintf("Building coverage grid...\n");
[latGrid, lonGrid] = build_coverage_grid(towers, cfg.grid.spacingM, cfg.grid.marginM);
cellAreaKm2 = (cfg.grid.spacingM^2) / 1e6;

fprintf("Creating sectorized transmitter sites...\n");
txDirectional = create_sector_sites(towers, cfg, true);
txIsotropic = create_sector_sites(towers, cfg, false);

fprintf("Computing effective noise power...\n");
noise = compute_effective_noise(cfg);

fprintf("Running NPDSCH BLER simulation example...\n");
bler = simulate_bler_npdsch(cfg.bler.requiredRepetitions, cfg.files.blerCacheMat);

snrThresholdRep = zeros(size(cfg.bler.requiredRepetitions));
for i = 1:numel(cfg.bler.requiredRepetitions)
	snrThresholdRep(i) = snr_for_bler_target(bler.SNRdB, bler.curves(i, :), cfg.bler.targetThreshold);
end

fprintf("Computing Longley-Rice RSS map (directional sectors)...\n");
rssLongleyDirectional = compute_best_server_rss( ...
	txDirectional, latGrid, lonGrid, cfg.radio.rxHeightM, "longley-rice");
snrLongleyDirectional = rssLongleyDirectional - noise.effectiveDbm;

fprintf("Computing free-space RSS map for model sanity check...\n");
rssFreeSpaceDirectional = compute_best_server_rss( ...
	txDirectional, latGrid, lonGrid, cfg.radio.rxHeightM, "freespace");

fprintf("Computing isotropic baseline map...\n");
rssLongleyIsotropic = compute_best_server_rss( ...
	txIsotropic, latGrid, lonGrid, cfg.radio.rxHeightM, "longley-rice");

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

plot_bler_contour( ...
	lonGrid, latGrid, blerMapRep1, towers, cfg.bler.targetThreshold, ...
	"Coverage Contour at 5% BLER (Repetition 1)", ...
	fullfile(cfg.paths.figureDir, cfg.output.contourRep1Figure));

plot_bler_contour( ...
	lonGrid, latGrid, blerMapRep32, towers, cfg.bler.targetThreshold, ...
	"Coverage Contour at 5% BLER (Repetition 32)", ...
	fullfile(cfg.paths.figureDir, cfg.output.contourRep32Figure));

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
	"latGrid", "lonGrid");

fprintf("Simulation completed. Output directory: %s\n", cfg.paths.figureDir);

function plot_tower_locations(towers, outFile)
fig = figure("Color", "w", "Position", [100, 100, 900, 700]);
plot(towers.Longitude, towers.Latitude, "bo", "MarkerFaceColor", "b", "MarkerSize", 4);
grid on;
xlabel("Longitude (deg)");
ylabel("Latitude (deg)");
title("Tower Locations Used for NB-IoT Coverage Planning");
axis tight;
exportgraphics(fig, outFile, "Resolution", 300);
close(fig);
end

function plot_bler_curves(bler, target, outFile)
fig = figure("Color", "w", "Position", [100, 100, 900, 700]);
plot(bler.SNRdB, bler.curves(1, :), "-o", "LineWidth", 1.4, "MarkerSize", 4);
hold on;
plot(bler.SNRdB, bler.curves(2, :), "-s", "LineWidth", 1.4, "MarkerSize", 4);
yline(target, "--k", "5% BLER threshold", "LineWidth", 1.1);
hold off;
grid on;
xlabel("SNR (dB)");
ylabel("BLER");
title("NPDSCH BLER vs SNR for Repetition 1 and 32");
legend("Repetition 1", "Repetition 32", "Location", "northeast");
ylim([0, 1]);
exportgraphics(fig, outFile, "Resolution", 300);
close(fig);
end

function plot_bler_contour(lonGrid, latGrid, blerMap, towers, level, titleText, outFile)
fig = figure("Color", "w", "Position", [100, 100, 920, 720]);
contourf(lonGrid, latGrid, blerMap, 24, "LineStyle", "none");
hold on;
contour(lonGrid, latGrid, blerMap, [level level], "k", "LineWidth", 2);
plot(towers.Longitude, towers.Latitude, "w^", "MarkerFaceColor", "k", "MarkerSize", 4);
hold off;
grid on;
xlabel("Longitude (deg)");
ylabel("Latitude (deg)");
title(titleText);
cb = colorbar;
cb.Label.String = "BLER";
axis tight;
exportgraphics(fig, outFile, "Resolution", 300);
close(fig);
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
