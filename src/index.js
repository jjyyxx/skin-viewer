async function loadImage(path) {
  return createImageBitmap(await (await fetch(path)).blob(), {
    resizeQuality: 'pixelated'
  })
}

function create(skin) {
  const scale = 16
  const width = 64 * scale, height = 64 * scale
  const canvas = document.createElement('canvas')
  canvas.setAttribute('width', width)
  canvas.setAttribute('height', height)
  canvas.style.imageRendering = 'pixelated'

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(skin, 0, 0, width, height)

  document.body.appendChild(canvas)
}

loadImage('foo.png').then(create)