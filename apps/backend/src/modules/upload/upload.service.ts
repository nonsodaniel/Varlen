import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import * as path from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'text/plain', 'text/csv',
];

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly accountId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('R2_BUCKET_NAME', 'sivena-uploads');
    // Trim trailing slash to avoid double-slash in generated URLs
    this.publicUrl = (this.config.get<string>('R2_PUBLIC_URL', '')).replace(/\/$/, '');
    this.accountId = this.config.get<string>('R2_ACCOUNT_ID', '');

    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID', '');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY', '');

    if (accessKeyId && secretAccessKey && this.accountId) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log('R2 storage configured');
    } else {
      this.logger.warn('R2 credentials not set — uploads will fail. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.');
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
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File buffer is empty');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File too large. Maximum size is 10MB');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
    if (!this.s3) {
      throw new BadRequestException('File storage is not configured');
    }
    if (!this.publicUrl) {
      throw new InternalServerErrorException('R2_PUBLIC_URL is not configured');
    }

    // Sanitise optional string params — NestJS @Body returns "" for missing fields
    const safeHouseholdId = householdId || undefined;
    const safeEntityType = entityType || undefined;
    const safeEntityId = entityId || undefined;

    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const hash = crypto.randomBytes(16).toString('hex');
    const key = `uploads/${userId}/${hash}${ext}`;

    // Upload to R2 first
    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
      }));
    } catch (err: any) {
      this.logger.error('R2 upload failed:', err?.message ?? err);
      throw new InternalServerErrorException('File upload failed. Please try again.');
    }

    const url = `${this.publicUrl}/${key}`;

    // Persist record — if this fails, clean up the R2 object to avoid orphans
    try {
      const record = await this.prisma.fileUpload.create({
        data: {
          userId,
          householdId: safeHouseholdId,
          filename: key,
          mimeType: file.mimetype,
          size: file.size,
          url,
          entityType: safeEntityType,
          entityId: safeEntityId,
        },
      });
      return { id: record.id, url: record.url, filename: key, mimeType: file.mimetype, size: file.size };
    } catch (err: any) {
      this.logger.error('DB insert failed after R2 upload, rolling back R2 object:', err?.message ?? err);
      // Best-effort cleanup — don't let the cleanup error mask the original
      this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch((e) =>
        this.logger.error('R2 rollback delete failed:', e?.message ?? e),
      );
      throw new InternalServerErrorException('Could not save file record. Please try again.');
    }
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

    if (this.s3) {
      try {
        await this.s3.send(new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: file.filename,
        }));
      } catch (err: any) {
        this.logger.error(`Failed to delete R2 object ${file.filename}:`, err?.message ?? err);
      }
    }

    await this.prisma.fileUpload.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
