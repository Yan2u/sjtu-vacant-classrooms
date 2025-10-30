export interface UserPreset {
    name: string,
    status: string,
    buildingIds: string[],
    classroomIds: string[],
    sortOptions: string[],
}

export interface UserConfig {
    presets: UserPreset[],
    lastUsedPreset: string
}