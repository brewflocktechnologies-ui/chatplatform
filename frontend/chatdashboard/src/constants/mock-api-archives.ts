import type { ArchivedChat, ChatMessage, CustomerInfo, PreChatFormData } from '@/features/archives/types';

const DAN_AVATAR = '/avatars/dan.jpg';

const agentMsg = (id: string, text: string, timestamp: string, author = 'Dan'): ChatMessage => ({
  id,
  sender: 'agent',
  author,
  avatar: DAN_AVATAR,
  text,
  timestamp,
  type: 'text'
});

const visitorMsg = (
  id: string,
  author: string,
  initials: string,
  text: string,
  timestamp: string
): ChatMessage => ({
  id,
  sender: 'visitor',
  author,
  initials,
  text,
  timestamp,
  type: 'text'
});

const systemClosedMsg = (id: string, timestamp: string, text?: string): ChatMessage => ({
  id,
  sender: 'system',
  author: 'System',
  timestamp,
  type: 'system-closed',
  ...(text ? { text } : {})
});

const CUSTOMER_TEST_1011: CustomerInfo = {
  id: 'cust-5',
  name: 'Test 10.11',
  email: 'xddd@xd.en',
  initials: 'T',
  avatarBg: 'bg-purple-600',
  localTime: '06:54 am local time',
  location: 'Krakow, Lesser Poland, Poland',
  allChatsCount: 14
};

const PRE_CHAT_ELOKI: PreChatFormData = {
  name: 'Eloki',
  email: 'elo@elo858is.melos'
};

export const MOCK_ARCHIVED_CHATS: ArchivedChat[] = [
  {
    id: 'chat-1',
    customerName: 'Visitor',
    date: '15 Feb 2024',
    timestamp: 'Thu 02/15/2024 04:12 pm',
    agent: 'Dan',
    snippet: 'D: Hello. How may I help you? V: testing Home',
    messageCount: 2,
    tags: [],
    customer: {
      id: 'cust-1',
      name: 'Visitor',
      email: 'visitor.7482@guest.com',
      initials: 'V',
      avatarBg: 'bg-emerald-600',
      localTime: '03:12 pm local time',
      location: 'Berlin, Germany',
      allChatsCount: 3
    },
    chatInfo: {
      chatId: 'V91AL88ZX1',
      chattingTime: '45 s',
      startedAt: 'Thu 02/15/2024 04:12 pm',
      startedUrl: 'https://treative.eu/home',
      group: 'General Support'
    },
    preChatForm: {
      name: 'Visitor',
      email: 'visitor.7482@guest.com'
    },
    technology: {
      ipAddress: '91.140.42.11',
      os: 'macOS 14.2',
      browser: 'Safari 17.2',
      device: 'MacBook Pro'
    },
    messages: [
      agentMsg('m1-1', 'Hello. How may I help you?', '04:12 pm'),
      visitorMsg('m1-2', 'Visitor', 'V', 'testing Home', '04:13 pm'),
      systemClosedMsg('m1-3', '04:13 pm')
    ]
  },
  {
    id: 'chat-2',
    customerName: 'Unnamed customer',
    date: '15 Feb 2024',
    timestamp: 'Thu 02/15/2024 10:05 am',
    agent: 'Dan',
    snippet: 'D: Hello. How may I help you? D: Hi D: hi',
    messageCount: 3,
    tags: [],
    customer: {
      id: 'cust-2',
      name: 'Unnamed customer',
      email: 'guest.anonymous@live.net',
      initials: 'U',
      avatarBg: 'bg-slate-600',
      localTime: '11:05 am local time',
      location: 'London, United Kingdom',
      allChatsCount: 1
    },
    chatInfo: {
      chatId: 'K23MM99PQ4',
      chattingTime: '1 m 10 s',
      startedAt: 'Thu 02/15/2024 10:05 am',
      startedUrl: 'https://treative.eu/pricing',
      group: 'Sales Support'
    },
    preChatForm: {
      name: 'Anonymous Guest',
      email: 'guest.anonymous@live.net'
    },
    technology: {
      ipAddress: '194.80.231.5',
      os: 'Windows 11',
      browser: 'Chrome 121.0',
      device: 'Desktop'
    },
    messages: [
      agentMsg('m2-1', 'Hello. How may I help you?', '10:05 am'),
      agentMsg('m2-2', 'Hi', '10:06 am'),
      agentMsg('m2-3', 'hi', '10:06 am'),
      systemClosedMsg('m2-4', '10:06 am')
    ]
  },
  {
    id: 'chat-3',
    customerName: 'Visitor',
    date: '23 May 2023',
    timestamp: 'Tue 05/23/2023 02:40 pm',
    agent: 'Dan',
    snippet: 'D: Hello. How may I help you? V: xd V: hey',
    messageCount: 3,
    tags: [],
    customer: {
      id: 'cust-3',
      name: 'Visitor',
      email: 'visitor.may23@gmail.com',
      initials: 'V',
      avatarBg: 'bg-indigo-600',
      localTime: '02:40 pm local time',
      location: 'Warsaw, Poland',
      allChatsCount: 2
    },
    chatInfo: {
      chatId: 'M77TR41XC8',
      chattingTime: '29 s',
      startedAt: 'Tue 05/23/2023 02:40 pm',
      startedUrl: 'https://treative.eu/features',
      group: 'General Support'
    },
    preChatForm: {
      name: 'Visitor',
      email: 'visitor.may23@gmail.com'
    },
    technology: {
      ipAddress: '83.21.144.90',
      os: 'Windows 10',
      browser: 'Firefox 114.0',
      device: 'Desktop'
    },
    messages: [
      agentMsg('m3-1', 'Hello. How may I help you?', '02:40 pm'),
      visitorMsg('m3-2', 'Visitor', 'V', 'xd', '02:40 pm'),
      visitorMsg('m3-3', 'Visitor', 'V', 'hey', '02:41 pm'),
      systemClosedMsg('m3-4', '02:41 pm')
    ]
  },
  {
    id: 'chat-4',
    customerName: 'Visitor',
    date: '23 Mar 2023',
    timestamp: 'Thu 03/23/2023 11:15 am',
    agent: 'Dan',
    snippet: 'D: Hello. How may I help you? V: elos D: os los',
    messageCount: 3,
    tags: [],
    customer: {
      id: 'cust-4',
      name: 'Visitor',
      email: 'visitor.mar23@fastmail.com',
      initials: 'V',
      avatarBg: 'bg-emerald-600',
      localTime: '11:15 am local time',
      location: 'Poznan, Poland',
      allChatsCount: 4
    },
    chatInfo: {
      chatId: 'P55NB12LK3',
      chattingTime: '42 s',
      startedAt: 'Thu 03/23/2023 11:15 am',
      startedUrl: 'https://treative.eu/contact',
      group: 'General Support'
    },
    preChatForm: {
      name: 'Visitor',
      email: 'visitor.mar23@fastmail.com'
    },
    technology: {
      ipAddress: '178.43.12.8',
      os: 'Android 13',
      browser: 'Chrome Mobile',
      device: 'Samsung Galaxy S22'
    },
    messages: [
      agentMsg('m4-1', 'Hello. How may I help you?', '11:15 am'),
      visitorMsg('m4-2', 'Visitor', 'V', 'elos', '11:15 am'),
      agentMsg('m4-3', 'os los', '11:16 am'),
      systemClosedMsg('m4-4', '11:16 am')
    ]
  },
  {
    id: 'chat-5',
    customerName: 'Test 10.11',
    date: '10 Nov 2022',
    timestamp: 'Started - Mon 03/28/2022 12:27 pm',
    agent: 'Dan',
    snippet: 'D: Hello. How may I help you? T1: xd D: xd D: 😻',
    messageCount: 4,
    tags: ['lead', 'botengine-transfer'],
    previousChatId: 'chat-6',
    customer: CUSTOMER_TEST_1011,
    chatInfo: {
      chatId: 'R99GL02NU0',
      chattingTime: '18 s',
      startedAt: 'Mon 03/28/2022 12:27 pm',
      startedUrl: 'https://treative.eu/testchat/',
      group: 'Chat Metrics'
    },
    preChatForm: PRE_CHAT_ELOKI,
    technology: {
      ipAddress: '87.239.22.104',
      os: 'Windows 10',
      browser: 'Chrome 108.0',
      device: 'Desktop'
    },
    messages: [
      agentMsg('m5-1', 'Welcome back, let us know if you have any questions.', '12:27 pm'),
      {
        id: 'm5-2',
        sender: 'visitor',
        author: 'Test 10.11',
        initials: 'T',
        type: 'pre-chat-form',
        timestamp: '12:27 pm',
        formData: PRE_CHAT_ELOKI
      },
      visitorMsg('m5-3', 'Test 10.11', 'T', '777', '12:27 pm'),
      agentMsg('m5-4', 'ok', '12:27 pm'),
      systemClosedMsg('m5-5', '12:27 pm', 'Archived - closed by agent • 12:27 pm')
    ]
  },
  {
    id: 'chat-6',
    customerName: 'Test 10.11',
    date: '29 Sep 2022',
    timestamp: 'Thu 09/29/2022 03:15 pm',
    agent: 'Dan',
    snippet: 'D: Hello. How may I help you? T1: sss T1: s T1: s D: xd',
    messageCount: 5,
    tags: ['lead'],
    nextChatId: 'chat-5',
    customer: CUSTOMER_TEST_1011,
    chatInfo: {
      chatId: 'Q44PT91AB7',
      chattingTime: '34 s',
      startedAt: 'Thu 09/29/2022 03:15 pm',
      startedUrl: 'https://treative.eu/testchat/',
      group: 'Chat Metrics'
    },
    preChatForm: PRE_CHAT_ELOKI,
    technology: {
      ipAddress: '87.239.22.104',
      os: 'Windows 10',
      browser: 'Chrome 105.0',
      device: 'Desktop'
    },
    messages: [
      agentMsg('m6-1', 'Hello. How may I help you?', '03:15 pm'),
      visitorMsg('m6-2', 'Test 10.11', 'T', 'sss', '03:15 pm'),
      visitorMsg('m6-3', 'Test 10.11', 'T', 's', '03:16 pm'),
      visitorMsg('m6-4', 'Test 10.11', 'T', 's', '03:16 pm'),
      agentMsg('m6-5', 'xd', '03:16 pm'),
      systemClosedMsg('m6-6', '03:17 pm', 'Archived - closed by agent • 03:17 pm')
    ]
  }
];

export const TOTAL_ARCHIVED_COUNT = 1328;
