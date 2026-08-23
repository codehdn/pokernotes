import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, Tray } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Store } from './database/database'
import { idSchema, notesSchema, playerListSchema, primarySchema, settingsSchema, statsSchema, tagSchema, usernameSchema } from '../shared/schemas'
import type { Settings } from '../shared/types'

let window: BrowserWindow
let store: Store
let tray: Tray
let quitting = false
const defaults: Settings = { shortcut: 'Control+Space', launchAtLogin: false }
const settingsPath = () => join(app.getPath('userData'), 'settings.json')
const readSettings = () => { try { return settingsSchema.parse(JSON.parse(readFileSync(settingsPath(),'utf8'))) } catch { return defaults } }
const writeSettings = (settings: Settings) => { writeFileSync(settingsPath(),JSON.stringify(settings,null,2)); app.setLoginItemSettings({openAtLogin:settings.launchAtLogin}); return settings }
const show = () => { window.show(); window.setAlwaysOnTop(true); window.moveTop(); window.focus(); window.webContents.send('focus-search') }
const registerShortcut = (shortcut:string) => { globalShortcut.unregisterAll(); if(!globalShortcut.register(shortcut,()=>window.isVisible()?window.hide():show())) throw new Error(`Shortcut is unavailable: ${shortcut}`) }
const backup = async () => { const dir=join(app.getPath('userData'),'backups');mkdirSync(dir,{recursive:true});const path=join(dir,`poker-notes-${new Date().toISOString().replace(/[:.]/g,'-')}.db`);await store.backup(path);return path }
const requestQuit = () => window?.webContents.isDestroyed() ? app.quit() : window.webContents.send('request-quit')
app.whenReady().then(async () => {
  const dbPath=join(app.getPath('userData'), 'poker-notes.db')
  try { store = Store.open(dbPath) } catch (error) { dialog.showErrorBox('Poker Notes database failed to open', `${dbPath}\n\n${String(error)}`); app.quit(); return }
  const iconPath=app.isPackaged?join(process.resourcesPath,'icon.png'):join(app.getAppPath(),'resources/icon.png')
  window = new BrowserWindow({ width: 420, height: 550, minWidth: 340, minHeight: 400, alwaysOnTop: true, frame: false, icon: iconPath, show: false, backgroundColor: '#151619', webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
  window.on('close', e => { if (!quitting) { e.preventDefault(); requestQuit() } })
  Menu.setApplicationMenu(null)
  if (process.env.ELECTRON_RENDERER_URL) window.loadURL(process.env.ELECTRON_RENDERER_URL); else window.loadFile(join(__dirname, '../renderer/index.html'))
  window.once('ready-to-show', show)
  try { registerShortcut(readSettings().shortcut) } catch (error) { dialog.showErrorBox('Global shortcut unavailable',String(error)); registerShortcut(defaults.shortcut) }
  app.setLoginItemSettings({openAtLogin:readSettings().launchAtLogin})
  tray=new Tray(nativeImage.createFromPath(iconPath).resize({width:16,height:16}));tray.setToolTip('Poker Player Notes');tray.setContextMenu(Menu.buildFromTemplate([{label:'Show',click:show},{label:'Back up now',click:()=>void backup()},{type:'separator'},{label:'Quit',click:requestQuit}]));tray.on('click',show)
  const today=`poker-notes-${new Date().toISOString().slice(0,10)}`
  const backupDir=join(app.getPath('userData'),'backups');if(!existsSync(backupDir)||!existsSync(join(backupDir,`${today}.db`))){mkdirSync(backupDir,{recursive:true});await store.backup(join(backupDir,`${today}.db`))}
  ipcMain.handle('hide', () => window.hide())
  ipcMain.handle('minimize', () => window.minimize())
  ipcMain.handle('quit', () => { store.close();quitting=true;app.quit() })
  ipcMain.handle('search', (_, q) => store.search(usernameSchema.parse(q)))
  ipcMain.handle('players:get', (_, query, page) => { const value=playerListSchema.parse({query,page});return store.allPlayers(value.query,value.page) })
  ipcMain.handle('player:get', (_, id) => store.getPlayer(idSchema.parse(id)))
  ipcMain.handle('player:create', (_, name) => { const player=store.createPlayer(usernameSchema.parse(name)); window.show(); window.setAlwaysOnTop(true); window.moveTop(); window.focus(); return player })
  ipcMain.handle('notes:update', (_, id, notes) => store.updateNotes(idSchema.parse(id), notesSchema.parse(notes)))
  ipcMain.handle('stats:commit', (_, id, stats) => store.commitStats(idSchema.parse(id), statsSchema.parse(stats)))
  ipcMain.handle('stats:history', (_, id) => store.history(idSchema.parse(id)))
  ipcMain.handle('primary:set', (_, id, value) => store.setPrimary(idSchema.parse(id), primarySchema.parse(value)))
  ipcMain.handle('tag:toggle', (_, id, tagId) => store.toggleTag(idSchema.parse(id), idSchema.parse(tagId)))
  ipcMain.handle('tags:get', () => store.allTags())
  ipcMain.handle('tag:create', (_, name, description, color) => { const value=tagSchema.parse({name,description,color});return store.createTag(value.name,value.description,value.color) })
  ipcMain.handle('tag:update', (_, id, name, description, color) => { const value=tagSchema.parse({name,description,color});return store.updateTag(idSchema.parse(id),value.name,value.description,value.color) })
  ipcMain.handle('tag:delete', (_, id) => store.deleteTag(idSchema.parse(id)))
  ipcMain.handle('primary-tags:get', () => store.allPrimaryTags())
  ipcMain.handle('primary-tag:create', (_, name, description, color) => { const value=tagSchema.parse({name,description,color});return store.createPrimaryTag(value.name,value.description,value.color) })
  ipcMain.handle('primary-tag:update', (_, key, name, description, color) => { const value=tagSchema.parse({name,description,color});return store.updatePrimaryTag(primarySchema.unwrap().parse(key),value.name,value.description,value.color) })
  ipcMain.handle('primary-tag:delete', (_, key) => store.deletePrimaryTag(primarySchema.unwrap().parse(key)))
  ipcMain.handle('settings:get', readSettings)
  ipcMain.handle('settings:set', (_, value) => { const next=settingsSchema.parse(value),previous=readSettings();try{registerShortcut(next.shortcut)}catch(error){registerShortcut(previous.shortcut);throw error}return writeSettings(next) })
  ipcMain.handle('backup', backup)
})
app.on('before-quit', () => { if(!quitting&&store?.db.open)store.close();quitting = true })
app.on('will-quit', () => globalShortcut.unregisterAll())
