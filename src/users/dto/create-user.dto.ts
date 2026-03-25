import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, ValidateIf } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ProductType } from '../../common/enums/product-type.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsNumber()
  @IsOptional()
  branchId?: number;

  @IsNumber()
  @IsOptional()
  regionalOfficeId?: number;

  @ValidateIf((o) => o.role === UserRole.HEAD_OFFICE)
  @IsNotEmpty()
  @IsEnum(ProductType)
  productType?: ProductType;

  @IsString()
  @IsOptional()
  email?: string;
}
