function blerOut = simulate_bler_npdsch(requiredRepetitions, cacheFile, requestedSNRdB, numTrBlks)
%SIMULATE_BLER_NPDSCH  Self-contained NB-IoT NPDSCH BLER simulation.
%
%   Uses MATLAB LTE Toolbox physical-layer functions directly.
%   Does NOT depend on any MathWorks example scripts.
%   Reference: 3GPP TS 36.211 / 36.213 Release 13.
%
%   Inputs
%     requiredRepetitions  1-D array of NRep values (e.g. [1 32])
%     cacheFile            Path to .mat cache file.  Re-used when the SNR
%                          vector matches and numTrBlks is not greater.
%     requestedSNRdB       Row vector of SNR points (dB).
%     numTrBlks            Transport blocks per SNR point.  Default 100.
%                          BLER resolution = 1/numTrBlks.
%
%   Output  blerOut struct with fields:
%     .SNRdB      SNR vector used (dB)
%     .repValues  NRep values that were simulated
%     .curves     nRep x nSNR BLER matrix

if nargin < 2 || isempty(cacheFile),       cacheFile = "";          end
if nargin < 3 || isempty(requestedSNRdB),  requestedSNRdB = [-25,-22,-20,-18,-16,-14,-12,-10,-8,-6,-4,-2,0,1,2,3,4,5,6,8,10]; end
if nargin < 4 || isempty(numTrBlks),       numTrBlks = 100;         end
requestedSNRdB = unique(requestedSNRdB(:).', "stable");

useCache = false;
if strlength(cacheFile) > 0 && exist(cacheFile, "file") == 2
    loaded = load(cacheFile);
    if isfield(loaded, "blerCache")
        bc = loaded.blerCache;
        if isfield(bc,"SNRdB") && isfield(bc,"repValues") && ...
           isfield(bc,"curves") && isfield(bc,"numTrBlks")
            if vectors_equal(bc.SNRdB(:).', requestedSNRdB) && ...
               bc.numTrBlks >= numTrBlks
                SNRdB = bc.SNRdB; repValues = bc.repValues;
                curves = bc.curves; useCache = true;
            end
        end
    end
end

if ~useCache
    [SNRdB, repValues, curves] = ...
        run_npdsch_bler_awgn(requestedSNRdB, numTrBlks, requiredRepetitions);
end

if strlength(cacheFile) > 0
    blerCache.SNRdB = SNRdB; blerCache.repValues = repValues; %#ok<STRNU>
    blerCache.curves = curves; blerCache.numTrBlks = numTrBlks;
    save(cacheFile, "blerCache");
end

repIdx = zeros(size(requiredRepetitions));
for i = 1:numel(requiredRepetitions)
    idx = find(repValues == requiredRepetitions(i), 1);
    if isempty(idx)
        error("NRep=%d not found in simulated output.", requiredRepetitions(i));
    end
    repIdx(i) = idx;
end
blerOut.SNRdB = SNRdB; blerOut.repValues = repValues(repIdx);
blerOut.curves = curves(repIdx,:);
end

% =========================================================================
function [SNRdB, repValues, curves] = run_npdsch_bler_awgn(snrPoints, numBlocks, nrepValues)
%RUN_NPDSCH_BLER_AWGN  Core NPDSCH BLER simulation (AWGN channel).
%
%   Physical-layer chain (3GPP TS 36.211/36.213 Release 13):
%     lteNDLSCH        - CRC + convolutional encoding + rate matching
%     lteNPDSCH        - QPSK modulation with bundled repetitions
%     lteNPDSCHDecode  - coherent soft-bit combining across NRep subframes
%                        via stateful decoder (dstate)
%     lteNDLSCHDecode  - Viterbi decoding + CRC verification
%
%   Channel model: AWGN in frequency domain (H=1, perfect CSI).
%   Appropriate for the SNR-to-coverage mapping used in this project.
%
%   NPSS (subframe 5) and NSSS subframes are detected by lteNPSS/lteNSSS
%   and skipped per 3GPP TS 36.211.
%
%   Parameters (3GPP TS 36.213 Tables 16.4.1.3-1 and 16.4.1.5.1-1):
%     IMCS=4, ISF=0 -> QPSK, TBS=56 bits, NSF=1 subframe per rep unit
%
%   NRep->IRep lookup (3GPP TS 36.213 Table 16.4.1.3-2):
%     NRep:   1   2   4   8  16  32  64  128  256  512  1024
%     IRep:   0   1   2   3   4   5   6    7    8    9    10

% --- NB-IoT eNB configuration (in-band, different PCI) ------------------
enb_base.NFrame            = 0;
enb_base.NSubframe         = 0;
enb_base.NNCellID          = 0;
enb_base.NBRefP            = 2;           % 2 NRS ports -> SFBC transmit diversity
enb_base.OperationMode     = 'Inband-DifferentPCI';
enb_base.CellRefP          = 4;
enb_base.NCellID           = 1;
enb_base.ControlRegionSize = 3;

% --- NPDSCH base configuration ------------------------------------------
npdsch_base.NPDSCHDataType = 'NotBCCH';
npdsch_base.Modulation     = 'QPSK';
npdsch_base.RNTI           = 1;
npdsch_base.NSF            = 1;           % NSF=1 per ISF=0

% Physical layer constants for this configuration
trblklen = 56;    % TBS: IMCS=4, NSF=1 (3GPP TS 36.213 Table 16.4.1.5.1-1)
rmoutlen = 200;   % Coded block size: Gd=100 QPSK symbols -> G=200 bits

% Perfect channel estimate (AWGN, H=1): shape [nSC, nSym, NBRefP, NRxAnts]
% SFBC with NBRefP=2 requires NRxAnts >= 2
nRx  = enb_base.NBRefP;
estH = ones(12, 14, enb_base.NBRefP, nRx);

nSnr      = numel(snrPoints);
nReps     = numel(nrepValues);
repValues = nrepValues(:).';

try
    useParallel = license("test", "Distrib_Computing_Toolbox") && ~isempty(ver("parallel"));
catch
    useParallel = false;
end

taskCount = nReps * nSnr;
blerFlat = zeros(1, taskCount);

if useParallel
    parfor taskIdx = 1:taskCount
        [rIdx, snrIdx] = ind2sub([nReps, nSnr], taskIdx);
        blerFlat(taskIdx) = simulate_bler_point( ...
            enb_base, npdsch_base, estH, trblklen, rmoutlen, ...
            snrPoints(snrIdx), numBlocks, nrepValues(rIdx), rIdx, snrIdx);
    end
else
    for taskIdx = 1:taskCount
        [rIdx, snrIdx] = ind2sub([nReps, nSnr], taskIdx);
        blerFlat(taskIdx) = simulate_bler_point( ...
            enb_base, npdsch_base, estH, trblklen, rmoutlen, ...
            snrPoints(snrIdx), numBlocks, nrepValues(rIdx), rIdx, snrIdx);
    end
end

curves = reshape(blerFlat, [nReps, nSnr]);

for rIdx = 1:nReps
    fprintf("  NRep=%-4d done: BLER range [%.4f, %.4f]\n", ...
        repValues(rIdx), min(curves(rIdx, :)), max(curves(rIdx, :)));
end

SNRdB = snrPoints;
end

% =========================================================================
function bler = simulate_bler_point(enb_base, npdsch_base, estH, trblklen, rmoutlen, snrDb, numBlocks, nRep, rIdx, snrIdx)
%SIMULATE_BLER_POINT  One independent repetition/SNR simulation point.

npdsch = npdsch_base;
npdsch.NRep = nRep;
noiseVar = 1 / 10^(snrDb / 10);
numErrors = 0;

for blkIdx = 1:numBlocks
    rng(blkIdx + snrIdx * 10000 + rIdx * 1000000, "combRecursive");

    txTrBlk = randi([0, 1], trblklen, 1);
    txCW    = lteNDLSCH(rmoutlen, txTrBlk);

    estate = [];   % NPDSCH encoder state
    dstate = [];   % NPDSCH decoder state (accumulates LLRs across reps)
    rxcw   = [];   % Final combined soft bits from lteNPDSCHDecode
    sfIdx  = 0;
    dstate.EndOfTx = 0;   % Initialise so while guard is valid first pass

    % --- Subframe loop until bundle complete ---------------------------
    while ~dstate.EndOfTx
        enb           = enb_base;
        enb.NSubframe = mod(sfIdx, 10);
        enb.NFrame    = floor(sfIdx / 10);

        % Skip NPSS and NSSS subframes (per 3GPP TS 36.211)
        if isempty(lteNPSS(enb)) && isempty(lteNSSS(enb))
            % Allocate resource grid for this subframe
            subgrid   = lteNBResourceGrid(enb);
            npdschIdx = lteNPDSCHIndices(enb, npdsch);

            % NPDSCH encoding for this subframe (stateful across reps)
            [txSym, estate] = lteNPDSCH(enb, npdsch, txCW, estate);
            subgrid(npdschIdx) = txSym;

            % NRS pilots required for correct scrambling reference
            subgrid(lteNRSIndices(enb)) = lteNRS(enb);

            % AWGN in frequency domain (H=1, no fading)
            rxgrid = subgrid + sqrt(noiseVar / 2) * ...
                     (randn(size(subgrid)) + 1j * randn(size(subgrid)));

            % Extract NPDSCH REs; use perfect H=1 channel estimate
            [rxSym, hest] = lteExtractResources(npdschIdx, rxgrid, estH);

            % Soft demapping + coherent LLR combining (via dstate)
            % rxcw is non-empty only after all NRep subframes (EndOfTx)
            [rxcw, dstate] = lteNPDSCHDecode( ...
                enb, npdsch, rxSym, hest, noiseVar, dstate);
        end

        sfIdx = sfIdx + 1;
        if sfIdx > (nRep + 20) * 3
            break;   % Safety guard: should not normally trigger
        end
    end

    if ~isempty(rxcw)
        % Viterbi decode + CRC check
        [~, blkCRCErr] = lteNDLSCHDecode(trblklen, rxcw);
        if blkCRCErr
            numErrors = numErrors + 1;
        end
    else
        numErrors = numErrors + 1;   % Safety guard triggered = block error
    end
end

bler = numErrors / numBlocks;
end

% =========================================================================
function tf = vectors_equal(a, b)
a = a(:).';  b = b(:).';
tf = numel(a) == numel(b) && all(abs(a - b) < 1e-10);
end
