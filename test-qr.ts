import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { QrCodesService } from './src/qr-codes/qr-codes.service';
import { UserRole } from './src/common/enums/user-role.enum';
import { ProductType } from './src/common/enums/product-type.enum';

async function bootstrap() {
  console.log("Starting Nest application context...");
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const qrCodesService = app.get(QrCodesService);

  // Mock an ADMIN user
  const adminUser = {
    id: 1,
    role: UserRole.ADMIN,
  };

  try {
    console.log("\\n--- Testing findAllByRole ---");
    const result = await qrCodesService.findAllByRole(adminUser, 1, 10);
    console.log(JSON.stringify(result, null, 2));
    
    console.log("\\n--- Test complete ---");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await app.close();
  }
}

bootstrap();
