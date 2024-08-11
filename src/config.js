import z from 'zod'

const stringArraySchema = z.string().transform(x => x.split(',')).pipe(z.string().trim().array())
const booleanSchema = z.literal('1').or(z.literal('0')).transform(x => x === '1').pipe(z.boolean())

const configSchema = z.object({
  CHAT_IDS: stringArraySchema,
  BROWSER_ARGS: stringArraySchema,
  INDEX_API_KEY: z.string(),
  YOUTUBE_API_V3_KEY: z.string(),
  INDEX_ENDPOINT: z.string().url(),
  VERBOSE_LOG: booleanSchema,
  OPEN_BROWSER: booleanSchema,
  RELOAD_PAGE_EVERY: z.coerce.number().int().positive()
})

export const config = configSchema.parse(process.env)
