import { CLASSROOM_TYPE_URL, GET_BUILD_ID_URL, SEMASTER_INFO_URL, TIMETABLE_URL } from "@/config"
import type { UserConfig } from "@/types/config"
import type { BuildingInfo, ClassroomCourse, ClassroomInfo, SectionTime, SemasterInfo } from "@/types/info"
import { clsx, type ClassValue } from "clsx"
import { toast } from "sonner"
import { twMerge } from "tailwind-merge"
import { createContext } from "vm"
import type { ThemeProviderState } from "./theme"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function getTimeTable(): Promise<SectionTime[]> {
  const resp = await fetch(TIMETABLE_URL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  const sections = (await resp.json()).data.section
  // from HH-MM to Date
  const result: SectionTime[] = sections.map((section: any) => {
    return {
      start: new Date(`1970-01-01T${section.startTime}:00`),
      end: new Date(`1970-01-01T${section.endTime}:00`),
    }
  })

  return result
}

export async function getSemasterInfo(): Promise<SemasterInfo> {
  const resp = await fetch(SEMASTER_INFO_URL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  const info = (await resp.json()).data
  return {
    year: info.year,
    week: info.week,
    sename: info.sename,
  }
}

export async function getBuildings(): Promise<BuildingInfo[]> {
  const resp = await fetch(GET_BUILD_ID_URL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })

  const schoolList = (await resp.json()).data.buildList
  const result: BuildingInfo[] = []
  schoolList.forEach((school: any) => {
    const buildings = school.children
    result.push(...buildings.map((building: any) => {
      const parts = building.fullName.split('/')
      return { id: building.id, name: parts[parts.length - 1] }
    }))
  })
  return result
}

export async function getFreeClassrooms(buildingId: string): Promise<ClassroomInfo[]> {
  const url = CLASSROOM_TYPE_URL.replace('${buildingId}', buildingId)
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })

  const floors: Array<any> = (await resp.json()).data.floorList
  const freeRooms = floors.flatMap(floor => {
    const rooms: Array<any> = floor.children
    const numberStudents = floor.roomStuNumbs?.reduce((acc: any, cur: any) => {
      acc[cur.roomId] = cur.actualStuNum
      return acc
    }, {}) ?? {}

    return rooms.filter(room => Number.parseInt(room.freeRoom) === 1).map(room => {
      const courses: ClassroomCourse[] = room.roomCourseList.map((course: any) => {
        return {
          start: course.startSection,
          end: course.endSection,
          weeks: course.assignedWeeks,
        }
      })
      const nameParts = room.fullName.split('/')
      return {
        name: nameParts[nameParts.length - 1],
        courses: courses,
        buildingId: Number.parseInt(buildingId),
        nextSection: -1,
        lastSection: -1,
        numberStudents: numberStudents[room.nodeId] ? numberStudents[room.nodeId] : 0,
        id: room.nodeId,
        isVacant: false,
      }
    })
  })

  return freeRooms
}

export function isBefore(time1: Date, time2: Date): boolean {
  if (time1.getHours() < time2.getHours()) {
    return true
  } else if (time1.getHours() === time2.getHours()) {
    return time1.getMinutes() < time2.getMinutes()
  } else {
    return false
  }
}

export function isAfter(time1: Date, time2: Date): boolean {
  if (time1.getHours() > time2.getHours()) {
    return true
  } else if (time1.getHours() === time2.getHours()) {
    return time1.getMinutes() > time2.getMinutes()
  } else {
    return false
  }
}

export function compareSectionTime(time1: Date, time2: Date): number {
  if (time1.getHours() !== time2.getHours()) {
    return (time1.getHours() - time2.getHours()) > 0 ? 1 : -1
  }
  if (time1.getMinutes() !== time2.getMinutes()) {
    return (time1.getMinutes() - time2.getMinutes()) > 0 ? 1 : -1
  }
  return 0
}

export function updateLastSection(classrooms: ClassroomInfo[], week: number) {
  classrooms.forEach(classroom => {
    let lastSection = -1
    const availableCourses = classroom.courses.filter(c => c.weeks.includes(week.toString()))
    if (availableCourses.length > 0) {
      lastSection = Math.max(...availableCourses.map(c => c.end))
    }
    classroom.lastSection = lastSection
  })
}


export function updateNextSection(classrooms: ClassroomInfo[], currentSection: number, week: number) {
  classrooms.forEach(classroom => {
    let nextSection = -1
    const availableCourses = classroom.courses.filter(c => c.weeks.includes(week.toString()) && c.start > currentSection)
    if (availableCourses.length > 0) {
      nextSection = Math.min(...availableCourses.map(c => c.start))
    }
    classroom.nextSection = nextSection
  })
}

export function isClassroomVacant(classroom: ClassroomInfo, currentSection: number, week: number): boolean {
  if (classroom.courses.length === 0) {
    return true
  }
  return classroom.courses.every(c => {
    return !c.weeks.includes(week.toString()) || c.start > currentSection || c.end < currentSection
  })
}

export function updateClassroomVacancy(classrooms: ClassroomInfo[], currentSection: number, week: number) {
  classrooms.forEach(classroom => {
    classroom.isVacant = isClassroomVacant(classroom, currentSection, week)
  })
}

export function loadUserConfig(): UserConfig {
  if (localStorage.getItem('userConfig')) {
    try {
      return JSON.parse(localStorage.getItem('userConfig')!) as UserConfig
    } catch (error) {
      toast.error('用户配置加载失败，已重置为默认配置')
      return {
        presets: [],
        lastUsedPreset: ''
      }
    }
  } else {
    return {
      presets: [],
      lastUsedPreset: ''
    }
  }
}

export function saveUserConfig(config: UserConfig) {
  localStorage.setItem('userConfig', JSON.stringify(config))
}

