import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) { }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = crypto.randomUUID();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }


  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    const user = await this.usersService.create(registerDto);

    const accessToken = this.generateAccessToken(user);
    const refreshToken = crypto.randomUUID();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }


  private generateAccessToken(user: any): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }


  async refreshTokens(accessToken: string, refreshToken: string) {
    try {
      const payload = this.jwtService.decode(accessToken) as { sub: string; email: string };
      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid access token');
      }

      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.hashedRefreshToken) {
        throw new UnauthorizedException('User not found or not logged in');
      }

      const isValid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
      if (!isValid) {
        throw new ForbiddenException('Invalid refresh token');
      }

     
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = crypto.randomUUID();
      const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

      await this.usersService.updateRefreshToken(user.id, newHashedRefreshToken);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (err) {
      throw new UnauthorizedException('Refresh failed');
    }
  }

 
  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.usersService.findOne(userId);
    return user || null;
  }

  async validateUserRoles(userId: string, requiredRoles: string[]): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    return requiredRoles.includes(user?.role);
  }
}

