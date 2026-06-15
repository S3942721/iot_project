function rssGridDbm = compute_best_server_rss(txSites, latGrid, lonGrid, rxHeightM, propagationModelName)
%COMPUTE_BEST_SERVER_RSS Compute best-server RSS over a receiver grid.

rxSites = rxsite( ...
    "Latitude", latGrid(:), ...
    "Longitude", lonGrid(:), ...
    "AntennaHeight", rxHeightM);

pm = propagationModel(propagationModelName);
rssBest = -Inf(numel(latGrid), 1);

for i = 1:numel(txSites)
    rssThis = sigstrength(rxSites, txSites(i), pm);
    rssThis = rssThis(:);
    if numel(rssThis) ~= numel(rssBest)
        error("sigstrength returned %d points but expected %d points.", numel(rssThis), numel(rssBest));
    end
    rssBest = max(rssBest, rssThis);
end

rssGridDbm = reshape(rssBest, size(latGrid, 1), size(latGrid, 2));
end
