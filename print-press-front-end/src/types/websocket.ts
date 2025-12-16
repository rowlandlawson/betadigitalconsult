export interface BaseWebSocketMessage {
  type: string;
  timestamp?: string;
}

export interface ConnectedMessage extends BaseWebSocketMessage {
  type: 'connected';
  message: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

export interface SubscribedMessage extends BaseWebSocketMessage {
  type: 'subscribed';
  channels: string[];
}

export interface PongMessage extends BaseWebSocketMessage {
  type: 'pong';
}

export interface NewNotificationMessage extends BaseWebSocketMessage {
  type: 'new_notification';
  notification: Notification;
}

export type WebSocketMessage =
  | ConnectedMessage
  | SubscribedMessage
  | PongMessage
  | NewNotificationMessage;
