interface ErrorDetail {
  code: string;
  message: string;
}

interface AuthErrors {
  INVALID_TOKEN: ErrorDetail;
  USER_NOT_FOUND: ErrorDetail;
  ALREADY_REGISTERED: ErrorDetail;
  UNAUTHORIZED: ErrorDetail;
}

interface UserErrors {
  NICKNAME_TAKEN: ErrorDetail;
  PROFILE_NOT_FOUND: ErrorDetail;
  SUSPENDED: ErrorDetail;
}

interface SpotErrors {
  NOT_FOUND: ErrorDetail;
  ALREADY_VOTED_TODAY: ErrorDetail;
  ALREADY_FAVORITED: ErrorDetail;
}

interface DiaryErrors {
  NOT_FOUND: ErrorDetail;
  NOT_OWNER: ErrorDetail;
  INVALID_DATE: ErrorDetail;
}

interface PostErrors {
  NOT_FOUND: ErrorDetail;
  NOT_AUTHOR: ErrorDetail;
  HIDDEN: ErrorDetail;
}

interface CommentErrors {
  NOT_FOUND: ErrorDetail;
  NOT_AUTHOR: ErrorDetail;
  MAX_DEPTH_EXCEEDED: ErrorDetail;
}

interface QuestionErrors {
  NOT_FOUND: ErrorDetail;
  NOT_AUTHOR: ErrorDetail;
  ALREADY_CLOSED: ErrorDetail;
}

interface AnswerErrors {
  NOT_FOUND: ErrorDetail;
  NOT_AUTHOR: ErrorDetail;
  ALREADY_ACCEPTED: ErrorDetail;
}

interface ReportErrors {
  NOT_FOUND: ErrorDetail;
  DUPLICATE: ErrorDetail;
  SELF_REPORT: ErrorDetail;
}

interface UploadErrors {
  FILE_TOO_LARGE: ErrorDetail;
  INVALID_TYPE: ErrorDetail;
  MAX_COUNT_EXCEEDED: ErrorDetail;
}

interface CommonErrors {
  FORBIDDEN: ErrorDetail;
  NOT_FOUND: ErrorDetail;
  BAD_REQUEST: ErrorDetail;
  INTERNAL_ERROR: ErrorDetail;
}

interface ErrorCodes {
  AUTH: AuthErrors;
  USER: UserErrors;
  SPOT: SpotErrors;
  DIARY: DiaryErrors;
  POST: PostErrors;
  COMMENT: CommentErrors;
  QUESTION: QuestionErrors;
  ANSWER: AnswerErrors;
  REPORT: ReportErrors;
  UPLOAD: UploadErrors;
  COMMON: CommonErrors;
}

export const ERROR_CODES: ErrorCodes = {
  AUTH: {
    INVALID_TOKEN: { code: 'AUTH_001', message: 'Invalid or expired authentication token' },
    USER_NOT_FOUND: { code: 'AUTH_002', message: 'Authenticated user not found in database' },
    ALREADY_REGISTERED: { code: 'AUTH_003', message: 'User is already registered' },
    UNAUTHORIZED: { code: 'AUTH_004', message: 'Authentication is required to access this resource' },
  },
  USER: {
    NICKNAME_TAKEN: { code: 'USER_001', message: 'This nickname is already taken' },
    PROFILE_NOT_FOUND: { code: 'USER_002', message: 'User profile not found' },
    SUSPENDED: { code: 'USER_003', message: 'User account has been suspended' },
  },
  SPOT: {
    NOT_FOUND: { code: 'SPOT_001', message: 'Surf spot not found' },
    ALREADY_VOTED_TODAY: { code: 'SPOT_002', message: 'You have already voted for this spot today' },
    ALREADY_FAVORITED: { code: 'SPOT_003', message: 'This spot is already in your favorites' },
  },
  DIARY: {
    NOT_FOUND: { code: 'DIARY_001', message: 'Diary entry not found' },
    NOT_OWNER: { code: 'DIARY_002', message: 'You are not the owner of this diary entry' },
    INVALID_DATE: { code: 'DIARY_003', message: 'Invalid date for diary entry' },
  },
  POST: {
    NOT_FOUND: { code: 'POST_001', message: 'Post not found' },
    NOT_AUTHOR: { code: 'POST_002', message: 'You are not the author of this post' },
    HIDDEN: { code: 'POST_003', message: 'This post has been hidden' },
  },
  COMMENT: {
    NOT_FOUND: { code: 'COMMENT_001', message: 'Comment not found' },
    NOT_AUTHOR: { code: 'COMMENT_002', message: 'You are not the author of this comment' },
    MAX_DEPTH_EXCEEDED: { code: 'COMMENT_003', message: 'Maximum comment nesting depth exceeded' },
  },
  QUESTION: {
    NOT_FOUND: { code: 'QUESTION_001', message: 'Question not found' },
    NOT_AUTHOR: { code: 'QUESTION_002', message: 'You are not the author of this question' },
    ALREADY_CLOSED: { code: 'QUESTION_003', message: 'This question has already been closed' },
  },
  ANSWER: {
    NOT_FOUND: { code: 'ANSWER_001', message: 'Answer not found' },
    NOT_AUTHOR: { code: 'ANSWER_002', message: 'You are not the author of this answer' },
    ALREADY_ACCEPTED: { code: 'ANSWER_003', message: 'An answer has already been accepted for this question' },
  },
  REPORT: {
    NOT_FOUND: { code: 'REPORT_001', message: 'Report not found' },
    DUPLICATE: { code: 'REPORT_002', message: 'You have already reported this content' },
    SELF_REPORT: { code: 'REPORT_003', message: 'You cannot report your own content' },
  },
  UPLOAD: {
    FILE_TOO_LARGE: { code: 'UPLOAD_001', message: 'File size exceeds the maximum allowed limit' },
    INVALID_TYPE: { code: 'UPLOAD_002', message: 'File type is not supported' },
    MAX_COUNT_EXCEEDED: { code: 'UPLOAD_003', message: 'Maximum number of files exceeded' },
  },
  COMMON: {
    FORBIDDEN: { code: 'COMMON_001', message: 'You do not have permission to perform this action' },
    NOT_FOUND: { code: 'COMMON_002', message: 'Requested resource not found' },
    BAD_REQUEST: { code: 'COMMON_003', message: 'Invalid request parameters' },
    INTERNAL_ERROR: { code: 'COMMON_004', message: 'An unexpected internal error occurred' },
  },
};
