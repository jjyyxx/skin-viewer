const THREE = require('three')
window.THREE = THREE
require('three/examples/js/controls/OrbitControls')

// import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera'
// import { Scene } from 'three/src/scenes/Scene'
// import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer'
// import { BoxGeometry } from 'three/src/geometries/BoxGeometry'
// import { Mesh } from 'three/src/objects/Mesh'
// import { Object3D } from 'three/src/core/Object3D'
// import { Texture } from 'three/src/textures/Texture'
// import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial'
// import { NearestFilter } from 'three/src/constants'

// const THREE = window.THREE = {
//   PerspectiveCamera,
//   Scene,
//   WebGLRenderer,
//   BoxGeometry,
//   Mesh,
//   Object3D,
//   Texture,
//   MeshBasicMaterial,
//   NearestFilter
// }

function create2DImage(skin, scale) {
  const width = 64 * scale, height = 64 * scale
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.style.imageRendering = 'pixelated'
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(skin, 0, 0, width, height)
  document.body.appendChild(canvas)
}

/**
 * @param {ImageBitmap} skin 
 */
async function create3DModel(skin, slim = 'auto') {
  if (skin.width !== 64) throw new Error('Width is not 64!')
  if (![32, 64].includes(skin.height)) throw new Error('Height is not 64 or 32!')

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 50

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)

  const controls = new THREE.OrbitControls(camera, renderer.domElement)
  controls.target.set(0, -16, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.25
  controls.screenSpacePanning = false
  controls.minDistance = 20
  controls.maxDistance = 500

  const parts = await disassemble(skin, slim)
  const isSlim = parts.isSlim

  const headModel = new THREE.BoxGeometry(8, 8, 8)
  const bodyModel = new THREE.BoxGeometry(8, 12, 4)
  const legModel = new THREE.BoxGeometry(4, 12, 4)
  const armModel = new THREE.BoxGeometry(isSlim ? 3 : 4, 12, 4)

  const head = new THREE.Mesh(headModel, getCubeMaterial(parts.head))
  head.position.set(0, 0, 0)

  const body = new THREE.Mesh(bodyModel, getCubeMaterial(parts.body))
  body.position.set(0, -10, 0)

  const leftArm = new THREE.Mesh(armModel, getCubeMaterial(parts.leftArm))
  leftArm.position.set(isSlim ? 5.5 : 6, -10, 0)

  const leftLeg = new THREE.Mesh(legModel, getCubeMaterial(parts.leftLeg))
  leftLeg.position.set(2, -22, 0)

  const rightArm = new THREE.Mesh(armModel, getCubeMaterial(parts.rightArm))
  rightArm.position.set(isSlim ? -5.5 : -6, -10, 0)

  const rightLeg = new THREE.Mesh(legModel, getCubeMaterial(parts.rightLeg))
  rightLeg.position.set(-2, -22, 0)

  const all = new THREE.Object3D()
  all.add(head, body, leftArm, leftLeg, rightArm, rightLeg)
  // const axesHelper = new THREE.AxesHelper(5)
  // scene.add(axesHelper)
  scene.add(all)

  document.body.appendChild(renderer.domElement)

  function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }

  animate()
}

/**
 * @param {{[key in 'top' | 'buttom' | 'right' | 'front' | 'left' | 'back']: ImageBitmap}} right 
 */
function mapRightToLeft(right) {
  return Promise.all([
    right.top,
    right.buttom,
    right.left,
    right.front,
    right.right,
    right.back
  ].map((image) => flip(image, true))).then((images) => {
    return {
      top: images[0],
      buttom: images[1],
      right: images[2],
      front: images[3],
      left: images[4],
      back: images[5]
    }
  })
}

/**
 * @param {ImageBitmap} skin
 */
function detectSlim(skin) {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  ctx.drawImage(skin, 40, 16, 16, 16, 0, 0, 16, 16)
  const [R, G, B, A] = ctx.getImageData(0, 0, 1, 1).data
  const [r, g, b, a] = ctx.getImageData(15, 15, 1, 1).data
  return A === 0 ? a === 0 : R === r && G === g && B === b && A === a
}

function getTransparentRect() {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return createImageBitmap(canvas)
}

/**
 * @param {ImageBitmap} skin 
 * @param {'auto' | 'slim' | 'default'} slim 
 */
function disassemble(skin, slim = 'auto') {
  const legacy = skin.height === 32
  const isSlim = slim === 'auto' ? detectSlim(skin) : slim === 'slim'

  const parts = [
    getConvex(skin, 0, 0, 8),
    getConvex(skin, 16, 16, 12, 8, 4),
    getConvex(skin, 40, 16, 12, isSlim ? 3 : 4, 4),
    getConvex(skin, 0, 16, 12, 4),
    getConvex(skin, 32, 0, 8)
  ]
  if (!legacy) {
    parts.push(
      // after 1.8
      getConvex(skin, 32, 48, 12, isSlim ? 3 : 4, 4),
      getConvex(skin, 16, 48, 12, 4),
      // layer 2
      getConvex(skin, 16, 32, 12, 8, 4),
      getConvex(skin, 40, 32, 12, 4),
      getConvex(skin, 0, 32, 12, 4),
      getConvex(skin, 48, 48, 12, 4),
      getConvex(skin, 0, 48, 12, 4)
    )
  } else {
    parts.push(getTransparentRect())
  }
  return Promise.all(parts).then(async (convex) => {
    const rightArm = convex[2]
    const rightLeg = convex[3]
    const transparent = convex[5]
    if (legacy) {
      const leftArm = await mapRightToLeft(rightArm)
      const leftLeg = await mapRightToLeft(rightLeg)
      return {
        head: convex[0],
        body: convex[1],
        rightArm,
        rightLeg,
        helmet: convex[4],
        leftArm,
        leftLeg,
        body2: transparent,
        rightArm2: transparent,
        rightLeg2: transparent,
        leftArm2: transparent,
        leftLeg2: transparent,
        isSlim
      }
    } else {
      return {
        head: convex[0],
        body: convex[1],
        rightArm: convex[2],
        rightLeg: convex[3],
        helmet: convex[4],

        leftArm: convex[5],
        leftLeg: convex[6],
        body2: convex[7],
        rightArm2: convex[8],
        rightLeg2: convex[9],
        leftArm2: convex[10],
        leftLeg2: convex[11],
        isSlim
      }
    }
  })
}

/**
 * get the convex
 * @param {ImageBitmap} image 
 * @param {number} sx 
 * @param {number} sy 
 * @param {number} [wx] 
 * @param {number} wz 
 * @param {number} [wy] 
 * @returns {Promise<{[key in 'top' | 'buttom' | 'right' | 'front' | 'left' | 'back']: ImageBitmap}>}
 */
function getConvex(image, sx, sy, wz, wx, wy, flipY = true) {
  if (wx === undefined) wx = wz
  if (wy === undefined) wy = wx
  const options = { imageOrientation: flipY ? 'flipY' : 'none' }
  const promises = [
    createImageBitmap(image, sx + wy, sy, wx, wy, ),
    createImageBitmap(image, sx + wy + wx, sy, wx, wy, options),
    createImageBitmap(image, sx, sy + wy, wy, wz, options),
    createImageBitmap(image, sx + wy, sy + wy, wx, wz, options),
    createImageBitmap(image, sx + wy + wx, sy + wy, wy, wz, options),
    createImageBitmap(image, sx + wy + wx + wy, sy + wy, wx, wz, options),
  ]
  return Promise.all(promises).then(async (images) => {
    return {
      top: await flip(images[0], false), // FIXME: weird
      buttom: await flip(images[1], false),
      right: images[2],
      front: images[3],
      left: images[4],
      back: images[5]
    }
  })
}

/**
 * @param {ImageBitmap} image 
 */
function flip(image, isX) {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  const xx = isX ? -1 : 1
  ctx.scale(xx, -xx)
  if (isX) {
    ctx.drawImage(image, -image.width, 0)
  } else {
    ctx.drawImage(image, 0, -image.height)
  }
  return createImageBitmap(canvas)
}

/**
 * @param {{[key in 'top' | 'buttom' | 'right' | 'front' | 'left' | 'back']: ImageBitmap}} convex 
 */
function getCubeMaterial(convex) {
  return [
    convex.left,
    convex.right,
    convex.top,
    convex.buttom,
    convex.front,
    convex.back
  ].map((image) => {
    const texture = new THREE.Texture(image)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.needsUpdate = true
    return new THREE.MeshBasicMaterial({ map: texture })
  })
}

// const picture = document.getElementById('picture')
// const check = document.getElementById('slim')
// const load = document.getElementById('load')
// load.addEventListener('click', () => {
//   if (picture.files.length === 0) return
//   const canvas = document.getElementsByTagName('canvas')
//   for (const c of canvas) {
//     c.remove()
//   }

//   const pic = picture.files[0]
//   createImageBitmap(pic, {
//     resizeQuality: 'pixelated'
//   }).then((r) => create3DModel(r, check.checked))
// })

async function loadImage(path) {
  return createImageBitmap(await (await fetch(path)).blob(), {
    resizeQuality: 'pixelated'
  })
}
loadImage('steve.png').then((r) => (/* create2DImage(r, 16),  */create3DModel(r)))
