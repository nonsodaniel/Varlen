import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload.sub;

      // Join personal room
      client.join(`user:${payload.sub}`);

      // Join ALL user's circle rooms
      const memberships = await this.prisma.householdMember.findMany({
        where: { userId: payload.sub, leftAt: null },
        select: { householdId: true },
      });

      for (const membership of memberships) {
        client.join(`household:${membership.householdId}`);
      }

      // Legacy: also set householdId from token for backward compat
      if (payload.householdId) {
        client.data.householdId = payload.householdId;
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // cleanup handled by socket.io
  }
}
