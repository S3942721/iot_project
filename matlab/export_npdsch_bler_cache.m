%% Export NPDSCH BLER cache for the project pipeline
% Run this script on a MATLAB installation that has LTE Toolbox and
% NPDSCHBlockErrorRateExample available.

clear;
clc;

addpath(fullfile(fileparts(mfilename("fullpath")), "helpers"));

cfg = project_config();
bler = simulate_bler_npdsch(cfg.bler.requiredRepetitions, cfg.files.blerCacheMat); %#ok<NASGU>

fprintf("BLER cache written to: %s\n", cfg.files.blerCacheMat);
