export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const IMAGE = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_COUNT_PER_POST: 10,
  MAX_COUNT_PER_DIARY: 5,
  MAX_COUNT_PER_PROFILE: 1,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ],
  THUMBNAIL_WIDTH: 300,
  THUMBNAIL_HEIGHT: 300,
} as const;

export const COMMENT = {
  MAX_DEPTH: 3,
  MAX_LENGTH: 1000,
} as const;

export const NICKNAME = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 20,
} as const;

export const POST = {
  TITLE_MAX_LENGTH: 100,
  CONTENT_MAX_LENGTH: 5000,
} as const;

export const QUESTION = {
  TITLE_MAX_LENGTH: 200,
  CONTENT_MAX_LENGTH: 5000,
} as const;

export const ANSWER = {
  CONTENT_MAX_LENGTH: 5000,
} as const;

export const SPOT_VOTE = {
  DAILY_LIMIT: 1,
} as const;

export const AUTH = {
  FIREBASE_TOKEN_HEADER: 'Authorization',
  BEARER_PREFIX: 'Bearer ',
} as const;

export const CACHE = {
  SHORT_TTL: 60,          // 1 minute
  MEDIUM_TTL: 300,        // 5 minutes
  LONG_TTL: 3600,         // 1 hour
  SPOT_LIST_TTL: 600,     // 10 minutes
} as const;
