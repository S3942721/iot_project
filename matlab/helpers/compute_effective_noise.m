function noise = compute_effective_noise(cfg)
%COMPUTE_EFFECTIVE_NOISE Compute thermal, interference, and effective noise.

kB = 1.380649e-23;
T = cfg.noise.temperatureK;
B = cfg.noise.bandwidthHz;
NFLinear = 10^(cfg.noise.noiseFigureDb / 10);

thermalW = kB * T * B * NFLinear;
interferenceW = 10^((cfg.noise.interferenceDbm - 30) / 10);
effectiveW = thermalW + interferenceW;

noise.thermalW = thermalW;
noise.interferenceW = interferenceW;
noise.effectiveW = effectiveW;
noise.thermalDbm = 10 * log10(thermalW) + 30;
noise.interferenceDbm = cfg.noise.interferenceDbm;
noise.effectiveDbm = 10 * log10(effectiveW) + 30;
end
