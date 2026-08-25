import QRCode from 'qrcode'

// 课后复盘 -> 一张可以直接发微信的分享图片。
// 设计目标：内容能自动撑开高度（动作多/总结长都不会截断），
// 右下角带个二维码——扫码跳转官网登录页，客户想看更详细的训练记录/趋势就点进去，
// 顺便也是给还没注册的人的一个入口。
// 支持中/英两种语言输出，教练生成时自己选。

export type ShareCardLang = 'zh' | 'en'

export interface ShareCardExercise {
  name_cn: string
  name_en: string
  sets?: number | null
  reps?: number | null
  weight?: number | null
  weightUnit?: string
  actualSets?: number | null
  actualReps?: number | null
  actualWeight?: number | null
  setDetails?: { set_no: number; reps: number | null; weight: number | null }[]
  note?: string
}

export interface ShareCardData {
  lang: ShareCardLang
  studioName: string
  clientName: string
  className: string
  date: Date
  exercises: ShareCardExercise[]
  summary?: string
  qrUrl: string
}

const BRAND = '#9880B8'
const LAVENDER = '#C2AFCC'
const PAGE_BG = '#F5F0F8'
const SUMMARY_BG = '#EFE7F4'
const TEXT_PRIMARY = '#5A4878'
const TEXT_SECONDARY = '#8A7A9E'
const FONT = '"PingFang SC", "Microsoft YaHei", -apple-system, sans-serif'

const SCALE = 2 // 输出图放大2倍，微信里看着不糊
const W = 720

const LABELS: Record<ShareCardLang, {
  headerTag: string
  summaryTitle: string
  qrTitle: string
  qrSub: string
  done: string
  reps: string
  setsX: string
}> = {
  zh: {
    headerTag: '训练记录',
    summaryTitle: '📝 课后总结',
    qrTitle: '扫码登录',
    qrSub: '查看完整训练记录与历史趋势',
    done: '已完成',
    reps: '次',
    setsX: '组 × ',
  },
  en: {
    headerTag: 'Training Record',
    summaryTitle: "📝 Coach's Notes",
    qrTitle: 'Scan to Log In',
    qrSub: 'View full training history & trends',
    done: 'Done',
    reps: 'reps',
    setsX: ' sets × ',
  },
}

// 先按原文里的换行拆段落，每段再按宽度自动折行——
// 教练在总结/备注里手动敲的换行会被保留，不会被强行拼成一行。
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    if (para === '') { lines.push(''); continue }
    let line = ''
    for (const ch of para) {
      const test = line + ch
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line)
        line = ch
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

function exerciseLine(ex: ShareCardExercise, lang: ShareCardLang): string {
  const L = LABELS[lang]
  // 有每组明细就展开显示（比如 8/8/6次），没有就用汇总的 actual_sets x actual_reps
  if (ex.setDetails && ex.setDetails.length > 0) {
    const reps = ex.setDetails.map(s => s.reps ?? '-').join('/')
    const w = ex.setDetails[0]?.weight
    return w != null ? `${reps} ${L.reps} · ${w}${ex.weightUnit || 'kg'}` : `${reps} ${L.reps}`
  }
  const sets = ex.actualSets ?? ex.sets
  const reps = ex.actualReps ?? ex.reps
  const weight = ex.actualWeight ?? ex.weight
  const parts: string[] = []
  if (sets != null && reps != null) parts.push(`${sets}${L.setsX}${reps}${L.reps}`)
  else if (reps != null) parts.push(`${reps}${L.reps}`)
  if (weight != null) parts.push(`${weight}${ex.weightUnit || 'kg'}`)
  return parts.length > 0 ? parts.join(' · ') : L.done
}

export async function generateReviewShareCard(data: ShareCardData): Promise<Blob> {
  const L = LABELS[data.lang]
  const exName = (ex: ShareCardExercise) =>
    data.lang === 'zh' ? (ex.name_cn || ex.name_en) : (ex.name_en || ex.name_cn)

  // logo 加载失败也不影响其余内容生成，直接不画图标就好
  let logoImg: HTMLImageElement | null = null
  try { logoImg = await loadImage('/logo.svg') } catch {}

  const dateLabel = data.lang === 'zh'
    ? data.date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // 先用一张量尺寸用的画布把要占的高度算出来，再建真正尺寸的画布画正式内容——
  // 这样动作再多、总结再长，图片都会自动变长，不会被裁掉。
  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')!

  const padX = 40
  let y = 0
  y += 100 // header（品牌条）
  y += 96 // 客户/课程/日期信息块
  y += 24 // 分隔线间距

  const exerciseRowHeights: number[] = []
  for (const ex of data.exercises) {
    mctx.font = `500 26px ${FONT}`
    const nameLines = wrapText(mctx, exName(ex), W - padX * 2 - 40)
    mctx.font = `400 22px ${FONT}`
    const detailLines = wrapText(mctx, exerciseLine(ex, data.lang), W - padX * 2 - 40)
    mctx.font = `400 20px ${FONT}`
    const noteLines = ex.note ? wrapText(mctx, ex.note, W - padX * 2 - 40) : []
    const rowH = 16 + nameLines.length * 34 + detailLines.length * 30 + noteLines.length * 27 + 14
    exerciseRowHeights.push(rowH)
    y += rowH
  }
  y += 20

  let summaryLines: string[] = []
  if (data.summary) {
    mctx.font = `400 25px ${FONT}`
    summaryLines = wrapText(mctx, data.summary, W - padX * 2 - 40)
    y += 64 + summaryLines.length * 36 + 32
  }

  y += 160 // footer（二维码区）
  const H = Math.ceil(y) + 40

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // 背景
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  let cy = 0

  // 品牌条
  ctx.fillStyle = BRAND
  ctx.fillRect(0, 0, W, 100)
  ctx.textBaseline = 'middle'

  let nameX = padX
  if (logoImg) {
    const logoSize = 40
    ctx.save()
    ctx.beginPath()
    ctx.arc(padX + logoSize / 2, 50, logoSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.clip()
    ctx.drawImage(logoImg, padX + 3, 50 - logoSize / 2 + 3, logoSize - 6, logoSize - 6)
    ctx.restore()
    nameX = padX + logoSize + 12
  }

  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 32px ${FONT}`
  ctx.fillText(data.studioName, nameX, 50)
  ctx.font = `400 20px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'right'
  ctx.fillText(L.headerTag, W - padX, 50)
  ctx.textAlign = 'left'
  cy = 100

  // 客户/课程信息块
  ctx.fillStyle = PAGE_BG
  ctx.fillRect(0, cy, W, 96)
  ctx.fillStyle = TEXT_PRIMARY
  ctx.font = `700 30px ${FONT}`
  const titleLine = data.clientName ? `${data.clientName} · ${data.className}` : data.className
  ctx.fillText(titleLine, padX, cy + 36)
  ctx.fillStyle = TEXT_SECONDARY
  ctx.font = `400 22px ${FONT}`
  ctx.fillText(dateLabel, padX, cy + 72)
  cy += 96

  cy += 24

  // 动作列表
  data.exercises.forEach((ex, i) => {
    const rowH = exerciseRowHeights[i]
    ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#FAF8FB'
    ctx.fillRect(0, cy, W, rowH)

    // 序号圆点
    ctx.fillStyle = LAVENDER
    ctx.beginPath()
    ctx.arc(padX + 12, cy + 30, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `700 16px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(String(i + 1), padX + 12, cy + 31)
    ctx.textAlign = 'left'

    let rowY = cy + 16
    ctx.fillStyle = TEXT_PRIMARY
    ctx.font = `500 26px ${FONT}`
    const nameLines = wrapText(ctx, exName(ex), W - padX * 2 - 40)
    nameLines.forEach(line => {
      ctx.fillText(line, padX + 40, rowY + 18)
      rowY += 34
    })

    ctx.fillStyle = TEXT_SECONDARY
    ctx.font = `400 22px ${FONT}`
    const detailLines = wrapText(ctx, exerciseLine(ex, data.lang), W - padX * 2 - 40)
    detailLines.forEach(line => {
      ctx.fillText(line, padX + 40, rowY + 14)
      rowY += 30
    })

    if (ex.note) {
      ctx.fillStyle = '#B3A6C4'
      ctx.font = `italic 400 20px ${FONT}`
      const noteLines = wrapText(ctx, ex.note, W - padX * 2 - 40)
      noteLines.forEach(line => {
        ctx.fillText(line, padX + 40, rowY + 12)
        rowY += 27
      })
    }

    cy += rowH
  })

  cy += 20

  // 课后总结——加大字号、整块底色，跟上面动作列表明显分开
  if (data.summary && summaryLines.length > 0) {
    const boxH = 64 + summaryLines.length * 36 + 24
    ctx.fillStyle = SUMMARY_BG
    ctx.fillRect(padX - 8, cy, W - (padX - 8) * 2, boxH)
    ctx.fillStyle = BRAND
    ctx.fillRect(padX - 8, cy, 6, boxH)
    ctx.fillStyle = TEXT_PRIMARY
    ctx.font = `700 27px ${FONT}`
    ctx.fillText(L.summaryTitle, padX + 20, cy + 30)
    ctx.fillStyle = TEXT_PRIMARY
    ctx.font = `400 25px ${FONT}`
    let sy = cy + 68
    summaryLines.forEach(line => {
      ctx.fillText(line, padX + 20, sy)
      sy += 36
    })
    cy += boxH + 24
  }

  // 分隔线
  ctx.strokeStyle = '#EEE6F2'
  ctx.beginPath()
  ctx.moveTo(padX, cy)
  ctx.lineTo(W - padX, cy)
  ctx.stroke()
  cy += 24

  // 二维码 + 引导文案
  const qrDataUrl = await QRCode.toDataURL(data.qrUrl, { margin: 0, width: 240, color: { dark: TEXT_PRIMARY, light: '#FFFFFF' } })
  const qrImg = await loadImage(qrDataUrl)
  const qrSize = 100
  ctx.drawImage(qrImg, W - padX - qrSize, cy + 10, qrSize, qrSize)

  ctx.fillStyle = TEXT_PRIMARY
  ctx.font = `700 22px ${FONT}`
  ctx.fillText(L.qrTitle, padX, cy + 40)
  ctx.fillStyle = TEXT_SECONDARY
  ctx.font = `400 19px ${FONT}`
  ctx.fillText(L.qrSub, padX, cy + 70)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('生成图片失败'))
    }, 'image/png')
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
