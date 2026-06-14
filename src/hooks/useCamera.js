import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

export async function captureFromCamera() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera
    })
    return {
      base64: image.base64String,
      preview: `data:image/${image.format};base64,${image.base64String}`
    }
  } catch (err) {
    if (err.message !== 'User cancelled photos app') {
      throw err
    }
    return null
  }
}

export async function pickFromGallery() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Photos
    })
    return {
      base64: image.base64String,
      preview: `data:image/${image.format};base64,${image.base64String}`
    }
  } catch (err) {
    if (err.message !== 'User cancelled photos app') {
      throw err
    }
    return null
  }
}
