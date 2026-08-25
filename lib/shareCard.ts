import QRCode from 'qrcode'

// 课后复盘 -> 一张可以直接发微信的分享图片。
// 设计目标：内容能自动撑开高度（动作多/总结长都不会截断），
// 右下角带个二维码——扫码跳转官网登录页，客户想看更详细的训练记录/趋势就点进去，
// 顺便也是给还没注册的人的一个入口。

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
}

export interface ShareCardData {
  studioName: string
  clientName: string
  className: string
  dateLabel: string
  exercises: ShareCardExercise[]
  summary?: string
  qrUrl: string
}

const BRAND = '#9880B8'
const LAVENDER = '#C2AFCC'
const PAGE_BG = '#F5F0F8'
const TEXT_PRIMARY = '#5A4878'
const TEXT_SECONDARY = '#8A7A9E'
const FONT = '"PingFang SC", "Microsoft YaHei", -apple-system, sans-serif'

const SCALE = 2 // 输出图放大2倍，微信里看着不糊
const W = 720

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function exerciseLine(ex: ShareCardExercise): string {
  // 有每组明细就展开显示（比如 8/8/6次），没有就用汇总的 actual_sets x actual_reps
  if (ex.setDetails && ex.setDetails.length > 0) {
    const reps = ex.setDetails.map(s => s.reps ?? '-').join('/')
    const w = ex.setDetails[0]?.weight
    return w != null ? `${reps} 次 · ${w}${ex.weightUnit || 'kg'}` : `${reps} 次`
  }
  const sets = ex.actualSets ?? ex.sets
  const reps = ex.actualReps ?? ex.reps
  const weight = ex.actualWeight ?? ex.weight
  const parts: string[] = []
  if (sets != null && reps != null) parts.push(`${sets}组 × ${reps}次`)
  else if (reps != null) parts.push(`${reps}次`)
  if (weight != null) parts.push(`${weight}${ex.weightUnit || 'kg'}`)
  return parts.length > 0 ? parts.join(' · ') : '已完成'
}

export async function generateReviewShareCard(data: ShareCardData): Promise<Blob> {
  // 先用一张量尺寸用的画布把要占的高度算出来，再建真正尺寸的画布画正式内容——
  // 这样动作再多、总结再长，图片都会自动变长，不会被裁掉。
  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')!

  const padX = 40
  let y = 0
  y += 100 // header（品牌条）
  y += 96 // 客户/课程/日期信息块
  y += 24 // 分隔线间距

  mctx.font = `500 26px ${FONT}`
  const exerciseRowHeights: number[] = []
  for (const ex of data.exercises) {
    mctx.font = `500 26px ${FONT}`
    const nameLines = wrapText(mctx, `${ex.name_cn}`, W - padX * 2 - 40)
    mctx.font = `400 22px ${FONT}`
    const detailLines = wrapText(mctx, exerciseLine(ex), W - padX * 2 - 40)
    const rowH = 16 + nameLines.length * 34 + detailLines.length * 30 + 14
    exerciseRowHeights.push(rowH)
    y += rowH
  }
  y += 20

  let summaryLines: string[] = []
  if (data.summary) {
    mctx.font = `400 24px ${FONT}`
    summaryLines = wrapText(mctx, data.summary, W - padX * 2 - 32)
    y += 56 + summaryLines.length * 34 + 24
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
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 32px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillText(data.studioName, padX, 50)
  ctx.font = `400 20px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'right'
  ctx.fillText('训练记录', W - padX, 50)
  ctx.textAlign = 'left'
  cy = 100

  // 客户/课程信息块
  ctx.fillStyle = PAGE_BG
  ctx.fillRect(0, cy, W, 96)
  ctx.fillStyle = TEXT_PRIMARY
  ctx.font = `700 30px ${FONT}`
  ctx.fillText(`${data.clientName} · ${data.className}`, padX, cy + 36)
  ctx.fillStyle = TEXT_SECONDARY
  ctx.font = `400 22px ${FONT}`
  ctx.fillText(data.dateLabel, padX, cy + 72)
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
    const nameLines = wrapText(ctx, ex.name_cn, W - padX * 2 - 40)
    nameLines.forEach(line => {
      ctx.fillText(line, padX + 40, rowY + 18)
      rowY += 34
    })

    ctx.fillStyle = TEXT_SECONDARY
    ctx.font = `400 22px ${FONT}`
    const detailLines = wrapText(ctx, exerciseLine(ex), W - padX * 2 - 40)
    detailLines.forEach(line => {
      ctx.fillText(line, padX + 40, rowY + 14)
      rowY += 30
    })

    cy += rowH
  })

  cy += 20

  // 课后总结
  if (data.summary && summaryLines.length > 0) {
    ctx.fillStyle = LAVENDER
    ctx.fillRect(padX, cy, 4, summaryLines.length * 34 + 40)
    ctx.fillStyle = TEXT_PRIMARY
    ctx.font = `700 24px ${FONT}`
    ctx.fillText('课后总结', padX + 20, cy + 20)
    ctx.fillStyle = TEXT_SECONDARY
    ctx.font = `400 24px ${FONT}`
    let sy = cy + 56
    summaryLines.forEach(line => {
      ctx.fillText(line, padX + 20, sy)
      sy += 34
    })
    cy += 56 + summaryLines.length * 34 + 24
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
  ctx.fillText('扫码登录', padX, cy + 40)
  ctx.fillStyle = TEXT_SECONDARY
  ctx.font = `400 19px ${FONT}`
  ctx.fillText('查看完整训练记录与历史趋势', padX, cy + 70)

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
