
export interface SectionTime {
    start: Date,
    end: Date
}

export interface ClassroomCourse {
    start: number,
    end: number,
    weeks: string
}

export interface ClassroomInfo {
    name: string,
    courses: ClassroomCourse[],
    buildingId: number,
    nextSection: number,
    lastSection: number,
    numberStudents: number,
    id: number,
    isVacant: boolean
}

export interface SemasterInfo {
    year: string,
    week: number,
    sename: string
}

export const defaultSemasterInfo: SemasterInfo = {
    year: '2025',
    week: 1,
    sename: '1'
}

export interface BuildingInfo {
    id: number,
    name: string
}