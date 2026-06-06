import type { AccountCreateRequest, AccountDto, AccountUpdateRequest } from "../types/api";
import api from "./api";

async function list() {
  const response = await api.get<AccountDto[]>("/accounts");
  return response.data;
}

async function create(body: AccountCreateRequest) {
  const response = await api.post<AccountDto>("/accounts", body);
  return response.data;
}

async function update(id: number, body: AccountUpdateRequest) {
  const response = await api.patch<AccountDto>(`/accounts/${id}`, body);
  return response.data;
}

export default {
  create,
  list,
  update,
};
