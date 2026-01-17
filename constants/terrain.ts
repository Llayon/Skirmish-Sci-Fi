import { TerrainTheme, FeatureType } from '../types';

interface TerrainGeneratorSchema {
    notableFeatures: FeatureType[]; // Array of 6, index 0 = roll 1
    regularFeatures: FeatureType[]; // Array of 6, index 0 = roll 1
}

export const TERRAIN_THEME_GENERATORS: Record<TerrainTheme, TerrainGeneratorSchema> = {
    Industrial: {
        notableFeatures: [
            'large_structure', 'industrial_cluster', 'fenced_area',
            'landing_pad', 'cargo_area', 'two_structures'
        ],
        regularFeatures: [
            'linear_obstacle', 'building', 'industrial_rubble',
            'spread_scatter', 'open_ground_central', 'industrial_urban_scatter'
        ]
    },
    Wilderness: {
        notableFeatures: [
            'forested_hill', 'large_swamp', 'rock_formations_group',
            'forested_area_paths', 'bare_hill', 'single_ruin'
        ],
        regularFeatures: [
            'dense_forest_swamp', 'rock_formation_plants', 'plant_cluster',
            'rock_formations_group', 'open_space_scattered_plants', 'natural_linear'
        ]
    },
    AlienRuin: {
        notableFeatures: [
            'scatter_plants', 'large_rubble_pile', 'large_ruined_building',
            'overgrown_plaza', 'ruined_tower_rubble', 'large_statue_rubble'
        ],
        regularFeatures: [
            'ruined_wall', 'ruined_building', 'partial_ruin',
            'open_space_scatter', 'strange_statue_wreck', 'scattered_plants_rubble'
        ]
    },
    CrashSite: {
        notableFeatures: [
            'damaged_structure', 'natural_feature_wreckage', 'burning_forest',
            'wreckage_pile', 'large_crater_wreckage', 'large_crater'
        ],
        regularFeatures: [
            'open_scatter_mix', 'scattered_wreckage', 'large_wreckage_piece',
            'crater', 'wreckage_line', 'open_ground_smoke'
        ]
    }
};