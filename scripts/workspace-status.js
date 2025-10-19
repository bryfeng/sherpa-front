#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const allowedTierStatuses = new Set(['complete', 'in_progress', 'planned', 'not_applicable', 'deprecated'])
const severityWeight = {
  complete: 0,
  in_progress: 1,
  planned: 2,
  deprecated: 3,
  not_applicable: 4,
}

function loadRegistry(registryPath) {
  try {
    const raw = fs.readFileSync(registryPath, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    console.error(`Failed to read registry at ${registryPath}:`, error.message)
    process.exit(1)
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function collectModuleIssues(module) {
  const issues = []
  const errors = []

  if (!module.id || typeof module.id !== 'string' || !/^[a-z0-9-]+$/.test(module.id)) {
    errors.push('Invalid or missing module id (expected kebab-case string).')
  }
  if (!module.name || typeof module.name !== 'string') {
    errors.push('Missing module name.')
  }

  if (!Array.isArray(module.owners) || module.owners.length === 0) {
    errors.push('Owners must be a non-empty array.')
  }

  if (!module.contracts || typeof module.contracts !== 'object') {
    errors.push('Missing contracts object.')
  } else {
    const { dataHook } = module.contracts
    if (!dataHook || typeof dataHook !== 'string' || !dataHook.startsWith('src/')) {
      errors.push('contracts.dataHook must be a src/ relative path.')
    }
  }

  if (!module.tiers || typeof module.tiers !== 'object') {
    errors.push('Missing tiers definition.')
  } else {
    for (const tierId of ['full', 'preview', 'attachment']) {
      const tier = module.tiers[tierId]
      if (!tier) {
        errors.push(`Missing ${tierId} tier metadata.`)
        continue
      }
      const { status, component, story, notes } = tier
      if (!allowedTierStatuses.has(status)) {
        errors.push(`${tierId} tier has invalid status "${status}".`)
        continue
      }
      if (status === 'complete') {
        if (!component) errors.push(`${tierId} tier marked complete but missing component path.`)
        if (!story) errors.push(`${tierId} tier marked complete but missing story reference.`)
      }
      if (status === 'not_applicable' && !notes) {
        errors.push(`${tierId} tier set to not_applicable but missing notes explaining why.`)
      }
      if (status === 'in_progress' && !component) {
        issues.push(`${tierId} tier in_progress without component pointer.`)
      }
    }
  }

  return { issues, errors }
}

function formatTierLine(label, tier) {
  const status = tier?.status || 'unknown'
  const note = tier?.notes ? ` – ${tier.notes}` : ''
  const marker = status === 'complete' ? ' ' : '!' // Flag non-complete tiers
  return `  ${marker} ${label.padEnd(10)} ${status.padEnd(13)}${note}`
}

function parsePriority(tags = []) {
  for (const tag of tags) {
    if (typeof tag === 'string' && tag.startsWith('priority:')) {
      const [, raw] = tag.split(':')
      if (raw && raw.startsWith('p')) {
        const num = Number(raw.slice(1))
        if (Number.isFinite(num)) return num
      }
      const num = Number(raw)
      if (Number.isFinite(num)) return num
    }
  }
  return 9
}

function main() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const projectRoot = path.resolve(__dirname, '..')
  const registryPath = path.join(projectRoot, 'docs', 'workspace', 'registry.json')
  const registry = loadRegistry(registryPath)

  const errors = []
  const warnings = []

  if (!registry || typeof registry !== 'object') {
    console.error('Workspace registry is not a valid object.')
    process.exit(1)
  }

  const modules = ensureArray(registry.modules)
  if (modules.length === 0) {
    warnings.push('No modules registered; run inventory before using this tool.')
  }

  console.log(`Workspace Registry Report (v${registry.version || 'unknown'})`)
  console.log('='.repeat(48))
  console.log(`Modules tracked: ${modules.length}`)
  console.log('')

  const miniBacklog = []

  for (const module of modules) {
    const { issues: moduleIssues, errors: moduleErrors } = collectModuleIssues(module)
    if (moduleErrors.length) {
      errors.push({ id: module.id || '<unknown>', items: moduleErrors })
    }
    if (moduleIssues.length) {
      warnings.push({ id: module.id || '<unknown>', items: moduleIssues })
    }

    const priority = parsePriority(module.tags)
    const previewStatus = module.tiers?.preview?.status || 'unknown'
    const attachmentStatus = module.tiers?.attachment?.status || 'unknown'
    const backlogWeight = Math.max(severityWeight[previewStatus] ?? 2, severityWeight[attachmentStatus] ?? 2)
    if (previewStatus !== 'complete' || attachmentStatus !== 'complete') {
      miniBacklog.push({
        id: module.id,
        name: module.name,
        priority,
        previewStatus,
        attachmentStatus,
        backlogWeight,
        notes: module.tiers?.preview?.notes || module.tiers?.attachment?.notes || '',
      })
    }

    console.log(`${module.name || 'Unnamed Module'} (${module.id})`)
    console.log(`  Owners: ${ensureArray(module.owners).join(', ') || '—'}`)
    console.log(`  Data hook: ${module.contracts?.dataHook || '—'}`)
    if (module.tags && module.tags.length) {
      console.log(`  Tags: ${module.tags.join(', ')}`)
    }
    console.log(formatTierLine('full', module.tiers?.full))
    console.log(formatTierLine('preview', module.tiers?.preview))
    console.log(formatTierLine('attachment', module.tiers?.attachment))
    if (module.notes) {
      console.log(`  Notes: ${module.notes}`)
    }
    console.log('')
  }

  if (miniBacklog.length) {
    console.log('Mini / Attachment backlog (sorted by priority):')
    miniBacklog
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return b.backlogWeight - a.backlogWeight
      })
      .forEach((entry) => {
        const priorityLabel = Number.isFinite(entry.priority) ? `p${entry.priority}` : 'p?'
        console.log(
          `  - [${priorityLabel}] ${entry.name} (${entry.id}) → preview=${entry.previewStatus}, attachment=${entry.attachmentStatus}` +
            (entry.notes ? ` — ${entry.notes}` : ''),
        )
      })
    console.log('')
  }

  if (warnings.length) {
    console.log('Warnings:')
    for (const warning of warnings) {
      const header = warning.id ? `  • ${warning.id}` : '  •'
      console.log(header)
      for (const item of warning.items) console.log(`      - ${item}`)
    }
    console.log('')
  }

  if (errors.length) {
    console.log('Errors:')
    for (const errorGroup of errors) {
      const header = errorGroup.id ? `  • ${errorGroup.id}` : '  •'
      console.log(header)
      for (const item of errorGroup.items) console.log(`      - ${item}`)
    }
    console.log('')
    process.exit(1)
  }
}

main()
