export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type Message = {
  id: string;
  sender: 'user' | 'contact';
  author: string;
  text: string;
  timestamp: string;
  attachments?: Attachment[];
};

export type ConversationStatus = 'online' | 'offline';

export type DetailsTab = 'info' | 'canned' | 'apps';

export type ChatNote = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

export type VisitorInfo = {
  email?: string;
  phone?: string;
  location?: string;
  localTime?: string;
  ipAddress?: string;
  os?: string;
  browser?: string;
  device?: string;
  startedUrl?: string;
  chattingTime?: string;
  tags?: string[];
};

export type Conversation = {
  id: string;
  name: string;
  title: string;
  status: ConversationStatus;
  unread: number;
  initials: string;
  messages: Message[];
  quickReplies: string[];
  autoReplies: string[];
  visitorInfo?: VisitorInfo;
  notes?: ChatNote[];
};
