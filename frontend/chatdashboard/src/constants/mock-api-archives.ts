import type { ArchivedChat } from '@/features/archives/types';

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
      {
        id: 'm1-1',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'Hello. How may I help you?',
        timestamp: '04:12 pm',
        type: 'text'
      },
      {
        id: 'm1-2',
        sender: 'visitor',
        author: 'Visitor',
        initials: 'V',
        text: 'testing Home',
        timestamp: '04:13 pm',
        type: 'text'
      },
      {
        id: 'm1-3',
        sender: 'system',
        author: 'System',
        timestamp: '04:13 pm',
        type: 'system-closed'
      }
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
      {
        id: 'm2-1',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'Hello. How may I help you?',
        timestamp: '10:05 am',
        type: 'text'
      },
      {
        id: 'm2-2',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'Hi',
        timestamp: '10:06 am',
        type: 'text'
      },
      {
        id: 'm2-3',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'hi',
        timestamp: '10:06 am',
        type: 'text'
      },
      {
        id: 'm2-4',
        sender: 'system',
        author: 'System',
        timestamp: '10:06 am',
        type: 'system-closed'
      }
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
      {
        id: 'm3-1',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'Hello. How may I help you?',
        timestamp: '02:40 pm',
        type: 'text'
      },
      {
        id: 'm3-2',
        sender: 'visitor',
        author: 'Visitor',
        initials: 'V',
        text: 'xd',
        timestamp: '02:40 pm',
        type: 'text'
      },
      {
        id: 'm3-3',
        sender: 'visitor',
        author: 'Visitor',
        initials: 'V',
        text: 'hey',
        timestamp: '02:41 pm',
        type: 'text'
      },
      {
        id: 'm3-4',
        sender: 'system',
        author: 'System',
        timestamp: '02:41 pm',
        type: 'system-closed'
      }
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
      {
        id: 'm4-1',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'Hello. How may I help you?',
        timestamp: '11:15 am',
        type: 'text'
      },
      {
        id: 'm4-2',
        sender: 'visitor',
        author: 'Visitor',
        initials: 'V',
        text: 'elos',
        timestamp: '11:15 am',
        type: 'text'
      },
      {
        id: 'm4-3',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'os los',
        timestamp: '11:16 am',
        type: 'text'
      },
      {
        id: 'm4-4',
        sender: 'system',
        author: 'System',
        timestamp: '11:16 am',
        type: 'system-closed'
      }
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
    customer: {
      id: 'cust-5',
      name: 'Test 10.11',
      email: 'xddd@xd.en',
      initials: 'T',
      avatarBg: 'bg-purple-600',
      localTime: '06:54 am local time',
      location: 'Krakow, Lesser Poland, Poland',
      allChatsCount: 14
    },
    chatInfo: {
      chatId: 'R99GL02NU0',
      chattingTime: '18 s',
      startedAt: 'Mon 03/28/2022 12:27 pm',
      startedUrl: 'https://treative.eu/testchat/',
      group: 'Chat Metrics'
    },
    preChatForm: {
      name: 'Eloki',
      email: 'elo@elo858is.melos'
    },
    technology: {
      ipAddress: '87.239.22.104',
      os: 'Windows 10',
      browser: 'Chrome 108.0',
      device: 'Desktop'
    },
    messages: [
      {
        id: 'm5-1',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'Welcome back, let us know if you have any questions.',
        timestamp: '12:27 pm',
        type: 'text'
      },
      {
        id: 'm5-2',
        sender: 'visitor',
        author: 'Test 10.11',
        initials: 'T',
        type: 'pre-chat-form',
        timestamp: '12:27 pm',
        formData: {
          name: 'Eloki',
          email: 'elo@elo858is.melos'
        }
      },
      {
        id: 'm5-3',
        sender: 'visitor',
        author: 'Test 10.11',
        initials: 'T',
        text: '777',
        timestamp: '12:27 pm',
        type: 'text'
      },
      {
        id: 'm5-4',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'ok',
        timestamp: '12:27 pm',
        type: 'text'
      },
      {
        id: 'm5-5',
        sender: 'system',
        author: 'System',
        text: 'Archived - closed by agent • 12:27 pm',
        timestamp: '12:27 pm',
        type: 'system-closed'
      }
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
    customer: {
      id: 'cust-5',
      name: 'Test 10.11',
      email: 'xddd@xd.en',
      initials: 'T',
      avatarBg: 'bg-purple-600',
      localTime: '06:54 am local time',
      location: 'Krakow, Lesser Poland, Poland',
      allChatsCount: 14
    },
    chatInfo: {
      chatId: 'Q44PT91AB7',
      chattingTime: '34 s',
      startedAt: 'Thu 09/29/2022 03:15 pm',
      startedUrl: 'https://treative.eu/testchat/',
      group: 'Chat Metrics'
    },
    preChatForm: {
      name: 'Eloki',
      email: 'elo@elo858is.melos'
    },
    technology: {
      ipAddress: '87.239.22.104',
      os: 'Windows 10',
      browser: 'Chrome 105.0',
      device: 'Desktop'
    },
    messages: [
      {
        id: 'm6-1',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'Hello. How may I help you?',
        timestamp: '03:15 pm',
        type: 'text'
      },
      {
        id: 'm6-2',
        sender: 'visitor',
        author: 'Test 10.11',
        initials: 'T',
        text: 'sss',
        timestamp: '03:15 pm',
        type: 'text'
      },
      {
        id: 'm6-3',
        sender: 'visitor',
        author: 'Test 10.11',
        initials: 'T',
        text: 's',
        timestamp: '03:16 pm',
        type: 'text'
      },
      {
        id: 'm6-4',
        sender: 'visitor',
        author: 'Test 10.11',
        initials: 'T',
        text: 's',
        timestamp: '03:16 pm',
        type: 'text'
      },
      {
        id: 'm6-5',
        sender: 'agent',
        author: 'Dan',
        avatar: '/avatars/dan.jpg',
        text: 'xd',
        timestamp: '03:16 pm',
        type: 'text'
      },
      {
        id: 'm6-6',
        sender: 'system',
        author: 'System',
        text: 'Archived - closed by agent • 03:17 pm',
        timestamp: '03:17 pm',
        type: 'system-closed'
      }
    ]
  }
];

export const TOTAL_ARCHIVED_COUNT = 1328;
