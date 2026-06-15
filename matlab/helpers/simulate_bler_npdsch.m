function blerOut = simulate_bler_npdsch(requiredRepetitions, cacheFile)
%SIMULATE_BLER_NPDSCH Run MathWorks NPDSCH BLER example and extract curves.

if nargin < 2
    cacheFile = "";
end

if exist("NPDSCHBlockErrorRateExample", "file") == 2
    runResult = evalc("NPDSCHBlockErrorRateExample;"); %#ok<NASGU>
elseif strlength(cacheFile) > 0 && exist(cacheFile, "file") == 2
    loaded = load(cacheFile);
    if ~isfield(loaded, "blerCache")
        error("BLER cache file exists but does not contain 'blerCache' struct.");
    end
    SNRdB = loaded.blerCache.SNRdB;
    repValues = loaded.blerCache.repValues;
    curves = loaded.blerCache.curves;
elseif ~isempty(cacheFile)
    localExampleDir = fullfile(fileparts(cacheFile), ".example_cache");
    localExamplePath = ensure_local_npdsch_example(localExampleDir);
    runResult = evalc(sprintf("run('%s');", localExamplePath)); %#ok<NASGU>
else
    error(['NPDSCHBlockErrorRateExample is unavailable and no BLER cache was found. ' ...
        'Install LTE Toolbox support and ensure openExample is available.']);
end

if exist("SNRdB", "var") ~= 1 || exist("repValues", "var") ~= 1 || exist("curves", "var") ~= 1
    snrCandidates = {"SNRdB", "snr", "snrDb", "snrVec"};
    repCandidates = {"ireps", "reps", "NRep", "nRep"};
    blerCandidates = {"BLER", "bler", "blerResults", "simBLER", "blerOut", "blerVec"};

    SNRdB = pull_vector_from_workspace(snrCandidates);
    repRaw = pull_vector_from_workspace(repCandidates);
    blerMatrix = pull_matrix_from_workspace(blerCandidates);

    if isempty(SNRdB) || isempty(repRaw) || isempty(blerMatrix)
        error(['Could not extract SNR/BLER outputs from NPDSCHBlockErrorRateExample. ' ...
            'Check the downloaded script output variable names in your MATLAB release.']);
    end

    SNRdB = SNRdB(:).';
    repRaw = repRaw(:).';

    if max(repRaw) <= 15
        repValues = 2 .^ repRaw;
    else
        repValues = repRaw;
    end

    try
        [curves, repValues] = orient_curves(blerMatrix, SNRdB, repValues);
    catch
        [curves, repValues] = extract_bler_curves_from_figures(SNRdB, repValues);
    end
end

if ~isempty(cacheFile)
    blerCache.SNRdB = SNRdB; %#ok<STRNU>
    blerCache.repValues = repValues;
    blerCache.curves = curves;
    save(cacheFile, "blerCache");
end

repIdx = zeros(size(requiredRepetitions));
for i = 1:numel(requiredRepetitions)
    idx = find(repValues == requiredRepetitions(i), 1);
    if isempty(idx)
        error("Repetition %d was not found in NPDSCH example output.", requiredRepetitions(i));
    end
    repIdx(i) = idx;
end

blerOut.SNRdB = SNRdB;
blerOut.repValues = repValues(repIdx);
blerOut.curves = curves(repIdx, :);
end

function scriptPath = ensure_local_npdsch_example(exampleDir)
if ~exist(exampleDir, "dir")
    mkdir(exampleDir);
end

scriptPath = fullfile(exampleDir, "NPDSCHBlockErrorRateExample.m");
if exist(scriptPath, "file") == 2
    return;
end

evalc(sprintf("openExample('lte/NPDSCHBlockErrorRateExample', workDir='%s');", exampleDir));

if exist(scriptPath, "file") ~= 2
    files = dir(fullfile(exampleDir, "**", "NPDSCHBlockErrorRateExample.m"));
    if ~isempty(files)
        scriptPath = fullfile(files(1).folder, files(1).name);
    else
        error(["Could not download NPDSCHBlockErrorRateExample.m via openExample. " ...
            "Verify LTE Toolbox installation and network access for examples."]);
    end
end
end

function [curves, repValues] = orient_curves(blerMatrix, SNRdB, repValues)
[nRows, nCols] = size(blerMatrix);
if nCols == numel(SNRdB)
    curves = blerMatrix;
elseif nRows == numel(SNRdB)
    curves = blerMatrix.';
else
    error("BLER matrix dimensions are incompatible with extracted SNR vector.");
end

if numel(repValues) ~= size(curves, 1)
    error("Number of repetition entries does not match BLER matrix rows.");
end
end

function vec = pull_vector_from_workspace(names)
vec = [];
for i = 1:numel(names)
    if evalin("caller", sprintf("exist('%s','var')", names{i}))
        value = evalin("caller", names{i});
        if isnumeric(value) && isvector(value)
            vec = value;
            return;
        end
    end
end
end

function mat = pull_matrix_from_workspace(names)
mat = [];
for i = 1:numel(names)
    if evalin("caller", sprintf("exist('%s','var')", names{i}))
        value = evalin("caller", names{i});
        if isnumeric(value) && ndims(value) == 2 && ~isscalar(value)
            mat = value;
            return;
        end
    end
end

vars = evalin("caller", "whos");
for i = 1:numel(vars)
    if strcmp(vars(i).class, "double") && numel(vars(i).size) == 2 && all(vars(i).size > 1)
        candidate = evalin("caller", vars(i).name);
        if all(candidate(:) >= 0) && all(candidate(:) <= 1)
            mat = candidate;
            return;
        end
    end
end

end

function [curves, repValues] = extract_bler_curves_from_figures(SNRdB, repValuesHint)
curves = [];
repValues = [];

figs = findall(groot, "Type", "figure");
for f = 1:numel(figs)
    ax = findall(figs(f), "Type", "axes");
    for a = 1:numel(ax)
        yl = get(get(ax(a), "YLabel"), "String");
        if iscell(yl)
            yl = strjoin(string(yl), " ");
        end
        if ~contains(string(yl), "BLER", "IgnoreCase", true)
            continue;
        end

        lineObjs = flipud(findall(ax(a), "Type", "line"));
        tmpCurves = [];
        for l = 1:numel(lineObjs)
            y = get(lineObjs(l), "YData");
            x = get(lineObjs(l), "XData");
            if isnumeric(y) && isnumeric(x) && numel(y) == numel(SNRdB) && numel(x) == numel(SNRdB)
                tmpCurves(end + 1, :) = y(:).'; %#ok<AGROW>
            end
        end

        if ~isempty(tmpCurves)
            curves = tmpCurves;

            lg = legend(ax(a));
            if ~isempty(lg) && isprop(lg, "String")
                repValues = parse_rep_values_from_legend(lg.String);
            end
            if isempty(repValues)
                if nargin >= 2 && ~isempty(repValuesHint) && numel(repValuesHint) == size(curves, 1)
                    repValues = repValuesHint;
                else
                    repValues = 1:size(curves, 1);
                end
            end
            return;
        end
    end
end

error("Could not extract BLER curves from NPDSCH example outputs.");
end

function repValues = parse_rep_values_from_legend(legendStrings)
repValues = [];
if ischar(legendStrings)
    legendStrings = {legendStrings};
end

for i = 1:numel(legendStrings)
    txt = string(legendStrings{i});
    token = regexp(txt, "NRep\s*=\s*(\d+)", "tokens", "once");
    if ~isempty(token)
        repValues(end + 1) = str2double(token{1}); %#ok<AGROW>
    end
end
end
