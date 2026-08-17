const STYLE_ID = 'dsh-companion-studio-styles'

const CSS = `
.dsh-companion-stage{--pet-primary:#315ea8;--pet-secondary:#fff;--pet-glow:#ff8b72;position:fixed;right:22px;bottom:18px;z-index:90;width:190px;min-height:218px;pointer-events:auto;user-select:none;touch-action:none;filter:drop-shadow(0 14px 24px rgba(10,26,55,.22));font:12px/1.35 system-ui,sans-serif;color:#17223a}
.dsh-companion-toolbar{position:absolute;right:0;top:12px;display:flex;gap:3px;opacity:0;transform:translateY(4px);transition:.18s ease;z-index:3}
.dsh-companion-stage:hover .dsh-companion-toolbar,.dsh-companion-stage:focus-within .dsh-companion-toolbar{opacity:1;transform:none}
.dsh-companion-toolbar button,.dsh-companion-header-toggle{border:1px solid color-mix(in srgb,var(--pet-primary) 32%,transparent);background:color-mix(in srgb,var(--pet-secondary) 92%,transparent);color:var(--pet-primary);border-radius:999px;min-width:26px;height:26px;cursor:pointer}
.dsh-companion-bubble{position:absolute;right:9px;bottom:210px;width:238px;max-height:150px;overflow:auto;background:color-mix(in srgb,var(--pet-secondary) 94%,transparent);border:1px solid color-mix(in srgb,var(--pet-primary) 22%,transparent);border-radius:15px 15px 4px 15px;padding:10px 12px;box-shadow:0 8px 22px rgba(10,26,55,.15);user-select:text;touch-action:auto}
.dsh-companion-bubble strong{display:block;color:var(--pet-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px}
.dsh-companion-bubble p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:inherit}
.dsh-companion-bubble small{display:block;color:#a04b4b;margin-top:5px}
.dsh-companion-menu{position:absolute;right:35px;top:62px;width:174px;max-height:min(420px,calc(100vh - 90px));overflow:auto;display:grid;gap:5px;background:color-mix(in srgb,var(--pet-secondary) 96%,transparent);border:1px solid color-mix(in srgb,var(--pet-primary) 24%,transparent);border-radius:13px;padding:9px;box-shadow:0 10px 24px rgba(10,26,55,.2);z-index:4;touch-action:auto}
.dsh-companion-menu .dsh-companion-menu-handle{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-3px -3px 1px;padding:5px 6px;border:0;border-radius:8px;background:transparent;color:var(--pet-primary);cursor:grab;touch-action:none}
.dsh-companion-menu-handle:active{cursor:grabbing}
.dsh-companion-menu-handle span{font-size:11px;color:#73809a;font-weight:500}
.dsh-companion-menu button{border:0;border-radius:8px;background:color-mix(in srgb,var(--pet-primary) 10%,var(--pet-secondary));padding:6px 8px;text-align:left;color:inherit;cursor:pointer}
.dsh-companion-menu button:hover{background:color-mix(in srgb,var(--pet-primary) 18%,var(--pet-secondary))}
.dsh-companion-menu small{color:#56627a;line-height:1.45}
.dsh-companion-voice{display:grid;gap:4px;color:#56627a}
.dsh-companion-voice select{width:100%;border:1px solid color-mix(in srgb,var(--pet-primary) 28%,transparent);border-radius:8px;background:var(--pet-secondary);color:inherit;padding:6px}
.dsh-companion-import{display:block;border:1px dashed color-mix(in srgb,var(--pet-primary) 44%,transparent);border-radius:8px;padding:7px 8px;text-align:center;color:var(--pet-primary);cursor:pointer;background:color-mix(in srgb,var(--pet-primary) 5%,var(--pet-secondary))}
.dsh-companion-import input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.dsh-companion-menu .dsh-companion-delete{color:#a13f48;background:#fff0f1}
.dsh-companion-import-error{color:#a13f48!important}
.dsh-companion-avatar{position:absolute;right:3px;bottom:24px;width:184px;height:198px;transform-origin:50% 90%;will-change:transform}
.dsh-companion-image{object-fit:contain;object-position:center bottom;filter:drop-shadow(0 8px 12px rgba(10,26,55,.18));pointer-events:none}
.dsh-companion-placeholder{border-radius:46% 54% 48% 52%;background:radial-gradient(circle at 42% 35%,var(--pet-secondary) 0 14%,transparent 15%),linear-gradient(145deg,color-mix(in srgb,var(--pet-primary) 70%,white),var(--pet-primary));border:3px solid color-mix(in srgb,var(--pet-secondary) 90%,var(--pet-primary));box-shadow:inset -12px -14px 0 rgba(0,0,0,.08),0 0 0 5px color-mix(in srgb,var(--pet-glow) 18%,transparent);display:grid;place-items:center}
.dsh-companion-placeholder::after{content:'';position:absolute;right:-18px;bottom:5px;width:45px;height:29px;border-radius:70% 25% 70% 25%;background:var(--pet-primary);transform:rotate(25deg);z-index:-1}
.dsh-companion-fin{position:absolute;left:-14px;top:55px;width:30px;height:18px;background:var(--pet-primary);border-radius:80% 20% 80% 20%;transform:rotate(-16deg)}
.dsh-companion-glyph{font-size:43px;transform:translateY(-11px)}
.dsh-companion-face{position:absolute;bottom:28px;font-weight:800;letter-spacing:3px;color:var(--pet-secondary);text-shadow:0 1px 2px rgba(0,0,0,.25)}
.dsh-companion-sprite{background-repeat:no-repeat;background-position:0 0;animation:dsh-pet-sprite var(--pet-fps) steps(var(--pet-frames)) infinite}
.dsh-companion-status{position:absolute;right:6px;bottom:0;display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;background:color-mix(in srgb,var(--pet-secondary) 94%,transparent);border:1px solid color-mix(in srgb,var(--pet-primary) 24%,transparent);white-space:nowrap}
.dsh-companion-status b{display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:var(--pet-primary);color:var(--pet-secondary)}
.dsh-companion-stage[data-state=idle] .dsh-companion-avatar{animation:dsh-pet-float 3.2s ease-in-out infinite}
.dsh-companion-stage[data-state=thinking] .dsh-companion-avatar{animation:dsh-pet-think 1.35s ease-in-out infinite}
.dsh-companion-stage[data-state=streaming] .dsh-companion-avatar{animation:dsh-pet-type .55s ease-in-out infinite alternate}
.dsh-companion-stage[data-state=tool] .dsh-companion-avatar{animation:dsh-pet-tool .75s ease-in-out infinite}
.dsh-companion-stage[data-state=waiting] .dsh-companion-avatar{animation:dsh-pet-wait 1.15s ease-in-out infinite}
.dsh-companion-stage[data-state=success] .dsh-companion-avatar{animation:dsh-pet-success .62s cubic-bezier(.25,.8,.3,1.25) 3}
.dsh-companion-stage[data-state=error] .dsh-companion-avatar{animation:dsh-pet-error .28s linear 4}
.dsh-companion-stage[data-state=sleeping] .dsh-companion-avatar{animation:dsh-pet-sleep 4s ease-in-out infinite;filter:saturate(.7)}
.dsh-companion-stage[data-showcase=true] .dsh-companion-avatar{animation:dsh-pet-showcase .72s ease-in-out 3}
.dsh-companion-dock{position:fixed;right:10px;bottom:72px;z-index:90;border:1px solid rgba(70,100,150,.24);border-radius:12px 0 0 12px;background:rgba(255,255,255,.9);padding:8px 7px;cursor:pointer;box-shadow:0 7px 18px rgba(10,26,55,.16)}
.dsh-companion-dock span+span{font-size:8px;color:#35a76f;margin-left:2px}
.dsh-companion-header-toggle{font-size:14px;line-height:1}
@keyframes dsh-pet-float{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-7px) rotate(1deg)}}
@keyframes dsh-pet-think{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(3deg) translateY(-3px)}}
@keyframes dsh-pet-type{from{transform:translateX(-2px) scaleY(.98)}to{transform:translateX(2px) scaleY(1.02)}}
@keyframes dsh-pet-tool{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg) translateY(-4px)}}
@keyframes dsh-pet-wait{0%,100%{transform:rotate(0)}35%{transform:rotate(-7deg)}70%{transform:rotate(4deg)}}
@keyframes dsh-pet-success{0%{transform:translateY(0) scale(1)}50%{transform:translateY(-18px) scale(1.07)}100%{transform:translateY(0) scale(1)}}
@keyframes dsh-pet-error{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes dsh-pet-sleep{0%,100%{transform:scaleY(.96) translateY(5px)}50%{transform:scaleY(1) translateY(2px)}}
@keyframes dsh-pet-showcase{0%,100%{transform:translateY(0) rotate(0)}35%{transform:translateY(-12px) rotate(-5deg)}70%{transform:translateY(-4px) rotate(5deg)}}
@keyframes dsh-pet-sprite{to{background-position:100% 0}}
@media (prefers-reduced-motion:reduce){.dsh-companion-stage .dsh-companion-avatar,.dsh-companion-sprite{animation:none!important}}
`

export function installCompanionStyles(documentLike: Document = document): () => void {
  const existing = documentLike.getElementById(STYLE_ID)
  if (existing) return () => {}
  const style = documentLike.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  documentLike.head.append(style)
  return () => { style.remove() }
}
