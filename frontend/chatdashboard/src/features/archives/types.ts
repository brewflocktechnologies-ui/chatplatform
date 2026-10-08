export interface PreChatFormData {
  name?: string;
  email?: string;
  [key: string]: string | undefined;
}

export interface ChatMessage {
  id: string;
  sender: 'agent' | 'visitor' | 'system';
  author: string;
  avatar?: string;
  initials?: string;
  text?: string;
  timestamp: string;
  type?: 'text' | 'pre-chat-form' | 'system-closed';
  formData?: PreChatFormData;
}

export interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarBg?: string;
  localTime: string;
  location: string;
  allChatsCount: number;
}

export interface ChatInfo {
  chatId: string;
  chattingTime: string;
  startedAt: string;
  startedUrl: string;
  group: string;
}

export interface TechInfo {
  ipAddress: string;
  os: string;
  browser: string;
  device: string;
}

export interface ArchivedChat {
  id: string;
  customerName: string;
  date: string;
  timestamp: string;
  agent: string;
  snippet: string;
  messageCount: number;
  tags: string[];
  customer: CustomerInfo;
  chatInfo: ChatInfo;
  preChatForm: PreChatFormData;
  technology: TechInfo;
  messages: ChatMessage[];
  previousChatId?: string;
  nextChatId?: string;
}
