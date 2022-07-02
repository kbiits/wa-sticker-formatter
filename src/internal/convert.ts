import sharp, { fit } from 'sharp'
import videoToGif from './videoToGif'
import { writeFile } from 'fs-extra'
import { tmpdir } from 'os'
import crop from './crop'
import { StickerTypes } from './Metadata/StickerTypes'
import { defaultBg } from '../Utils'
import { IStickerOptions } from '..'

const convert = async (
    data: Buffer,
    mime: string,
    { quality = 100, background = defaultBg, type = StickerTypes.DEFAULT }: IStickerOptions,
    webpConfig: Partial<sharp.WebpOptions> = {} 
): Promise<Buffer> => {
    const isVideo = mime.startsWith('video')
    let image = isVideo ? await videoToGif(data) : data
    const isAnimated = isVideo || mime.includes('gif')

    if (isAnimated && ['crop', 'circle'].includes(type)) {
        const filename = `${tmpdir()}/${Math.random().toString(36)}.webp`
        await writeFile(filename, image)
        ;[image, type] = [await crop(filename), type === 'circle' ? StickerTypes.CIRCLE : StickerTypes.DEFAULT]
    }

    const img = sharp(image, { animated: type !== 'circle' }).toFormat('webp')

    if (type === 'crop')
        img.resize(512, 512, {
            fit: fit.cover
        })

    if (type === 'full')
        img.resize(512, 512, {
            fit: fit.contain,
            background
        })

    if (type === 'circle') {
        img.resize(512, 512, {
            fit: fit.cover
        }).composite([
            {
                input: Buffer.from(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="${background}"/></svg>`
                ),
                blend: 'dest-in'
            }
        ])
    }

    return await img
        .webp({
            quality,
            lossless: false,
            ...webpConfig,
        })
        .toBuffer()
}

export default convert
