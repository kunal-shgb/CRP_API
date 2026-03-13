import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && user.password && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const effectiveRO = user.regionalOffice || user.branch?.regionalOffice;

    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      productType: user.product_type,
      branch: user.branch ? {
        id: user.branch.id,
        name: user.branch.name,
        code: user.branch.code,
      } : null,
      regionalOffice: effectiveRO ? {
        id: effectiveRO.id,
        name: effectiveRO.name,
        code: effectiveRO.code,
      } : null,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: payload
    };
  }
}
