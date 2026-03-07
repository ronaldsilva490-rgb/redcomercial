/**
 * Barcode Scanner — usa BarcodeDetector API nativa do browser (Chrome/Android).
 * Sem biblioteca externa, sem permissão de app, sem custo.
 * Fallback gracioso para browsers sem suporte (iOS Safari).
 */

/** Verifica se o browser suporta BarcodeDetector */
export function isBarcodeDetectorSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

/** Formatos suportados para produtos comerciais */
const FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'data_matrix']

/**
 * Abre câmera e detecta código de barras.
 * @param {HTMLVideoElement} videoEl - elemento <video> para preview
 * @param {Function} onDetect - callback(code: string) chamado ao detectar
 * @param {Function} onError - callback(error: Error)
 * @returns {Function} stop() - para parar a câmera
 */
export async function startBarcodeScanner(videoEl, onDetect, onError) {
  if (!isBarcodeDetectorSupported()) {
    onError(new Error('BarcodeDetector não suportado neste browser. Use Chrome em Android.'))
    return () => {}
  }

  let stream = null
  let animFrame = null
  let stopped = false

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' }, // câmera traseira
        width:  { ideal: 1280 },
        height: { ideal: 720 },
      }
    })

    videoEl.srcObject = stream
    videoEl.play()

    const detector = new window.BarcodeDetector({ formats: FORMATS })

    const scan = async () => {
      if (stopped) return
      if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
        try {
          const codes = await detector.detect(videoEl)
          if (codes.length > 0) {
            const code = codes[0].rawValue
            stopCamera()
            onDetect(code)
            return
          }
        } catch { /* continua tentando */ }
      }
      animFrame = requestAnimationFrame(scan)
    }

    videoEl.addEventListener('playing', () => {
      animFrame = requestAnimationFrame(scan)
    }, { once: true })

  } catch (err) {
    if (err.name === 'NotAllowedError') {
      onError(new Error('Permissão de câmera negada. Habilite nas configurações do browser.'))
    } else {
      onError(err)
    }
  }

  function stopCamera() {
    stopped = true
    if (animFrame) cancelAnimationFrame(animFrame)
    if (stream) stream.getTracks().forEach(t => t.stop())
    if (videoEl) videoEl.srcObject = null
  }

  return stopCamera
}
