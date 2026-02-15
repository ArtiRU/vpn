import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsAfterDate(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAfterDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          
          if (!value || !relatedValue) return false;
          
          const date = new Date(value);
          const relatedDate = new Date(relatedValue);
          
          return date > relatedDate;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be after ${relatedPropertyName}`;
        },
      },
    });
  };
}
