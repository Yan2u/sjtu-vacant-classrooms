import type { ClassroomInfo, SectionTime } from "@/types/info";
import type { JSX } from "react";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item"
import { ArrowRight, CheckCircle, CheckCircleIcon, Clock4, ListEnd, Lock, School, Sparkle, Unlock, Users } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

export function ClassroomCard({ room, timetable }: { room: ClassroomInfo, timetable: SectionTime[] }): JSX.Element {
    function getSectionDescription(section: number): string {
        if (section < 0 || section > timetable.length) {
            return "无"
        }
        return `第 ${section} 节 (${format(timetable[section - 1].start, 'HH:mm')} - ${format(timetable[section - 1].end, 'HH:mm')})`
    }

    const html =
        <>
            <Item variant="outline" className="w-full sm:w-64 h-32 border-2">
                <ItemContent>
                    <ItemTitle className="font-bold">{room.name}</ItemTitle>
                    <ItemDescription className="flex flex-row items-center">
                        <ArrowRight size={16} className="mr-1" />
                        {getSectionDescription(room.nextSection)}
                    </ItemDescription>
                    <ItemDescription className="flex flex-row items-center">
                        <Clock4 size={16} className="mr-1" />
                        {getSectionDescription(room.lastSection)}
                    </ItemDescription>
                    <ItemDescription className="flex flex-row items-center">
                        <Users size={16} className="mr-1" />
                        {room.numberStudents}
                    </ItemDescription>
                </ItemContent>
                <ItemActions className="h-full">
                    {
                        room.isVacant ? (
                            <Unlock size={32} className="text-green-200 place-self-end" />
                        ) : (
                            <Lock size={32} className="text-red-200 place-self-end" />
                        )
                    }
                </ItemActions>
            </Item>
        </>
    return html
}