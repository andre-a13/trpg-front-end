import {
  inventionsCreate,
  inventionsDelete,
  inventionsDraw,
  inventionsGetState,
  inventionsList,
  invengineerSetEnabled,
} from "../api/generated/sdk.gen";
import { apiOptions } from "./api";

export default {
  async list() {
    return (await inventionsList(apiOptions)).data;
  },
  async add(name: string) {
    return (await inventionsCreate({ ...apiOptions, body: { name } })).data;
  },
  async remove(id: number) {
    await inventionsDelete({ ...apiOptions, path: { invention_id: id } });
  },
  async setEnabled(slug: string, enabled: boolean) {
    return (await invengineerSetEnabled({ ...apiOptions, path: { slug }, body: { enabled } })).data;
  },
  async getState(slug: string) {
    return (await inventionsGetState({ ...apiOptions, path: { slug } })).data;
  },
  async draw(slug: string) {
    return (await inventionsDraw({ ...apiOptions, path: { slug } })).data;
  },
};
