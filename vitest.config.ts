/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig umożliwia testowanie komponentów .astro przez Container API.
export default getViteConfig({
    test: {
        include: ['db/**/*.test.ts', 'src/**/*.test.ts'],
        environment: 'node',
    },
});
