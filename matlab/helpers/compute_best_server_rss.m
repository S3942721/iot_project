function rssGridDbm = compute_best_server_rss(txSites, latGrid, lonGrid, rxHeightM, propagationModelName)
%COMPUTE_BEST_SERVER_RSS Compute best-server RSS over a receiver grid.

rxSites = rxsite( ...
    "Latitude", latGrid(:), ...
    "Longitude", lonGrid(:), ...
    "AntennaHeight", rxHeightM);

pm = propagationModel(propagationModelName);
rssBest = -Inf(numel(latGrid), 1);
numTxSites = numel(txSites);

try
    useParallel = license("test", "Distrib_Computing_Toolbox") && ~isempty(ver("parallel"));
catch
    useParallel = false;
end

if useParallel
    rssAll = -Inf(numel(rssBest), numTxSites);
    parfor i = 1:numTxSites
        rssThis = sigstrength(rxSites, txSites(i), pm);
        rssThis = rssThis(:);
        if numel(rssThis) ~= numel(rssBest)
            error("sigstrength returned %d points but expected %d points.", numel(rssThis), numel(rssBest));
        end
        rssAll(:, i) = rssThis;
    end
    rssBest = max(rssAll, [], 2);
else
    for i = 1:numTxSites
        rssThis = sigstrength(rxSites, txSites(i), pm);
        rssThis = rssThis(:);
        if numel(rssThis) ~= numel(rssBest)
            error("sigstrength returned %d points but expected %d points.", numel(rssThis), numel(rssBest));
        end
        rssBest = max(rssBest, rssThis);
    end
end

rssGridDbm = reshape(rssBest, size(latGrid, 1), size(latGrid, 2));
end
