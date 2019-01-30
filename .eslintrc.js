module.exports = {
  parser: "typescript-eslint-parser",
  plugins: ["prettier", "typescript"],
  extends: ["eslint:recommended"],
  parserOptions: {
    sourceType: "module",
  },
  env: { es6: true },
  rules: {
    "no-unused-vars": "off",
    "typescript/no-unused-vars": ["error"],
    "prefer-arrow-callback": ["error"]
  }
};
