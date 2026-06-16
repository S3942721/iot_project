function cfg = project_config()
%PROJECT_CONFIG Centralized configuration for the NB-IoT coverage project.

helpersDir = fileparts(mfilename("fullpath"));
matlabDir = fileparts(helpersDir);
projectDir = fileparts(matlabDir);

cfg.paths.projectDir = projectDir;
cfg.paths.matlabDir = matlabDir;
cfg.paths.figureDir = fullfile(projectDir, "report", "figures");
cfg.paths.literatureDir = fullfile(projectDir, "resources", "literature");

cfg.files.towerCsv = fullfile(matlabDir, "TowersLocations.csv");
cfg.files.antennaMat = fullfile(matlabDir, "Directional12dBi.mat");
cfg.files.blerCacheMat = fullfile(matlabDir, "npdsch_bler_cache.mat");

cfg.radio.fcHz = 900e6;
cfg.radio.txPowerW = 40;
cfg.radio.txHeightM = 30;
cfg.radio.rxHeightM = 1.5;
cfg.radio.sectorAzimuthDeg = [0, 120, 240];

cfg.grid.spacingM = 100;
cfg.grid.marginM = 2000;
cfg.grid.marginCandidatesM = [2000];

cfg.noise.temperatureK = 290;
cfg.noise.bandwidthHz = 180e3;
cfg.noise.noiseFigureDb = 5;
cfg.noise.interferenceDbm = -85;

cfg.bler.targetThreshold = 0.05;
cfg.bler.requiredRepetitions = [1, 32];
cfg.bler.strictContourCrossing = false;
cfg.bler.snrSweepDb = [-25, -22, -20, -18, -16, -14, -12, -10, -8, -6, -4, -2, 0];

cfg.sensitivity.interferenceOffsetDb = [-5, 0, 5];

cfg.output.rssFigure = "fig_rss_heatmap.png";
cfg.output.snrFigure = "fig_snr_heatmap.png";
cfg.output.blerFigure = "fig_bler_vs_snr.png";
cfg.output.towerFigure = "fig_tower_locations.png";
cfg.output.contourRep1Figure = "fig_bler_contour_rep1.png";
cfg.output.contourRep32Figure = "fig_bler_contour_rep32.png";
cfg.output.summaryMat = "simulation_summary.mat";
cfg.output.sensitivityCsv = "sensitivity_area_summary.csv";
cfg.output.modelComparisonCsv = "model_comparison_summary.csv";
end
