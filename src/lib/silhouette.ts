import silhouetteUrl from '../assets/silhouette.png'
import handsUrl from '../assets/silhouette_hands.png'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function loadSilhouetteImage(): Promise<HTMLImageElement> {
  return loadImage(silhouetteUrl)
}

// バッグの手前に重ねる「手だけ」の透過PNG（silhouette.png と同寸・同位置）。
export function loadHandsLayerImage(): Promise<HTMLImageElement> {
  return loadImage(handsUrl)
}
