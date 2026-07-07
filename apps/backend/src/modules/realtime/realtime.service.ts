import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private gateway: RealtimeGateway) {}

  emitToHousehold(householdId: string, event: string, payload: any) {
    this.gateway.server?.to(`household:${householdId}`).emit(event, payload);
  }

  emitToCircles(circleIds: string[], event: string, payload: any) {
    const rooms = circleIds.map((id) => `household:${id}`);
    this.gateway.server?.to(rooms).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: any) {
    this.gateway.server?.to(`user:${userId}`).emit(event, payload);
  }
}
