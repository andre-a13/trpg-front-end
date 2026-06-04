import type { IAddCharacter, IUpdateCharacter } from "../interface/IAddCharacter";
import Character from "../models/character";
import type { CharacterDto } from "../types/api";
import api from "./api";

async function create( body : IAddCharacter )
{
    const res = await api.post("/characters", body );
    return res;
}

async function getBySlug( slug : string )
{
    const res = await api.get("/characters/" + slug );
    return new Character(res.data);
}

async function list()
{
    const res = await api.get("/characters");
    return res.data.map((item: CharacterDto) => new Character(item));
}

async function patch( slug : string, body : IUpdateCharacter )
{
    const res = await api.patch("/characters/" + slug, body );
    return res;
}

type CharacterPortraitUploadResponse = {
    upload_url: string;
    object_key: string;
    public_url: string;
    expires_in: number;
};

async function uploadPortrait( slug : string, file : File )
{
    const uploadRequest = await api.post<CharacterPortraitUploadResponse>(
        `/characters/${slug}/portrait-upload`,
        {
            filename: file.name,
            content_type: file.type,
            size: file.size,
        }
    );

    const uploadResponse = await fetch(uploadRequest.data.upload_url, {
        method: "PUT",
        headers: {
            "Content-Type": file.type,
        },
        body: file,
    });

    if (!uploadResponse.ok) {
        throw new Error("Portrait upload failed");
    }

    await patch(slug, { portraitUrl: uploadRequest.data.public_url });

    return uploadRequest.data.public_url;
}

async function uploadBackground( slug : string, file : File )
{
    const uploadRequest = await api.post<CharacterPortraitUploadResponse>(
        `/characters/${slug}/background-upload`,
        {
            filename: file.name,
            content_type: file.type,
            size: file.size,
        }
    );

    const uploadResponse = await fetch(uploadRequest.data.upload_url, {
        method: "PUT",
        headers: {
            "Content-Type": file.type,
        },
        body: file,
    });

    if (!uploadResponse.ok) {
        throw new Error("Background upload failed");
    }

    await patch(slug, { backgroundUrl: uploadRequest.data.public_url });

    return uploadRequest.data.public_url;
}

export default {
    create,
    getBySlug,
    list,
    patch,
    uploadPortrait,
    uploadBackground
}
