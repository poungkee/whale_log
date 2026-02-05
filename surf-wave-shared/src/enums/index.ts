export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum Difficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum BoardType {
  LONGBOARD = 'LONGBOARD',
  SHORTBOARD = 'SHORTBOARD',
  FUNBOARD = 'FUNBOARD',
  FISH = 'FISH',
  GUN = 'GUN',
  FOAMBOARD = 'FOAMBOARD',
  BODYBOARD = 'BODYBOARD',
  SUP = 'SUP',
}

export enum ReportReason {
  SPAM = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
  HARASSMENT = 'HARASSMENT',
  MISINFORMATION = 'MISINFORMATION',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
}

export enum NotificationType {
  COMMENT = 'COMMENT',
  LIKE = 'LIKE',
  ANSWER = 'ANSWER',
  ACCEPTED_ANSWER = 'ACCEPTED_ANSWER',
  CONDITION_ALERT = 'CONDITION_ALERT',
  SYSTEM = 'SYSTEM',
  BROADCAST = 'BROADCAST',
}

export enum TideStatus {
  HIGH = 'HIGH',
  LOW = 'LOW',
  RISING = 'RISING',
  FALLING = 'FALLING',
}

export enum WindDirection {
  N = 'N',
  NE = 'NE',
  E = 'E',
  SE = 'SE',
  S = 'S',
  SW = 'SW',
  W = 'W',
  NW = 'NW',
}

export enum VoteType {
  PERFECT = 'PERFECT',
  FLAT = 'FLAT',
  MEDIOCRE = 'MEDIOCRE',
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum GuideCategory {
  BASICS = 'BASICS',
  SAFETY = 'SAFETY',
  EQUIPMENT = 'EQUIPMENT',
  ETIQUETTE = 'ETIQUETTE',
}

export enum SocialProvider {
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}
