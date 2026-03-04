import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/__tests__/**/*.vitest.test.{js,mjs}'],
    globals: true,
  },
});
