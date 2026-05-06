import {
  IsString, IsNotEmpty, IsEmail, IsOptional,
  Length, Matches,
} from 'class-validator';

const ALPHA_NUMERIC_REGEX = /^[a-zA-Z0-9 ]*$/;
const ALPHA_NUMERIC_MESSAGE = 'special characters are not allowed';

export class CreateQrCodeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(ALPHA_NUMERIC_REGEX, { message: `Merchant name: ${ALPHA_NUMERIC_MESSAGE}` })
  merchant_name: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Mobile number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Mobile number must contain only digits' })
  mobile_number: string;

  @IsString()
  @IsNotEmpty()
  @Length(14, 14, { message: 'Account number must be exactly 14 digits' })
  @Matches(/^\d{14}$/, { message: 'Account number must contain only digits' })
  account_number: string;

  @IsString()
  @IsNotEmpty()
  @Length(11, 11, { message: 'IFSC must be exactly 11 characters' })
  @Matches(/^[a-zA-Z0-9]+$/, { message: `IFSC code: ${ALPHA_NUMERIC_MESSAGE}` })
  ifsc_code: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'MCC code must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'MCC code must contain only digits' })
  mcc_code: string;

  @IsEmail()
  @IsNotEmpty()
  email_id?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(ALPHA_NUMERIC_REGEX, { message: `Transaction type: ${ALPHA_NUMERIC_MESSAGE}` })
  transaction_type: string;

  @IsString()
  @IsNotEmpty()
  @Matches(ALPHA_NUMERIC_REGEX, { message: `Address line 1: ${ALPHA_NUMERIC_MESSAGE}` })
  address_line1: string;

  @IsString()
  @IsNotEmpty()
  @Matches(ALPHA_NUMERIC_REGEX, { message: `Address line 2: ${ALPHA_NUMERIC_MESSAGE}` })
  address_line2: string;

  @IsString()
  @IsNotEmpty()
  @Matches(ALPHA_NUMERIC_REGEX, { message: `City: ${ALPHA_NUMERIC_MESSAGE}` })
  city: string;

  @IsString()
  @IsNotEmpty()
  @Matches(ALPHA_NUMERIC_REGEX, { message: `State: ${ALPHA_NUMERIC_MESSAGE}` })
  state: string;

  @IsString()
  @IsOptional()
  @Matches(ALPHA_NUMERIC_REGEX, { message: `Circle ID: ${ALPHA_NUMERIC_MESSAGE}` })
  circle_id?: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Pincode must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Pincode must contain only digits' })
  pincode: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'Pincode must be exactly 4 digits' })
  @Matches(ALPHA_NUMERIC_REGEX, { message: `SOL ID: ${ALPHA_NUMERIC_MESSAGE}` })
  sol_id: string;
}

