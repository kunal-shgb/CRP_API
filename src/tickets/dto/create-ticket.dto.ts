import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDate, IsNumber, ValidateIf, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, Validate } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType } from '../../common/enums/product-type.enum';
import { TicketType } from '../../common/enums/ticket-type.enum';

@ValidatorConstraint({ name: 'utrValidation', async: false })
class UtrValidation implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as CreateTicketDto;
    if (object.ticket_type === TicketType.OTHERS) return true;
    if (typeof value !== 'string') return false;

    const product = object.product_type;
    const utrLength = value.length;
    const isNumeric = /^\d+$/.test(value);

    if ([ProductType.UPI, ProductType.IMPS, ProductType.ATM, ProductType.AEPS].includes(product)) {
      return utrLength === 12 && isNumeric;
    } else if (product === ProductType.RTGS) {
      return utrLength === 22;
    } else if (product === ProductType.NEFT) {
      return utrLength === 16;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as CreateTicketDto;
    const product = object.product_type;
    
    if ([ProductType.UPI, ProductType.IMPS, ProductType.ATM, ProductType.AEPS].includes(product)) {
      return `UTR/RRN must be exactly 12 numeric digits for ${product}`;
    } else if (product === ProductType.RTGS) {
      return "UTR/RRN must be exactly 22 characters for RTGS";
    } else if (product === ProductType.NEFT) {
      return "UTR/RRN must be exactly 16 characters for NEFT";
    }
    return "Invalid UTR/RRN";
  }
}

export class CreateTicketDto {

  @ValidateIf(o => o.ticket_type !== TicketType.OTHERS)
  @IsString()
  @IsNotEmpty()
  @Validate(UtrValidation)
  utr_rrn?: string;

  @ValidateIf(o => o.ticket_type !== TicketType.OTHERS)
  @Type(() => Date)
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
