import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HomeController } from './home/home.controller';
import { ChatGateway } from './chat/chat.gateway';
import { GatewayModule } from './chat/gateway.module';

@Module({
  imports: [GatewayModule],
  controllers: [AppController, HomeController],
  providers: [AppService, ChatGateway],
})
export class AppModule {}
