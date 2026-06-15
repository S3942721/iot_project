function txSites = create_sector_sites(towers, cfg, useDirectionalAntenna)
%CREATE_SECTOR_SITES Create 3-sector sites for each tower.

if useDirectionalAntenna
    if isempty(which('phased.internal.Directivity'))
        error(['Directional12dBi.mat uses phased.CustomAntennaElement, which requires ' ...
            'Phased Array System Toolbox support (phased.internal.Directivity).']);
    end

    loaded = load(cfg.files.antennaMat);
    if ~isfield(loaded, "antenna")
        error("Directional12dBi.mat must contain variable 'antenna'.");
    end
    sectorAntenna = loaded.antenna;
else
    sectorAntenna = [];
end

nTowers = height(towers);
nSectors = numel(cfg.radio.sectorAzimuthDeg);
totalSites = nTowers * nSectors;

siteNames = strings(totalSites, 1);
siteLat = zeros(totalSites, 1);
siteLon = zeros(totalSites, 1);
siteAz = zeros(totalSites, 1);

index = 1;
for t = 1:nTowers
    for s = 1:nSectors
        siteNames(index) = sprintf("Tower_%03d_Sector_%d", t, s);
        siteLat(index) = towers.Latitude(t);
        siteLon(index) = towers.Longitude(t);
        siteAz(index) = cfg.radio.sectorAzimuthDeg(s);
        index = index + 1;
    end
end

antennaAngles = [siteAz.'; zeros(1, totalSites)];

if useDirectionalAntenna
    txSites = txsite( ...
        "Name", siteNames, ...
        "Latitude", siteLat, ...
        "Longitude", siteLon, ...
        "AntennaHeight", cfg.radio.txHeightM, ...
        "Antenna", sectorAntenna, ...
        "AntennaAngle", antennaAngles, ...
        "TransmitterPower", cfg.radio.txPowerW, ...
        "TransmitterFrequency", cfg.radio.fcHz);
else
    txSites = txsite( ...
        "Name", siteNames, ...
        "Latitude", siteLat, ...
        "Longitude", siteLon, ...
        "AntennaHeight", cfg.radio.txHeightM, ...
        "TransmitterPower", cfg.radio.txPowerW, ...
        "TransmitterFrequency", cfg.radio.fcHz);
end
end
