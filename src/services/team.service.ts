import type { IAddTeam, TeamDto } from "../interface/IAddTeam";
import type { TeamIllustrationUploadResponse } from "../types/api";
import api from "./api";

async function create(body: IAddTeam) {
  const res = await api.post<TeamDto>("/teams", body);
  return res;
}

async function list() {
  const res = await api.get<TeamDto[]>("/teams");
  return res.data;
}

async function getByUuid(uuid: string) {
  const res = await api.get<TeamDto>("/teams/" + uuid);
  return res.data;
}

async function addMember(uuid: string, characterSlug: string) {
  const res = await api.post<TeamDto>(`/teams/${uuid}/characters/${characterSlug}`);
  return res.data;
}

async function removeMember(uuid: string, characterSlug: string) {
  const res = await api.delete<TeamDto>(`/teams/${uuid}/characters/${characterSlug}`);
  return res.data;
}

async function createIllustrationUpload(uuid: string, file: File) {
  const res = await api.post<TeamIllustrationUploadResponse>(
    `/teams/${uuid}/illustration-upload`,
    {
      filename: file.name,
      content_type: file.type,
      size: file.size,
    }
  );
  return res.data;
}

async function updateIllustration(uuid: string, illustrationUrl: string | null) {
  const res = await api.patch<TeamDto>(`/teams/${uuid}/illustration`, {
    illustrationUrl,
  });
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
