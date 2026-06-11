import { useEffect, useRef } from 'react'
import {
  EditorView, keymap, placeholder as cmPlaceholder,
  Decoration, WidgetType,
} from '@codemirror/view'
import { EditorState, StateField } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxTree, syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
import { autocompletion, startCompletion, completionKeymap } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import katex from 'katex'

// Slash menu — inserts markdown snippets. cursorAt/selectLen position the caret after insert.
export const SLASH_COMMANDS = [
  { id: 'h1',      badge: 'H1',   label: 'Heading 1',     insert: '# '          },
  { id: 'h2',      badge: 'H2',   label: 'Heading 2',     insert: '## '         },
  { id: 'h3',      badge: 'H3',   label: 'Heading 3',     insert: '### '        },
  { id: 'bullet',  badge: '•',    label: 'Bullet List',   insert: '- '          },
  { id: 'num',     badge: '1.',   label: 'Numbered List', insert: '1. '         },
  { id: 'quote',   badge: '>',    label: 'Quote',         insert: '> '          },
  { id: 'code',    badge: '</>',  label: 'Code Block',    insert: '```\n\n```', cursorAt: 4 },
  { id: 'math',    badge: '$$',   label: 'Math Block',    insert: '$$\n\n$$',   cursorAt: 3 },
  { id: 'imath',   badge: '$',    label: 'Inline Math',   insert: '$x$',        cursorAt: 1, selectLen: 1 },
  { id: 'table',   badge: '⊞',    label: 'Table',         insert: '| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| | | |' },
  { id: 'divider', badge: '---',  label: 'Divider',       insert: '\n---\n'     },
  { id: 'bold',    badge: '**',   label: 'Bold',          insert: '****',       cursorAt: 2 },
  { id: 'italic',  badge: '*',    label: 'Italic',        insert: '**',         cursorAt: 1 },
]

// Content styling — headings sized, inline formatting rendered (markers are hidden separately below)
const mdHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.9em',  fontWeight: '800', lineHeight: '1.3' },
  { tag: tags.heading2, fontSize: '1.55em', fontWeight: '800' },
  { tag: tags.heading3, fontSize: '1.3em',  fontWeight: '700' },
  { tag: tags.heading4, fontSize: '1.12em', fontWeight: '700' },
  { tag: tags.heading5, fontSize: '1em',    fontWeight: '700' },
  { tag: tags.heading6, fontSize: '1em',    fontWeight: '700', color: 'var(--text-secondary)' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: [tags.link, tags.url], color: 'var(--accent-blue)', textDecoration: 'underline' },
  { tag: tags.monospace, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', background: 'var(--bg-overlay)', borderRadius: '4px', padding: '0 3px' },
  { tag: tags.quote, color: 'var(--text-secondary)', fontStyle: 'italic' },
  { tag: tags.processingInstruction, color: 'var(--text-muted)' },
])

class MathWidget extends WidgetType {
  constructor(tex, block) { super(); this.tex = tex; this.block = block }
  eq(o) { return o.tex === this.tex && o.block === this.block }
  toDOM() {
    const el = document.createElement(this.block ? 'div' : 'span')
    el.className = 'cm-math'
    try { katex.render(this.tex, el, { displayMode: this.block, throwOnError: false }) }
    catch { el.textContent = this.block ? `$$${this.tex}$$` : `$${this.tex}$` }
    return el
  }
  ignoreEvent() { return false }
}

class BulletWidget extends WidgetType {
  eq() { return true }
  toDOM() {
    const s = document.createElement('span')
    s.className = 'cm-md-bullet'
    s.textContent = '•'
    return s
  }
}

class TableWidget extends WidgetType {
  constructor(src) { super(); this.src = src }
  eq(o) { return o.src === this.src }
  toDOM() {
    const rows = this.src.split('\n').filter(l => l.trim())
    const parseRow = l => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())
    const table = document.createElement('table')
    table.className = 'cm-md-table'
    if (rows[0]) {
      const thead = document.createElement('thead')
      const tr = document.createElement('tr')
      for (const h of parseRow(rows[0])) {
        const th = document.createElement('th'); th.textContent = h; tr.appendChild(th)
      }
      thead.appendChild(tr); table.appendChild(thead)
    }
    const tbody = document.createElement('tbody')
    for (let i = 2; i < rows.length; i++) {
      const tr = document.createElement('tr')
      for (const c of parseRow(rows[i])) {
        const td = document.createElement('td'); td.textContent = c; tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
    table.appendChild(tbody)
    return table
  }
  ignoreEvent() { return false }
}

const HIDE_MARKS = new Set(['HeaderMark', 'EmphasisMark', 'CodeMark', 'StrikethroughMark'])

function buildDecorations(state) {
  const sel = state.selection
  const overlaps = (from, to) => sel.ranges.some(r => r.from <= to && r.to >= from)
  const deco = []

  {
    syntaxTree(state).iterate({
      enter: (node) => {
        const name = node.name

        // Inline markers (#, **, `, ~~) — reveal only when editing that element, not the whole line
        if (HIDE_MARKS.has(name)) {
          const parent = node.node.parent
          if (overlaps(parent ? parent.from : node.from, parent ? parent.to : node.to)) return
          let end = node.to
          if (name === 'HeaderMark' && state.doc.sliceString(node.to, node.to + 1) === ' ') end = node.to + 1
          if (end > node.from) deco.push(Decoration.replace({}).range(node.from, end))
          return
        }

        // Bullet markers → render as •, reveal raw when editing that line
        if (name === 'ListMark') {
          const line = state.doc.lineAt(node.from)
          if (overlaps(line.from, line.to)) return
          if (/^[-*+]$/.test(state.doc.sliceString(node.from, node.to))) {
            deco.push(Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to))
          }
          return
        }

        // Tables → render as a real table block, reveal raw when the cursor is inside
        if (name === 'Table') {
          const startLine = state.doc.lineAt(node.from)
          const endLine = state.doc.lineAt(node.to)
          if (overlaps(startLine.from, endLine.to)) return
          deco.push(Decoration.replace({
            widget: new TableWidget(state.doc.sliceString(startLine.from, endLine.to)),
            block: true,
          }).range(startLine.from, endLine.to))
          return false // don't descend — the whole block is replaced
        }
      },
    })
  }

  // Render LaTeX math as widgets when the cursor isn't inside the expression
  {
    const text = state.doc.toString()
    let m
    const reBlock = /\$\$([\s\S]+?)\$\$/g
    while ((m = reBlock.exec(text))) {
      const s = m.index, e = s + m[0].length
      if (!overlaps(s, e)) deco.push(Decoration.replace({ widget: new MathWidget(m[1].trim(), true) }).range(s, e))
    }
    const reInline = /(?<!\$)\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\$)/g
    while ((m = reInline.exec(text))) {
      const s = m.index, e = s + m[0].length
      if (!overlaps(s, e)) deco.push(Decoration.replace({ widget: new MathWidget(m[1].trim(), false) }).range(s, e))
    }
  }

  // Sort and drop any overlaps (CodeMirror rejects overlapping replace ranges)
  deco.sort((a, b) => a.from - b.from || a.startSide - b.startSide)
  const safe = []
  let last = -1
  for (const d of deco) {
    if (d.from >= last) { safe.push(d); last = d.to }
  }
  return Decoration.set(safe)
}

// Block decorations (the table widget) must come from a StateField, not a ViewPlugin
const livePreview = StateField.define({
  create(state) { return buildDecorations(state) },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) return buildDecorations(tr.state)
    return deco.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f),
})

// Slash command autocomplete
function slashSource(context) {
  const line = context.state.doc.lineAt(context.pos)
  const before = line.text.slice(0, context.pos - line.from)
  const m = /^\/(\w*)$/.exec(before)
  if (!m) return null
  const query = m[1].toLowerCase()
  const opts = SLASH_COMMANDS.filter(c => !query || c.label.toLowerCase().includes(query) || c.id.includes(query))
  if (!opts.length) return null
  return {
    from: line.from,
    to: context.pos,
    filter: false,
    validFor: /^\/\w*$/,
    options: opts.map(cmd => ({
      label: cmd.label,
      detail: cmd.badge,
      apply: (view, _c, from, to) => {
        const cursor = from + (cmd.cursorAt !== undefined ? cmd.cursorAt : cmd.insert.length)
        view.dispatch({
          changes: { from, to, insert: cmd.insert },
          selection: { anchor: cursor, head: cursor + (cmd.selectLen || 0) },
        })
      },
    })),
  }
}

// Open the slash menu the moment "/" is typed at the start of a line
const slashTrigger = EditorView.updateListener.of((u) => {
  if (!u.docChanged) return
  let fire = false
  u.changes.iterChanges((_fa, _ta, fromB, _tb, inserted) => {
    if (inserted.toString() === '/' && fromB === u.state.doc.lineAt(fromB).from) fire = true
  })
  if (fire) setTimeout(() => startCompletion(u.view), 0)
})

const editorTheme = EditorView.theme({
  '&': { color: 'var(--text-primary)', backgroundColor: 'transparent', fontSize: '15px', height: 'auto' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'visible', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', lineHeight: '1.85' },
  '.cm-content': {
    padding: '40px 80px 160px', minHeight: '70vh', letterSpacing: '0.3px',
    caretColor: 'var(--accent-blue)', maxWidth: '900px', margin: '0 auto', boxSizing: 'content-box',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent-blue)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(91,140,255,0.22)' },
  '.cm-placeholder': { color: 'var(--text-muted)' },
  '.cm-math': { color: 'var(--text-primary)' },
  '.cm-md-bullet': { color: 'var(--accent-blue)', fontWeight: '700' },
  '.cm-md-table': { borderCollapse: 'collapse', margin: '6px 0 16px', fontSize: '14px', maxWidth: '100%' },
  '.cm-md-table th, .cm-md-table td': { border: '1px solid var(--border)', padding: '6px 12px', textAlign: 'left', color: 'var(--text-primary)', verticalAlign: 'top' },
  '.cm-md-table th': { background: 'var(--bg-overlay)', fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' },
  '.cm-tooltip': { background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': { fontFamily: 'inherit', maxHeight: '300px' },
  '.cm-tooltip-autocomplete ul li': { padding: '8px 12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { background: 'var(--bg-hover, var(--nav-active))', color: 'var(--text-primary)' },
  '.cm-completionLabel': { fontSize: '13px', fontWeight: '600' },
  '.cm-completionDetail': { fontStyle: 'normal', color: 'var(--text-muted)', marginLeft: 'auto', paddingLeft: '12px', fontSize: '11px', fontFamily: 'monospace' },
}, { dark: true })

export default function MarkdownEditor({ value, onChange, zoom = 1, autoFocus = false, placeholder = '' }) {
  const hostRef = useRef()
  const viewRef = useRef()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value || '',
        extensions: [
          history(),
          keymap.of([...completionKeymap, ...defaultKeymap, ...historyKeymap]),
          markdown({ base: markdownLanguage }),
          syntaxHighlighting(mdHighlight),
          livePreview,
          EditorView.lineWrapping,
          autocompletion({ override: [slashSource], icons: false, closeOnBlur: true }),
          slashTrigger,
          cmPlaceholder(placeholder),
          editorTheme,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current?.(u.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    if (autoFocus) view.focus()
    return () => { view.destroy(); viewRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync when the note is swapped or changed externally (not from our own typing)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (value != null && value !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
    }
  }, [value])

  return <div ref={hostRef} style={{ zoom }} />
}
