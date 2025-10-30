from typing import Any, Dict, List, Tuple
from datetime import datetime
from pydantic import BaseModel
import requests

GET_BUILD_ID_URL = 'https://ids.sjtu.edu.cn/build/findAreaBuild?schoolArea=0'
SCHOOL_BUILD_ID = 3  # 3 - 闵行, 662 - 徐汇
CLASSROOM_TYPE_URL = 'https://ids.sjtu.edu.cn/build/findBuildRoomType?buildId={building_id}&mobileType=mobileFlag'
SEMASTER_INFO_URL = 'https://ids.sjtu.edu.cn/course/findCurSemester'
TIMETABLE_URL = 'https://ids.sjtu.edu.cn/course/findSection'

current_time = datetime.strptime('22:40', '%H:%M')  # for test


class SectionTime(BaseModel):
    start: datetime
    end: datetime


class ClassroomCourse(BaseModel):
    start: int
    end: int
    weeks: str


class ClassroomInfo(BaseModel):
    name: str
    courses: List[ClassroomCourse]
    building_name: str
    next_section: int = -1  # 查询过程中更新, 表示当前空余的自习室最早到后面的哪一节会被重新占用
    last_section: int = -1  # 查询过程中更新, 表示当前空余的自习室最晚的一节, 这之后该教室一定为空


def get_timetable() -> List[SectionTime]:
    req = requests.post(TIMETABLE_URL)
    req.raise_for_status()
    sections = req.json()['data']['section']
    section_times = [
        SectionTime(
            start=datetime.strptime(section['startTime'], '%H:%M'),
            end=datetime.strptime(section['endTime'], '%H:%M')
        )
        for section in sections
    ]
    section_times.sort(key=lambda x: x.start)
    return section_times


def get_semaster_info() -> Dict[str, Any]:
    req = requests.post(SEMASTER_INFO_URL)
    req.raise_for_status()
    return req.json()['data']


def get_buildings_id() -> Dict[str, int]:
    req = requests.post(
        GET_BUILD_ID_URL
    )
    req.raise_for_status()

    school_list = req.json()['data']['buildList']
    for school in school_list:
        if school['id'] == SCHOOL_BUILD_ID:
            buildings = school['children']
            return {
                build['name']: build['id']
                for build in buildings
            }

    return None


def get_free_classrooms(building_id: int, building_name: str) -> List[ClassroomInfo]:
    req = requests.post(
        CLASSROOM_TYPE_URL.format(building_id=building_id)
    )
    req.raise_for_status()

    floors = req.json()['data']['floorList']
    free_rooms = [
        room
        for floor in floors
        for room in floor['children']
        if int(room['freeRoom']) == 1
    ]

    result: List[ClassroomInfo] = []
    for room in free_rooms:
        courses = [
            ClassroomCourse(
                start=course['startSection'],
                end=course['endSection'],
                weeks=course['assignedWeeks']
            )
            for course in room['roomCourseList']
        ]
        result.append(
            ClassroomInfo(
                name=room['fullName'].split('/')[-1],
                courses=courses,
                building_name=building_name
            )
        )

    return result


def get_section(tp: datetime, sections: List[SectionTime]) -> int:
    for i, section in enumerate(sections):
        if section.start <= tp <= section.end:
            return i + 1
        if i < len(sections) - 1 and section.end < tp < sections[i + 1].start:
            return i + 2

    if tp < sections[0].start:
        return -1
    return len(sections) + 1


def update_next_section(rooms: List[ClassroomInfo], section: int, week: int):
    for room in rooms:
        next_section = -1
        next_courses = [
            course for course in room.courses
            if course.start > section and str(week) in course.weeks
        ]
        if next_courses:
            next_section = min(course.start for course in next_courses)
        room.next_section = next_section


def update_last_section(rooms: List[ClassroomInfo], week: int):
    for room in rooms:
        last_section = -1
        avail_courses = [
            course for course in room.courses
            if str(week) in course.weeks
        ]
        if avail_courses:
            last_section = max(course.end for course in avail_courses)
        room.last_section = last_section


def main():
    sem_info = get_semaster_info()
    section_time = get_timetable()
    classrooms: List[ClassroomInfo] = []
    current_section = get_section(current_time, section_time)
    print(f"学期: {sem_info['year']}-{sem_info['sename']}")
    print(f"周数: {sem_info['week']}")
    print(f"当前时间: {current_time.strftime('%H:%M')}")
    print(f"当前节次: {current_section}")
    print(f"时间表: {', '.join([s.start.strftime('%H:%M')+'-'+s.end.strftime('%H:%M') for s in section_time])}")
    buildings = get_buildings_id()
    for building, id in buildings.items():
        rooms = get_free_classrooms(id, building)
        print(f"{building} (id: {id}, 自习室: {len(rooms)})")
        classrooms.extend(rooms)

    # 0. 预处理, 计算每个自习室的 last_section
    update_last_section(classrooms, sem_info['week'])

    # 1. 筛选当前空余的自习教室
    current_free_rooms = [
        room
        for room in classrooms
        if all(
            not (course.start <= current_section <= course.end and str(sem_info['week']) in course.weeks)
            for course in room.courses
        )
    ]
    # 1.1. 对于每个自习室, 计算其到后面哪一节又会被占用, 没有就是 -1, 更新 next_section, 并计算最后一节
    update_next_section(current_free_rooms, current_section, sem_info['week'])

    grouped = {
        building: [
            room for room in current_free_rooms
            if room.building_name == building
        ]
        for building in buildings.keys()
    }

    print(f"当前空余自习室: ")
    for building, rooms in grouped.items():
        print(f"  {building}:", end=' ')
        for room in rooms:
            print(room.name, end='')
            if room.next_section != -1:
                print(f"(到{room.next_section}节{section_time[room.next_section - 1].start.strftime('%H:%M')})", end=', ')
            else:
                print("(空闲)", end=', ')
        print()

    # 2. 计算最后一节课离当前节次最近的自习室
    min_dist = 100
    for room in classrooms:
        if room.last_section != -1 and room.last_section >= current_section:
            min_dist = min(min_dist, room.last_section - current_section)

    closest_rooms = []
    for room in classrooms:
        if room.last_section == current_section + min_dist:
            closest_rooms.append(room)

    grouped = {
        building: [
            room for room in closest_rooms
            if room.building_name == building
        ]
        for building in buildings.keys()
    }

    closest_section = current_section + min_dist
    if min_dist == 100:
        print('未找到节次最近的自习室')
        return
    print(f"距离当前节次最近的自习室 ({closest_section}节{section_time[closest_section - 1].end.strftime('%H:%M')}): ")
    for building, rooms in grouped.items():
        print(f"  {building}:", end=' ')
        for room in rooms:
            print(room.name, end=', ')
        print()


if __name__ == '__main__':
    main()
