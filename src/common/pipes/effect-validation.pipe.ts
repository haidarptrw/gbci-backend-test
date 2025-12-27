import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Schema } from 'effect';

@Injectable()
export class EffectValidationPipe implements PipeTransform {
  constructor(private schema: Schema.Schema<any>) {}

  transform(value: unknown) {
    const decode = Schema.decodeUnknownEither(this.schema);
    const result = decode(value);

    if (result._tag === 'Left') {
      const errorString = result.left.message;
      throw new BadRequestException(`Validation Failed: ${errorString}`);
    }

    return result.right;
  }
}