import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'text/plain', 'text/csv',
];

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    householdId?: string,
    entityType?: string,
    entityId?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File too large. Maximum size is 10MB');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    const ext = path.extname(file.originalname);
    const hash = crypto.randomBytes(16).toString('hex');
    const filename = `${hash}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const apiUrl = this.config.get('API_BASE_URL', 'http://localhost:3000');
    const url = `${apiUrl}/uploads/${filename}`;

    const record = await this.prisma.fileUpload.create({
      data: {
        userId,
        householdId,
        filename,
        mimeType: file.mimetype,
        size: file.size,
        url,
        entityType,
        entityId,
      },
    });

    return { id: record.id, url: record.url, filename, mimeType: file.mimetype, size: file.size };
  }

  async getUserUploads(userId: string) {
    return this.prisma.fileUpload.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async deleteFile(id: string, userId: string) {
    const file = await this.prisma.fileUpload.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!file) return;

    const filePath = path.join(this.uploadDir, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.prisma.fileUpload.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
