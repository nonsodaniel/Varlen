import {
  Controller, Post, Get, Delete, Param,
  UseInterceptors, UploadedFile, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        householdId: { type: 'string' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
    @Body('householdId') householdId?: string,
    @Body('entityType') entityType?: string,
    @Body('entityId') entityId?: string,
  ) {
    return this.uploadService.uploadFile(file, userId, householdId, entityType, entityId);
  }

  @Get()
  @ApiOperation({ summary: 'Get my uploads' })
  getUploads(@CurrentUser('sub') userId: string) {
    return this.uploadService.getUserUploads(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an upload' })
  deleteUpload(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.uploadService.deleteFile(id, userId);
  }
}
