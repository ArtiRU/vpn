import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          // At least 8 characters
          if (value.length < 8) return false;

          // At least one uppercase letter
          if (!/[A-Z]/.test(value)) return false;

          // At least one lowercase letter
          if (!/[a-z]/.test(value)) return false;

          // At least one number
          if (!/\d/.test(value)) return false;

          // At least one special character
          if (!/[@$!%*?&]/.test(value)) return false;

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password must be at least 8 characters and contain uppercase, lowercase, number and special character (@$!%*?&)';
        },
      },
    });
  };
}
