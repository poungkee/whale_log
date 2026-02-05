export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidNickname = (nickname: string): boolean => {
  // 2-30자, 한글/영문/숫자/언더스코어만 허용
  const nicknameRegex = /^[가-힣a-zA-Z0-9_]{2,30}$/;
  return nicknameRegex.test(nickname);
};

export const isValidPassword = (password: string): boolean => {
  // 최소 8자, 영문/숫자/특수문자 포함
  return password.length >= 8;
};

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim().length === 0) {
    return `${fieldName}을(를) 입력해주세요.`;
  }
  return null;
};

export const validateMinLength = (value: string, min: number, fieldName: string): string | null => {
  if (value.length < min) {
    return `${fieldName}은(는) 최소 ${min}자 이상이어야 합니다.`;
  }
  return null;
};

export const validateMaxLength = (value: string, max: number, fieldName: string): string | null => {
  if (value.length > max) {
    return `${fieldName}은(는) 최대 ${max}자까지 입력 가능합니다.`;
  }
  return null;
};

export const validateRange = (value: number, min: number, max: number, fieldName: string): string | null => {
  if (value < min || value > max) {
    return `${fieldName}은(는) ${min}에서 ${max} 사이여야 합니다.`;
  }
  return null;
};
