import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validador que verifica que al menos uno de los campos especificados esté presente
 */
@ValidatorConstraint({ name: 'requireAtLeastOne', async: false })
export class RequireAtLeastOneConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedProperties] = args.constraints;
    const obj = args.object as any;
    
    // Verificar que al menos una de las propiedades relacionadas esté presente
    const hasAtLeastOne = relatedProperties.some((prop: string) => {
      const propValue = obj[prop];
      // Para objetos anidados, verificar que el objeto exista y tenga propiedades
      if (typeof propValue === 'object' && propValue !== null) {
        return Object.keys(propValue).length > 0;
      }
      return propValue !== null && propValue !== undefined && propValue !== '';
    });
    
    return hasAtLeastOne;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedProperties] = args.constraints;
    return `Debes proporcionar al menos uno de los siguientes campos: ${relatedProperties.join(', ')}`;
  }
}

/**
 * Valida que al menos uno de los campos especificados esté presente y no sea null/undefined
 * 
 * @param properties Array de nombres de propiedades que deben ser verificadas
 * @param validationOptions Opciones de validación
 * 
 * @example
 * ```typescript
 * @RequireAtLeastOne(['customerId', 'customerDetails'])
 * export class CreateWaitlistEntryDto {
 *   customerId?: string;
 *   customerDetails?: CustomerDetailsDto;
 * }
 * ```
 */
export function RequireAtLeastOne(
  properties: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'requireAtLeastOne',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [properties],
      options: validationOptions,
      validator: RequireAtLeastOneConstraint,
    });
  };
}

