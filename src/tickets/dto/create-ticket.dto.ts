import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ProductType } from '../../common/enums/product-type.enum';
import { IssueType } from '../../common/enums/issue-type.enum';

export class CreateTicketDto {
  @IsString()
  @IsOptional()
  utr_rrn?: string;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @IsEnum(ProductType)
  @IsNotEmpty()
  product_type: ProductType;

  @IsEnum(IssueType)
  @IsNotEmpty()
  issue_type: IssueType;

  @IsString()
  @IsNotEmpty()
  description: string;
}
