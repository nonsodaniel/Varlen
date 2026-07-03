import { Priority } from '../enums/priority.enum';
import { RecurringType } from '../enums/recurring.enum';

// ---------------------------------------------------------------------------
// Task domain types
// ---------------------------------------------------------------------------

/** A task (or chore) belonging to a household. */
export interface ITask {
  /** Unique identifier. */
  id: string;
  /** Household this task belongs to. */
  householdId: string;
  /** Short title. */
  title: string;
  /** Optional longer description / notes. */
  description?: string;
  /** Whether the task has been completed. */
  completed: boolean;
  /** ISO-8601 date string for the due date. */
  dueDate?: string;
  /** Priority level. */
  priority: Priority;
  /** User ID of the assigned household member. */
  assignedTo?: string;
  /** User ID of the member who created the task. */
  createdBy: string;
  /** Whether the task is visible to all household members. */
  shared: boolean;
  /** Optional grouping category (e.g. "Kitchen", "Garden"). */
  category?: string;
  /** Recurrence pattern, if the task repeats. */
  recurring?: RecurringType;
  /** Whether this task is classified as a household chore. */
  isChore?: boolean;
}

/** Payload for creating a new task. */
export interface ICreateTask {
  /** Household this task belongs to. */
  householdId: string;
  /** Short title. */
  title: string;
  /** Optional description. */
  description?: string;
  /** ISO-8601 due date. */
  dueDate?: string;
  /** Priority level. */
  priority: Priority;
  /** Assigned member user ID. */
  assignedTo?: string;
  /** Whether visible to all household members. */
  shared: boolean;
  /** Optional grouping category. */
  category?: string;
  /** Recurrence pattern. */
  recurring?: RecurringType;
  /** Whether this is a household chore. */
  isChore?: boolean;
}

/** Payload for updating an existing task. */
export interface IUpdateTask {
  /** Updated title. */
  title?: string;
  /** Updated description. */
  description?: string;
  /** Updated completion flag. */
  completed?: boolean;
  /** Updated ISO-8601 due date. */
  dueDate?: string;
  /** Updated priority. */
  priority?: Priority;
  /** Updated assigned member. */
  assignedTo?: string;
  /** Updated sharing flag. */
  shared?: boolean;
  /** Updated category. */
  category?: string;
  /** Updated recurrence pattern. */
  recurring?: RecurringType;
  /** Updated chore flag. */
  isChore?: boolean;
}

/** Query parameters for fetching tasks. */
export interface IQueryTasks {
  /** Filter by completion status. */
  completed?: boolean;
  /** Filter by priority level. */
  priority?: Priority;
  /** Filter by assigned user ID. */
  assignedTo?: string;
  /** Filter by sharing status. */
  shared?: boolean;
  /** Filter by category. */
  category?: string;
  /** Filter by chore flag. */
  isChore?: boolean;
}
