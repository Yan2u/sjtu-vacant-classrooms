/*
GET_BUILD_ID_URL = 'https://ids.sjtu.edu.cn/build/findAreaBuild?schoolArea=0'
SCHOOL_BUILD_ID = 3  # 3 - 闵行, 662 - 徐汇
CLASSROOM_TYPE_URL = 'https://ids.sjtu.edu.cn/build/findBuildRoomType?buildId={building_id}&mobileType=mobileFlag'
SEMASTER_INFO_URL = 'https://ids.sjtu.edu.cn/course/findCurSemester'
TIMETABLE_URL = 'https://ids.sjtu.edu.cn/course/findSection'
*/

export const GET_BUILD_ID_URL = '/api/buildings'
export const SCHOOL_BUILD_ID = 3  // 3 - 闵行, 662 - 徐汇
export const CLASSROOM_TYPE_URL = '/api/classroom?buildingId=${buildingId}'
export const SEMASTER_INFO_URL = '/api/semaster'
export const TIMETABLE_URL = '/api/timetable'