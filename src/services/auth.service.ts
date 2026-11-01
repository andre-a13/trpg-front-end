import { authLogin, authRegister, authLogout, authMe } from "../api/generated/sdk.gen";
import type { AccountCredentials } from "../api/generated/types.gen";
import { apiOptions, publicApiOptions, refreshTokens } from "./api";
export type { AccountCredentials };

async function login(body: AccountCredentials) {
  return (await authLogin({ ...publicApiOptions, body })).data;
}
async function register(body: AccountCredentials) {
  return (await authRegister({ ...apiOptions, body })).data;
}
async function logout() {
  await authLogout(publicApiOptions);
}
async function me() {
  return (await authMe(apiOptions)).data;
}
export default { login, logout, me, refresh: refreshTokens, register };
