import { Controller, Get, InternalServerErrorException, NotFoundException, Param, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { Effect, Exit, Match } from "effect";
import { AuthGuard } from "@nestjs/passport";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const program = this.usersService.findById(id);

        const exit = await Effect.runPromiseExit(program);

        if (Exit.isSuccess(exit)) {
            return exit.value;
        } else {
            const cause = exit.cause;
            if (cause._tag !== 'Fail') {
                throw new InternalServerErrorException('Unexpected error occurred');
            }

            const error = cause.error;
            Match.value(error).pipe(
                Match.tag('UserNotFound', (notFoundError) => {
                    throw new NotFoundException(`User with ID ${notFoundError.id} not found`);
                }),
                Match.tag('DatabaseError', (dbError) => {
                    console.error(dbError.originalError);
                    throw new InternalServerErrorException('Database unavailable');
                })
            );
        }
    }
}