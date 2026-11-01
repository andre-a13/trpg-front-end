import type { IAddTeam } from "../interface/IAddTeam";
import { teamsCreate, teamsList, teamsGet, teamsAddMember, teamsRemoveMember,
  teamsCreateIllustrationUpload, teamsUpdateIllustration } from "../api/generated/sdk.gen";
import type { TeamIllustrationUploadRequest } from "../api/generated/types.gen";
import { apiOptions } from "./api";

async function create(body: IAddTeam) {
  const res = await teamsCreate({ ...apiOptions, body });
  return res;
}

async function list() {
  const res = await teamsList(apiOptions);
  return res.data;
}

async function getByUuid(uuid: string) {
  const res = await teamsGet({ ...apiOptions, path: { team_uuid: uuid } });
  return res.data;
}

async function addMember(uuid: string, characterSlug: string) {
  const res = await teamsAddMember({ ...apiOptions, path: { team_uuid: uuid, character_slug: characterSlug } });
  return res.data;
}

async function removeMember(uuid: string, characterSlug: string) {
  const res = await teamsRemoveMember({ ...apiOptions, path: { team_uuid: uuid, character_slug: characterSlug } });
  return res.data;
}

async function createIllustrationUpload(uuid: string, file: File) {
  const res = await teamsCreateIllustrationUpload({
    ...apiOptions, path: { team_uuid: uuid }, body: {
      filename: file.name,
      content_type: file.type as TeamIllustrationUploadRequest["content_type"],
      size: file.size,
    },
  });
  return res.data;
}

async function updateIllustration(uuid: string, illustrationUrl: string | null) {
  const res = await teamsUpdateIllustration({ ...apiOptions, path: { team_uuid: uuid }, body: { illustrationUrl } });
  return res.data;
}

async function uploadIllustration(uuid: string, file: File) {
  const uploadRequest = await createIllustrationUpload(uuid, file);

  const uploadResponse = await fetch(uploadRequest.upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Team illustration upload failed");
  }

  return updateIllustration(uuid, uploadRequest.public_url);
}

export default {
  addMember,
  create,
  createIllustrationUpload,
  getByUuid,
  list,
  removeMember,
  updateIllustration,
  uploadIllustration,
};
