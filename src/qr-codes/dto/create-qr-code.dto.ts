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
  @Length(14, 14, { message: 'Mobile number must be exactly 14 digits' })
  @Matches(/^\d{14}$/, { message: 'Account number must contain only digits' })
  account_number: string;

  @IsString()
  @IsNotEmpty()
  @Length(11, 11, { message: 'IFSC must be exactly 11 digits' })
  ifsc_code: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'MCC code must be exactly 4 digits' })
  mcc_code: string;

  @IsEmail()
  @IsNotEmpty()
  email_id?: string;

  @IsString()
  @IsNotEmpty()
  transaction_type: string;

  @IsString()
  @IsNotEmpty()
  address_line1: string;

  @IsString()
  @IsNotEmpty()
  address_line2?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsOptional()
  circle_id?: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Pincode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Pincode must contain only digits' })
  pincode: string;

  @IsString()
  @IsNotEmpty()
  sol_id: string;
}
