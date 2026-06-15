# NB-IoT Coverage Pipeline

This folder contains the implementation for Topic 1 (NB-IoT coverage design).

## Main entry point

- `s3942721_project.m`

## Helper modules

- `helpers/project_config.m`
- `helpers/load_tower_locations.m`
- `helpers/build_coverage_grid.m`
- `helpers/create_sector_sites.m`
- `helpers/compute_effective_noise.m`
- `helpers/simulate_bler_npdsch.m`
- `helpers/snr_for_bler_target.m`
- `helpers/compute_best_server_rss.m`
- `helpers/plot_and_export_maps.m`

## Required MATLAB capability

The script requires wireless planning functions used by `txsite/rxsite` workflows:

- `txsite`
- `rxsite`
- `propagationModel`
- `sigstrength`

Because the provided `Directional12dBi.mat` contains a `phased.CustomAntennaElement`,
the run also requires phased-array directivity support:

- `phased.internal.Directivity` (Phased Array System Toolbox runtime support)

The script requires strict NPDSCH BLER data generated from the official MATLAB example `NPDSCHBlockErrorRateExample` (LTE Toolbox example).
This is now automatic: on first run, the helper downloads `NPDSCHBlockErrorRateExample.m`
to `matlab/.example_cache/` using `openExample`, runs it, and caches extracted BLER outputs.

## BLER cache workflow (strict simulation source)

If your machine has `NPDSCHBlockErrorRateExample`, run:

1. `export_npdsch_bler_cache`

If the NPDSCH example is not on-path but you can run it in MATLAB Desktop:

1. Run the NPDSCH BLER example manually in Desktop MATLAB.
2. Without clearing workspace, run: `capture_npdsch_bler_cache_from_base`

This writes:

- `matlab/npdsch_bler_cache.mat`

Then run:

1. `s3942721_project`

If the example is unavailable, the main script will stop and report the missing dependency.

## Output artifacts

All output files are exported to `report/figures`:

- `fig_tower_locations.png`
- `fig_bler_vs_snr.png`
- `fig_rss_heatmap.png`
- `fig_snr_heatmap.png`
- `fig_bler_contour_rep1.png`
- `fig_bler_contour_rep32.png`
- `sensitivity_area_summary.csv`
- `model_comparison_summary.csv`
- `simulation_summary.mat`
