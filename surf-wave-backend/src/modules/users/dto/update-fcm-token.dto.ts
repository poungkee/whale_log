/**
 * @file update-fcm-token.dto.ts
 * @description FCM 토큰 업데이트 요청 DTO
 *
 * PATCH /users/me/fcm-token 엔드포인트에서 사용됩니다.
 * 모바일 앱이 시작될 때 또는 토큰이 갱신될 때 호출합니다.
 */
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFcmTokenDto {
  /** FCM 디바이스 토큰 - Firebase Cloud Messaging에서 발급한 푸시 알림 토큰 */
  @ApiProperty({ description: 'Firebase Cloud Messaging token' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
