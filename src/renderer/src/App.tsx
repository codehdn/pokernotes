import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayerProfile, PlayerSearchResult } from '../../shared/types'
import SearchBar from './SearchBar'
import PlayerView from './PlayerView'
import SettingsPanel from './SettingsPanel'

export default function App(){
  const [query,setQuery]=useState(''),[results,setResults]=useState<PlayerSearchResult[]>([]),[player,setPlayer]=useState<PlayerProfile|null>(null),[selected,setSelected]=useState(0),[searchedQuery,setSearchedQuery]=useState(''),[settings,setSettings]=useState(false)
  const input=useRef<HTMLInputElement>(null), flush=useRef<()=>Promise<void>>(async()=>{})
  const focus=()=>{input.current?.focus();input.current?.select()}
  const search=useCallback(async()=>{await flush.current();const q=query.trim();if(!q)return;setPlayer(null);const found=await window.pokerNotes.searchPlayers(q);setSearchedQuery(q);setSelected(0);if(found.length===1&&found[0].username.toLowerCase()===q.toLowerCase()){setPlayer(await window.pokerNotes.getPlayer(found[0].id));return}setResults(found)},[query])
  const open=async(id:number)=>{await flush.current();setPlayer(await window.pokerNotes.getPlayer(id))}
  const create=async()=>{const q=query.trim();if(!q)return;try{setPlayer(await window.pokerNotes.createPlayer(q))}catch(e){setResults(await window.pokerNotes.searchPlayers(q))}}
  useEffect(()=>window.pokerNotes.onFocusSearch(focus),[])
  useEffect(()=>window.pokerNotes.onBeforeHide(()=>{void flush.current()}),[])
  useEffect(()=>window.pokerNotes.onRequestQuit(()=>{void flush.current().then(()=>window.pokerNotes.quit())}),[])
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.ctrlKey&&e.key.toLowerCase()==='f'){e.preventDefault();focus()}else if(e.key==='Escape'){player?setPlayer(null):window.pokerNotes.hide()}else if(!player&&e.key==='ArrowDown'){e.preventDefault();setSelected(s=>Math.min(s+1,results.length))}else if(!player&&e.key==='ArrowUp'){e.preventDefault();setSelected(s=>Math.max(s-1,0))}else if(!player&&e.key==='Enter'&&document.activeElement!==input.current){selected<results.length?open(results[selected].id):create()}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[player,results,selected,query])
  const submit=()=>searchedQuery===query.trim()&&results.length===0?create():search()
  return <><nav className="titlebar"><span>Poker Notes</span><button title="Settings" onClick={()=>setSettings(!settings)}>⚙</button><button title="Minimize" onClick={()=>window.pokerNotes.minimize()}>−</button><button title="Close" onClick={()=>void flush.current().then(()=>window.pokerNotes.quit())}>×</button></nav><main>{settings?<SettingsPanel close={()=>setSettings(false)} openPlayer={id=>{setSettings(false);void open(id)}}/>:<><SearchBar inputRef={input} query={query} setQuery={setQuery} search={submit}/>{player?<PlayerView player={player} setPlayer={setPlayer} flushRef={flush}/>:<section className="results">{results.map((r,i)=><button key={r.id} className={selected===i?'selected':''} onClick={()=>open(r.id)}><strong>{r.username}</strong><small>{r.hands??'–'} | {r.vpip??'–'} | {r.pfr??'–'}　{[r.primaryClassification?.replace('_',' '),...r.exploitTags.map(t=>t.name)].filter(Boolean).join(' · ')}</small></button>)}{searchedQuery.length>0&&searchedQuery===query.trim()&&!results.some(r=>r.username.toLowerCase()===query.trim().toLowerCase())&&<button className={selected===results.length?'selected create':''} onClick={create}>+ Create “{query.trim()}”</button>}</section>}</>}</main></>
}
