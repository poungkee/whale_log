/**
 * @file social-provider.enum.ts
 * @description 소셜 로그인 제공자 열거형
 *
 * Firebase Authentication을 통해 지원하는 소셜 로그인 플랫폼을 정의합니다.
 */
export enum SocialProvider {
  GOOGLE = 'GOOGLE',   // 구글 소셜 로그인
  APPLE = 'APPLE',     // 애플 소셜 로그인 (iOS)
  KAKAO = 'KAKAO',     // 카카오 소셜 로그인 (한국)
}
