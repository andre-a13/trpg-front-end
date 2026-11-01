export default {
  input: "contracts/openapi.json",
  output: "src/api/generated",
  plugins: [
    "@hey-api/typescript",
    { name: "@hey-api/sdk", auth: false },
    "@hey-api/client-axios",
  ],
};
