import { ImageResponse } from 'next/og'

export const alt = 'ArrowLabs, the creative operating system for commerce'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0f0a24',
          padding: '72px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* gradient bloom */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: 'linear-gradient(120deg, #6D5EF6, #E24BF0 52%, #FF5C7A)',
            filter: 'blur(20px)',
            opacity: 0.55,
          }}
        />

        {/* brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(120deg, #6D5EF6, #E24BF0 52%, #FF5C7A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            ↗
          </div>
          <div style={{ color: 'white', fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            ArrowLabs
          </div>
        </div>

        {/* headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              color: 'white',
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Automate your whole store.
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              background: 'linear-gradient(120deg, #8B7BFF, #E24BF0 52%, #FF7C93)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Then let it sell.
          </div>
        </div>

        {/* footer row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#b9b2d6', fontSize: 26 }}>
          <span>Listings</span>
          <span style={{ color: '#5b527e' }}>·</span>
          <span>Ads</span>
          <span style={{ color: '#5b527e' }}>·</span>
          <span>Photography</span>
          <span style={{ color: '#5b527e' }}>·</span>
          <span>UGC video</span>
          <span style={{ color: '#5b527e' }}>·</span>
          <span style={{ color: 'white' }}>Human on the loop</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
