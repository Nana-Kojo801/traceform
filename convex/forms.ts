import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { fieldV, sectionV } from './schema'
import { getSchemaForProject } from './helpers'
import { MAX_FIELDS_PER_SCHEMA } from '../shared/limits'
import { SAMPLE_SCHEMA } from '../shared/sample/sample-schema'

export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return await getSchemaForProject(ctx, projectId)
  },
})

export const save = mutation({
  args: {
    projectId: v.id('projects'),
    sections: v.array(sectionV),
    fields: v.array(fieldV),
  },
  handler: async (ctx, { projectId, sections, fields }) => {
    if (fields.length > MAX_FIELDS_PER_SCHEMA) {
      throw new ConvexError(`At most ${MAX_FIELDS_PER_SCHEMA} fields per form.`)
    }
    const ids = new Set<string>()
    for (const f of fields) {
      if (!f.label.trim()) throw new ConvexError('Every field needs a label.')
      if (!/^[a-z0-9_]{1,64}$/.test(f.id)) throw new ConvexError(`Invalid field id "${f.id}".`)
      if (ids.has(f.id)) throw new ConvexError(`Duplicate field id "${f.id}".`)
      ids.add(f.id)
      if (!sections.some((s) => s.id === f.sectionId)) throw new ConvexError(`Field "${f.label}" has no section.`)
      if (f.type === 'single_select' && f.choices.filter((c) => c.trim()).length < 2) {
        throw new ConvexError(`"${f.label}" needs at least two choices.`)
      }
    }
    const clean = fields.map((f) => ({
      ...f,
      choices: f.type === 'single_select' ? f.choices.map((c) => c.trim()).filter(Boolean) : [],
    }))
    const existing = await getSchemaForProject(ctx, projectId)
    if (existing) {
      await ctx.db.patch(existing._id, { sections, fields: clean, updatedAt: Date.now() })
      return existing._id
    }
    return await ctx.db.insert('schemas', { projectId, sections, fields: clean, updatedAt: Date.now() })
  },
})

export const useSample = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const existing = await getSchemaForProject(ctx, projectId)
    const data = { sections: SAMPLE_SCHEMA.sections, fields: SAMPLE_SCHEMA.fields, updatedAt: Date.now() }
    if (existing) await ctx.db.patch(existing._id, data)
    else await ctx.db.insert('schemas', { projectId, ...data })
  },
})
