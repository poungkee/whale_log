export const APP_CONSTANTS = {
  API_VERSION: 'v1',
  API_PREFIX: '/api/v1',

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  IMAGE: {
    MAX_UPLOAD_COUNT: 5,
    MAX_FILE_SIZE_MB: 10,
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  },

  NICKNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 30,
  },

  POST: {
    MAX_CONTENT_LENGTH: 5000,
    MAX_TAGS: 10,
  },

  COMMENT: {
    MAX_CONTENT_LENGTH: 2000,
    MAX_DEPTH: 1,
  },

  DIARY: {
    MIN_SATISFACTION: 1,
    MAX_SATISFACTION: 5,
  },

  FORECAST: {
    DEFAULT_HOURS: 24,
    WEEKLY_DAYS: 7,
  },

  CACHE_TTL: {
    FORECAST_CURRENT: 15 * 60,
    FORECAST_HOURLY: 30 * 60,
    SPOTS_LIST: 5 * 60,
    VOTES: 2 * 60,
    NOTIFICATIONS_UNREAD: 60,
    GUIDES_LIST: 60 * 60,
  },
} as const;
