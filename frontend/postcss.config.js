// PostCSS pipeline
// • tailwindcss  — generates utility classes (purges unused ones via content scan)
// • autoprefixer — adds vendor prefixes for cross-browser support
// • cssnano      — minifies CSS in production: removes comments, collapses
//                  shorthand, deduplicates rules, and shortens colour values.
//                  In development (NODE_ENV !== 'production') it is skipped so
//                  HMR stays fast.

const isProd = process.env.NODE_ENV === 'production';

export default {
  plugins: {
    tailwindcss:  {},
    autoprefixer: {},
    ...(isProd ? { cssnano: { preset: ['default', { discardComments: { removeAll: true } }] } } : {}),
  },
};
