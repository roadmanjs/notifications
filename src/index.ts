import {BadgeResolver} from './badge/Badge.resolver';
import NotificationResolver from './notification/notification.resolver';

export const getNotificationResolvers = () => [NotificationResolver, BadgeResolver];
