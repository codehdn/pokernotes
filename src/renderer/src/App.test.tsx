import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import type { PlayerProfile, PokerNotesAPI } from '../../shared/types'

const profile = (username: string, id = 1): PlayerProfile => ({ id, username, notes: '', primaryClassification: null, exploitTags: [], latestStats: null, createdAt: '', updatedAt: '', lastViewedAt: null })
let api: PokerNotesAPI
afterEach(cleanup)
beforeEach(() => {
  api = {
    getVersion: vi.fn().mockResolvedValue('1.0.0'),
    getPlayers: vi.fn().mockResolvedValue({players:[],total:0}),
    searchPlayers: vi.fn(), getPlayer: vi.fn(), createPlayer: vi.fn(), updateNotes: vi.fn(), commitStats: vi.fn(), getStatHistory: vi.fn().mockResolvedValue([]), setPrimaryClassification: vi.fn(), toggleExploitTag: vi.fn(), getExploitTags: vi.fn().mockResolvedValue([]), createExploitTag: vi.fn(), updateExploitTag:vi.fn(),deleteExploitTag:vi.fn(),getPrimaryTags:vi.fn().mockResolvedValue([]),createPrimaryTag:vi.fn(),updatePrimaryTag:vi.fn(),deletePrimaryTag:vi.fn(), getSettings: vi.fn(), setSettings: vi.fn(), backupNow: vi.fn(), hide: vi.fn(), minimize: vi.fn(), quit: vi.fn(), onFocusSearch: vi.fn().mockReturnValue(()=>{}), onBeforeHide: vi.fn().mockReturnValue(()=>{}), onRequestQuit: vi.fn().mockReturnValue(()=>{})
  }
  window.pokerNotes = api
})

it('creates with Enter after an empty search', async () => {
  vi.mocked(api.searchPlayers).mockResolvedValue([])
  vi.mocked(api.createPlayer).mockResolvedValue(profile('hayden'))
  const { getByLabelText } = render(<App />)
  const input = getByLabelText('Search players')
  input.focus()
  fireEvent.change(input, { target: { value: 'hayden' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  await screen.findByText('+ Create “hayden”')
  fireEvent.keyDown(input, { key: 'Enter' })
  await screen.findByText('hayden')
  expect(api.createPlayer).toHaveBeenCalledWith('hayden')
})

it('never offers an empty username', () => {
  render(<App />)
  expect(screen.queryByText(/Create/)).not.toBeInTheDocument()
})

it('opens a sole exact match immediately', async () => {
  vi.mocked(api.searchPlayers).mockResolvedValue([{ id: 1, username: 'Hayden', hands: null, vpip: null, pfr: null, primaryClassification: null, exploitTags: [] }])
  vi.mocked(api.getPlayer).mockResolvedValue(profile('Hayden'))
  render(<App />)
  const input = screen.getByLabelText('Search players')
  input.focus()
  fireEvent.change(input, { target: { value: 'hayden' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  await waitFor(() => expect(api.getPlayer).toHaveBeenCalledWith(1))
  expect(await screen.findByText('Hayden')).toBeInTheDocument()
})

it('flushes notes before closing', async () => {
  vi.mocked(api.searchPlayers).mockResolvedValue([{ id: 1, username: 'Hayden', hands: null, vpip: null, pfr: null, primaryClassification: null, exploitTags: [] }])
  vi.mocked(api.getPlayer).mockResolvedValue(profile('Hayden'))
  render(<App />)
  const input=screen.getByLabelText('Search players');input.focus();fireEvent.change(input,{target:{value:'Hayden'}});fireEvent.keyDown(input,{key:'Enter'})
  const notes=await screen.findByLabelText('Player notes');fireEvent.change(notes,{target:{value:'must persist'}});fireEvent.click(screen.getByTitle('Close'))
  await waitFor(()=>expect(api.quit).toHaveBeenCalled())
  expect(api.updateNotes).toHaveBeenCalledWith(1,'must persist')
  expect(vi.mocked(api.updateNotes).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(api.quit).mock.invocationCallOrder[0])
})

it('opens a player from the settings list', async () => {
  vi.mocked(api.getSettings).mockResolvedValue({shortcut:'Control+Space',launchAtLogin:false})
  vi.mocked(api.getPlayers).mockResolvedValue({players:[{id:1,username:'Alice'},{id:2,username:'Bob'}],total:2})
  vi.mocked(api.getPlayer).mockResolvedValue(profile('Bob',2))
  render(<App />)
  fireEvent.click(screen.getByTitle('Settings'))
  fireEvent.change(await screen.findByLabelText('Filter players'),{target:{value:'bob'}})
  fireEvent.click(screen.getByText('Bob'))
  expect(await screen.findByText('Bob')).toBeInTheDocument()
  expect(api.getPlayer).toHaveBeenCalledWith(2)
})
