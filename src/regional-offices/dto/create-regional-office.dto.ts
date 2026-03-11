import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRegionalOfficeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
