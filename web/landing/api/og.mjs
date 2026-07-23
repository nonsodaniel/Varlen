import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';

export default async function handler(req, res) {
  try {
    const imageResponse = new ImageResponse(
      h('div', {
        style: {
          background: 'linear-gradient(135deg, #0F1020 0%, #1A1B3A 50%, #0F1020 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        },
      },
        h('div', {
          style: {
            fontSize: '38px',
            fontWeight: '800',
            color: 'white',
            letterSpacing: '8px',
            marginBottom: '12px',
          },
        }, 'SIVENA'),
        h('div', {
          style: {
            width: '60px',
            height: '4px',
            background: 'linear-gradient(90deg, #3B82F6, #10B981)',
            borderRadius: '2px',
            marginBottom: '36px',
          },
        }),
        h('div', {
          style: {
            fontSize: '54px',
            fontWeight: '700',
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.15,
            maxWidth: '860px',
            marginBottom: '20px',
          },
        }, 'Manage your life, together'),
        h('div', {
          style: {
            fontSize: '22px',
            color: 'rgba(255,255,255,0.55)',
            textAlign: 'center',
            marginBottom: '44px',
            maxWidth: '680px',
          },
        }, 'Tasks \u00b7 Meals \u00b7 Budget \u00b7 Habits \u00b7 Wellness'),
        h('div', {
          style: {
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '56px',
          },
        },
          ...['For Couples', 'For Families', 'For Everyone'].map((label) =>
            h('div', {
              key: label,
              style: {
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '20px',
                padding: '10px 22px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '15px',
                fontWeight: '600',
              },
            }, label)
          )
        ),
        h('div', {
          style: {
            color: 'rgba(255,255,255,0.3)',
            fontSize: '16px',
            letterSpacing: '2px',
          },
        }, 'sivena.app')
      ),
      { width: 1200, height: 630 }
    );

    const buffer = await imageResponse.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.send(Buffer.from(buffer));
  } catch (e) {
    console.error('OG image error:', e);
    res.status(500).send('Error generating image');
  }
}
