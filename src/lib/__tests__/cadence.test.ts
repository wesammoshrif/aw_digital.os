import { describe, it, expect } from 'vitest'
import { applyCadence } from '../cadence'

describe('applyCadence', () => {
  const mockLead = {
    status: 'new' as const,
    attempts: 0
  }

  it('should handle "no_answer" disposition', () => {
    const result = applyCadence(mockLead, 'no_answer')
    expect(result.status).toBe('contacted')
    expect(result.attempts).toBe(1)
    expect(result.nextStep).toBe('Erneuter Anruf')
    expect(result.nextStepAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('should freeze lead after 5 failed attempts', () => {
    const leadAfter4Attempts = { status: 'contacted' as const, attempts: 4 }
    const result = applyCadence(leadAfter4Attempts, 'no_answer')
    expect(result.status).toBe('frozen')
    expect(result.nextStep).toContain('Ruhend')
  })

  it('should handle "interested" disposition', () => {
    const result = applyCadence(mockLead, 'interested')
    expect(result.status).toBe('reached')
    expect(result.nextStep).toContain('Audit senden')
  })

  it('should lock lead on "not_interested"', () => {
    const result = applyCadence(mockLead, 'not_interested')
    expect(result.status).toBe('lost')
    expect(result.locked).toBe(true)
  })
})
