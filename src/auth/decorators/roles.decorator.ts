import { SetMetadata } from '@nestjs/common';
import { RoleType } from '../../users/users.type';

export const Roles = (...roles: RoleType[]) => SetMetadata('roles', roles);
