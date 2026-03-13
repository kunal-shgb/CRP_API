import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber } from 'class-validator';
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
  roId?: number;

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType;

  @IsString()
  @IsOptional()
  email?: string;
}
