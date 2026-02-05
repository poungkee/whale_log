export interface CreateAnswerRequest {
  content: string;
}

export interface UpdateAnswerRequest {
  content: string;
}

export interface AnswerResponse {
  id: string;
  questionId: string;
  author: AnswerAuthor;
  content: string;
  isAccepted: boolean;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerAuthor {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}
