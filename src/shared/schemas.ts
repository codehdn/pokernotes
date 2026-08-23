import { z } from 'zod'
import { PRIMARY_CLASSIFICATIONS } from './types'
export const idSchema = z.number().int().positive()
export const usernameSchema = z.string().trim().min(1).max(100)
export const playerListSchema = z.object({ query: z.string().trim().max(100), page: z.number().int().nonnegative() })
export const notesSchema = z.string().max(100_000)
export const statsSchema = z.object({ hands: z.number().int().nonnegative().nullable(), vpip: z.number().min(0).max(100).nullable(), pfr: z.number().min(0).max(100).nullable() })
export const primarySchema = z.string().min(1).max(80).nullable()
export const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i)
export const tagSchema = z.object({ name: z.string().trim().min(1).max(40), description: z.string().trim().min(1).max(250), color: colorSchema.default('#3a6c90') })
export const settingsSchema = z.object({ shortcut: z.string().trim().min(1).max(40), launchAtLogin: z.boolean() })
