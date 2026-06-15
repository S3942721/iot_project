%% Capture NPDSCH BLER outputs from base workspace into project cache
% Usage:
% 1) In MATLAB Desktop, run the NPDSCH BLER example script manually.
% 2) Without clearing workspace, run this script.

clearvars -except SNRdB snr snrDb snrVec ireps reps NRep nRep BLER bler blerResults simBLER blerOut

addpath(fullfile(fileparts(mfilename("fullpath")), "helpers"));
cfg = project_config();

snrCandidates = {"SNRdB", "snr", "snrDb", "snrVec"};
repCandidates = {"ireps", "reps", "NRep", "nRep"};
blerCandidates = {"BLER", "bler", "blerResults", "simBLER", "blerOut"};

SNRdB = pull_vector_from_base(snrCandidates);
repRaw = pull_vector_from_base(repCandidates);
blerMatrix = pull_matrix_from_base(blerCandidates);

if isempty(SNRdB) || isempty(repRaw) || isempty(blerMatrix)
    error(["Could not find SNR/repetition/BLER variables in base workspace. " ...
        "Run NPDSCH example first, then run this script without clearing."]);
end

SNRdB = SNRdB(:).';
repRaw = repRaw(:).';

if max(repRaw) <= 15
    repValues = 2 .^ repRaw;
else
    repValues = repRaw;
end

[nRows, nCols] = size(blerMatrix);
if nCols == numel(SNRdB)
    curves = blerMatrix;
elseif nRows == numel(SNRdB)
    curves = blerMatrix.';
else
    error("BLER matrix dimensions do not match SNR vector length.");
end

if numel(repValues) ~= size(curves, 1)
    error("Repetition vector length does not match BLER curve row count.");
end

blerCache.SNRdB = SNRdB; %#ok<STRNU>
blerCache.repValues = repValues;
blerCache.curves = curves;
save(cfg.files.blerCacheMat, "blerCache");

fprintf("Saved BLER cache: %s\n", cfg.files.blerCacheMat);

function vec = pull_vector_from_base(names)
vec = [];
for i = 1:numel(names)
    if evalin("base", sprintf("exist('%s','var')", names{i}))
        value = evalin("base", names{i});
        if isnumeric(value) && isvector(value)
            vec = value;
            return;
        end
    end
end
end

function mat = pull_matrix_from_base(names)
mat = [];
for i = 1:numel(names)
    if evalin("base", sprintf("exist('%s','var')", names{i}))
        value = evalin("base", names{i});
        if isnumeric(value) && ndims(value) == 2
            mat = value;
            return;
        end
    end
end

vars = evalin("base", "whos");
for i = 1:numel(vars)
    if strcmp(vars(i).class, "double") && numel(vars(i).size) == 2 && all(vars(i).size > 1)
        candidate = evalin("base", vars(i).name);
        if all(candidate(:) >= 0) && all(candidate(:) <= 1)
            mat = candidate;
            return;
        end
    end
end
end
