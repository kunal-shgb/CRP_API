import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMccCodeDto {
  @IsString()
  @IsNotEmpty()
  mcc_code: string;

  @IsString()
  @IsNotEmpty()
  mcc_name: string;
}

export class UpdateMccCodeDto {
  @IsString()
  @IsNotEmpty()
  mcc_code?: string;

  @IsString()
  @IsNotEmpty()
  mcc_name?: string;
}
