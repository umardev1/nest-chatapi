import { Logger, OnModuleInit } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket as IoSocket, Server } from 'socket.io';

export interface CustomSocket extends IoSocket {
  username?: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001'],
  },
})
export class ChatGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer() io: Server;
  connectedUsers = {};
  unreadMessages = {};

  onModuleInit() {}

  afterInit() {
    this.logger.log('Initialized');

    this.io.on('connection', (socket: CustomSocket) => {
      console.log('connected - socket.id', socket.id);
    });
  }

  handleConnection(client: CustomSocket, ...args: any[]) {
    const { sockets } = this.io.sockets;

    this.logger.log(`Client id: ${client.id} connected`);
    this.logger.debug(`Number of connected clients: ${sockets.size}`);
  }

  handleDisconnect(client: CustomSocket) {
    this.logger.log(`Client id:${client.id} disconnected`);
    delete this.connectedUsers[client.id];

    const users = [];
    for (const connectedUser in this.connectedUsers) {
      users.push({
        userID: this.connectedUsers[connectedUser].id,
        username: this.connectedUsers[connectedUser].username,
        unread:
          this.unreadMessages[this.connectedUsers[connectedUser].username] || 0,
      });
    }
    console.log(users.length);
    this.io.emit('users', users);
  }

  @SubscribeMessage('newMessage')
  onNewMessage(@MessageBody() body: any): string {
    const to = body.to,
      from = body.from,
      message = body.content,
      date = body.date,
      time = body.time;

    if (this.connectedUsers.hasOwnProperty(to)) {
      this.connectedUsers[to].emit('onMessage', {
        msg: 'New Message',
        to: to,
        from: from,
        content: message,
        date: date,
        time: time,
      });
    }

    if (!this.unreadMessages[from]) {
      this.unreadMessages[from] = 0;
    }
    this.unreadMessages[from] += 1;
    this.io.to(to).emit('updateUnreadCount', {
      user: from,
      count: this.unreadMessages[from],
    });

    return 'Hello world!';
  }

  @SubscribeMessage('register')
  handleRegister(client: CustomSocket, data: any) {
    client.username = data;
    this.connectedUsers[client.id] = client;

    const users = [];
    for (const connectedUser in this.connectedUsers) {
      users.push({
        unread:
          this.unreadMessages[this.connectedUsers[connectedUser].username] || 0,
        userID: this.connectedUsers[connectedUser].id,
        username: this.connectedUsers[connectedUser].username,
      });
    }
    this.io.emit('users', users);
  }

  @SubscribeMessage('resetCount')
  handleUpdateCount(client: CustomSocket, data: any) {
    this.unreadMessages[data] = 0;
    this.io.emit('resetSuccess', {
      user: data,
      count: this.unreadMessages[data],
    });
  }

  @SubscribeMessage('createGroup')
  handleCreateGroup(@MessageBody() body: any) {
    const { groupName, members } = body;
    members.forEach((member) => {
      const memberSocket = this.connectedUsers[member.userID];
      if (memberSocket) {
        memberSocket.join(groupName);
      }
    });
    this.io.to(groupName).emit('groupCreated', { groupName, members });
    return { groupName, members };
  }

  @SubscribeMessage('joinGroup')
  handleJoinGroup(client: CustomSocket, @MessageBody() body: any) {
    const { groupName } = body;
    client.join(groupName);
    this.io.to(groupName).emit('userJoined', { groupName, userId: client.id });
  }

  @SubscribeMessage('groupMessage')
  handleGroupMessage(@MessageBody() body: any) {
    const { groupName, from, message, date, time } = body;
    this.io.to(groupName).emit('onGroupMessage', {
      msg: 'New Group Message',
      groupName,
      from,
      content: message,
      username: this.connectedUsers[from].username,
      date,
      time,
    });
  }
}
