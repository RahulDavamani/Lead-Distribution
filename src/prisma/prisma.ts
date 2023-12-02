import { PrismaClient } from '@prisma/client';
import { env } from '$env/dynamic/private';

export const prisma = global.prisma || new PrismaClient();

if (env.MODE === 'DEV') global.prisma = prisma;
