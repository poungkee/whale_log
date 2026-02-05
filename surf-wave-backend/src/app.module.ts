import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Feature modules will be imported here as they are created
    // e.g.:
    // UsersModule,
    // AuthModule,
    // SpotsModule,
    // SessionsModule,
    // UploadsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
