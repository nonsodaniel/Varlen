import { RecurringType } from '../enums/recurring.enum';

// ---------------------------------------------------------------------------
// Calendar domain types
// ---------------------------------------------------------------------------

/** A calendar event belonging to a household. */
export interface ICalendarEvent {
  /** Unique identifier. */
  id: string;
  /** Household this event belongs to. */
  householdId: string;
  /** Short title displayed on the calendar. */
  title: string;
  /** Optional longer description / notes. */
  description?: string;
  /** ISO-8601 date-time string for the start of the event. */
  startDate: string;
  /** ISO-8601 date-time string for the end of the event. */
  endDate: string;
  /** Whether the event spans the entire day. */
  allDay: boolean;
  /** Hex colour used to render the event. */
  color: string;
  /** Optional location name or address. */
  location?: string;
  /** User ID of the member who created the event. */
  createdBy: string;
  /** Whether the event is visible to all household members. */
  shared: boolean;
  /** Recurrence pattern, if the event repeats. */
  recurring?: RecurringType;
}

/** Payload for creating a new calendar event. */
export interface ICreateCalendarEvent {
  /** Household this event belongs to. */
  householdId: string;
  /** Short title. */
  title: string;
  /** Optional description. */
  description?: string;
  /** ISO-8601 start date-time. */
  startDate: string;
  /** ISO-8601 end date-time. */
  endDate: string;
  /** Whether the event is all-day. */
  allDay: boolean;
  /** Hex colour. */
  color: string;
  /** Optional location. */
  location?: string;
  /** Whether visible to all household members. */
  shared: boolean;
  /** Recurrence pattern. */
  recurring?: RecurringType;
}

/** Payload for updating an existing calendar event. */
export interface IUpdateCalendarEvent {
  /** Updated title. */
  title?: string;
  /** Updated description. */
  description?: string;
  /** Updated ISO-8601 start date-time. */
  startDate?: string;
  /** Updated ISO-8601 end date-time. */
  endDate?: string;
  /** Updated all-day flag. */
  allDay?: boolean;
  /** Updated hex colour. */
  color?: string;
  /** Updated location. */
  location?: string;
  /** Updated sharing flag. */
  shared?: boolean;
  /** Updated recurrence pattern. */
  recurring?: RecurringType;
}

/** Query parameters for fetching calendar events. */
export interface IQueryCalendarEvents {
  /** ISO-8601 date-time lower bound. */
  start?: string;
  /** ISO-8601 date-time upper bound. */
  end?: string;
  /** Filter by sharing status. */
  shared?: boolean;
  /** Filter by creator user ID. */
  createdBy?: string;
}
