import { NotificationType } from '../enums/notification-type.enum';

// ---------------------------------------------------------------------------
// Notification domain types
// ---------------------------------------------------------------------------

/** An in-app or push notification delivered to a user. */
export interface INotification {
  /** Unique identifier. */
  id: string;
  /** Recipient user ID. */
  userId: string;
  /** Notification headline. */
  title: string;
  /** Notification body text. */
  body: string;
  /** Whether the user has read this notification. */
  read: boolean;
  /** Discriminator for the notification kind. */
  type: NotificationType;
  /** Optional icon name or URL. */
  icon?: string;
  /** ISO-8601 date-time string when the notification was created. */
  createdAt: string;
}
