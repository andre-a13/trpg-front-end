import { accountsCreate, accountsList, accountsUpdate } from "../api/generated/sdk.gen";
import type { AccountCreateRequest, AccountUpdateRequest } from "../types/api";
import { apiOptions } from "./api";

async function list() {
  return (await accountsList(apiOptions)).data;
}
async function create(body: AccountCreateRequest) {
  return (await accountsCreate({ ...apiOptions, body })).data;
}
async function update(id: number, body: AccountUpdateRequest) {
  return (await accountsUpdate({ ...apiOptions, path: { user_id: id }, body })).data;
}
export default { create, list, update };
