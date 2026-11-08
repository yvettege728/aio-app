export const palettes = {
  cream: { bg: '#F5F2E9', text: '#3D473B', a: '#E7D9D1', b: '#A87370' },
  lavender: { bg: '#F5F2E9', text: '#41463E', a: '#DED9CF', b: '#786D66', c: '#ECE6D8' },
  blush: { bg: '#F3EEE6', text: '#4A5144', a: '#E4D1C9', b: '#99936F' },
  aqua: { bg: '#EFF1EA', text: '#3F5148', a: '#E2D4CA', b: '#748B7A', c: '#A87370' },
  ivory: { bg: '#F7F4EC', text: '#66554B', a: '#E8D8CF', b: '#929478', c: '#E4E0D4', d: '#B47E78' },
  rejection: {
    sky: '#E6EFFA',
    mist: '#F6DDE6',
    white: '#FBFCFF',
    blue: '#6C7FD8',
    dot: '#9FD3EE',
    mint: '#CFE8C9',
    coral: '#E4625A',
    rose: '#EE8FA6',
    ink: '#6E5440',
  },
} as const;

export type PaletteName = Exclude<keyof typeof palettes, 'rejection'>;
