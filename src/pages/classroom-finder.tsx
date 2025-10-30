import { useState, useEffect } from "react";
import { Clock, BookOpen, Calendar, Hourglass, RefreshCcw, Funnel, Building, SortAsc, SortDesc, Library, Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type BuildingInfo, type ClassroomInfo, defaultSemasterInfo, type SectionTime, type SemasterInfo } from "@/types/info";
import { compareSectionTime, getBuildings, getFreeClassrooms, getSemasterInfo, getTimeTable, isBefore, loadUserConfig, saveUserConfig, updateClassroomVacancy, updateLastSection, updateNextSection } from "@/lib/utils";
import { toast, Toaster } from "sonner";
import { format } from "date-fns";
import { ButtonGroup } from "@/components/ui/button-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ClassroomCard } from "@/components/classroom";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/multi-select";
import type { UserConfig } from "@/types/config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";

const sortOptions = [
  {
    heading: '人数',
    options: [
      { value: 'asc_students', label: '升序', icon: SortAsc },
      { value: 'desc_students', label: '降序', icon: SortDesc },
    ]
  },
  {
    heading: '下一节课时间',
    options: [
      { value: 'asc_next', label: '早到晚', icon: SortAsc },
      { value: 'desc_next', label: '晚到早', icon: SortDesc },
    ]
  },
  {
    heading: '下课时间',
    options: [
      { value: 'asc_end', label: '早到晚', icon: SortAsc },
      { value: 'desc_end', label: '晚到早', icon: SortDesc },
    ]
  }
]

const sortPresets = [
  {
    value: 'empty_least_people',
    label: '空闲且人数最少',
  },
  {
    value: 'stair_classroom',
    label: '阶梯教室',
  },
  {
    value: 'earliest_end',
    label: '最早结束',
  },
  {
    value: 'reset',
    label: '重置',
  }
]

const ClassroomFinderPage = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [timetable, setTimetable] = useState<SectionTime[]>([])
  const [buildings, setBuildings] = useState<BuildingInfo[]>([])
  const [classrooms, setClassrooms] = useState<ClassroomInfo[]>([])
  const [semasterInfo, setSemasterInfo] = useState<SemasterInfo>(defaultSemasterInfo)
  const [currentSection, setCurrentSection] = useState<number>(0)

  const [timePanelOpen, setTimePanelOpen] = useState<boolean>(false)
  const [presetPanelOpen, setPresetPanelOpen] = useState<boolean>(false)
  const [presetNamePanelOpen, setPresetNamePanelOpen] = useState<boolean>(false)
  const [clearPresetPanelOpen, setClearPresetPanelOpen] = useState<boolean>(false)
  const [userSetTime, setUserSetTime] = useState<Date>(new Date())

  const [filteredClassrooms, setFilteredClassrooms] = useState<ClassroomInfo[]>([])

  const [newPresetName, setNewPresetName] = useState<string>("")

  const [userConfig, setUserConfig] = useState<UserConfig>(loadUserConfig)

  // querys
  const [queryClassroomStatus, setQueryClassroomStatus] = useState<string>("all")
  const [queryBuildingIds, setQueryBuildingIds] = useState<string[]>([])
  const [querySortOptions, setQuerySortOptions] = useState<string[]>([])
  const [queryClassroomIds, setQueryClassroomIds] = useState<string[]>([])
  const [queryPreset, setQueryPreset] = useState<string>("")

  const refresh = async () => {
    try {
      console.log("refresh...")

      const info = await getSemasterInfo()
      setSemasterInfo(info)
      const tt = await getTimeTable()
      tt.sort((a, b) => a.start.getTime() - b.start.getTime())
      setTimetable(tt)
      const bldgs = await getBuildings()
      setBuildings(bldgs)
      const rooms =
        (await Promise.all(bldgs.map(building => getFreeClassrooms(building.id.toString()))))
          .flat()
      console.log(`init classrooms vacancy (week: ${info.week}, sec: ${currentSection}, rooms: ${rooms.length})...`)
      const curTime = new Date()
      const curSection = getSection(curTime, tt)

      updateLastSection(rooms, info.week)
      updateNextSection(rooms, curSection, info.week)
      updateClassroomVacancy(rooms, curSection, info.week)
      setClassrooms(rooms)
      setCurrentTime(curTime)
      setCurrentSection(curSection)
      toast.success("教室信息拉取成功")
    }
    catch (err) {
      console.log(err)
      toast.error(`Error: ${err}`)
    }
  }

  // init
  useEffect(() => {
    console.log("init...")
    refresh().then(() => {
      if (userConfig.lastUsedPreset) {
        loadPreset(userConfig.lastUsedPreset)
      }
    })
  }, [])

  const updateFilteredClassrooms = () => {
    // 1. by status
    let result: ClassroomInfo[] = classrooms
    if (queryClassroomStatus !== "all") {
      const isVacant = queryClassroomStatus === "vacant"
      result = classrooms.filter(c => c.isVacant === isVacant)
    }

    // 2. by building
    if (queryBuildingIds.length > 0) {
      result = result.filter(c => queryBuildingIds.includes(c.buildingId.toString()))
    }

    // 3. by classroom id
    if (queryClassroomIds.length > 0) {
      result = result.filter(c => queryClassroomIds.includes(c.id.toString()))
    }

    // 4. sort
    querySortOptions.forEach(sortOption => {
      switch (sortOption) {
        case 'asc_students':
          result.sort((a, b) => a.numberStudents - b.numberStudents)
          break
        case 'desc_students':
          result.sort((a, b) => b.numberStudents - a.numberStudents)
          break
        case 'asc_next':
          result.sort((a, b) => a.nextSection - b.nextSection)
          break
        case 'desc_next':
          result.sort((a, b) => b.nextSection - a.nextSection)
          break
        case 'asc_end':
          result.sort((a, b) => a.lastSection - b.lastSection)
          break
        case 'desc_end':
          result.sort((a, b) => b.lastSection - a.lastSection)
          break
      }
    })

    setFilteredClassrooms(result)
  }

  const clearSortOptions = () => {
    setQueryClassroomStatus('all')
    setQueryBuildingIds([])
    setQuerySortOptions([])
    setQueryClassroomIds([])
  }

  const updatePreset = () => {
    clearSortOptions()
    switch (queryPreset) {
      case 'empty_least_people':
        setQueryClassroomStatus('vacant')
        setQuerySortOptions(['asc_students'])
        break
      case 'stair_classroom':
        {
          const stairClassrooms = classrooms.filter(c => c.name.includes('15') || c.name.includes('05')).map(c => c.id.toString())
          setQueryClassroomIds(stairClassrooms)
        }
        break
      case 'earliest_end':
        setQuerySortOptions(['asc_end'])
        break
      case 'reset':
        break
    }
  }

  useEffect(updateFilteredClassrooms,
    [classrooms, queryClassroomStatus, queryBuildingIds, querySortOptions, queryClassroomIds, currentSection, semasterInfo])

  useEffect(updatePreset, [queryPreset])

  useEffect(() => { saveUserConfig(userConfig) }, [userConfig])

  const getSection = (date: Date, timetable: SectionTime[]): number => {
    if (timetable.length === 0) {
      return 0
    }
    if (isBefore(date, timetable[0].start)) {
      return 0
    }
    for (let i = 0; i < timetable.length; i++) {
      if (compareSectionTime(date, timetable[i].start) >= 0 && compareSectionTime(date, timetable[i].end) <= 0) {
        return i + 1
      }

      if (compareSectionTime(date, timetable[i].start) < 0) {
        return i + 1
      }
    }
    return timetable.length
  }

  // calculate current section
  useEffect(() => {
    setCurrentSection(getSection(currentTime, timetable))
  }, [currentTime, timetable])

  useEffect(() => {
    console.log(`update classrooms vacancy (week: ${semasterInfo.week}, sec: ${currentSection}, rooms: ${classrooms.length})...`)
    const rooms = classrooms.map(r => ({ ...r }));
    updateNextSection(rooms, currentSection, semasterInfo.week)
    updateClassroomVacancy(rooms, currentSection, semasterInfo.week)
    setClassrooms(rooms)
  }, [currentSection, semasterInfo])

  const getSectionTime = (section: number): string => {
    if (section === 0) {
      return '未开始'
    }
    if (section >= timetable.length) {
      return '已结束'
    }
    return `${format(timetable[section - 1].start, 'HH:mm')}-${format(timetable[section - 1].end, 'HH:mm')}`
  }

  const getNextPresetName = () => {
    if (!userConfig || (userConfig.presets.length === 0)) {
      return '预设1'
    } else {
      return `预设${userConfig.presets.length + 1}`
    }
  }

  const submitNewPresetName = () => {
    if (userConfig.presets.find(p => p.name === newPresetName)) {
      toast.error('预设名称已存在，请更换名称')
      return
    }
    setUserConfig(cfg => {
      return {
        ...cfg,
        presets: [...cfg.presets, {
          name: newPresetName,
          classroomIds: queryClassroomIds,
          buildingIds: queryBuildingIds,
          status: queryClassroomStatus,
          sortOptions: querySortOptions
        }]
      }
    })
    setPresetNamePanelOpen(false)
    toast.success(`已保存预设: ${newPresetName}`)
  }

  const loadPreset = (presetName: string) => {
    const preset = userConfig.presets.find(p => p.name === presetName)
    if (preset) {
      setQueryBuildingIds(preset.buildingIds)
      setQueryClassroomIds(preset.classroomIds)
      setQueryClassroomStatus(preset.status)
      setQuerySortOptions(preset.sortOptions)
      toast.success(`已加载预设: ${presetName}`)
      userConfig.lastUsedPreset = presetName
    } else {
      toast.error(`未找到对应预设: ${presetName}`)
    }
  }

  const handleUserSetTime = () => {
    if (userSetTime) {
      setCurrentTime(userSetTime)
    }
    setTimePanelOpen(false)
  }

  const handleClearPresets = () => {
    setUserConfig(cfg => {
      return {
        ...cfg,
        presets: []
      }
    })
    setClearPresetPanelOpen(false)
    toast.success('已清空所有预设')
  }

  return (
    <>
      <main className="h-screen w-screen bg-muted/60 justify-center items-center flex py-2">
        <ScrollArea className="w-full max-w-6xl h-full bg-card rounded-lg shadow-lg">
          <div className="flex flex-col space-y-6 m-6 mt-10">
            {/* 卡片内容区，承载所有三个部分 */}
            {/* ===== 2. 标题部分 (左对齐文档式) ===== */}
            <div className="flex flex-col w-full sm:flex-row space-y-4">
              <div className="flex-shrink-0 self-start">
                <h1 className="text-3xl font-bold tracking-tight">
                  SJTU Vacant Classrooms
                </h1>
                <p className="text-muted-foreground mt-1">
                  SJTU空闲自习教室实时查询
                </p>
              </div>
              <div className="flex flex-row-reverse flex-grow self-end">
                <ButtonGroup >
                  <Button variant='outline' onClick={refresh}>
                    <RefreshCcw />
                    刷新
                  </Button>
                  <Popover open={timePanelOpen} onOpenChange={setTimePanelOpen}>
                    <PopoverTrigger asChild>
                      <Button variant='outline'>
                        <Calendar />
                        选择时间
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="grid gap-4">
                        <div className="flex space-x-4">
                          <div className="space-y-2 flex-grow">
                            <h4 className="leading-none font-medium">输入时间</h4>
                            <p className="text-muted-foreground text-sm">
                              不会改变人数
                            </p>
                          </div>
                          <Button variant="outline" onClick={handleUserSetTime}>
                            确认
                          </Button>
                        </div>
                        <div className="grid gap-2">
                          <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="time">时间</Label>
                            <Input
                              type="time"
                              id="time"
                              defaultValue={format(userSetTime, 'HH:mm')}
                              className="col-span-2 h-8"
                              onChange={e => { setUserSetTime(new Date(`1970-01-01T${e.target.value}:00`)) }}
                            />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <ThemeToggle />
                </ButtonGroup>
              </div>
            </div>

            {/* ===== 3. 信息部分 (指标卡片网格) ===== */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>当前时间</ItemTitle>
                  <ItemDescription>{format(currentTime, 'HH:mm')}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Clock size={16} />
                </ItemActions>
              </Item>
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>当前学期</ItemTitle>
                  <ItemDescription>{semasterInfo.year}-{semasterInfo.sename}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <BookOpen size={16} />
                </ItemActions>
              </Item>
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>当前周数</ItemTitle>
                  <ItemDescription>第 {semasterInfo.week} 周</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Calendar size={16} />
                </ItemActions>
              </Item>
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>当前节次</ItemTitle>
                  <ItemDescription>第 {currentSection} 节 ({getSectionTime(currentSection)})</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Hourglass size={16} />
                </ItemActions>
              </Item>
            </div>

            {/* ===== 4. 主要部分 ===== */}
            <div className="flex-1 flex flex-col w-full space-y-4">
              <div className="text-xl flex flex-row items-center">
                <p className="font-semibold">自习教室</p>
                <div className="flex-grow flex flex-row-reverse">
                  <ButtonGroup>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline">
                          <Funnel />
                          筛选
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-90 text-sm">
                        <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                          <p className="w-fit">状态</p>
                          <Select defaultValue="vacant" value={queryClassroomStatus} onValueChange={setQueryClassroomStatus}>
                            <SelectTrigger className="w-full" size="sm">
                              <SelectValue placeholder="空闲" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vacant">空闲</SelectItem>
                              <SelectItem value="occupied">占用</SelectItem>
                              <SelectItem value="all">全部</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="w-fit">教学楼</p>
                          <MultiSelect responsive={true} variant="secondary" placeholder="选择所在的教学楼" defaultValue={queryBuildingIds} onValueChange={setQueryBuildingIds}
                            options={buildings.map(b => ({ value: b.id.toString(), label: b.name, icon: Building }))} searchable={false} />
                          <p className="w-fit">教室</p>
                          <MultiSelect responsive={true} variant="secondary" placeholder="选择教室" defaultValue={queryClassroomIds} onValueChange={setQueryClassroomIds}
                            options={classrooms.map(c => ({ value: c.id.toString(), label: c.name, icon: Library }))} searchable={true} />
                          <p className="w-fit">排序</p>
                          <MultiSelect responsive={true} variant="secondary" placeholder="选择排序方式" defaultValue={querySortOptions} onValueChange={setQuerySortOptions}
                            options={sortOptions} searchable={false} />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Popover open={presetNamePanelOpen} onOpenChange={setPresetNamePanelOpen}>
                      <PopoverTrigger asChild>
                        <Button onClick={() => setNewPresetName(getNextPresetName())} variant="outline">
                          <Save />
                          保存
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-sm">
                        <div className="grid gap-4">
                          <div className="space-y-1">
                            <p className="font-bold">保存预设</p>
                            <p className="text-muted-foreground">将当前筛选条件保存为预设</p>
                          </div>
                          <Input id="preset-name" onKeyDown={e => { e.key === 'Enter' && submitNewPresetName() }} value={newPresetName} onChange={e => setNewPresetName(e.target.value)} />
                          <div className="w-full flex flex-row-reverse space-x-3 space-x-reverse">
                            <Button onClick={submitNewPresetName}>确认</Button>
                            <Button onClick={() => setPresetNamePanelOpen(false)} variant="outline">取消</Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <DropdownMenu open={presetPanelOpen} onOpenChange={setPresetPanelOpen} modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <Settings />
                          预设
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>内置</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          {sortPresets.map(preset => (
                            <DropdownMenuItem key={preset.value} onSelect={() => {
                              setQueryPreset(preset.value)
                              setPresetPanelOpen(false)
                            }}>
                              <span>{preset.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>保存的</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          {userConfig && userConfig.presets.map(preset => (
                            <DropdownMenuItem key={preset.name} onSelect={() => loadPreset(preset.name)}>
                              <span>{preset.name}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>删除</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {userConfig && userConfig.presets.map(preset => (
                                <DropdownMenuItem key={preset.name} onSelect={() => {
                                  setUserConfig(cfg => {
                                    return {
                                      ...cfg,
                                      presets: cfg.presets.filter(p => p.name !== preset.name)
                                    }
                                  })
                                  toast.success(`已删除预设: ${preset.name}`)
                                }}>
                                  <span>{preset.name}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <Popover modal open={clearPresetPanelOpen} onOpenChange={setClearPresetPanelOpen}>
                            <PopoverTrigger asChild>
                              <DropdownMenuItem onSelect={e => { e.preventDefault(); setClearPresetPanelOpen(true) }}>清空</DropdownMenuItem>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 text-sm">
                              <div className="grid gap-4">
                                <div className="space-y-1">
                                  <p className="font-bold">清空预设</p>
                                  <p className="text-muted-foreground">确定要清空所有保存的预设吗？此操作不可撤销！</p>
                                </div>
                                <div className="w-full flex flex-row-reverse space-x-3 space-x-reverse">
                                  <Button variant="destructive" onClick={handleClearPresets}>确认</Button>
                                  <Button variant="outline" onClick={() => setClearPresetPanelOpen(false)}>取消</Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ButtonGroup>
                </div>
              </div>
              <div className="flex-grow flex flex-wrap space-x-2 space-y-2">
                {filteredClassrooms.map(classroom => <ClassroomCard room={classroom} timetable={timetable} />)}
              </div>
            </div>
          </div>
        </ScrollArea>
      </main>
    </>
  );
};

export default ClassroomFinderPage;
