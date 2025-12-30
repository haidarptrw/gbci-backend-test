import { Schema as EffectSchema } from 'effect';
import { Schema as MongooseSchema } from 'mongoose';

/**
 * Automatically converts a Mongoose Schema into an Effect Schema Struct.
 * Includes a generic <T> to cast the result to your Class Type.
 */
export function mongooseToEffect<T = any>(mongooseSchema: MongooseSchema): EffectSchema.Schema<T> {
    const shape: Record<string, any> = {};

    mongooseSchema.eachPath((path, schemaType: any) => {
        // Skip internal Mongoose paths like __v
        if (path === '__v') return;

        let baseType: EffectSchema.Schema<any> = EffectSchema.Unknown;
        const instance = schemaType.instance;

        if (instance === 'String') baseType = EffectSchema.String;
        else if (instance === 'Number') baseType = EffectSchema.Number;
        else if (instance === 'Boolean') baseType = EffectSchema.Boolean;
        else if (instance === 'Date') {
            baseType = EffectSchema.Union(EffectSchema.Date, EffectSchema.String, EffectSchema.instanceOf(Date))
        }
        else if (instance === 'ObjectID') baseType = EffectSchema.Unknown;

        // Handle "select: false" or "required: false"
        const isSelectFalse = schemaType.options?.select === false;
        const isRequired = schemaType.isRequired;

        if (!isRequired || isSelectFalse) {
            shape[path] = EffectSchema.optional(EffectSchema.NullOr(baseType));
        } else {
            shape[path] = baseType;
        }
    });

    const dateOrString = EffectSchema.Union(EffectSchema.instanceOf(Date), EffectSchema.Date, EffectSchema.String);
    
    if (!shape['createdAt']) {
        shape['createdAt'] = EffectSchema.optional(EffectSchema.NullOr(dateOrString));
    }
    if (!shape['updatedAt']) {
        shape['updatedAt'] = EffectSchema.optional(EffectSchema.NullOr(dateOrString));
    }
    if (!shape['_id']) {
        shape['_id'] = EffectSchema.Unknown;
    }

    return EffectSchema.Struct(shape) as unknown as EffectSchema.Schema<T>;
}