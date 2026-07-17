import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyReceiptDto {
  @ApiProperty({ description: 'Platform the purchase was made on' })
  @IsString()
  @IsEnum(['ios', 'android'])
  platform: 'ios' | 'android';

  @ApiProperty({ description: 'RevenueCat customer ID' })
  @IsString()
  revenuecatCustomerId: string;

  @ApiPropertyOptional({ description: 'Product ID from the store' })
  @IsOptional()
  @IsString()
  productId?: string;
}
