// Blade Design System tokens (dark theme, ashGrayDark scale)
// Source: https://github.com/razorpay/blade

export const color = {
  // Neutral (ashGrayDark)
  bg: {
    body: 'hsla(231, 17%, 8%, 1)',        // 1200
    surface: 'hsla(231, 12%, 12%, 1)',     // 1100
    elevated: 'hsla(230, 8%, 15%, 1)',     // 1000
    muted: 'hsla(230, 7%, 17%, 1)',        // 900
    subtle: 'hsla(230, 6%, 19%, 1)',       // 800
  },
  border: {
    subtle: 'hsla(230, 6%, 22%, 1)',       // 700
    default: 'hsla(233, 5%, 32%, 1)',      // 600
    muted: 'hsla(233, 4%, 40%, 1)',        // 500
  },
  text: {
    primary: 'hsla(0, 0%, 99%, 1)',        // 0
    secondary: 'hsla(240, 2%, 92%, 1)',    // 50
    muted: 'hsla(227, 4%, 60%, 1)',        // 300
    subtle: 'hsla(229, 4%, 50%, 1)',       // 400
    disabled: 'hsla(233, 4%, 40%, 1)',     // 500
  },
  // Primary (azure)
  primary: {
    base: 'hsla(218, 89%, 51%, 1)',        // 500
    hover: 'hsla(218, 87%, 43%, 1)',       // 600
    muted: 'hsla(218, 89%, 51%, 0.18)',    // a200
    subtle: 'hsla(218, 89%, 51%, 0.09)',   // a100
  },
  // Feedback
  positive: {
    base: 'hsla(153, 100%, 30%, 1)',       // emerald.500
    muted: 'hsla(150, 100%, 28%, 0.18)',   // emerald.a200
  },
  negative: {
    base: 'hsla(4, 85%, 44%, 1)',          // crimson.600
    muted: 'hsla(4, 85%, 44%, 0.18)',      // crimson.a200
    bg: 'hsla(4, 85%, 44%, 0.09)',         // crimson.a100
    text: 'hsla(5, 75%, 94%, 1)',          // crimson.100
  },
};

export const font = {
  family: {
    text: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    code: "'Menlo', 'SF Mono', 'Courier New', 'Roboto Mono', monospace",
  },
  size: {
    xs: 10,    // 25
    sm: 11,    // 50
    caption: 12, // 75
    body: 14,  // 100
    md: 16,    // 200
    lg: 18,    // 300
    xl: 20,    // 400
    '2xl': 24, // 500
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    xs: 13,    // 25
    sm: 16,    // 50
    caption: 17, // 75
    body: 20,  // 100
    md: 24,    // 200
    lg: 24,    // 300
    xl: 26,    // 400
  },
};

export const spacing = {
  0: 0,
  1: 2,
  2: 4,
  3: 8,
  4: 12,
  5: 16,
  6: 20,
  7: 24,
  8: 32,
  9: 40,
  10: 48,
  11: 56,
};

export const radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  max: 9999,
};

export const borderWidth = {
  thin: 1,
  thick: 1.5,
};
