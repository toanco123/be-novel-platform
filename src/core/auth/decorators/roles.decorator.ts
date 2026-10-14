import { SetMetadata } from '@nestjs/common'
import { ROLES } from '../auth.constants'
import type { Role } from '../auth.types'

/** Route chỉ cho các vai trò này (vd @Roles('admin')); sai vai trò thì 403 forbidden */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles)
