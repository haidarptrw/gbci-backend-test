import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt";
import { Connection } from "mongoose";
import { UsersService } from "src/users/users.service";

describe('ProfileController (E2E)', () => {
    let app: INestApplication;
    let connection: Connection;
    let usersService: UsersService;
    let jwtService: JwtService;

    const mongoUri = process.env.MONGO_URI;
    
})