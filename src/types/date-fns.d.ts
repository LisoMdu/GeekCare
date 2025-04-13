declare module 'date-fns' {
  export function startOfMonth(date: Date): Date;
  export function endOfMonth(date: Date): Date;
  export function eachDayOfInterval(interval: { start: Date; end: Date }): Date[];
  export function isSameMonth(date: Date, dateToCompare: Date): boolean;
  export function isToday(date: Date): boolean;
  export function format(date: Date, formatStr: string): string;
  export function addDays(date: Date, amount: number): Date;
} 