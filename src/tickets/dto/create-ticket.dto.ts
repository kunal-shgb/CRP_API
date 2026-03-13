import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDate, IsNumber, ValidateIf } from 'class-validator';
import { ProductType } from '../../common/enums/product-type.enum';
import { TicketType } from '../../common/enums/ticket-type.enum';

export class CreateTicketDto {

  @ValidateIf(o => o.ticket_type !== TicketType.OTHERS)
  @IsString()
  @IsNotEmpty()
  utr_rrn?: string;

  @ValidateIf(o => o.ticket_type !== TicketType.OTHERS)
  @IsDate()
  @IsNotEmpty()
  transaction_date?: Date;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @ValidateIf(o => o.ticket_type !== TicketType.OTHERS)
  @IsNumber()
  @IsNotEmpty()
  transaction_amount?: number;

  @IsEnum(ProductType)
  @IsNotEmpty()
  product_type: ProductType;

  @IsEnum(TicketType)
  @IsNotEmpty()
  ticket_type: TicketType;

  @IsString()
  @IsNotEmpty()
  description: string;
}
