function snrThresholdDb = snr_for_bler_target(snrVecDb, blerVec, blerTarget)
%SNR_FOR_BLER_TARGET Find SNR corresponding to a BLER target.

snrVecDb = snrVecDb(:);
blerVec = blerVec(:);

if numel(snrVecDb) ~= numel(blerVec)
    error("SNR and BLER vectors must have the same length.");
end

crossing = find((blerVec(1:end-1) - blerTarget) .* (blerVec(2:end) - blerTarget) <= 0, 1, "first");

if isempty(crossing)
    [~, idxNearest] = min(abs(blerVec - blerTarget));
    snrThresholdDb = snrVecDb(idxNearest);
    return;
end

x1 = blerVec(crossing);
x2 = blerVec(crossing + 1);
y1 = snrVecDb(crossing);
y2 = snrVecDb(crossing + 1);

if abs(x2 - x1) < eps
    snrThresholdDb = y1;
else
    alpha = (blerTarget - x1) / (x2 - x1);
    snrThresholdDb = y1 + alpha * (y2 - y1);
end
end
