function towers = load_tower_locations(towerCsv)
%LOAD_TOWER_LOCATIONS Load tower latitude and longitude coordinates.

raw = readmatrix(towerCsv);
if size(raw, 2) < 2
    error("Tower file must contain latitude and longitude in two columns.");
end

raw = raw(:, 1:2);
raw = raw(~any(isnan(raw), 2), :);

if isempty(raw)
    error("No valid tower coordinates found in %s", towerCsv);
end

towers = table(raw(:, 1), raw(:, 2), 'VariableNames', {'Latitude', 'Longitude'});
end
