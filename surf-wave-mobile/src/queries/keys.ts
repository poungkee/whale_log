export const queryKeys = {
  // Auth & Users
  user: {
    all: ['user'] as const,
    me: () => [...queryKeys.user.all, 'me'] as const,
    stats: () => [...queryKeys.user.all, 'stats'] as const,
    detail: (userId: string) => [...queryKeys.user.all, userId] as const,
  },

  // Spots
  spots: {
    all: ['spots'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.spots.all, 'list', filters] as const,
    nearby: (lat: number, lng: number, radius?: number) =>
      [...queryKeys.spots.all, 'nearby', { lat, lng, radius }] as const,
    detail: (spotId: string) => [...queryKeys.spots.all, spotId] as const,
    votes: (spotId: string) => [...queryKeys.spots.all, spotId, 'votes'] as const,
    favorites: () => [...queryKeys.spots.all, 'favorites'] as const,
  },

  // Forecasts
  forecasts: {
    all: ['forecasts'] as const,
    current: (spotId: string) => [...queryKeys.forecasts.all, spotId, 'current'] as const,
    hourly: (spotId: string, date?: string) => [...queryKeys.forecasts.all, spotId, 'hourly', date] as const,
    weekly: (spotId: string) => [...queryKeys.forecasts.all, spotId, 'weekly'] as const,
  },

  // Diary
  diary: {
    all: ['diary'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.diary.all, 'list', filters] as const,
    calendar: (year: number, month: number) => [...queryKeys.diary.all, 'calendar', year, month] as const,
    detail: (diaryId: string) => [...queryKeys.diary.all, diaryId] as const,
    public: (filters?: Record<string, any>) => [...queryKeys.diary.all, 'public', filters] as const,
  },

  // Posts
  posts: {
    all: ['posts'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.posts.all, 'list', filters] as const,
    detail: (postId: string) => [...queryKeys.posts.all, postId] as const,
    comments: (postId: string) => [...queryKeys.posts.all, postId, 'comments'] as const,
    bookmarks: () => [...queryKeys.posts.all, 'bookmarks'] as const,
  },

  // QnA
  questions: {
    all: ['questions'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.questions.all, 'list', filters] as const,
    detail: (questionId: string) => [...queryKeys.questions.all, questionId] as const,
  },

  // Guides
  guides: {
    all: ['guides'] as const,
    list: (category?: string) => [...queryKeys.guides.all, 'list', category] as const,
    detail: (guideId: string) => [...queryKeys.guides.all, guideId] as const,
    progress: () => [...queryKeys.guides.all, 'progress'] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread'] as const,
    alerts: () => [...queryKeys.notifications.all, 'alerts'] as const,
  },
};
