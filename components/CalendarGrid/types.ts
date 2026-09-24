import type { EventRow } from "../../lib/types";

export interface EventBarDescriptor {
    event: EventRow;
    colStart: number;
    colEnd: number;
    lane: number;
}

export interface DayDots {
    [isoDate: string]: string[];
}

export interface DayEvents {
    [isoDate: string]: EventRow[];
}
