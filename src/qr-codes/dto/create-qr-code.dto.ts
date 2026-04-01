import {
  IsString, IsNotEmpty, IsEmail, IsOptional,
  Length, Matches,
} from 'class-validator';

export class CreateQrCodeDto {
  @IsString()
  @IsNotEmpty()
  merchant_name: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Mobile number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Mobile number must contain only digits' })
  mobile_number: string;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @IsString()
  @IsNotEmpty()
  ifsc_code: string;

  @IsString()
  @IsNotEmpty()
  mcc_code: string;

  @IsEmail()
  @IsOptional()
  email_id?: string;

  @IsString()
  @IsNotEmpty()
  transaction_type: string;

  @IsString()
  @IsNotEmpty()
  address_line1: string;

  @IsString()
  @IsOptional()
  address_line2?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Pincode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Pincode must contain only digits' })
  pincode: string;

  @IsString()
  @IsNotEmpty()
  sol_id: string;
}
